// Importazione delle dipendenze necessarie
import { NextResponse } from 'next/server';
import { getKaleyraConfig, getClientDbConfig, connectToClientDb } from '../../../utils/db';

// Configurazione per Next.js: forza il rendering dinamico e usa il runtime Node.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Funzione principale per gestire le richieste POST
export async function POST(request) {
  try {
    // Estrazione dei dati dalla richiesta
    const { codice_spotty, mobile, message, media_url, mime_type } = await request.json();

    // Verifica della presenza dei parametri obbligatori
    if (!codice_spotty || !mobile || !message) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
    }

    // Recupero della configurazione Kaleyra per il cliente
    const kaleyraConfig = await getKaleyraConfig(codice_spotty);

    if (!kaleyraConfig) {
      return NextResponse.json({ error: 'Configurazione Kaleyra non trovata' }, { status: 400 });
    }

    // Estrazione dei dati di configurazione Kaleyra
    const { wa_kaleyra_sid, wa_kaleyra_apikey, wa_kaleyra_numero_telefono } = kaleyraConfig;

    // Preparazione dell'URL per l'API Kaleyra
    const url = `https://api.kaleyra.io/v1/${wa_kaleyra_sid}/messages`;

    // Creazione del FormData per la richiesta a Kaleyra
    const formData = new FormData();
    formData.append('to', mobile);
    formData.append('type', 'text');
    formData.append('channel', 'whatsapp');
    formData.append('from', wa_kaleyra_numero_telefono);
    formData.append('body', message);

    // Aggiunta di media_url e mime_type se presenti
    if (media_url && mime_type) {
      formData.append('media_url', media_url);
      formData.append('content_type', mime_type);
    }

    // Invio della richiesta a Kaleyra
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': wa_kaleyra_apikey,
      },
      body: formData,
    });

    // Gestione della risposta di Kaleyra
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Errore nella risposta di Kaleyra:', errorData);
      return NextResponse.json({ error: 'Errore nell\'invio del messaggio' }, { status: response.status });
    }

    const data = await response.json();

    // Salvataggio del messaggio nel database del cliente
    const clientConfig = await getClientDbConfig(codice_spotty);
    const clientConnection = await connectToClientDb(clientConfig);
    if (clientConnection) {
      try {
        // Inserimento del messaggio nella tabella LogInvioWhatsApp
        await clientConnection.execute(
          `INSERT INTO LogInvioWhatsApp 
          (Data, CodiceCliente, Telefono, Messaggio, MessageId, TipoInvio, Status) 
          VALUES (NOW(), ?, ?, ?, ?, 'chat', 0)`,
          [codice_spotty, mobile, message, data.id]
        );
      } catch (dbError) {
        console.error('Errore nel salvataggio del messaggio nel database:', dbError);
      } finally {
        // Chiusura della connessione al database
        await clientConnection.end();
      }
    } else {
      console.error('Impossibile connettersi al database del cliente');
    }

    // Restituzione della risposta di Kaleyra al client
    return NextResponse.json(data);

  } catch (error) {
    // Gestione degli errori generali
    console.error('Errore nell\'invio del messaggio:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}