const API_BASE = "/api";
const TOKEN_KEY = "powersmart_token";
const USER_KEY = "powersmart_user";

const demoMeters = [
  { label: "Main House", meter_number: "37101122093", role: "owner", occupant_name: "Akinyi Home", units_remaining: 34.8, daily_avg_units: 5.6, threshold: 10 },
  { label: "Unit A", meter_number: "37101122094", role: "tenant", occupant_name: "Mary N.", units_remaining: 8.2, daily_avg_units: 3.1, threshold: 10 },
  { label: "Unit B", meter_number: "37101122095", role: "tenant", occupant_name: "Otieno J.", units_remaining: 3.7, daily_avg_units: 2.5, threshold: 7 },
  { label: "Dorm Room", meter_number: "37101122096", role: "family", occupant_name: "Brian A.", units_remaining: 16.9, daily_avg_units: 1.8, threshold: 6 }
];

const demoTokens = [
  { id: "demo-1", meter_id: "37101122093", amount_ksh: 1000, token_number: "5821 9044 3178 6632 1098", push_status: "pending" },
  { id: "demo-2", meter_id: "37101122094", amount_ksh: 500, token_number: "7054 1148 8891 2203 4507", push_status: "success" }
];

const appliances = [
  { name: "Fridge", watts: 150, hours_per_day: 16 },
  { name: "TV", watts: 100, hours_per_day: 5 },
  { name: "Iron", watts: 1000, hours_per_day: 0.7 },
  { name: "Water heater", watts: 1800, hours_per_day: 0.5 }
];

let state = {
  token: localStorage.getItem(TOKEN_KEY),
  user: readStoredUser(),
  meters: demoMeters,
  tokens: demoTokens,
  outages: [],
  pools: [],
  predictions: null,
  currentRole: "owner",
  poolValue: 7400
};

const $ = (selector) => document.querySelector(selector);
const formatKsh = (value) => `KSh ${Math.round(Number(value) || 0).toLocaleString("en-KE")}`;
const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;"
}[char]));

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.token && options.auth !== false) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(payload.error || payload.message || "Backend request failed");
  }

  return payload;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function requireSession() {
  if (state.token) {
    return true;
  }
  showToast("Login or register first to call protected backend routes.");
  $("#authPanel").scrollIntoView({ behavior: "smooth", block: "start" });
  return false;
}

function setSession(authResponse) {
  state.token = authResponse.token;
  state.user = authResponse.user;
  localStorage.setItem(TOKEN_KEY, state.token);
  localStorage.setItem(USER_KEY, JSON.stringify(state.user));
  renderAuth();
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  state.meters = demoMeters;
  state.tokens = demoTokens;
  renderAll();
  renderAuth();
}

function normaliseManagedMeter(meter) {
  return {
    label: meter.label || "Meter",
    meter_number: meter.meter_number,
    role: meter.role || "owner",
    occupant_name: meter.occupant_name || "Registered user",
    units_remaining: Number(meter.units_remaining || 0),
    daily_avg_units: Number(meter.daily_avg_units || 1),
    threshold: 10,
    can_purchase: meter.can_purchase,
    can_transfer: meter.can_transfer,
    can_view_usage: meter.can_view_usage
  };
}

function getVisibleMeters() {
  if (state.currentRole === "tenant") {
    return state.meters.filter((meter) => meter.role === "tenant").slice(0, 1);
  }
  return state.meters;
}

function renderAuth() {
  const isLoggedIn = Boolean(state.token);
  $("#authState").textContent = isLoggedIn ? `Logged in as ${state.user?.name || "PowerSmart user"}` : "Guest mode";
  $("#syncState").textContent = isLoggedIn ? "Backend sync enabled" : "Login to sync backend data";
  $("#authTitle").textContent = isLoggedIn ? "Connected to backend" : "Login or register";
  $("#authCopy").textContent = isLoggedIn
    ? `JWT session active for ${state.user?.email || "your account"}.`
    : "Connect the dashboard to your Go backend using a JWT session.";
  $("#logoutBtn").hidden = !isLoggedIn;
  $("#loginForm").hidden = isLoggedIn;
  $("#registerForm").hidden = isLoggedIn;
}

