import { NextResponse } from 'next/server';
import { getClientDbConfig, connectToClientDb, logKaleyraError } from '../../../utils/db';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Aumenta il timeout a 60 secondi
export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
  maxDuration: 60,
};

// Implementa una cache semplice
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minuto

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const codiceSpotty = searchParams.get('codice_spotty');

  if (!codiceSpotty) {
    return NextResponse.json({ message: 'Codice Spotty non fornito' }, { status: 400 });
  }

  // Controlla la cache
  const cachedData = cache.get(codiceSpotty);
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
    return NextResponse.json(cachedData.data);
  }

  const clientConfig = await getClientDbConfig(codiceSpotty);

  if (!clientConfig) {
    return NextResponse.json({ message: 'Codice Spotty non valido' }, { status: 400 });
  }

  const gruppo = clientConfig.Gruppo?.trim() || '';
  let altriClientiGruppo = [];

  if (gruppo) {
    // ... (il codice per recuperare altri clienti del gruppo rimane invariato)
  }

  const clientConnection = await connectToClientDb(clientConfig);

  if (!clientConnection) {
    return NextResponse.json({ message: 'Connessione al database del cliente fallita' }, { status: 500 });
  }

  try {
    // Query ottimizzata
    const [rows] = await clientConnection.execute(
      `
      SELECT 
        sr.mobile AS id, 
        sr.name,
        sr.message AS lastMessage,
        sr.created_at AS lastMessageTime
      FROM spottywa_risposte sr
      INNER JOIN (
        SELECT mobile, MAX(created_at) AS max_created_at
        FROM spottywa_risposte
        GROUP BY mobile
      ) latest ON sr.mobile = latest.mobile AND sr.created_at = latest.max_created_at
      ORDER BY sr.created_at DESC
      `
    );

    const chats = rows.map(row => ({
      id: row.id,
      name: row.name || row.id,
      lastMessage: row.lastMessage,
      lastMessageTime: row.lastMessageTime,
    }));

    await clientConnection.end();

    const responseData = {
      chats: chats,
      altriClientiGruppo: altriClientiGruppo,
    };

    // Salva i dati nella cache
    cache.set(codiceSpotty, { data: responseData, timestamp: Date.now() });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Errore nel recupero delle chat:', error.message);
    return NextResponse.json({ message: 'Errore nel recupero delle chat' }, { status: 500 });
  }
}
