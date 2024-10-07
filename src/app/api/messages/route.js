// app/api/messages/route.js

import { NextResponse } from 'next/server';
import { getClientDbConfig, connectToClientDb, logKaleyraError } from '../../../utils/db';
import mysql from 'mysql2/promise';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const encryptedCodiceSpotty = searchParams.get('codice_spotty');
  const mobile = searchParams.get('mobile');

  // Verifica che 'codice_spotty' e 'mobile' siano stati forniti
  if (!encryptedCodiceSpotty) {
    return NextResponse.json({ message: 'Codice Spotty non fornito' }, { status: 400 });
  }

  if (!mobile) {
    return NextResponse.json({ message: 'Numero di telefono non fornito' }, { status: 400 });
  }

  // Funzione di decriptazione (implementa la tua logica se necessaria)
  const decryptCodiceSpotty = (encrypted) => {
    // Implementa la tua logica di decriptazione qui
    // Se non necessiti di decriptazione, ritorna direttamente il valore
    return encrypted;
  };

  const codiceSpotty = decryptCodiceSpotty(encryptedCodiceSpotty);

  if (!codiceSpotty) {
    return NextResponse.json({ message: 'Codice Spotty non valido' }, { status: 400 });
  }

  // Rimuove il prefisso 'spotty' dal codice spotty
  const codiceSpottyWithoutPrefix = codiceSpotty.replace('spotty', '');

  // Ottieni i dettagli di connessione al database del cliente
  const clientConfig = await getClientDbConfig(codiceSpotty);

  if (!clientConfig) {
    return NextResponse.json({ message: 'Configurazione cliente non trovata' }, { status: 400 });
  }

  // Connettiti al database del cliente
  const clientConnection = await connectToClientDb(clientConfig);

  if (!clientConnection) {
    return NextResponse.json({ message: 'Connessione al database del cliente fallita' }, { status: 500 });
  }

  // Funzione per rimuovere le linee di data dal contenuto del messaggio
  const removeDateLines = (content) => {
    if (!content) return '';
    const lines = content.split('\n');
    const filteredLines = lines.filter(line => !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(line.trim()));
    return filteredLines.join('\n');
  };

  // Funzione per ottenere il mime type dall'estensione del file
  const getMimeType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      mp4: 'video/mp4',
      pdf: 'application/pdf',
      // Aggiungi altri tipi se necessario
    };
    return mimeTypes[ext] || 'application/octet-stream';
  };

  try {
    // Query per recuperare i messaggi ricevuti (con media)
    const [receivedRows] = await clientConnection.execute(
      `
      SELECT
        id,
        sender,
        name,
        message,
        media_url,
        mime_type,
        created_at AS time,
        'received' AS direction
      FROM spottywa_risposte
      WHERE mobile = ?
      `,
      [mobile]
    );

    // Query per recuperare i messaggi inviati (con media)
    const [sentRows] = await clientConnection.execute(
      `
      SELECT
        liw.Id AS id,
        'Me' AS sender,
        NULL AS name,
        liw.Messaggio AS message,
        sm.Immagine AS media_url,
        liw.Data AS time,
        'sent' AS direction,
        liw.Status
      FROM LogInvioWhatsApp liw
      LEFT JOIN spottymkt_messaggi sm ON liw.NomeTemplate = sm.NomeTemplate
      WHERE liw.Telefono = ?
      `,
      [mobile]
    );

    // Combina i messaggi
    const allMessages = [...receivedRows, ...sentRows];

    // Ordina i messaggi per data
    allMessages.sort((a, b) => new Date(a.time) - new Date(b.time));

    // Mappa i messaggi per adattarli al formato richiesto
    const messages = allMessages
      .map(row => {
        let content = '';

        if (row.direction === 'received') {
          try {
            const messageData = JSON.parse(row.message);
            if (messageData[0]?.text?.body) {
              content = messageData[0].text.body;
            }
          } catch (error) {
            console.error(`Errore nel parsing del messaggio ricevuto con id ${row.id}:`, error.message);
            content = '';
          }
        } else {
          content = row.message || '';
        }

        // Rimuove le linee di data dal contenuto del messaggio
        content = removeDateLines(content);

        // Verifica che la data sia valida
        const messageDate = new Date(row.time);
        if (isNaN(messageDate.getTime())) {
          console.error(`Data non valida per il messaggio con id ${row.id}: ${row.time}`);
          return null; // Esclude i messaggi con date non valide
        }

        // Deriva il mime_type dall'estensione del file se media_url è presente
        let mime_type = null;
        let media_url = row.media_url || null;

        if (media_url) {
          mime_type = getMimeType(media_url);

          // Verifica se media_url inizia con 'http://' o 'https://'
          if (!/^https?:\/\//.test(media_url)) {
            // Costruisce il media_url secondo il formato richiesto
            const imageName = media_url;
            media_url = `https://media.spottywifi.app/wa/${codiceSpottyWithoutPrefix}/images/${imageName}`;
          }
        }

        return {
          id: row.id,
          sender: row.sender,
          content: content,
          media_url: media_url,
          mime_type: mime_type,
          time: messageDate.toISOString(), // ISO 8601
          status: row.Status || null, // Solo per i messaggi inviati
          isSystem: row.sender === 'System',
        };
      })
      .filter(message => message !== null); // Rimuove i messaggi null

    await clientConnection.end();

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Errore nel recupero dei messaggi:', error.message);
    return NextResponse.json({ message: 'Errore nel recupero dei messaggi' }, { status: 500 });
  }
}