function renderSummary() {
  const visibleMeters = getVisibleMeters();
  const totalUnits = visibleMeters.reduce((sum, meter) => sum + meter.units_remaining, 0);
  const totalDaily = visibleMeters.reduce((sum, meter) => sum + Math.max(meter.daily_avg_units, 0.1), 0);
  const riskMeters = visibleMeters.filter((meter) => meter.units_remaining <= meter.threshold).length;
  const savings = visibleMeters.reduce((sum, meter) => sum + Math.round(meter.units_remaining * 18), 0);

  $("#totalUnits").textContent = `${totalUnits.toFixed(1)} kWh`;
  $("#runway").textContent = `${(totalUnits / Math.max(totalDaily, 1)).toFixed(1)} days`;
  $("#riskMeters").textContent = `${riskMeters} meter${riskMeters === 1 ? "" : "s"}`;
  $("#goalProgress").textContent = formatKsh(savings);
}

function renderMeters() {
  const meterGrid = $("#meterGrid");
  const visibleMeters = getVisibleMeters();

  meterGrid.innerHTML = visibleMeters.map((meter) => {
    const units = Number(meter.units_remaining || 0);
    const daily = Math.max(Number(meter.daily_avg_units || 1), 0.1);
    const level = Math.min(100, Math.round((units / 40) * 100));
    const days = (units / daily).toFixed(1);
    const status = units <= 5 ? "critical" : units <= meter.threshold ? "warning" : "";

    return `
      <article class="meter-card">
        <div class="meter-header">
          <div>
            <strong>${escapeHTML(meter.label)}</strong>
            <span>${escapeHTML(meter.meter_number)} - ${escapeHTML(meter.occupant_name)}</span>
          </div>
          <span class="badge ${status}">${escapeHTML(meter.role)}</span>
        </div>
        <div class="unit-line">
          <strong>${units.toFixed(1)} kWh</strong>
          <span>${days} days</span>
        </div>
        <progress value="${level}" max="100"></progress>
        <div class="meter-meta">Threshold ${meter.threshold} kWh - Avg ${daily.toFixed(1)} kWh/day</div>
      </article>
    `;
  }).join("");

  renderSummary();
}

async function renderDistribution() {
  const amount = Number($("#bulkAmount").value || 0);
  const mode = $("#splitMode").value;

  if (state.token) {
    try {
      const allocations = await api("/features/tokens/bulk-split", {
        method: "POST",
        body: JSON.stringify({ amount_ksh: amount, mode })
      });
      $("#distributionList").innerHTML = allocations.map((item) => `
        <div class="list-row">
          <div>
            <strong>${escapeHTML(item.label)}</strong>
            <span>${escapeHTML(item.meter_number)} - ${item.units.toFixed(1)} kWh</span>
          </div>
          <strong>${formatKsh(item.amount_ksh)}</strong>
        </div>
      `).join("");
      return;
    } catch (error) {
      showToast(error.message);
    }
  }

  const targets = getVisibleMeters();
  const totalDaily = targets.reduce((sum, meter) => sum + Math.max(meter.daily_avg_units, 1), 0);
  const allocations = targets.map((meter) => {
    const share = mode === "weighted" ? Math.max(meter.daily_avg_units, 1) / totalDaily : 1 / Math.max(targets.length, 1);
    return { meter, amount: amount * share };
  });

  $("#distributionList").innerHTML = allocations.map(({ meter, amount: value }) => `
    <div class="list-row">
      <div>
        <strong>${escapeHTML(meter.label)}</strong>
        <span>${escapeHTML(meter.meter_number)}</span>
      </div>
      <strong>${formatKsh(value)}</strong>
    </div>
  `).join("");
}

