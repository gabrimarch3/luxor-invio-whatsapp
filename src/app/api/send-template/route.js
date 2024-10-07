import { NextResponse } from 'next/server';
import { getKaleyraConfig, getClientDbConfig, connectToClientDb } from '../../../utils/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const codice_spotty = searchParams.get('codice_spotty');
  const mobile = searchParams.get('mobile');
  const template_name = searchParams.get('template_name');
  const params = searchParams.get('params');
  const lang_code = searchParams.get('lang_code');

  console.log('Dati ricevuti per template di testo:', {
    codice_spotty,
    mobile,
    template_name,
    params,
    lang_code
  });

  if (!codice_spotty || !mobile || !template_name) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
  }

  try {
    const kaleyraConfig = await getKaleyraConfig(codice_spotty);

    if (!kaleyraConfig) {
      return NextResponse.json({ error: 'Configurazione Kaleyra non trovata' }, { status: 400 });
    }

    const { wa_kaleyra_sid, wa_kaleyra_apikey, wa_kaleyra_numero_telefono } = kaleyraConfig;

    const baseUrl = `https://api.kaleyra.io/v1/${wa_kaleyra_sid}/messages`;

    const queryParams = new URLSearchParams({
      channel: 'whatsapp',
      to: mobile,
      from: wa_kaleyra_numero_telefono,
      type: 'template',
      template_name: template_name,
      lang_code: lang_code || 'it',
      callback_url: 'https://apiv2dev.spottywifi.app/wappybusiness/webhook_callback_kaleyra.php'
    });

    if (params) {
      queryParams.append('params', params);
    }

    const url = `${baseUrl}?${queryParams.toString()}`;

    console.log('URL completo della richiesta a Kaleyra:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api-key': wa_kaleyra_apikey,
      },
    });

    console.log('Risposta Kaleyra status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Errore nella risposta di Kaleyra:', errorData);
      return NextResponse.json({ error: 'Errore nell\'invio del template', details: errorData }, { status: response.status });
    }

    const data = await response.json();
    console.log('Risposta Kaleyra data:', data);

    // Salva il messaggio nel database del cliente
    const clientConfig = await getClientDbConfig(codice_spotty);
    const clientConnection = await connectToClientDb(clientConfig);
    if (clientConnection) {
      try {
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
        await clientConnection.end();
      }
    } else {
      console.error('Impossibile connettersi al database del cliente');
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Errore nell\'invio del template:', error);
    return NextResponse.json({ error: 'Errore interno del server', details: error.message }, { status: 500 });
  }
}

// Rimuovi la funzione POST se non è necessaria