// utils/logger.js

import fs from 'fs';
import path from 'path';

/**
 * Logs informational messages.
 * @param {string} message
 */
export function logInfo(message) {
  console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
}

/**
 * Logs error messages to both a file and the console.
 * @param {string} message
 */
export function logError(message) {
  const logFile = path.join(process.cwd(), 'kaleyra_error_log.txt');
  const logMessage = `[ERROR] ${new Date().toISOString()} - ${message}\n`;
  fs.appendFile(logFile, logMessage, (err) => {
    if (err) console.error('Failed to write to log file:', err);
  });
  console.error(logMessage);
}
