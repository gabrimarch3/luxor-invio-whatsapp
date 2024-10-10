// app/api/messages/route.js

import { NextResponse } from 'next/server';
import { getClientDbConfig, connectToClientDb, logKaleyraError } from '../../../utils/db';
import mysql from 'mysql2/promise';

// Configurazione per Next.js: forza il rendering dinamico e usa il runtime Node.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Gestisce le richieste GET per recuperare i messaggi
export async function GET(request) {
  // Estrae i parametri dalla query string
  const { searchParams } = new URL(request.url);
  const encryptedCodiceSpotty = searchParams.get('codice_spotty');
  const mobile = searchParams.get('mobile');

  // Verifica la presenza dei parametri obbligatori
  if (!encryptedCodiceSpotty) {
    return NextResponse.json({ message: 'Codice Spotty non fornito' }, { status: 400 });
  }

  if (!mobile) {
    return NextResponse.json({ message: 'Numero di telefono non fornito' }, { status: 400 });
  }

  // Funzione di decriptazione (da implementare se necessaria)
  const decryptCodiceSpotty = (encrypted) => {
    // TODO: Implementare la logica di decriptazione
    return encrypted;
  };

  const codiceSpotty = decryptCodiceSpotty(encryptedCodiceSpotty);

  if (!codiceSpotty) {
    return NextResponse.json({ message: 'Codice Spotty non valido' }, { status: 400 });
  }

  // Rimuove il prefisso 'spotty' dal codice
  const codiceSpottyWithoutPrefix = codiceSpotty.replace('spotty', '');

  // Recupera la configurazione del database del cliente
  const clientConfig = await getClientDbConfig(codiceSpotty);

  if (!clientConfig) {
    return NextResponse.json({ message: 'Configurazione cliente non trovata' }, { status: 400 });
  }

  // Stabilisce la connessione al database del cliente
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

  // Funzione per determinare il MIME type basato sull'estensione del file
  const getMimeType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      mp4: 'video/mp4',
      pdf: 'application/pdf',
      // Aggiungere altri tipi MIME se necessario
    };
    return mimeTypes[ext] || 'application/octet-stream';
  };

  try {
    // Recupera i messaggi ricevuti dal database
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

    // Recupera i messaggi inviati dal database
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

    // Combina e ordina tutti i messaggi
    const allMessages = [...receivedRows, ...sentRows];
    allMessages.sort((a, b) => new Date(a.time) - new Date(b.time));

    // Elabora e formatta i messaggi
    const messages = allMessages
      .map(row => {
        let content = '';

        // Gestisce il parsing del contenuto per i messaggi ricevuti
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

        // Rimuove le linee di data dal contenuto
        content = removeDateLines(content);

        // Verifica la validità della data del messaggio
        const messageDate = new Date(row.time);
        if (isNaN(messageDate.getTime())) {
          console.error(`Data non valida per il messaggio con id ${row.id}: ${row.time}`);
          return null; // Esclude i messaggi con date non valide
        }

        // Gestisce l'URL e il MIME type dei media
        let mime_type = null;
        let media_url = row.media_url || null;

        if (media_url) {
          mime_type = getMimeType(media_url);

          // Costruisce l'URL completo per i media se necessario
          if (!/^https?:\/\//.test(media_url)) {
            const imageName = media_url;
            media_url = `https://media.spottywifi.app/wa/${codiceSpottyWithoutPrefix}/images/${imageName}`;
          }
        }

        // Restituisce l'oggetto messaggio formattato
        return {
          id: row.id,
          sender: row.sender,
          content: content,
          media_url: media_url,
          mime_type: mime_type,
          time: messageDate.toISOString(), // Formato ISO 8601
          status: row.Status || null, // Solo per i messaggi inviati
          isSystem: row.sender === 'System',
        };
      })
      .filter(message => message !== null); // Rimuove i messaggi null

    // Chiude la connessione al database
    await clientConnection.end();

    // Restituisce i messaggi come risposta JSON
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Errore nel recupero dei messaggi:', error.message);
    return NextResponse.json({ message: 'Errore nel recupero dei messaggi' }, { status: 500 });
  }
}
