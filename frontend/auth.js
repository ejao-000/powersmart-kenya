// auth.js

const API_BASE = "/api";
const TOKEN_KEY = "powersmart_token";
const USER_KEY = "powersmart_user";
const ROLE_KEY = "powersmart_role";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function showMessage(message, type = "success") {
    const msg = $("#authMessage");
    if (!msg) return;
    msg.textContent = message;
    msg.className = `auth-message show ${type}`;
    setTimeout(() => {
        msg.textContent = "";
        msg.className = "auth-message";
    }, 4000);
}

function saveSession(token, user, role) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(ROLE_KEY, role);
}

function getSession() {
    return {
        token: localStorage.getItem(TOKEN_KEY),
        user: JSON.parse(localStorage.getItem(USER_KEY) || "null"),
        role: localStorage.getItem(ROLE_KEY) || "tenant"
    };
}

function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
}

/* =====================================================
   UI & TAB INITIALIZATION
===================================================== */

let currentAuthRole = "tenant"; // 'tenant' | 'landlord' | 'admin'

document.addEventListener("DOMContentLoaded", () => {
    protectPages();
    initializeCoreTabs();
    initializeSignupRoleSelector();
    initializeLogin();
    initializeRegister();
    loadUserProfile();
});

function initializeCoreTabs() {
    const loginTab = $("#loginTab");
    const registerTab = $("#registerTab");
    const loginForm = $("#loginForm");
    const registerForm = $("#registerForm");
    const adminSecretTrigger = $("#adminSecretTrigger");

    if (!loginTab || !registerTab) return;

    loginTab.addEventListener("click", () => {
        loginTab.classList.add("active");
        registerTab.classList.remove("active");
        loginForm.classList.remove("hidden");
        registerForm.classList.add("hidden");
        currentAuthRole = "tenant"; // reset back standard
        updateBrandHeader();
    });

    registerTab.addEventListener("click", () => {
        registerTab.classList.add("active");
        loginTab.classList.remove("active");
        registerForm.classList.remove("hidden");
        loginForm.classList.add("hidden");
        updateSignupFields();
    });

    // Direct Admin Trigger via Footer Link
    if (adminSecretTrigger) {
        adminSecretTrigger.addEventListener("click", (e) => {
            e.preventDefault();
            currentAuthRole = "admin";
            loginTab.classList.add("active");
            registerTab.classList.remove("active");
            loginForm.classList.remove("hidden");
            registerForm.classList.add("hidden");
            
            $("#loginTitle").textContent = "Super-Admin Direct Portal";
            $("#loginSubmitBtn").textContent = "Authenticate Admin Console";
            showMessage("Admin security checkpoint active.", "info");
        });
    }
}

// Switch fields dynamically inside the Signup form when clicking Tenant vs Landlord
function initializeSignupRoleSelector() {
    const signupRoleBtns = $$(".signup-role-btn");
    
    signupRoleBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            signupRoleBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentAuthRole = btn.getAttribute("data-signup-role");
            updateSignupFields();
        });
    });

    updateSignupFields();
}

function updateSignupFields() {
    const dynamicContainer = $("#signupDynamicFields");
    const submitBtn = $("#registerSubmitBtn");
    const brandSubtitle = $("#brandSubtitle");

    if (!dynamicContainer) return;

    if (currentAuthRole === "tenant") {
        if (brandSubtitle) brandSubtitle.textContent = "Tenant & Consumer Smart Utility Portal";
        submitBtn.textContent = "Create  Account";
        dynamicContainer.innerHTML = `
            <label for="registerMeter">KPLC Smart Meter Account (11 Digits)</label>
            <input type="text" id="registerMeter" placeholder="37101122093" required>
        `;
    } else if (currentAuthRole === "landlord") {
        if (brandSubtitle) brandSubtitle.textContent = "Landlord Multi-Property Fleet Portal";
        submitBtn.textContent = "Create Landlord Account";
        dynamicContainer.innerHTML = `
            <label for="registerProperty">Property / Building Name</label>
            <input type="text" id="registerProperty" placeholder="Sunrise Apartments" required>
            <label for="registerUnits">Total Managed Units</label>
            <input type="number" id="registerUnits" placeholder="e.g., 12" min="1" required>
        `;
    }
}

function updateBrandHeader() {
    const brandSubtitle = $("#brandSubtitle");
    if (brandSubtitle) brandSubtitle.textContent = "Smart Electricity Management System";
    $("#loginTitle").textContent = "Welcome Back";
    $("#loginSubmitBtn").textContent = "Sign In";
}

/* =====================================================
   ROUTING & PROTECTION
===================================================== */

function protectPages() {
    const path = window.location.pathname;
    const page = path.split("/").pop();
    const { token, role } = getSession();

    if ((page === "index.html" || page === "") && token) {
        redirectToDashboard(role);
        return;
    }

    if (page.includes("dashboard") && !token) {
        window.location.href = "index.html";
    }
}

function redirectToDashboard(role) {
    if (role === "landlord") {
        window.location.href = "dashboard-landlord.html";
    } else if (role === "admin") {
        window.location.href = "dashboard-admin.html";
    } else {
        window.location.href = "dashboard-tenant.html";
    }
}

/* =====================================================
   FORM SUBMISSIONS (LOGIN & REGISTER)
===================================================== */

function initializeLogin() {
    const loginForm = $("#loginForm");
    if (!loginForm) return;

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = $("#loginEmail").value.trim();
        const password = $("#loginPassword").value;

        // If user accessed via admin secret trigger, assign admin role session
        const assignedRole = currentAuthRole === "admin" ? "admin" : "tenant";

        try {
            // Demo Session Mock
            const result = {
                token: `powersmart-${assignedRole}-token`,
                user: { id: 101, name: assignedRole === 'admin' ? 'Super Administrator' : 'Utility User', email }
            };

            saveSession(result.token, result.user, assignedRole);
            showMessage(`Login successful! Loading ${assignedRole} interface...`);

            setTimeout(() => {
                redirectToDashboard(assignedRole);
            }, 1000);
        } catch (error) {
            showMessage(error.message, "error");
        }
    });
}

function initializeRegister() {
    const registerForm = $("#registerForm");
    if (!registerForm) return;

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = $("#registerName").value.trim();

        try {
            showMessage(`${currentAuthRole.toUpperCase()} account created successfully! Please sign in.`);
            registerForm.reset();
            $("#loginTab").click(); // Switch back to login
        } catch (error) {
            showMessage(error.message, "error");
        }
    });
}

function logoutUser() {
    clearSession();
    window.location.href = "index.html";
}
window.logoutUser = logoutUser;

function loadUserProfile() {
    const { user, role } = getSession();
    if (!user) return;
    if ($("#userName")) $("#userName").textContent = user.name;
    if ($("#userEmail")) $("#userEmail").textContent = user.email;
    if ($("#userRoleBadge")) $("#userRoleBadge").textContent = role.toUpperCase();
}
