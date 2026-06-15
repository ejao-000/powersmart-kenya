// ======================================================
// app.js
// PowerSmart Kenya Dashboard
// ======================================================

const TOKEN_KEY = "powersmart_token";
const USER_KEY = "powersmart_user";

const $ = (selector) => document.querySelector(selector);

// ======================================================
// APP STATE
// ======================================================

const state = {

    meters: [
        {
            label: "Main House",
            meter_number: "37101122093",
            role: "Owner",
            units_remaining: 34.8,
            daily_avg_units: 5.6,
            threshold: 10
        },
        {
            label: "Unit A",
            meter_number: "37101122094",
            role: "Tenant",
            units_remaining: 8.2,
            daily_avg_units: 3.1,
            threshold: 10
        },
        {
            label: "Unit B",
            meter_number: "37101122095",
            role: "Tenant",
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

// ======================================================
// AUTH PROTECTION
// ======================================================

function protectDashboard() {

    const token =
        localStorage.getItem(TOKEN_KEY);

    if (!token) {

        window.location.href =
            "index.html";
    }
}

// ======================================================
// LOAD USER
// ======================================================

function loadUserProfile() {

    const user =
        JSON.parse(
            localStorage.getItem(USER_KEY) ||
            "null"
        );

    if (!user) return;

    const userName =
        $("#userName");

    if (userName) {

        userName.textContent =
            user.name || "PowerSmart User";
    }
}

// ======================================================
// TOAST
// ======================================================

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

// ======================================================
// OVERVIEW
// ======================================================

function renderOverview() {

    const totalUnits =
        state.meters.reduce(
            (sum, meter) =>
                sum + meter.units_remaining,
            0
        );

    const totalDaily =
        state.meters.reduce(
            (sum, meter) =>
                sum + meter.daily_avg_units,
            0
        );

    const riskMeters =
        state.meters.filter(
            meter =>
                meter.units_remaining <=
                meter.threshold
        ).length;

    const savings =
        totalUnits * 18;

    $("#totalUnits").textContent =
        totalUnits.toFixed(1) + " kWh";

    $("#runway").textContent =
        (totalUnits / totalDaily).toFixed(1)
        + " Days";

    $("#riskMeters").textContent =
        riskMeters;

    $("#goalProgress").textContent =
        "KSh " +
        savings.toLocaleString();
}

// ======================================================
// METERS
// ======================================================

function renderMeters() {

    const container =
        $("#meterGrid");

    if (!container) return;

    container.innerHTML =
        state.meters.map(meter => {

            const days =
                meter.units_remaining /
                meter.daily_avg_units;

            return `
            <article class="meter-card">

                <div class="meter-header">

                    <div>
                        <strong>${meter.label}</strong>
                        <div>${meter.meter_number}</div>
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

                <small>
                    Avg ${meter.daily_avg_units}
                    kWh/day
                </small>

            </article>
        `;
        }).join("");
}

// ======================================================
// TOKENS
// ======================================================

function generateToken() {

    let token = "";

    for (let i = 0; i < 20; i++) {

        token +=
            Math.floor(
                Math.random() * 10
            );
    }

    return token.match(/.{1,4}/g).join(" ");
}

function buyToken() {

    const amount =
        Number(
            $("#buyAmount")?.value
        );

    if (!amount || amount <= 0) {

        showToast(
            "Enter a valid amount"
        );

        return;
    }

    const token =
        generateToken();

    $("#latestToken").textContent =
        token;

    state.tokenHistory.unshift({
        amount,
        token,
        status: "Success"
    });

    renderTokenHistory();

    showToast(
        "Token purchased successfully"
    );
}

function renderTokenHistory() {

    const container =
        $("#tokenHistory");

    if (!container) return;

    container.innerHTML =
        state.tokenHistory.map(item => `
        <div class="list-row">

            <div>
                <strong>
                    KSh ${item.amount}
                </strong>
                <br>
                <small>
                    ${item.token}
                </small>
            </div>

            <span class="badge">
                ${item.status}
            </span>

        </div>
    `).join("");
}

// ======================================================
// COMMUNITY
// ======================================================

function renderCommunity() {

    const pool =
        state.communityPool;

    $("#poolAmount").textContent =
        "KSh " +
        pool.collected.toLocaleString();

    const progress =
        document.querySelector(
            ".pool-meter progress"
        );

    if (progress) {

        progress.value =
            pool.collected;

        progress.max =
            pool.target;
    }

    $("#communityList").innerHTML = `
        <div class="list-row">

            <div>
                <strong>
                    Community Pool
                </strong>
                <br>
                <small>
                    ${pool.members} Members
                </small>
            </div>

            <span class="badge">
                Active
            </span>

        </div>
    `;
}

// ======================================================
// PAGE NAVIGATION
// ======================================================

function initNavigation() {

    const links =
        document.querySelectorAll(
            ".nav-link"
        );

    const pages =
        document.querySelectorAll(
            ".dashboard-page"
        );

    links.forEach(link => {

        link.addEventListener(
            "click",
            (e) => {

                e.preventDefault();

                links.forEach(item =>
                    item.classList.remove(
                        "active"
                    )
                );

                pages.forEach(page =>
                    page.classList.add(
                        "hidden"
                    )
                );

                link.classList.add(
                    "active"
                );

                const pageId =
                    link.dataset.page;

                document
                    .getElementById(pageId)
                    .classList.remove(
                        "hidden"
                    );
            }
        );
    });
}

// ======================================================
// LOGOUT
// ======================================================

function setupLogout() {

    const logoutBtn =
        $("#logoutBtn");

    if (!logoutBtn) return;

    logoutBtn.addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                TOKEN_KEY
            );

            localStorage.removeItem(
                USER_KEY
            );

            window.location.href =
                "index.html";
        }
    );
}

// ======================================================
// EVENTS
// ======================================================

function bindEvents() {

    $("#buyTokenBtn")
        ?.addEventListener(
            "click",
            buyToken
        );

    $("#syncNow")
        ?.addEventListener(
            "click",
            () => {

                renderOverview();
                renderMeters();
                renderCommunity();

                showToast(
                    "Dashboard synced"
                );
            }
        );
}

// ======================================================
// INIT
// ======================================================

function init() {

    protectDashboard();

    loadUserProfile();

    renderOverview();

    renderMeters();

    renderTokenHistory();

    renderCommunity();

    initNavigation();

    setupLogout();

    bindEvents();
}

document.addEventListener(
    "DOMContentLoaded",
    init
);