async function renderAppliances() {
  if (state.token) {
    try {
      const result = await api("/features/analysis/appliances", {
        method: "POST",
        body: JSON.stringify({ appliances: appliances })
      });
      $("#applianceList").innerHTML = result.estimates.map((item) => `
        <div class="appliance-row">
          <div>
            <strong>${escapeHTML(item.name)}</strong>
            <span>${item.kwh_per_day} kWh/day</span>
          </div>
          <strong>${formatKsh(item.cost_per_day)}/day</strong>
        </div>
      `).join("");
      $("#applianceInsight").textContent = result.insight;
      return;
    } catch (error) {
      showToast(error.message);
    }
  }

  const tariffRate = 31.75;
  const dailyCosts = appliances.map((item) => ({
    ...item,
    cost: (item.watts / 1000) * item.hours_per_day * tariffRate
  }));
  const total = dailyCosts.reduce((sum, item) => sum + item.cost, 0);
  const top = dailyCosts.slice().sort((a, b) => b.cost - a.cost)[0];

  $("#applianceList").innerHTML = dailyCosts.map((item) => `
    <div class="appliance-row">
      <div>
        <strong>${escapeHTML(item.name)}</strong>
        <span>${item.watts}W for ${item.hours_per_day}h/day</span>
      </div>
      <strong>${formatKsh(item.cost)}/day</strong>
    </div>
  `).join("");
  $("#applianceInsight").textContent = `${top.name} is ${Math.round((top.cost / total) * 100)}% of today's appliance budget.`;
}

function renderOutages(filter = "all") {
  const reports = state.outages.length ? state.outages : [
    { area: "Kileleshwa", type: "unscheduled", report_count: 24, estimated_restore: "7:40 PM" },
    { area: "Kasarani", type: "scheduled", report_count: 12, estimated_restore: "restored at 3:15 PM" },
    { area: "Syokimau", type: "unscheduled", report_count: 31, estimated_restore: "8:10 PM" }
  ];

  const feed = reports.filter((report) => filter === "all" || report.type === filter);
  $("#outageFeed").innerHTML = feed.map((report) => `
    <div class="list-row">
      <div>
        <strong>${escapeHTML(report.area)}</strong>
        <small>${report.report_count} reports - ${escapeHTML(report.type)}</small>
      </div>
      <strong>${escapeHTML(report.estimated_restore)}</strong>
    </div>
  `).join("");
}

function renderMap() {
  const roads = [
    { left: 4, top: 22, width: 88, rotate: 8 },
    { left: 10, top: 66, width: 72, rotate: -14 },
    { left: 38, top: 8, width: 62, rotate: 92 },
    { left: 2, top: 45, width: 92, rotate: 0 }
  ];
  const hotspots = [
    { left: 18, top: 26, level: "med", label: "12" },
    { left: 60, top: 40, level: "high", label: "31" },
    { left: 76, top: 18, level: "low", label: "8" },
    { left: 34, top: 62, level: "high", label: "24" }
  ];

  $("#mapCanvas").innerHTML = [
    ...roads.map((road) => `<span class="road" style="left:${road.left}%;top:${road.top}%;width:${road.width}%;transform:rotate(${road.rotate}deg)"></span>`),
    ...hotspots.map((spot) => `<span class="hotspot ${spot.level}" style="left:${spot.left}%;top:${spot.top}%">${spot.label}</span>`)
  ].join("");
}

function renderTokens() {
  $("#tokenHistory").innerHTML = state.tokens.map((item) => `
    <div class="list-row">
      <div>
        <strong>${formatKsh(item.amount_ksh)} - ${escapeHTML(item.payment_ref || item.meter_id)}</strong>
        <small>${escapeHTML(item.token_number)}</small>
      </div>
      <span class="badge">${escapeHTML(item.push_status || "pending")}</span>
    </div>
  `).join("");
}

function renderPredictions() {
  const predictions = state.predictions;
  const lines = predictions ? [
    `Typical depletion window: ${predictions.runout_window}`,
    `Recommended purchase timing: ${predictions.recommended_buy_day}`,
    ...predictions.amount_comparisons,
    ...predictions.anomalies
  ] : [
    "Typical depletion window: Thursday evening",
    "KSh 500 lasts about 6.2 days",
    "KSh 1000 lasts about 13.1 days with better daily value",
    "Usage anomaly watch: water heater spike detected yesterday"
  ];

  $("#predictionList").innerHTML = lines.map((text) => `<div class="list-row"><span>${escapeHTML(text)}</span></div>`).join("");
}

