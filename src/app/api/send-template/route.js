// Importazione delle dipendenze necessarie
import { NextResponse } from 'next/server';
import { getKaleyraConfig, getClientDbConfig, connectToClientDb } from '../../../utils/db';

// Configurazione per Next.js: forza il rendering dinamico e usa il runtime Node.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Funzione principale per gestire le richieste GET
export async function GET(request) {
  // Estrazione dei parametri dalla query string
  const { searchParams } = new URL(request.url);
  const codice_spotty = searchParams.get('codice_spotty');
  const mobile = searchParams.get('mobile');
  const template_name = searchParams.get('template_name');
  const params = searchParams.get('params');
  const lang_code = searchParams.get('lang_code');

  // Log dei dati ricevuti per debugging
  console.log('Dati ricevuti per template di testo:', {
    codice_spotty,
    mobile,
    template_name,
    params,
    lang_code
  });

  // Verifica della presenza dei parametri obbligatori
  if (!codice_spotty || !mobile || !template_name) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
  }

  try {
    // Recupero della configurazione Kaleyra per il cliente
    const kaleyraConfig = await getKaleyraConfig(codice_spotty);

    if (!kaleyraConfig) {
      return NextResponse.json({ error: 'Configurazione Kaleyra non trovata' }, { status: 400 });
    }

    // Estrazione dei dati di configurazione Kaleyra
    const { wa_kaleyra_sid, wa_kaleyra_apikey, wa_kaleyra_numero_telefono } = kaleyraConfig;

    // Preparazione dell'URL base per l'API Kaleyra
    const baseUrl = `https://api.kaleyra.io/v1/${wa_kaleyra_sid}/messages`;

    // Costruzione dei parametri della query
    const queryParams = new URLSearchParams({
      channel: 'whatsapp',
      to: mobile,
      from: wa_kaleyra_numero_telefono,
      type: 'template',
      template_name: template_name,
      lang_code: lang_code || 'it',
      callback_url: 'https://apiv2dev.spottywifi.app/wappybusiness/webhook_callback_kaleyra.php'
    });

    // Aggiunta dei parametri del template se presenti
    if (params) {
      queryParams.append('params', params);
    }

    // Costruzione dell'URL completo
    const url = `${baseUrl}?${queryParams.toString()}`;

    console.log('URL completo della richiesta a Kaleyra:', url);

    // Invio della richiesta a Kaleyra
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api-key': wa_kaleyra_apikey,
      },
    });

    console.log('Risposta Kaleyra status:', response.status);

    // Gestione della risposta di Kaleyra
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Errore nella risposta di Kaleyra:', errorData);
      return NextResponse.json({ error: 'Errore nell\'invio del template', details: errorData }, { status: response.status });
    }

    const data = await response.json();
    console.log('Risposta Kaleyra data:', data);

    // Salvataggio del messaggio nel database del cliente
    const clientConfig = await getClientDbConfig(codice_spotty);
    const clientConnection = await connectToClientDb(clientConfig);
    if (clientConnection) {
      try {
        // Inserimento del record nel database del cliente
        await clientConnection.execute(
          `INSERT INTO LogInvioWhatsApp 
          (Data, CodiceCliente, Telefono, Messaggio, MessageId, TipoInvio, NomeTemplate, Status) 
          VALUES (NOW(), ?, ?, ?, ?, 'template', ?, 0)`,
          [codice_spotty, mobile, params, data.id, template_name]
        );
        console.log('Messaggio salvato nel database del cliente');
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
    console.error('Errore nell\'invio del template:', error);
    return NextResponse.json({ error: 'Errore interno del server', details: error.message }, { status: 500 });
  }
}

// La funzione POST è stata rimossa come richiesto