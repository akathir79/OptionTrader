document.addEventListener("DOMContentLoaded", () => {
  const btnOpen = document.getElementById("brokerSettingsBtn");
  const modalEl = document.getElementById("brokerSettingsModal");
  const modal = new bootstrap.Modal(modalEl);
  const tbody = document.getElementById("brokerTableBody");
  const form = document.getElementById("brokerForm");
  const userSelect = document.getElementById("userSelect");
  const brokerSelect = document.getElementById("brokerSelect");
  const tokenStatus = document.getElementById("tokenStatus");

  const toast = (msg, cls = "bg-danger") => {
    console.log("Toast triggered:", msg, cls);
    const t = document.createElement("div");
    t.className = `toast text-white ${cls}`;
    Object.assign(t.style, {
      position: "fixed",
      bottom: "1rem",
      right: "1rem",
      zIndex: 1080,
    });
    t.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">${msg}</div>
        <button class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>`;
    document.body.appendChild(t);
    const bsToast = new bootstrap.Toast(t, { delay: 2500 });
    bsToast.show();
    t.addEventListener("hidden.bs.toast", () => t.remove());
  };

  const safe = async (r) => {
    if (!r || !r.ok) {
      const text = r && r.statusText ? await r.text() : "Network error";
      console.error("API Response Error:", r ? r.status : "No response", text);
      return [false, { error: text || "Invalid response" }];
    }
    try {
      const text = await r.text();
      console.log("API Response:", r.status, r.statusText, text);
      return [true, text ? JSON.parse(text) : {}];
    } catch (e) {
      console.error("Safe fetch error:", e, "Response text:", await r.text());
      return [false, { error: "Invalid response: " + (await r.text() || e.message) }];
    }
  };

  const snippet = (str) => str ? `${str.slice(0, 3)}...${str.slice(-3)}` : "";

  const populateDropdowns = (data) => {
    userSelect.innerHTML = '<option value="">Select</option>';
    brokerSelect.innerHTML = '<option value="">Select</option>';

    const uniqueBrokers = [...new Set(data.map(item => item.brokername).filter(name => name))];
    const uniqueUsers = [...new Set(data.map(item => item.broker_user_id).filter(id => id))];

    uniqueBrokers.forEach(broker => {
      const option = document.createElement('option');
      option.value = broker;
      option.textContent = broker;
      brokerSelect.appendChild(option);
    });

    uniqueUsers.forEach(user => {
      const option = document.createElement('option');
      option.value = user;
      option.textContent = user;
      userSelect.appendChild(option);
    });
  };

  const isTokenValid = (createdAt) => {
    if (!createdAt) return false;
    const now = new Date();
    const tokenDate = new Date(createdAt);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0); // 7 AM IST today
    return tokenDate >= today;
  };

  const updateTokenStatus = (data) => {
    const selectedUser = userSelect.value;
    const selectedBroker = brokerSelect.value;
    if (!selectedUser || !selectedBroker) {
      tokenStatus.textContent = "No Token";
      tokenStatus.className = "badge bg-secondary ms-1";
      return;
    }

    const record = data.find(item =>
      item.brokername === selectedBroker && item.broker_user_id === selectedUser
    );
    if (record && record.access_token_created_at) {
      const valid = isTokenValid(record.access_token_created_at);
      tokenStatus.textContent = valid ? "Token Valid" : "Token Expired";
      tokenStatus.className = `badge ms-1 ${valid ? "bg-success" : "bg-danger"}`;
    } else {
      tokenStatus.textContent = "No Token";
      tokenStatus.className = "badge bg-secondary ms-1";
    }
  };

  const load = () => {
    console.log("Loading table data...");
    fetch("/api/broker_settings/")
      .then(r => safe(r))
      .then(([ok, result]) => {
        if (ok) {
          tbody.innerHTML = result.length
            ? ""
            : '<tr><td colspan="7" class="text-center text-muted">No records</td></tr>';
          result.forEach(o => {
            const tr = document.createElement("tr");
            tr.dataset.id = o.id;
            tr.dataset.broker = (o.brokername || "").toLowerCase();
            tr.dataset.client = o.clientid || "";
            tr.dataset.redirect = o.redirect_url || "";
            tr.dataset.refreshToken = o.refresh_token || "";

            tr.innerHTML = `
              <td>${o.brokername}</td>
              <td>${o.broker_user_id}</td>
              <td>${snippet(o.access_token)}</td>
              <td>${o.access_token_created_at || "N/A"}</td>
              <td>${snippet(o.refresh_token)}</td>
              <td>${o.refresh_token_created_at || "N/A"}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary edit"><i class="fas fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-danger delete"><i class="fas fa-trash"></i></button>
                <button class="btn btn-sm btn-outline-success token"><i class="fas fa-key"></i></button>
                <button class="btn btn-sm btn-outline-warning refresh"><i class="fas fa-sync-alt"></i></button>
              </td>`;
            tbody.appendChild(tr);
          });
          console.log("Table loaded with", result.length, "rows");
          populateDropdowns(result);
          updateTokenStatus(result);
        } else {
          toast(result.error || "Failed to load data", "bg-danger");
        }
      })
      .catch(e => {
        console.error("Load error:", e);
        toast("Failed to load data: Network error", "bg-danger");
      });
  };

  tbody.addEventListener("click", async e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const tr = btn.closest("tr");
    const id = tr.dataset.id;
    const br = tr.dataset.broker;

    console.log("Button clicked:", btn.className, id);

    if (btn.classList.contains("delete")) {
      try {
        const [ok, result] = await safe(await fetch(`/api/broker_settings/${id}`, { method: "DELETE" }));
        if (ok) {
          toast("Deleted ✔️", "bg-success");
          load();
        } else {
          toast(result.error || "Delete failed");
        }
      } catch (e) {
        console.error("Delete error:", e);
        toast("Delete failed");
      }
      return;
    }

    if (btn.classList.contains("edit")) {
      try {
        const [ok, result] = await safe(await fetch("/api/broker_settings/"));
        if (ok) {
          const o = result.find(x => x.id == id);
          if (!o) {
            toast("Record not found");
            return;
          }
          form.dataset.id = id;
          [...form.elements].forEach(el => {
            if (el.name && o.hasOwnProperty(el.name)) {
              el.value = o[el.name] || "";
            }
          });
          toast("Loaded for editing", "bg-success");
        } else {
          toast(result.error || "Failed to load record");
        }
      } catch (e) {
        console.error("Edit error:", e);
        toast("Failed to load record");
      }
      return;
    }

    if (btn.classList.contains("token")) return handleToken(id, tr);
    if (btn.classList.contains("refresh")) return handleRefresh(id, tr);
    if (btn.classList.contains("copy")) return handleCopy(btn);
    if (btn.classList.contains("toggleedit")) return handleToggleEdit(btn);
    if (btn.classList.contains("save")) return handleSave(btn.closest(".token-row"));
  });

  const ALLOWED = ["fyers"];

  async function handleToken(id, tr) {
    if (!ALLOWED.includes(tr.dataset.broker)) {
      toast("Select a valid broker for this action");
      return;
    }

    const { client: clientId, redirect: redir } = tr.dataset;
    const authURL = `https://api-t1.fyers.in/api/v3/generate-authcode?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redir)}&response_type=code&state=livetrade`;
    window.open(authURL, "_blank");

    const code = prompt("Paste the Fyers auth_code:");
    if (!code) return;

    try {
      const [ok, result] = await safe(await fetch(`/api/broker_settings/${id}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth_code: code })
      }));

      if (ok) {
        toast("Tokens saved ✔️", "bg-success");
        await load();
      } else {
        toast(result.error || "Token exchange failed");
      }
    } catch (e) {
      console.error("Token error:", e);
      toast("Token exchange failed");
    }
  }

  async function handleRefresh(id, tr) {
    if (!ALLOWED.includes(tr.dataset.broker)) {
      toast("Select a valid broker for this action");
      return;
    }
    const refreshToken = tr.dataset.refreshToken;
    if (!refreshToken) {
      toast("No refresh token available");
      return;
    }

    console.log("Attempting refresh for ID:", id, "with refreshToken:", refreshToken);
    try {
      const [ok, result] = await safe(await fetch(`/api/broker_settings/${id}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken })
      }));
      if (ok) {
        console.log("Refresh response:", result);
        const newAccessToken = result.access_token;
        if (newAccessToken) {
          toast("Access token refreshed ✔️", "bg-success");
          await load();
        } else {
          toast("Refresh failed: No new access token received");
          console.warn("No access_token in response:", result);
        }
      } else {
        toast(result.error || "Refresh failed");
        console.error("Refresh failed with error:", result.error);
      }
    } catch (e) {
      console.error("Refresh error:", e, "Stack:", e.stack);
      toast("Refresh failed: " + (e.message || "Unknown issue"));
    }
  }

  const makeTokenField = (label, fname, value, ts) => `
    <div class="mb-3">
      <label class="form-label fw-bold mb-1">${label}
        <span class="text-muted fw-normal">(Created: ${ts || "N/A"} IST)</span>
      </label>
      <div class="input-group input-group-sm">
        <textarea class="form-control token-input" data-field="${fname}" rows="2" readonly>${value || ""}</textarea>
        <button class="btn btn-outline-secondary copy" title="Copy"><i class="fas fa-copy"></i></button>
        <button class="btn btn-outline-primary toggleedit" title="Edit"><i class="fas fa-edit"></i></button>
      </div>
    </div>`;

  function handleCopy(btn) {
    const tx = btn.parentElement.querySelector(".token-input");
    if (!tx) {
      toast("No text to copy");
      return;
    }
    navigator.clipboard?.writeText(tx.value).then(
      () => toast("Copied ✔️", "bg-success"),
      () => {
        tx.select();
        document.execCommand("copy");
        toast("Copied ✔️", "bg-success");
      }
    );
  }

  function handleToggleEdit(btn) {
    const tx = btn.parentElement.querySelector(".token-input");
    const row = btn.closest(".token-row");
    const save = row.querySelector(".save");
    tx.readOnly = !tx.readOnly;
    btn.classList.toggle("btn-outline-primary");
    btn.classList.toggle("btn-outline-secondary");
    save.disabled = false;
    console.log("Toggled edit for", tx.dataset.field);
  }

  async function handleSave(row) {
    const id = row.dataset.id;
    const body = {};
    row.querySelectorAll(".token-input").forEach(i => body[i.dataset.field] = i.value.trim());

    console.log("Saving token data for ID:", id, body);

    try {
      const [ok, result] = await safe(await fetch(`/api/broker_settings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }));

      if (ok) {
        toast("Saved ✔️", "bg-success");
        await load();
      } else {
        toast(result.error || "Save failed");
      }
    } catch (e) {
      console.error("Save error:", e);
      toast("Save failed");
    }
  }

  form.addEventListener("submit", async ev => {
    ev.preventDefault();
    if (!form.brokername.value.trim() || !form.broker_user_id.value.trim()) {
      toast("Broker & Broker-UserID required");
      return;
    }

    const formData = Object.fromEntries(new FormData(form));
    delete formData.created_at;

    const id = form.dataset.id;
    const url = id ? `/api/broker_settings/${id}` : "/api/broker_settings/";
    const method = id ? "PUT" : "POST";

    console.log("Form submit:", { url, method, formData });

    try {
      const [ok, result] = await safe(await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      }));

      if (ok) {
        toast("Saved ✔️", "bg-success");
        form.reset();
        delete form.dataset.id;
        await load();
      } else {
        toast(result.error || "Save failed: " + (result.message || "No details"));
      }
    } catch (e) {
      console.error("Form submit error:", e);
      toast("Save failed: Network error - " + (e.message || "Unknown issue"));
    }
  });

  document.addEventListener("click", function (e) {
    const btn = e.target.closest(".copy-token");
    if (!btn) return;
    const field = btn.dataset.target;
    const input = form.querySelector(`[name="${field}"]`);
    if (input && input.value.trim()) {
      navigator.clipboard.writeText(input.value.trim())
        .then(() => toast(`Copied ${field.replace("_", " ")} ✔️`, "bg-success"));
    } else {
      toast("No text to copy");
    }
  });

  [userSelect, brokerSelect].forEach(select => {
    select.addEventListener("change", () => {
      fetch("/api/broker_settings/")
        .then(r => safe(r))
        .then(([ok, result]) => {
          if (ok) {
            updateTokenStatus(result);
          }
        })
        .catch(e => console.error("Error fetching data for token status:", e));
    });
  });

  btnOpen?.addEventListener("click", () => {
    console.log("Opening modal and loading data");
    load();
    modal.show();
  });

  load(); // Initial load
});