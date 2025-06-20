const net = require('net');
const vehicleController = require('../controllers/vehicleController');

let initialized = false;

const setupTCPListener = () => {
  if (initialized) return;
  initialized = true;

  const client = new net.Socket();
  let buffer = '';

  client.connect(5050, 'pogog.ovh', () => {
    console.log('[TCP] Connected to server');
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
        vehicleController.handleLiveVehicleData(parsedData); // ✅ Calls controller that will emit via rooms
      } catch (err) {
        console.error('[TCP] JSON error:', err.message);
        console.error('Chunk:', chunk);
      }

      boundary = buffer.indexOf('\n');
    }
  });

  client.on('close', () => console.log('[TCP] Connection closed'));
  client.on('error', (err) => console.error('[TCP] Error:', err.message));
};

module.exports = { setupTCPListener };
