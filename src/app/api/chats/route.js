// app/api/chats/route.js

import { NextResponse } from 'next/server';
import { getClientDbConfig, connectToClientDb } from '../../../utils/db';
import mysql from 'mysql2/promise';

// Imposta la configurazione per Next.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Funzione principale per gestire le richieste GET
export async function GET(request) {
  console.log('Inizio della richiesta GET');
  try {
    // Estrae il parametro 'codice_spotty' dall'URL
    const { searchParams } = new URL(request.url);
    const codiceSpotty = searchParams.get('codice_spotty');

    // Verifica che 'codice_spotty' sia stato fornito
    if (!codiceSpotty) {
      return NextResponse.json({ message: 'Codice Spotty non fornito' }, { status: 400 });
    }

    // Ottiene la configurazione del database del cliente
    const clientConfig = await getClientDbConfig(codiceSpotty);

    if (!clientConfig) {
      return NextResponse.json({ message: 'Codice Spotty non valido' }, { status: 400 });
    }

    // Estrae il gruppo del cliente e inizializza l'array per altri clienti del gruppo
    const gruppo = clientConfig.Gruppo?.trim() || '';
    let altriClientiGruppo = [];

    // Recupera altri clienti del gruppo, se esiste un gruppo
    if (gruppo) {
      // Configurazione per la connessione al database centrale
      const centralHost = 'node1.spottywifi.it';
      const centralDb   = 'luxor_spottywifi';
      const centralUser = 'sql_spottywifi';
      const centralPass = 'VAJHyyVnFxxiXYLM';
      const charset = 'utf8mb4';
      
      try {
        // Crea una connessione al database centrale
        const centralConnection = await mysql.createConnection({
          host: centralHost,
          user: centralUser,
          password: centralPass,
          database: centralDb,
          charset: charset,
          multipleStatements: false,
        });

        // Imposta la codifica corretta per la connessione
        await centralConnection.execute(`SET NAMES 'utf8mb4'`);

        // Esegue la query per ottenere altri clienti dello stesso gruppo
        const [rows] = await centralConnection.execute(
          `
          SELECT CodiceCliente, NomeCliente 
          FROM adm_Clienti 
          WHERE TRIM(LOWER(Gruppo)) = TRIM(LOWER(?))
          AND CodiceCliente <> ?
          `,
          [gruppo.toLowerCase(), codiceSpotty]
        );

        altriClientiGruppo = rows;
        await centralConnection.end();
      } catch (error) {
        console.error('Errore nel recupero dei clienti del gruppo:', error.message);
        return NextResponse.json({ message: 'Errore nel recupero dei clienti del gruppo' }, { status: 500 });
      }
    }

    // Crea una connessione al database del cliente
    const clientConnection = await connectToClientDb(clientConfig);

    if (!clientConnection) {
      return NextResponse.json({ message: 'Connessione al database del cliente fallita' }, { status: 500 });
    }

    try {
      // Esegue la query per ottenere le chat del cliente
      const [rows] = await clientConnection.execute(
        `
        SELECT 
          sr.mobile AS id, 
          sr.name,
          (SELECT message FROM spottywa_risposte WHERE mobile = sr.mobile ORDER BY created_at DESC LIMIT 1) AS lastMessage,
          MAX(sr.created_at) AS lastMessageTime
        FROM spottywa_risposte sr
        GROUP BY sr.mobile, sr.name
        ORDER BY MAX(sr.created_at) DESC
        `
      );

      // Formatta i risultati della query in un array di chat
      const chats = rows.map(row => ({
        id: row.id,
        name: row.name || row.id,
        lastMessage: row.lastMessage,
        lastMessageTime: row.lastMessageTime,
      }));

      await clientConnection.end();

      console.log('Fine della richiesta GET');
      // Prepara e invia la risposta JSON
      return NextResponse.json({
        chats: chats,
        altriClientiGruppo: altriClientiGruppo,
      });
    } catch (error) {
      console.error('Errore nel recupero delle chat:', error.message);
      return NextResponse.json({ message: 'Errore nel recupero delle chat' }, { status: 500 });
    }
  } catch (error) {
    console.error('Errore nella richiesta GET:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
