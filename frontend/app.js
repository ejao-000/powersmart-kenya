// app.js

const API_BASE = "/api";

const $ = (selector) => document.querySelector(selector);

const state = {
  currentPage: "overview",

  meters: [
    {
      label: "Main House",
      meter_number: "37101122093",
      occupant_name: "Owner",
      role: "owner",
      units_remaining: 34.8,
      daily_avg_units: 5.6,
      threshold: 10
    },
    {
      label: "Unit A",
      meter_number: "37101122094",
      occupant_name: "Tenant",
      role: "tenant",
      units_remaining: 8.2,
      daily_avg_units: 3.1,
      threshold: 10
    },
    {
      label: "Unit B",
      meter_number: "37101122095",
      occupant_name: "Tenant",
      role: "tenant",
      units_remaining: 3.7,
      daily_avg_units: 2.5,
      threshold: 7
    }
  ],

  tokenHistory: [
    {
      amount: 1000,
      token: "5821 9044 3178 6632",
      status: "Success"
    }
  ],

  communityPool: {
    target: 10000,
    collected: 7400,
    members: 10
  }
};

/* =====================================
   TOAST
===================================== */

function showToast(message) {
  const toast = $("#toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

/* =====================================
   OVERVIEW
===================================== */

function renderOverview() {
  const totalUnits = state.meters.reduce(
    (sum, meter) => sum + meter.units_remaining,
    0
  );

  const totalDaily = state.meters.reduce(
    (sum, meter) => sum + meter.daily_avg_units,
    0
  );

  const riskMeters = state.meters.filter(
    (meter) => meter.units_remaining <= meter.threshold
  ).length;

  const savings = totalUnits * 18;

  $("#totalUnits").textContent =
    totalUnits.toFixed(1) + " kWh";

  $("#runway").textContent =
    (totalUnits / totalDaily).toFixed(1) + " days";

  $("#riskMeters").textContent =
    riskMeters + " meter(s)";

  $("#goalProgress").textContent =
    "KSh " + savings.toLocaleString();
}

/* =====================================
   METERS
===================================== */

function renderMeters() {
  const container = $("#meterGrid");

  if (!container) return;

  container.innerHTML = state.meters
    .map((meter) => {
      const days =
        meter.units_remaining /
        meter.daily_avg_units;

      return `
      <article class="meter-card">
        <div class="meter-header">
          <div>
            <strong>${meter.label}</strong>
            <span>${meter.meter_number}</span>
          </div>

          <span class="badge">
            ${meter.role}
          </span>
        </div>

        <div class="unit-line">
          <strong>
            ${meter.units_remaining.toFixed(1)} kWh
          </strong>

          <span>
            ${days.toFixed(1)} days
          </span>
        </div>

        <progress
          value="${meter.units_remaining}"
          max="40">
        </progress>

        <div class="meter-meta">
          Avg ${meter.daily_avg_units} kWh/day
        </div>
      </article>
    `;
    })
    .join("");
}

/* =====================================
   TOKEN PURCHASE
===================================== */

function generateToken() {
  let token = "";

  for (let i = 0; i < 20; i++) {
    token += Math.floor(Math.random() * 10);
  }

  return token.match(/.{1,4}/g).join(" ");
}

function buyToken() {
  const amount = Number(
    $("#buyAmount")?.value || 0
  );

  if (amount <= 0) {
    showToast("Enter valid amount");
    return;
  }

  const token = generateToken();

  $("#latestToken").textContent = token;

  state.tokenHistory.unshift({
    amount,
    token,
    status: "Success"
  });

  renderTokenHistory();

  showToast("Token purchased successfully");
}

/* =====================================
   TOKEN HISTORY
===================================== */

function renderTokenHistory() {
  const container = $("#tokenHistory");

  if (!container) return;

  container.innerHTML = state.tokenHistory
    .map(
      (item) => `
      <div class="list-row">
        <div>
          <strong>KSh ${item.amount}</strong>
          <small>${item.token}</small>
        </div>

        <span class="badge">
          ${item.status}
        </span>
      </div>
    `
    )
    .join("");
}

/* =====================================
   COMMUNITY
===================================== */

function renderCommunity() {
  const pool = state.communityPool;

  const amount = $("#poolAmount");
  const progress =
    document.querySelector(
      ".pool-meter progress"
    );

  if (amount)
    amount.textContent =
      "KSh " +
      pool.collected.toLocaleString();

  if (progress) {
    progress.value = pool.collected;
    progress.max = pool.target;
  }

  const container =
    $("#communityList");

  if (!container) return;

  container.innerHTML = `
    <div class="list-row">
      <div>
        <strong>Community Pool</strong>
        <small>
          ${pool.members} members
        </small>
      </div>

      <span class="badge">
        Active
      </span>
    </div>
  `;
}

/* =====================================
   TARIFF
===================================== */

function calculateTariff() {
  const usage =
    Number($("#monthlyUsage")?.value) || 0;

  const increase =
    Number($("#tariffIncrease")?.value) || 0;

  const currentTariff = 31.75;

  const extra =
    usage *
    currentTariff *
    (increase / 100);

  $("#tariffResult").textContent =
    "Projected change: +KSh " +
    Math.round(extra).toLocaleString();
}

/* =====================================
   SIDEBAR NAVIGATION
===================================== */

function initSidebarNavigation() {
  const links =
    document.querySelectorAll(
      ".nav-list a"
    );

  links.forEach((link) => {
    link.addEventListener("click", () => {
      links.forEach((item) =>
        item.classList.remove("active")
      );

      link.classList.add("active");
    });
  });
}

/* =====================================
   LOGOUT
===================================== */

function setupLogout() {
  const logoutBtn =
    $("#logoutBtn");

  if (!logoutBtn) return;

  logoutBtn.addEventListener(
    "click",
    () => {
      localStorage.removeItem(
        "powersmart_token"
      );

      localStorage.removeItem(
        "powersmart_user"
      );

      window.location.href =
        "index.html";
    }
  );
}

/* =====================================
   API INTEGRATION HOOKS
===================================== */

async function fetchMeters() {
  try {
    const response = await fetch(
      `${API_BASE}/meters`
    );

    if (!response.ok) return;

    const data =
      await response.json();

    state.meters = data;

    renderOverview();
    renderMeters();
  } catch (error) {
    console.log(error);
  }
}

async function fetchCommunityPool() {
  try {
    const response = await fetch(
      `${API_BASE}/community`
    );

    if (!response.ok) return;

    const data =
      await response.json();

    state.communityPool = data;

    renderCommunity();
  } catch (error) {
    console.log(error);
  }
}

/* =====================================
   EVENTS
===================================== */

function bindEvents() {
  $("#buyTokenBtn")?.addEventListener(
    "click",
    buyToken
  );

  $("#calculateTariffBtn")?.addEventListener(
    "click",
    calculateTariff
  );

  $("#joinGroupBtn")?.addEventListener(
    "click",
    () => {
      state.communityPool.collected += 400;

      renderCommunity();

      showToast(
        "Joined community purchase pool"
      );
    }
  );
}

/* =====================================
   INIT
===================================== */

function init() {
  renderOverview();
  renderMeters();
  renderTokenHistory();
  renderCommunity();

  bindEvents();

  setupLogout();

  initSidebarNavigation();
}

document.addEventListener(
  "DOMContentLoaded",
  init
);