function renderCommunity() {
  const pools = state.pools.length ? state.pools : [
    { id: "pool-001", name: "South B weekday pool", target_ksh: 10000, collected_ksh: state.poolValue, member_count: 10, estimated_saving_ksh: 180, status: "collecting" }
  ];
  const mainPool = pools[0];

  $("#poolAmount").textContent = formatKsh(mainPool.collected_ksh);
  document.querySelector(".pool-meter progress").value = mainPool.collected_ksh;
  document.querySelector(".pool-meter progress").max = mainPool.target_ksh;
  $("#communityList").innerHTML = pools.map((pool) => `
    <div class="list-row">
      <div>
        <strong>${escapeHTML(pool.name)}</strong>
        <small>${pool.member_count} members - saves about ${formatKsh(pool.estimated_saving_ksh)}</small>
      </div>
      <span class="badge">${escapeHTML(pool.status)}</span>
    </div>
  `).join("");
}

async function calculateTariff() {
  const usage = Number($("#monthlyUsage").value || 0);
  const increase = Number($("#tariffIncrease").value || 0) / 100;
  const currentTariff = 31.75;

  if (state.token) {
    try {
      const result = await api("/features/analysis/tariff", {
        method: "POST",
        body: JSON.stringify({
          monthly_usage_kwh: usage,
          current_tariff_ksh_kwh: currentTariff,
          new_tariff_ksh_kwh: currentTariff * (1 + increase)
        })
      });
      $("#tariffResult").textContent = `Projected change: ${formatKsh(result.difference_ksh)}. ${result.recommendation}`;
      return;
    } catch (error) {
      showToast(error.message);
    }
  }

  $("#tariffResult").textContent = `Projected change: +${formatKsh(usage * currentTariff * increase)} next month`;
}

