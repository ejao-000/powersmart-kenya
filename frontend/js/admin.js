// js/admin.js

document.addEventListener('DOMContentLoaded', () => {
  const adminSession = localStorage.getItem('powersmart_admin');
  if (!adminSession) {
    alert('Unauthorized access attempt detected. Redirecting...');
    window.location.href = 'index.html';
  } else {
    console.log("Master system privileges validated.");
  }
});
