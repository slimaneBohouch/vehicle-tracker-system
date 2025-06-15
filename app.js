const net = require('net');

const client = new net.Socket();
let buffer = '';

client.connect(5050, 'pogog.ovh', () => {
  console.log('Connected to server');
  client.write('Hello');//il faut garder cette ligne pour que le serveur puisse répondre
});

client.on('data', (data) => {
  buffer += data.toString('utf-8');

  let boundary = buffer.indexOf('\n'); // Assuming JSON objects are newline-delimited
  while (boundary !== -1) {
    const chunk = buffer.slice(0, boundary).trim();
    buffer = buffer.slice(boundary + 1);

    try {
      const parsedData = JSON.parse(chunk);
      console.log('Received from server:', parsedData);
    } catch (error) {
      console.error('Error parsing JSON:', error.message);
      console.error('Raw chunk received:', chunk);
    }

    boundary = buffer.indexOf('\n');
  }
});

client.on('close', () => {
  console.log('Connection closed');
});

client.on('error', (err) => {
  console.error('Client error:', err);
});