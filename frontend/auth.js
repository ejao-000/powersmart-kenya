// auth.js

const API_BASE = "/api";

const TOKEN_KEY = "powersmart_token";
const USER_KEY = "powersmart_user";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const $ = (selector) => document.querySelector(selector);

function showMessage(message, type = "success") {
    const msg = $("#authMessage");

    if (!msg) return;

    msg.textContent = message;
    msg.className = `auth-message ${type}`;

    setTimeout(() => {
        msg.textContent = "";
        msg.className = "auth-message";
    }, 4000);
}

function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getSession() {
    return {
        token: localStorage.getItem(TOKEN_KEY),
        user: JSON.parse(localStorage.getItem(USER_KEY) || "null")
    };
}

function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

async function api(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: {
            "Content-Type": "application/json"
        },
        ...options
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Request failed");
    }

    return data;
}

/*
|--------------------------------------------------------------------------
| Redirect Logged-in Users
|--------------------------------------------------------------------------
*/

(function () {
    const currentPage = window.location.pathname;

    if (
        localStorage.getItem(TOKEN_KEY) &&
        currentPage.includes("index.html")
    ) {
        window.location.href = "dashboard.html";
    }
})();

/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/

const loginForm = $("#loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = $("#loginEmail").value.trim();
        const password = $("#loginPassword").value;

        try {
            /*
             * Backend version
             *
             * const result = await api("/auth/login", {
             *   method: "POST",
             *   body: JSON.stringify({ email, password })
             * });
             */

            const result = {
                token: "powersmart-demo-token",
                user: {
                    id: 1,
                    name: "Emma Akinyi",
                    email
                }
            };

            saveSession(result.token, result.user);

            showMessage("Login successful");

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1000);

        } catch (error) {
            showMessage(error.message, "error");
        }
    });
}

/*
|--------------------------------------------------------------------------
| Register
|--------------------------------------------------------------------------
*/

const registerForm = $("#registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = $("#registerName").value.trim();
        const email = $("#registerEmail").value.trim();
        const phone = $("#registerPhone").value.trim();
        const meter = $("#registerMeter").value.trim();
        const password = $("#registerPassword").value;

        try {
            /*
             * Backend version
             *
             * const result = await api("/auth/register", {
             *   method: "POST",
             *   body: JSON.stringify({
             *      name,
             *      email,
             *      phone,
             *      meter_account: meter,
             *      password
             *   })
             * });
             */

            const result = {
                token: "powersmart-demo-token",
                user: {
                    id: 1,
                    name,
                    email,
                    phone,
                    meter
                }
            };

            saveSession(result.token, result.user);

            showMessage("Account created successfully");

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1000);

        } catch (error) {
            showMessage(error.message, "error");
        }
    });
}

/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/

window.logoutUser = function () {
    clearSession();
    window.location.href = "index.html";
};

/*
|--------------------------------------------------------------------------
| Protect Dashboard
|--------------------------------------------------------------------------
*/

(function () {
    const currentPage = window.location.pathname;

    if (
        currentPage.includes("dashboard.html") &&
        !localStorage.getItem(TOKEN_KEY)
    ) {
        window.location.href = "index.html";
    }
})();

/*
|--------------------------------------------------------------------------
| Load User Info
|--------------------------------------------------------------------------
*/

window.loadUserProfile = function () {
    const user = JSON.parse(
        localStorage.getItem(USER_KEY) || "null"
    );

    if (!user) return;

    const userName = $("#userName");
    const userEmail = $("#userEmail");

    if (userName) {
        userName.textContent = user.name || "User";
    }

    if (userEmail) {
        userEmail.textContent = user.email || "";
    }
};

/*
|--------------------------------------------------------------------------
| Initialize
|--------------------------------------------------------------------------
*/

document.addEventListener("DOMContentLoaded", () => {
    loadUserProfile();
});
