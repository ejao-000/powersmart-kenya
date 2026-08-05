// js/tenant.js

document.addEventListener('DOMContentLoaded', () => {
  console.log("Tenant telemetry module initialized.");
  // Add live polling functions or M-Pesa trigger logic here
});

function triggerMpesaTopUp(amount, phone) {
  console.log(`Initiating M-Pesa STK push for KSh ${amount} to ${phone}`);
  alert(`STK Push sent to ${phone}. Please enter your PIN to complete the token purchase.`);
}
