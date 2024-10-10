// utils/db.js

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// Abilita o disabilita la modalità di debug globale
// Utile per attivare/disattivare i log dettagliati in tutto il modulo
const DEBUG_MODE = true;

/**
 * Registra gli errori relativi a Kaleyra in un file di log dedicato.
 * 
 * @param {string} message - Il messaggio di errore da registrare.
 * 
 * Questa funzione:
 * 1. Crea una directory 'logs' se non esiste.
 * 2. Scrive il messaggio di errore in un file 'kaleyra_error_log.txt' con timestamp.
 * 3. Stampa anche l'errore nella console per una visibilità immediata durante lo sviluppo.
 */
export function logKaleyraError(message) {
  const logDir = path.join(process.cwd(), 'logs');
  const logFile = path.join(logDir, 'kaleyra_error_log.txt');

  // Assicura l'esistenza della directory 'logs'
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  // Scrive nel file di log
  fs.appendFileSync(logFile, logMessage, 'utf8');

  // Log anche nella console per debug immediato
  console.error(logMessage);
}

/**
 * Recupera la configurazione del database del cliente dal database centrale.
 * 
 * @param {string} codiceSpotty - Il codice identificativo del cliente.
 * @returns {Promise<Object|null>} Un oggetto con i dettagli di connessione del cliente o null in caso di errore.
 * 
 * Questa funzione:
 * 1. Si connette al database centrale usando credenziali predefinite.
 * 2. Esegue una query per ottenere i dettagli di connessione del cliente specifico.
 * 3. Chiude la connessione al database centrale.
 * 4. Restituisce i dettagli di connessione o null se non trovati o in caso di errore.
 */
export async function getClientDbConfig(codiceSpotty) {
  // Dettagli di connessione al database centrale
  const centralHost = 'node1.spottywifi.it';
  const centralDb   = 'luxor_spottywifi';
  const centralUser = 'sql_spottywifi';
  const centralPass = 'VAJHyyVnFxxiXYLM';
  const charset = 'utf8mb4';

  const dsn = `mysql://${centralUser}:${centralPass}@${centralHost}/${centralDb}?charset=${charset}`;

  try {
    // Crea una connessione al database centrale
    const centralConnection = await mysql.createConnection({
      host: centralHost,
      user: centralUser,
      password: centralPass,
      database: centralDb,
      charset: charset,
      multipleStatements: false, // Misura di sicurezza per prevenire SQL injection
    });

    // Esegue la query per ottenere i dettagli del cliente
    const [rows] = await centralConnection.execute(
      `
      SELECT HostDatabase, NomeDatabase, UtenteDatabase, PasswordDatabase, Gruppo
      FROM adm_Clienti 
      WHERE CodiceCliente COLLATE utf8_unicode_ci = ?
      `,
      [codiceSpotty]
    );

    // Chiude la connessione al database centrale
    await centralConnection.end();

    // Verifica se sono stati trovati risultati
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

/**
 * Stabilisce una connessione al database del cliente.
 * 
 * @param {Object} clientConfig - Configurazione del database del cliente.
 * @returns {Promise<mysql.Connection|null>} Una connessione al database del cliente o null in caso di errore.
 * 
 * Questa funzione:
 * 1. Tenta di stabilire una connessione al database del cliente usando la configurazione fornita.
 * 2. Misura il tempo necessario per stabilire la connessione.
 * 3. Registra eventuali errori di connessione.
 * 4. Restituisce l'oggetto connessione o null in caso di errore.
 */
export async function connectToClientDb(clientConfig) {
  const startTime = Date.now();
  try {
    const clientConnection = await mysql.createConnection({
      host: '213.152.202.187', // IP fisso del database del cliente
      user: clientConfig.UtenteDatabase,
      password: clientConfig.PasswordDatabase,
      database: clientConfig.NomeDatabase,
      charset: 'utf8mb4',
      multipleStatements: false, // Misura di sicurezza per prevenire SQL injection
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

/**
 * Recupera la configurazione Kaleyra per un cliente specifico.
 * 
 * @param {string} codiceSpotty - Il codice identificativo del cliente.
 * @returns {Promise<Object|null>} Un oggetto con la configurazione Kaleyra o null in caso di errore.
 * 
 * Questa funzione:
 * 1. Si connette al database centrale.
 * 2. Recupera le impostazioni Kaleyra specifiche per il cliente.
 * 3. Verifica che tutte le chiavi di configurazione necessarie siano presenti.
 * 4. Registra eventuali errori o chiavi mancanti.
 * 5. Restituisce un oggetto con la configurazione o null in caso di errore.
 */
export async function getKaleyraConfig(codiceSpotty) {
  // Dettagli di connessione al database centrale
  const centralHost = 'node1.spottywifi.it';
  const centralDb   = 'luxor_spottywifi';
  const centralUser = 'sql_spottywifi';
  const centralPass = 'VAJHyyVnFxxiXYLM';
  const charset = 'utf8mb4';
  
  const dsn = `mysql://${centralUser}:${centralPass}@${centralHost}/${centralDb}?charset=${charset}`;

  try {
    // Stabilisce una connessione al database centrale
    const centralConnection = await mysql.createConnection({
      host: centralHost,
      user: centralUser,
      password: centralPass,
      database: centralDb,
      charset: charset,
      multipleStatements: false,
    });

    // Definisce le chiavi di configurazione richieste
    const requiredKeys = [
      'wa_kaleyra_sid',
      'wa_kaleyra_apikey',
      'wa_kaleyra_wabaid',
      'wa_kaleyra_numero_telefono',
      'wa_kaleyra_url_calback'
    ];

    // Prepara la query SQL con placeholders per le chiavi richieste
    const placeholders = requiredKeys.map(() => '?').join(',');
    const sql = `
      SELECT Chiave, Valore
      FROM adm_Impostazioni
      WHERE CodiceCliente = ? 
      AND Chiave IN (${placeholders})
    `;

    const params = [codiceSpotty, ...requiredKeys];

    // Esegue la query
    const [rows] = await centralConnection.execute(sql, params);

    // Chiude la connessione al database centrale
    await centralConnection.end();

    // Organizza i risultati in un oggetto
    const settings = {};
    rows.forEach(row => {
      settings[row.Chiave] = row.Valore;
    });

    // Verifica la presenza di tutte le chiavi richieste
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

/**
 * Esegue una query SQL con un timeout specificato.
 * 
 * @param {mysql.Connection} connection - La connessione al database.
 * @param {string} query - La query SQL da eseguire.
 * @param {Array} params - I parametri per la query.
 * @param {number} timeout - Il timeout in millisecondi (default: 5000ms).
 * @returns {Promise<any>} Il risultato della query o un errore in caso di timeout.
 * 
 * Questa funzione:
 * 1. Imposta un timer per il timeout della query.
 * 2. Esegue la query SQL.
 * 3. Annulla il timer se la query termina prima del timeout.
 * 4. Restituisce il risultato della query o genera un errore in caso di timeout.
 */
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

