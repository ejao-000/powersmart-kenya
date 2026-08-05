// js/auth.js

function switchView(viewType) {
  const registerContainer = document.getElementById('registerContainer');
  const loginContainer = document.getElementById('loginContainer');
  const adminContainer = document.getElementById('adminContainer');
  const authMessage = document.getElementById('authMessage');
  
  if (authMessage) authMessage.innerText = '';

  if (registerContainer) registerContainer.classList.add('hidden-view');
  if (loginContainer) loginContainer.classList.add('hidden-view');
  if (adminContainer) adminContainer.classList.add('hidden-view');

  if (viewType === 'login') {
    loginContainer.classList.remove('hidden-view');
  } else if (viewType === 'admin') {
    adminContainer.classList.remove('hidden-view');
  } else {
    registerContainer.classList.remove('hidden-view');
  }
}

function handleRoleChange() {
  const roleSelect = document.getElementById('accountRole');
  const registerSubmitBtn = document.getElementById('registerSubmitBtn');
  const dynamicFieldsContainer = document.getElementById('signupDynamicFields');

  if (!roleSelect || !dynamicFieldsContainer) return;

  if (roleSelect.value === 'tenant') {
    if (registerSubmitBtn) registerSubmitBtn.innerText = "Create Account";
    dynamicFieldsContainer.innerHTML = `
      <div>
        <label class="block text-xs font-mono text-slate-500 mb-1 uppercase" for="meterNumber">Smart Meter Number</label>
        <input type="text" id="meterNumber" placeholder="KPLC-TR-948201" required class="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 px-4 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500">
      </div>
      <div>
        <label class="block text-xs font-mono text-slate-500 mb-1 uppercase" for="houseDetails">House / Apartment Number</label>
        <input type="text" id="houseDetails" placeholder="Block B, Apt 402" required class="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 px-4 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500">
      </div>
    `;
  } else {
    if (registerSubmitBtn) registerSubmitBtn.innerText = "Create Account";
    dynamicFieldsContainer.innerHTML = `
      <div>
        <label class="block text-xs font-mono text-slate-500 mb-1 uppercase" for="propertyName">Property Name / Building</label>
        <input type="text" id="propertyName" placeholder="Sunrise Heights Estate" required class="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 px-4 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500">
      </div>
      <div>
        <label class="block text-xs font-mono text-slate-500 mb-1 uppercase" for="totalUnits">Total Managed Units</label>
        <input type="number" id="totalUnits" placeholder="24" required class="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 px-4 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500">
      </div>
    `;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  handleRoleChange();
});

function handleRegister(e) {
  e.preventDefault();
  alert('Account registered successfully! Redirecting to login...');
  switchView('login');
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  // Store mock session token
  localStorage.setItem('powersmart_user', email);
  alert('Tenant/Landlord login successful! Redirecting to dashboard...');
  window.location.href = 'tenant-dashboard.html';
}

function handleAdminLogin(e) {
  e.preventDefault();
  localStorage.setItem('powersmart_admin', 'active');
  alert('Master Key Verified. Accessing Admin Telemetry...');
  window.location.href = 'admin-dashboard.html';
}
