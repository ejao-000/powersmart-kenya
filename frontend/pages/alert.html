<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Alerts — PowerSmart</title>
  <link rel="stylesheet" href="../css/main.css"/>
  <link rel="stylesheet" href="../css/dashboard.css"/>
  <link rel="stylesheet" href="../css/alerts.css"/>
</head>
<body>
  <nav class="sidebar">
    <div class="brand"><span class="brand-icon">⚡</span><span>PowerSmart</span></div>
    <a href="../dashboard.html" class="nav-item">◎ Dashboard</a>
    <a href="tokens.html"    class="nav-item">⊕ Buy Tokens</a>
    <a href="history.html"   class="nav-item">☰ Token History</a>
    <a href="alerts.html"    class="nav-item active">⚑ Alerts</a>
    <a href="settings.html"  class="nav-item">⚙ Settings</a>
    <div class="nav-spacer"></div>
    <button id="btn-logout" class="nav-item nav-logout">Sign Out</button>
  </nav>

  <main class="content">
    <header class="page-header">
      <div>
        <h1>Alerts</h1>
        <p class="subtitle">Get notified before your power runs out.</p>
      </div>
      <button id="btn-request-notif" class="btn btn-outline">Enable Notifications</button>
    </header>

    <!-- Add new alert -------------------------------------------------- -->
    <section class="card">
      <h2>Add Alert Rule</h2>
      <form id="form-add-alert" class="alert-form">
        <div class="form-row">
          <label>Alert type
            <select id="sel-type" required>
              <option value="low_units">Units remaining (kWh)</option>
              <option value="days_left">Days remaining</option>
            </select>
          </label>
          <label>Notify when below
            <div class="input-suffix">
              <input type="number" id="inp-threshold" min="0.1" step="0.1" required placeholder="e.g. 10"/>
              <span id="threshold-unit">kWh</span>
            </div>
          </label>
          <label>Channel
            <select id="sel-channel">
              <option value="push">Browser notification</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </label>
        </div>
        <button type="submit" class="btn btn-primary">Save Alert</button>
      </form>
    </section>

    <!-- Existing alerts ------------------------------------------------- -->
    <section class="card">
      <h2>Your Alert Rules</h2>
      <div id="alerts-list" class="alerts-list">
        <p class="empty-state">Loading…</p>
      </div>
    </section>
  </main>

  <script type="module">
    import { alerts as alertsApi } from '../js/api.js';
    import { requestNotificationPermission, invalidateAlertsCache } from '../js/predictor.js';
    import { isLoggedIn } from '../js/store.js';

    if (!isLoggedIn()) location.href = '../index.html';

    const alertsList = document.getElementById('alerts-list');
    const thresholdUnit = document.getElementById('threshold-unit');

    document.getElementById('sel-type').addEventListener('change', e => {
      thresholdUnit.textContent = e.target.value === 'low_units' ? 'kWh' : 'days';
    });

    document.getElementById('btn-request-notif').addEventListener('click', async () => {
      const granted = await requestNotificationPermission();
      alert(granted ? 'Notifications enabled!' : 'Permission denied. Check browser settings.');
    });

    async function renderAlerts() {
      const data = await alertsApi.list().catch(() => []);
      if (!data.length) {
        alertsList.innerHTML = '<p class="empty-state">No alert rules yet.</p>';
        return;
      }
      alertsList.innerHTML = data.map(a => `
        <div class="alert-row">
          <div class="alert-info">
            <strong>${a.type === 'low_units' ? 'Units' : 'Days'} below ${a.threshold}${a.type === 'low_units' ? ' kWh' : ' days'}</strong>
            <span class="alert-channel">via ${a.channel}</span>
          </div>
          <div class="alert-actions">
            <label class="toggle" title="${a.enabled ? 'Enabled' : 'Disabled'}">
              <input type="checkbox" ${a.enabled ? 'checked' : ''} data-id="${a.id}" class="chk-enable"/>
              <span class="toggle-slider"></span>
            </label>
            <button class="icon-btn btn-delete-alert" data-id="${a.id}" title="Delete">🗑</button>
          </div>
        </div>
      `).join('');

      alertsList.querySelectorAll('.chk-enable').forEach(chk => {
        chk.addEventListener('change', e => {
          alertsApi.update(e.target.dataset.id, { enabled: e.target.checked });
          invalidateAlertsCache();
        });
      });
      alertsList.querySelectorAll('.btn-delete-alert').forEach(btn => {
        btn.addEventListener('click', async e => {
          await alertsApi.delete(e.currentTarget.dataset.id);
          invalidateAlertsCache();
          renderAlerts();
        });
      });
    }

    document.getElementById('form-add-alert').addEventListener('submit', async e => {
      e.preventDefault();
      await alertsApi.create({
        type:      document.getElementById('sel-type').value,
        threshold: parseFloat(document.getElementById('inp-threshold').value),
        channel:   document.getElementById('sel-channel').value,
      });
      invalidateAlertsCache();
      e.target.reset();
      renderAlerts();
    });

    renderAlerts();
  </script>
</body>
</html>
