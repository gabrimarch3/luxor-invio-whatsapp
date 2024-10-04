import { NextResponse } from 'next/server';
import { getClientDbConfig, connectToClientDb, logKaleyraError } from '../../../utils/db';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const codiceSpotty = searchParams.get('codice_spotty');

  // Verifica che 'codice_spotty' sia stato fornito
  if (!codiceSpotty) {
    return NextResponse.json({ message: 'Codice Spotty non fornito' }, { status: 400 });
  }

  // Ottieni la configurazione del database del cliente
  const clientConfig = await getClientDbConfig(codiceSpotty);

  if (!clientConfig) {
    return NextResponse.json({ message: 'Codice Spotty non valido' }, { status: 400 });
  }

  const gruppo = clientConfig.Gruppo?.trim() || '';
  let altriClientiGruppo = [];

  // Recupera altri clienti del gruppo, se esiste un gruppo
  if (gruppo) {
    const centralHost = 'node1.spottywifi.it';
    const centralDb   = 'luxor_spottywifi';
    const centralUser = 'sql_spottywifi';
    const centralPass = 'VAJHyyVnFxxiXYLM';
    const charset = 'utf8mb4';
    
    try {
      const centralConnection = await mysql.createConnection({
        host: centralHost,
        user: centralUser,
        password: centralPass,
        database: centralDb,
        charset: charset,
        multipleStatements: false,
      });

      // Imposta la codifica corretta
      await centralConnection.execute(`SET NAMES 'utf8mb4'`);

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

  // Connettiti al database del cliente
  const clientConnection = await connectToClientDb(clientConfig);

  if (!clientConnection) {
    return NextResponse.json({ message: 'Connessione al database del cliente fallita' }, { status: 500 });
  }

  try {
    // Query modificata per non utilizzare la colonna 'is_new'
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

    // Mappa i risultati della query in un array con formato corretto
    const chats = rows.map(row => ({
      id: row.id,
      name: row.name || row.id,
      lastMessage: row.lastMessage,
      lastMessageTime: row.lastMessageTime,
      // Rimuoviamo hasNewMessages e newMessageCount poiché non abbiamo queste informazioni
    }));

    await clientConnection.end();

    // Preparazione della risposta JSON
    return NextResponse.json({
      chats: chats,
      altriClientiGruppo: altriClientiGruppo,
    });
  } catch (error) {
    console.error('Errore nel recupero delle chat:', error.message);
    return NextResponse.json({ message: 'Errore nel recupero delle chat' }, { status: 500 });
  }
}
