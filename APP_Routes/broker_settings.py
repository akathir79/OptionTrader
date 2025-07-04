# ---------------------------------------------------------------------
# Full, self-contained blueprint for broker settings + token handling.
# Drop-in ready for your existing Flask app.
# ---------------------------------------------------------------------
from __future__ import annotations
from datetime import date, datetime
import hashlib, json, typing as T, requests
import pytz
import logging

from flask import Blueprint, jsonify, request
from APP_Extensions.db import db
from models import BrokerSettings

# ---------------------------------------------------------------------
# Optional import: only needed when the fyers SDK is installed.
try:
    from fyers_apiv3 import fyersModel
except ImportError:
    fyersModel = None

bp = Blueprint("broker_settings", __name__, url_prefix="/api/broker_settings")
_rows = lambda: BrokerSettings.query.filter_by(user_id=0)

# Configure logging for debugging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------
# Editable columns  •  NEW: access_token / refresh_token added
FIELDS = [
    "brokername", "broker_user_id",
    "app_name", "app_source",
    "clientid", "appkey", "redirect_url",
    "pin", "useremail", "usermobileno",
    "pan", "dob",
    "access_token", "refresh_token",     # ← editable via PUT/POST
]

# ---------------------------------------------------------------------
# Helpers
def _ist_time(dt: datetime | None) -> str | None:
    """Convert UTC datetime → Asia/Kolkata string, or None."""
    if not dt:
        return None
    ist = pytz.timezone("Asia/Kolkata")
    return dt.replace(tzinfo=pytz.utc).astimezone(ist).strftime("%Y-%m-%d %H:%M:%S")

def _safe_ts(row, attr: str) -> str | None:
    """Safe read of timestamp columns that may not exist in DB yet."""
    return _ist_time(getattr(row, attr, None))

def _clean(js: dict) -> dict:
    """Filter/convert incoming JSON to model-ready dict."""
    out: dict[str, T.Any] = {}
    for k in FIELDS:
        if k not in js:
            continue
        v = js[k]
        if v in ("", None):
            out[k] = None
        elif k == "dob":
            try:
                out[k] = date.fromisoformat(v)
            except ValueError:
                out[k] = None
        else:
            out[k] = v
    return out

def _dto(row: BrokerSettings) -> dict:
    """Row → JSON for API responses."""
    d = {k: (getattr(row, k).isoformat() if isinstance(getattr(row, k), date)
             else getattr(row, k))
         for k in FIELDS}
    d["id"] = row.id
    d["access_token_created_at"]  = _safe_ts(row, "access_token_created_at")
    d["refresh_token_created_at"] = _safe_ts(row, "refresh_token_created_at")
    return d

def _json_error(msg: str, status: int = 400):
    return jsonify(error=msg), status

# ---------------------------------------------------------------------
# CRUD endpoints
@bp.get("/")
def api_list():
    return jsonify([_dto(r) for r in _rows()])

@bp.post("/")
def api_create():
    js = request.get_json() or {}
    if not {"brokername", "broker_user_id"} <= js.keys():
        return _json_error("brokername and broker_user_id required")
    row = BrokerSettings(user_id=0, **_clean(js))
    db.session.add(row)
    db.session.commit()
    return jsonify(_dto(row)), 201

@bp.put("/<int:row_id>")
def api_update(row_id: int):
    row = BrokerSettings.query.get_or_404(row_id)
    payload = _clean(request.get_json() or {})
    now = datetime.utcnow()
    if "access_token"  in payload:
        row.access_token_created_at  = now
    if "refresh_token" in payload:
        row.refresh_token_created_at = now
    for k, v in payload.items():
        setattr(row, k, v)
    db.session.commit()
    return jsonify(_dto(row))

@bp.delete("/<int:row_id>")
def api_delete(row_id: int):
    db.session.delete(BrokerSettings.query.get_or_404(row_id))
    db.session.commit()
    return "", 204

# ---------------------------------------------------------------------
# Broker-specific token logic  (currently only FYERS implemented)
BrokerHandler = T.TypedDict("BrokerHandler", {
    "token":   T.Callable[[BrokerSettings, str], tuple[str, str]],
    "refresh": T.Callable[[BrokerSettings], str],
})

def _fyers_ok():
    if fyersModel is None:
        raise RuntimeError("fyers-apiv3 SDK not installed")

