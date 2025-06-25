const net = require('net');
const vehicleController = require('../controllers/vehicleController');
const { writeLog } = require('../Utils/logger');

let client;
let buffer = '';
let reconnectTimeout;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_MS = 5000;

function connectToTCPServer() {
  client = new net.Socket();

  writeLog('[TCP] 🔌 Trying to connect to server...');

  client.connect(5050, 'pogog.ovh', () => {
    writeLog('[TCP] ✅ Connected to TCP server at pogog.ovh:5050');
    client.setKeepAlive(true, 10000);
    reconnectAttempts = 0;
    client.write('Hello');
  });

  client.on('data', (data) => {
    buffer += data.toString('utf-8');
    let boundary = buffer.indexOf('\n');

    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 1);

      try {
        const parsedData = JSON.parse(chunk);
        vehicleController.handleLiveVehicleData(parsedData);
      } catch (err) {
        writeLog(`[TCP] ❌ JSON Parse Error: ${err.message}`);
        writeLog(`[TCP] ❌ Faulty Chunk: ${chunk}`);
      }

      boundary = buffer.indexOf('\n');
    }
  });

  client.on('error', (err) => {
    writeLog(`[TCP] ❌ Socket Error: ${err.message}`);
    cleanupAndReconnect();
  });

  client.on('close', (hadError) => {
    writeLog(`[TCP] ❌ Connection closed${hadError ? ' due to error' : ''}`);
    cleanupAndReconnect();
  });

  client.on('end', () => {
    writeLog('[TCP] ⚠️ Connection ended by remote host');
    cleanupAndReconnect();
  });
}

function cleanupAndReconnect() {
  if (client) {
    client.destroy();
    client = null;
  }

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    writeLog('[TCP] ❌ Max reconnect attempts reached. Stopping TCP client.');
    return;
  }

  reconnectAttempts++;
  writeLog(`[TCP] 🔁 Attempting reconnect in ${RECONNECT_DELAY_MS / 1000} seconds... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

  clearTimeout(reconnectTimeout);
  reconnectTimeout = setTimeout(() => {
    connectToTCPServer();
  }, RECONNECT_DELAY_MS);
}

let initialized = false;

const setupTCPListener = () => {
  if (initialized) return;
  initialized = true;
  connectToTCPServer();
};

module.exports = { setupTCPListener };
