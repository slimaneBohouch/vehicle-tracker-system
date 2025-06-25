const fs = require('fs');
const path = require('path');
const colors = require('colors');

const logFilePath = path.join(__dirname, '../logs/tcp_receiver.log');

function writeLog(message) {
  const timestamp = new Date().toLocaleString('fr-MA', {
    timeZone: 'Africa/Casablanca',
    hour12: false,
  });

  const fullMessage = `[${timestamp}] ${message}\n`;

  fs.appendFile(logFilePath, fullMessage, (err) => {
    if (err) console.error('[Logger] ❌ Failed to write log file:', err);
  });

  if (message.includes('✅')) console.log(colors.green(fullMessage.trim()));
  else if (message.includes('❌')) console.log(colors.red(fullMessage.trim()));
  else if (message.includes('🔁')) console.log(colors.yellow(fullMessage.trim()));
  else console.log(fullMessage.trim());
}


module.exports = { writeLog };