def _fyers_token(row: BrokerSettings, auth_code: str) -> tuple[str, str]:
    """Exchange auth_code → (access, refresh)."""
    _fyers_ok()
    s = fyersModel.SessionModel(
        client_id   = row.clientid,
        secret_key  = row.appkey,
        redirect_uri= row.redirect_url,
        response_type="code",
        grant_type   ="authorization_code",
    )
    s.set_token(auth_code)
    rsp = s.generate_token()
    if not (isinstance(rsp, dict) and rsp.get("access_token")):
        raise RuntimeError(str(rsp))
    return rsp["access_token"], rsp["refresh_token"]

def _fyers_refresh(row: BrokerSettings) -> str:
    """Refresh FYERS access token using stored refresh_token."""
    _fyers_ok()
    if not getattr(row, "refresh_token", None):
        raise RuntimeError("No refresh_token stored")
    # Generate appIdHash as requested: clientid + appkey hashed with sha256
    concatenated_str = row.clientid + row.appkey
    logger.debug(f"Concatenated string for appIdHash: {concatenated_str}")  # Debug: Log concatenated string
    hash_object = hashlib.sha256(concatenated_str.encode())
    appIdHash = hash_object.hexdigest()
    logger.debug(f"Generated appIdHash: {appIdHash}")  # Debug: Log hashed value
    body = {
        "grant_type": "refresh_token",
        "appIdHash": appIdHash,
        "refresh_token": row.refresh_token,
        "pin": row.pin,
    }
    logger.debug(f"Request body for Fyers API: {body}")  # Debug: Log request body
    r = requests.post(
        "https://api-t1.fyers.in/api/v3/validate-refresh-token",
        data=json.dumps(body),
        headers={"Content-Type": "application/json"},
        timeout=10)
    if r.status_code != 200:
        logger.error(f"Fyers API error (status: {r.status_code}): {r.text}")  # Debug: Log API error
        raise RuntimeError(r.text)
    data = r.json()
    logger.debug(f"Fyers API response: {data}")  # Debug: Log API response
    if not data.get("access_token"):
        logger.error(f"No access_token in response: {data}")  # Debug: Log if token missing
        raise RuntimeError(str(data))
    return data["access_token"]

BROKER_HANDLERS: dict[str, BrokerHandler] = {
    "fyers": {"token": _fyers_token, "refresh": _fyers_refresh},
    # …add other brokers here…
}

def _handler(row: BrokerSettings) -> BrokerHandler:
    h = BROKER_HANDLERS.get(row.brokername.lower())
    if not h:
        raise KeyError
    return h

# ---------------------------------------------------------------------
# Token-exchange & refresh endpoints
@bp.post("/<int:row_id>/token")
def api_token(row_id: int):
    row = BrokerSettings.query.get_or_404(row_id)
    auth_code = (request.get_json() or {}).get("auth_code")
    if not auth_code:
        return _json_error("auth_code required")
    try:
        access, refresh = _handler(row)["token"](row, auth_code)
        now = datetime.utcnow()
        row.access_token = access
        row.refresh_token = refresh
        row.access_token_created_at = now
        row.refresh_token_created_at = now
        db.session.commit()
        return jsonify(_dto(row))
    except KeyError:
        return _json_error("Select a valid broker for this action")
    except Exception as exc:
        return _json_error(str(exc), 502)

@bp.post("/<int:row_id>/refresh")
def api_refresh(row_id: int):
    row = BrokerSettings.query.get_or_404(row_id)
    try:
        new_access_token = _handler(row)["refresh"](row)
        row.access_token = new_access_token
        row.access_token_created_at = datetime.utcnow()
        db.session.commit()
        return jsonify(_dto(row))
    except KeyError:
        return _json_error("Select a valid broker for this action")
    except Exception as exc:
        return _json_error(str(exc), 502)

# ---------------------------------------------------------------------
# Inline “eye”-button endpoint used by broker_settings.js
@bp.get("/<int:row_id>/tokens/view")
def view_tokens(row_id: int):
    row = BrokerSettings.query.get_or_404(row_id)
    return jsonify({
        "access_token": getattr(row, "access_token", "") or "",
        "refresh_token": getattr(row, "refresh_token", "") or "",
        "access_token_created_at": _safe_ts(row, "access_token_created_at"),
        "refresh_token_created_at": _safe_ts(row, "refresh_token_created_at"),
    })