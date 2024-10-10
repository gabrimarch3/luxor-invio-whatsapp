// utils/logger.js

// Importazione dei moduli necessari per la gestione dei file e dei percorsi
import fs from 'fs';
import path from 'path';

/**
 * Registra messaggi informativi nella console.
 * 
 * @param {string} message - Il messaggio da registrare
 * 
 * Questa funzione:
 * 1. Crea un timestamp ISO per il momento attuale
 * 2. Formatta il messaggio con il prefisso [INFO] e il timestamp
 * 3. Stampa il messaggio formattato nella console
 * 
 * Utilizzo:
 * logInfo("Operazione completata con successo");
 */
export function logInfo(message) {
  console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
}

/**
 * Registra messaggi di errore sia in un file che nella console.
 * 
 * @param {string} message - Il messaggio di errore da registrare
 * 
 * Questa funzione:
 * 1. Definisce il percorso del file di log degli errori
 * 2. Crea un timestamp ISO per il momento attuale
 * 3. Formatta il messaggio di errore con il prefisso [ERROR], il timestamp e un newline
 * 4. Scrive il messaggio formattato nel file di log
 * 5. Gestisce eventuali errori durante la scrittura del file
 * 6. Stampa il messaggio di errore anche nella console
 * 
 * Utilizzo:
 * logError("Si è verificato un errore durante l'elaborazione dei dati");
 */
export function logError(message) {
  // Definisce il percorso del file di log nella directory corrente del progetto
  const logFile = path.join(process.cwd(), 'kaleyra_error_log.txt');
  
  // Formatta il messaggio di errore
  const logMessage = `[ERROR] ${new Date().toISOString()} - ${message}\n`;
  
  // Scrive il messaggio nel file di log
  fs.appendFile(logFile, logMessage, (err) => {
    // Se si verifica un errore durante la scrittura, lo registra nella console
    if (err) console.error('Failed to write to log file:', err);
  });
  
  // Stampa il messaggio di errore anche nella console per una visibilità immediata
  console.error(logMessage);
}
