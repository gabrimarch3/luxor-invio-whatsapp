// utils/db.js

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { logKaleyraError } from './logging';

// Abilitare o disabilitare la modalità di debug
const DEBUG_MODE = true;

// Funzione per loggare gli errori di Kaleyra
export function logKaleyraError(message) {
  const logDir = path.join(process.cwd(), 'logs');
  const logFile = path.join(logDir, 'kaleyra_error_log.txt');

  // Crea la cartella 'logs' se non esiste
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  // Scrive il messaggio nel file di log
  fs.appendFileSync(logFile, logMessage, 'utf8');

  // Logga anche nel log di sistema
  console.error(logMessage);
}

// Funzione per ottenere i dettagli di connessione dal database centrale
export async function getClientDbConfig(codiceSpotty) {
  // Dettagli per connettersi al database centrale
  const centralHost = 'node1.spottywifi.it';        // Host del database centrale
  const centralDb   = 'luxor_spottywifi';          // Nome del database centrale
  const centralUser = 'sql_spottywifi';            // Username del database centrale
  const centralPass = 'VAJHyyVnFxxiXYLM';          // Password del database centrale
  const charset = 'utf8mb4'; // Assicurati che il charset sia coerente

  const dsn = `mysql://${centralUser}:${centralPass}@${centralHost}/${centralDb}?charset=${charset}`;

  try {
    const centralConnection = await mysql.createConnection({
      host: centralHost,
      user: centralUser,
      password: centralPass,
      database: centralDb,
      charset: charset,
      multipleStatements: false,
    });

    const [rows] = await centralConnection.execute(
      `
      SELECT HostDatabase, NomeDatabase, UtenteDatabase, PasswordDatabase, Gruppo
      FROM adm_Clienti 
      WHERE CodiceCliente COLLATE utf8_unicode_ci = ?
      `,
      [codiceSpotty]
    );

    await centralConnection.end();

    if (rows.length === 0) {
      console.error(`Nessuna configurazione cliente trovata per codiceSpotty: ${codiceSpotty}`);
      return null;
    }

    console.log(`Configurazione cliente trovata: ${JSON.stringify(rows[0])}`);
    return rows[0];
  } catch (error) {
    console.error('Connessione al database centrale fallita:', error.message);
    return null;
  }
}

// Funzione per connettersi al database del cliente
export async function connectToClientDb(clientConfig) {
  const startTime = Date.now();
  try {
    const clientConnection = await mysql.createConnection({
      host: '213.152.202.187', // IP fisso del database del cliente
      user: clientConfig.UtenteDatabase,
      password: clientConfig.PasswordDatabase,
      database: clientConfig.NomeDatabase,
      charset: 'utf8mb4', // Assicurati che il charset sia coerente
      multipleStatements: false,
    });
    const endTime = Date.now();
    console.log(`Connessione al DB completata in ${endTime - startTime}ms`);
    return clientConnection;
  } catch (error) {
    const endTime = Date.now();
    logKaleyraError(`Connessione al DB fallita dopo ${endTime - startTime}ms: ${error.message}`);
    return null;
  }
}

// Funzione per ottenere la configurazione di Kaleyra
export async function getKaleyraConfig(codiceSpotty) {
  // Dettagli per connettersi al database centrale
  const centralHost = 'node1.spottywifi.it';
  const centralDb   = 'luxor_spottywifi';
  const centralUser = 'sql_spottywifi';
  const centralPass = 'VAJHyyVnFxxiXYLM';
  const charset = 'utf8mb4';
  
  const dsn = `mysql://${centralUser}:${centralPass}@${centralHost}/${centralDb}?charset=${charset}`;

  try {
    const centralConnection = await mysql.createConnection({
      host: centralHost,
      user: centralUser,
      password: centralPass,
      database: centralDb,
      charset: charset,
      multipleStatements: false,
    });

    const requiredKeys = [
      'wa_kaleyra_sid',
      'wa_kaleyra_apikey',
      'wa_kaleyra_wabaid',
      'wa_kaleyra_numero_telefono',
      'wa_kaleyra_url_calback'
    ];

    const placeholders = requiredKeys.map(() => '?').join(',');
    const sql = `
      SELECT Chiave, Valore
      FROM adm_Impostazioni
      WHERE CodiceCliente = ? 
      AND Chiave IN (${placeholders})
    `;

    const params = [codiceSpotty, ...requiredKeys];

    const [rows] = await centralConnection.execute(sql, params);

    await centralConnection.end();

    const settings = {};
    rows.forEach(row => {
      settings[row.Chiave] = row.Valore;
    });

    // Verifica se tutte le chiavi sono state recuperate
    for (const key of requiredKeys) {
      if (!settings[key]) {
        const logMessage = `Chiave mancante: ${key} per il cliente ${codiceSpotty}`;
        logKaleyraError(logMessage);
        return null;
      }
    }

    return settings;
  } catch (error) {
    const logMessage = `Errore nella query di getKaleyraConfig: ${error.message}`;
    logKaleyraError(logMessage);
    return null;
  }
}

// Esempio di implementazione di un timeout per le query
const queryWithTimeout = async (connection, query, params, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Query timeout'));
    }, timeout);

    connection.query(query, params, (error, results) => {
      clearTimeout(timer);
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
};

// Usa questa funzione invece di connection.query direttamente
