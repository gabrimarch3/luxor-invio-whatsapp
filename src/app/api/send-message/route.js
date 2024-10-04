import { NextResponse } from 'next/server';
import { getKaleyraConfig, getClientDbConfig, connectToClientDb } from '../../../utils/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { codice_spotty, mobile, message, media_url, mime_type } = await request.json();

    if (!codice_spotty || !mobile || !message) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
    }

    const kaleyraConfig = await getKaleyraConfig(codice_spotty);

    if (!kaleyraConfig) {
      return NextResponse.json({ error: 'Configurazione Kaleyra non trovata' }, { status: 400 });
    }

    const { wa_kaleyra_sid, wa_kaleyra_apikey, wa_kaleyra_numero_telefono } = kaleyraConfig;

    const url = `https://api.kaleyra.io/v1/${wa_kaleyra_sid}/messages`;

    const formData = new FormData();
    formData.append('to', mobile);
    formData.append('type', 'text');
    formData.append('channel', 'whatsapp');
    formData.append('from', wa_kaleyra_numero_telefono);
    formData.append('body', message);

    if (media_url && mime_type) {
      formData.append('media_url', media_url);
      formData.append('content_type', mime_type);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': wa_kaleyra_apikey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Errore nella risposta di Kaleyra:', errorData);
      return NextResponse.json({ error: 'Errore nell\'invio del messaggio' }, { status: response.status });
    }

    const data = await response.json();

    // Salva il messaggio nel database del cliente
    const clientConfig = await getClientDbConfig(codice_spotty);
    const clientConnection = await connectToClientDb(clientConfig);
    if (clientConnection) {
      try {
        await clientConnection.execute(
          `INSERT INTO LogInvioWhatsApp 
          (Data, CodiceCliente, Telefono, Messaggio, MessageId, TipoInvio, Status) 
          VALUES (NOW(), ?, ?, ?, ?, 'chat', 0)`,
          [codice_spotty, mobile, message, data.id]
        );
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
    console.error('Errore nell\'invio del messaggio:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}