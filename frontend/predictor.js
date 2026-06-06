// predictor.js — client-side prediction engine.
// Mirrors the server-side logic so the dashboard can show live estimates
// without a round-trip on every render.

import { meter as meterApi, alerts as alertsApi } from './api.js';

let predictionCache = null;
let alertsCache = null;

/**
 * Fetches the server prediction and caches it.
 */
export async function fetchPrediction() {
  predictionCache = await meterApi.getPrediction();
  return predictionCache;
}

/**
 * Returns the cached prediction or fetches fresh data.
 */
export function getCachedPrediction() {
  return predictionCache;
}

/**
 * Computes a lightweight local estimate from known units + daily avg.
 * Use this for instant UI updates before the server responds.
 */
export function estimateLocally(unitsRemaining, dailyAvgUnits) {
  if (!dailyAvgUnits || dailyAvgUnits <= 0) {
    return { daysRemaining: null, alertLevel: 'ok', depletionDate: null };
  }
  const days = unitsRemaining / dailyAvgUnits;
  const depletion = new Date(Date.now() + days * 86400000);

  let alertLevel = 'ok';
  if (days <= 1) alertLevel = 'critical';
  else if (days <= 3) alertLevel = 'warning';

  return {
    daysRemaining: Math.round(days * 10) / 10,
    depletionDate: depletion,
    alertLevel,
    unitsRemaining,
    dailyAvgUnits,
  };
}

/**
 * Checks all user-configured alert thresholds and fires browser notifications
 * for any that are breached. Call this after each telemetry update.
 */
export async function checkAlerts(unitsRemaining, daysRemaining) {
  if (!alertsCache) {
    alertsCache = await alertsApi.list();
  }

  for (const alert of alertsCache) {
    if (!alert.enabled) continue;

    let breached = false;
    if (alert.type === 'low_units' && unitsRemaining <= alert.threshold) breached = true;
    if (alert.type === 'days_left'  && daysRemaining  <= alert.threshold) breached = true;

    if (breached) {
      fireNotification(alert, unitsRemaining, daysRemaining);
    }
  }
}

function fireNotification(alert, units, days) {
  const title = 'PowerSmart Alert';
  let body = '';

  if (alert.type === 'low_units') {
    body = `Your meter has ${units.toFixed(1)} kWh remaining — below your ${alert.threshold} kWh alert threshold.`;
  } else if (alert.type === 'days_left') {
    body = `Your power will last approximately ${days.toFixed(1)} more days. Top up now to stay connected.`;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/assets/icon-192.png' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') new Notification(title, { body });
    });
  }
}

/**
 * Requests browser notification permission on first use.
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

/**
 * Invalidates the alerts cache (call after creating/updating/deleting an alert).
 */
export function invalidateAlertsCache() {
  alertsCache = null;
}
