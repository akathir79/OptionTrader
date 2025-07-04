from flask import Flask, render_template
from APP_Extensions.db import db
from APP_Routes.symbol_selector import symbol_selector_bp
from APP_Routes.broker_settings import bp           #  ← just “bp”, not bp_broker
from flask import jsonify, request
from models import BrokerSettings
import os
from APP_Routes.websocket_data import websocket_bp
from APP_Routes.spot_price import spot_price_bp

app = Flask(__name__)
app.config.update(
    SQLALCHEMY_DATABASE_URI=os.environ.get("DATABASE_URL"),
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    DEBUG=True,
    SQLALCHEMY_ENGINE_OPTIONS={
        "pool_recycle": 300,
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20
    },
)

db.init_app(app)
import models                                       # registers BrokerSettings

# register blueprints
app.register_blueprint(symbol_selector_bp)
app.register_blueprint(bp)                          # ← same symbol as above
app.register_blueprint(websocket_bp, url_prefix='/api/websocket')
app.register_blueprint(spot_price_bp, url_prefix='/api')

@app.route("/")
def live_trade():
    return render_template("live_trade.html")


@app.route('/get_access_token', methods=['GET'])
def get_access_token():
    brokername = request.args.get('brokername')
    broker_user_id = request.args.get('broker_user_id')
    if not brokername or not broker_user_id:
        return jsonify({"error": "Missing parameters"}), 400

    broker_setting = BrokerSettings.query.filter_by(
        brokername=brokername, broker_user_id=broker_user_id
    ).first()

    if broker_setting and broker_setting.access_token:
        return jsonify({"access_token": broker_setting.access_token})
    else:
        return jsonify({"error": "Token not found"}), 404

if __name__ == "__main__":
    app.run(port=5000, debug=True)