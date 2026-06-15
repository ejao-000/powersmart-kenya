// auth.js

const API_BASE = "/api";

const TOKEN_KEY = "powersmart_token";
const USER_KEY = "powersmart_user";

/* =====================================================
   HELPERS
===================================================== */

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

/* =====================================================
   AUTH TAB SWITCHING
===================================================== */

function initializeTabs() {

    const loginTab = $("#loginTab");
    const registerTab = $("#registerTab");

    const loginForm = $("#loginForm");
    const registerForm = $("#registerForm");

    if (
        !loginTab ||
        !registerTab ||
        !loginForm ||
        !registerForm
    ) {
        return;
    }

    loginTab.addEventListener("click", () => {

        loginTab.classList.add("active");
        registerTab.classList.remove("active");

        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
    });

    registerTab.addEventListener("click", () => {

        registerTab.classList.add("active");
        loginTab.classList.remove("active");

        registerForm.classList.remove("hidden");
        loginForm.classList.add("hidden");
    });
}

/* =====================================================
   PAGE PROTECTION
===================================================== */

function protectPages() {

    const page =
        window.location.pathname.split("/").pop();

    const token =
        localStorage.getItem(TOKEN_KEY);

    // User already logged in
    if (
        (page === "index.html" || page === "") &&
        token
    ) {
        window.location.href = "dashboard.html";
        return;
    }

    // User not logged in
    if (
        page === "dashboard.html" &&
        !token
    ) {
        window.location.href = "index.html";
    }
}

/* =====================================================
   LOGIN
===================================================== */

function initializeLogin() {

    const loginForm = $("#loginForm");

    if (!loginForm) return;

    loginForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();

            const email =
                $("#loginEmail").value.trim();

            const password =
                $("#loginPassword").value;

            try {

                /*
                Backend Version

                const result = await api(
                    "/auth/login",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            email,
                            password
                        })
                    }
                );
                */

                // DEMO LOGIN

                const result = {
                    token: "powersmart-demo-token",
                    user: {
                        id: 1,
                        name: "PowerSmart User",
                        email
                    }
                };

                saveSession(
                    result.token,
                    result.user
                );

                showMessage(
                    "Login successful"
                );

                setTimeout(() => {
                    window.location.href =
                        "dashboard.html";
                }, 1000);

            } catch (error) {

                showMessage(
                    error.message,
                    "error"
                );
            }
        }
    );
}

/* =====================================================
   REGISTER
===================================================== */

function initializeRegister() {

    const registerForm =
        $("#registerForm");

    if (!registerForm) return;

    registerForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();

            const name =
                $("#registerName").value.trim();

            const email =
                $("#registerEmail").value.trim();

            const phone =
                $("#registerPhone").value.trim();

            const meter =
                $("#registerMeter").value.trim();

            const password =
                $("#registerPassword").value;

            try {

                /*
                Backend Version

                await api(
                    "/auth/register",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            name,
                            email,
                            phone,
                            meter_account: meter,
                            password
                        })
                    }
                );
                */

                showMessage(
                    "Account created successfully. Please login."
                );

                registerForm.reset();

                // Switch back to login tab

                $("#loginTab").click();

            } catch (error) {

                showMessage(
                    error.message,
                    "error"
                );
            }
        }
    );
}

/* =====================================================
   LOGOUT
===================================================== */

function logoutUser() {

    clearSession();

    window.location.href =
        "index.html";
}

window.logoutUser = logoutUser;

/* =====================================================
   LOAD USER PROFILE
===================================================== */

function loadUserProfile() {

    const user =
        JSON.parse(
            localStorage.getItem(USER_KEY) ||
            "null"
        );

    if (!user) return;

    const userName =
        $("#userName");

    const userEmail =
        $("#userEmail");

    if (userName) {
        userName.textContent =
            user.name || "User";
    }

    if (userEmail) {
        userEmail.textContent =
            user.email || "";
    }
}

/* =====================================================
   INIT
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        protectPages();

        initializeTabs();

        initializeLogin();

        initializeRegister();

        loadUserProfile();
    }
);
