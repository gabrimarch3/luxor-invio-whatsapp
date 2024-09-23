// app/api/messages/route.js

import pool from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mobile = searchParams.get('mobile');

  if (!mobile) {
    return new Response(
      JSON.stringify({ message: 'Numero di telefono non fornito' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Query per recuperare i messaggi ricevuti (con media)
    const [receivedRows] = await pool.query(
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

    // Query per recuperare i messaggi inviati (senza media)
    const [sentRows] = await pool.query(
      `
      SELECT
        Id AS id,
        'Me' AS sender,
        NULL AS name,
        Messaggio AS message,
        NULL AS media_url,      -- Nessun media per i messaggi inviati
        NULL AS mime_type,      -- Nessun mime_type per i messaggi inviati
        Data AS time,
        'sent' AS direction,
        Status
      FROM LogInvioWhatsApp
      WHERE Telefono = ?
    `,
      [mobile]
    );

    // Combina i messaggi
    const allMessages = [...receivedRows, ...sentRows];

    // Ordina i messaggi per data
    allMessages.sort((a, b) => new Date(a.time) - new Date(b.time));

    // Mappa i messaggi per adattarli al formato richiesto
    const messages = allMessages
      .map((row) => {
        let content = '';

        // Parsing del messaggio per i messaggi ricevuti
        if (row.direction === 'received') {
          try {
            const messageData = JSON.parse(row.message)[0];
            content = messageData.text ? messageData.text.body : '';
          } catch (error) {
            console.error(
              `Errore nel parsing del messaggio ricevuto con id ${row.id}:`,
              error
            );
            content = '';
          }
        } else {
          // Messaggio inviato
          content = row.message || '';
        }

        // Rimuove le linee di data dal contenuto del messaggio
        content = removeDateLines(content);

        // Verifica che la data sia valida
        const messageDate = new Date(row.time);
        if (isNaN(messageDate)) {
          console.error(`Data non valida per il messaggio con id ${row.id}:`, row.time);
          return null; // Esclude i messaggi con date non valide
        }

        return {
          id: row.id,
          sender: row.sender,
          content,
          media_url: row.media_url || null, // Aggiungi media_url se presente
          mime_type: row.mime_type || null, // Aggiungi mime_type se presente
          time: messageDate.toISOString(), // Restituisce il timestamp completo
          status: row.Status || null, // Solo per i messaggi inviati
          isSystem: row.sender === 'System', // Flag per messaggi di sistema
        };
      })
      .filter((message) => message !== null); // Rimuove i messaggi null

    return new Response(JSON.stringify(messages), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Errore nel recupero dei messaggi:', error);
    return new Response(
      JSON.stringify({
        message: 'Errore nel recupero dei messaggi',
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Funzione per rimuovere le linee di data dal contenuto del messaggio
const removeDateLines = (content) => {
  if (!content) return '';
  const lines = content.split('\n');
  const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/; // Regex per date nel formato dd/MM/yyyy
  const filteredLines = lines.filter((line) => !datePattern.test(line.trim()));
  return filteredLines.join('\n');
};