async function buyToken() {
  if (!requireSession()) return;

  const channel = $("#paymentChannel").value;
  const payload = {
    amount_ksh: Number($("#buyAmount").value || 0),
    payment_channel: channel,
    phone: $("#paymentPhone").value.trim()
  };

  try {
    const token = await api("/tokens/buy", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    $("#latestToken").textContent = token.token_number;
    state.tokens = [token, ...state.tokens.filter((item) => item.id !== token.id)];
    renderTokens();
    showToast("Token bought and saved to backend history.");
  } catch (error) {
    showToast(error.message);
  }
}

async function makeTransferCode() {
  if (!requireSession()) return;

  const fromMeter = state.meters[0]?.meter_number || "";
  const payload = {
    from_meter_number: fromMeter,
    to_meter_number: $("#recipientMeter").value.trim(),
    amount_ksh: Number($("#transferAmount").value || 0),
    channel: "offline_code"
  };

  try {
    const transfer = await api("/features/tokens/transfer", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    $("#transferCode").textContent = transfer.encrypted_code;
    showToast("Emergency transfer code generated by backend.");
  } catch (error) {
    showToast(error.message);
  }
}

function addAppliance() {
  const names = ["Laptop", "Kettle", "Security light", "Freezer"];
  const watts = [65, 1800, 30, 220];
  const index = appliances.length % names.length;
  appliances.push({ name: names[index], watts: watts[index], hours_per_day: index + 1 });
  renderAppliances();
  showToast("Appliance added to estimator.");
}

async function loadBackendData() {
  if (!state.token) {
    renderAll();
    return;
  }

  try {
    const [meters, tokens, outages, predictions, pools] = await Promise.all([
      api(`/features/meters?role=${state.currentRole}`),
      api("/tokens"),
      api("/features/outages"),
      api("/features/predictions/usage"),
      api("/features/community-pools")
    ]);

    state.meters = meters.map(normaliseManagedMeter);
    state.tokens = tokens;
    state.outages = outages;
    state.predictions = predictions;
    state.pools = pools;
    renderAll();
    showToast("Backend data synced.");
  } catch (error) {
    showToast(error.message);
    renderAll();
  }
}

function renderAll() {
  renderAuth();
  renderMeters();
  renderDistribution();
  renderAppliances();
  renderOutages($("#outageFilter").value);
  renderMap();
  renderTokens();
  renderPredictions();
  renderCommunity();
  calculateTariff();
}

function bindEvents() {
  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const auth = await api("/auth/login", {
        method: "POST",
        auth: false,
        body: JSON.stringify({
          email: $("#loginEmail").value.trim(),
          password: $("#loginPassword").value
        })
      });
      setSession(auth);
      await loadBackendData();
      showToast("Logged in and linked to backend.");
    } catch (error) {
      showToast(error.message);
    }
  });

  $("#registerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const auth = await api("/auth/register", {
        method: "POST",
        auth: false,
        body: JSON.stringify({
          name: $("#registerName").value.trim(),
          email: $("#registerEmail").value.trim(),
          phone: $("#registerPhone").value.trim(),
          password: $("#registerPassword").value,
          meter_account: $("#registerMeter").value.trim()
        })
      });
      setSession(auth);
      await loadBackendData();
      showToast("Registered and linked to backend.");
    } catch (error) {
      showToast(error.message);
    }
  });

  $("#logoutBtn").addEventListener("click", clearSession);

  document.querySelectorAll("[data-role]").forEach((button) => {
    button.addEventListener("click", async () => {
      document.querySelectorAll("[data-role]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.currentRole = button.dataset.role;
      await loadBackendData();
    });
  });

  $("#splitTokenBtn").addEventListener("click", async () => {
    await renderDistribution();
    showToast(state.token ? "Bulk split calculated by backend." : "Demo split calculated locally.");
  });
  $("#buyBulkBtn").addEventListener("click", () => $("#tokens").scrollIntoView({ behavior: "smooth" }));
  $("#buyTokenBtn").addEventListener("click", buyToken);
  $("#makeTransferBtn").addEventListener("click", makeTransferCode);
  $("#saveAutomationBtn").addEventListener("click", async () => {
    if (!requireSession()) return;
    try {
      await api("/features/automation/rules", {
        method: "POST",
        body: JSON.stringify({
          meter_number: state.meters[0]?.meter_number || "",
          enabled: $("#autoTopup").checked,
          threshold_units: Number($("#thresholdUnits").value || 10),
          amount_ksh: Number($("#autoAmount").value || 500),
          schedule: $("#fixedSchedule").value,
          payment_channel: "mpesa"
        })
      });
      showToast("Auto-purchase rule saved to backend.");
    } catch (error) {
      showToast(error.message);
    }
  });
  $("#reportOutageBtn").addEventListener("click", async () => {
    if (!requireSession()) return;
    try {
      const outage = await api("/features/outages", {
        method: "POST",
        body: JSON.stringify({ area: "Nairobi West", county: "Nairobi", type: "unscheduled", has_power: false })
      });
      state.outages = [outage, ...state.outages];
      renderOutages($("#outageFilter").value);
      showToast("Outage report saved to backend.");
    } catch (error) {
      showToast(error.message);
    }
  });
  $("#outageFilter").addEventListener("change", (event) => renderOutages(event.target.value));
  $("#addApplianceBtn").addEventListener("click", addAppliance);
  $("#calculateTariffBtn").addEventListener("click", calculateTariff);
  $("#exportTokensBtn").addEventListener("click", async () => {
    if (!requireSession()) return;
    try {
      await api("/features/tokens/backup");
      showToast("Token backup fetched from backend.");
    } catch (error) {
      showToast(error.message);
    }
  });
  $("#joinGroupBtn").addEventListener("click", async () => {
    if (!requireSession()) return;
    try {
      const pool = await api("/features/community-pools/join", {
        method: "POST",
        body: JSON.stringify({ pool_id: state.pools[0]?.id || "pool-001", amount_ksh: 400 })
      });
      state.pools = [pool];
      renderCommunity();
      showToast("Community pool joined through backend.");
    } catch (error) {
      showToast(error.message);
    }
  });
  $("#syncNow").addEventListener("click", loadBackendData);
  $("#bulkAmount").addEventListener("input", renderDistribution);
  $("#splitMode").addEventListener("change", renderDistribution);
}

function init() {
  renderAuth();
  bindEvents();
  loadBackendData();
}

init();
