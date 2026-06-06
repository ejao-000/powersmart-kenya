// bluetooth.js — Web Bluetooth API integration.
// Connects to the Kenya Power prepaid meter's BLE service and writes the token number.
// The meter exposes a standard GATT service; the token is written as a UTF-8 string
// to the token-write characteristic.

import { tokens } from './api.js';

// Replace with the actual KP meter BLE GATT UUIDs when known.
const KP_METER_SERVICE_UUID   = '0000ffe0-0000-1000-8000-00805f9b34fb';
const KP_TOKEN_CHAR_UUID      = '0000ffe1-0000-1000-8000-00805f9b34fb';

let connectedDevice = null;
let tokenCharacteristic = null;

export function isBluetoothSupported() {
  return 'bluetooth' in navigator;
}

/**
 * Scans for a nearby Kenya Power meter and returns a connected device.
 * The user must grant permission via the browser's Bluetooth picker.
 */
export async function connectToMeter() {
  if (!isBluetoothSupported()) {
    throw new Error('Web Bluetooth is not supported on this device or browser.');
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [KP_METER_SERVICE_UUID] }],
    optionalServices: [KP_METER_SERVICE_UUID],
  });

  device.addEventListener('gattserverdisconnected', onDisconnected);

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(KP_METER_SERVICE_UUID);
  tokenCharacteristic = await service.getCharacteristic(KP_TOKEN_CHAR_UUID);
  connectedDevice = device;

  return device.name || 'Kenya Power Meter';
}

/**
 * Writes the 20-digit token number to the meter over BLE and updates the server.
 * @param {string} tokenId - DB token ID (for server status update)
 * @param {string} tokenNumber - 20-digit KP token string
 */
export async function pushTokenToMeter(tokenId, tokenNumber) {
  if (!tokenCharacteristic) {
    throw new Error('No meter connected. Connect via Bluetooth first.');
  }

  // Notify server that a push is starting
  await tokens.pushBluetooth(tokenId, 'request');

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(tokenNumber);
    await tokenCharacteristic.writeValueWithResponse(data);

    // Confirm success on server
    await tokens.pushBluetooth(tokenId, 'confirm');
    return { success: true };
  } catch (err) {
    // Record failure on server so user knows to enter manually
    await tokens.pushBluetooth(tokenId, 'fail').catch(() => {});
    throw err;
  }
}

/**
 * Auto-push: when Bluetooth is on and the user has bought a new token,
 * this is called automatically without user interaction (after initial pairing).
 */
export async function autoPushIfConnected(tokenId, tokenNumber) {
  if (!connectedDevice || !tokenCharacteristic) {
    return { skipped: true, reason: 'no_device_connected' };
  }
  return pushTokenToMeter(tokenId, tokenNumber);
}

export function getConnectedDeviceName() {
  return connectedDevice ? (connectedDevice.name || 'Meter') : null;
}

export function disconnect() {
  if (connectedDevice?.gatt?.connected) {
    connectedDevice.gatt.disconnect();
  }
  connectedDevice = null;
  tokenCharacteristic = null;
}

function onDisconnected() {
  connectedDevice = null;
  tokenCharacteristic = null;
  document.dispatchEvent(new CustomEvent('meter:disconnected'));
}
