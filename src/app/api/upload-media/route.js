import { NextResponse } from 'next/server';
import { getKaleyraConfig, getClientDbConfig, connectToClientDb } from '../../../utils/db';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const codice_spotty = formData.get('codice_spotty');
  const mobile = formData.get('mobile');
  const caption = formData.get('caption') || '';

  if (!codice_spotty || !mobile || !file) {
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
  }

  const kaleyraConfig = await getKaleyraConfig(codice_spotty);

  if (!kaleyraConfig) {
    return NextResponse.json({ error: 'Configurazione Kaleyra non trovata' }, { status: 400 });
  }

  const { wa_kaleyra_sid, wa_kaleyra_apikey } = kaleyraConfig;

  const url = `https://api.kaleyra.io/v1/${wa_kaleyra_sid}/messages`;

  const kaleyraFormData = new FormData();
  kaleyraFormData.append('to', mobile);
  kaleyraFormData.append('type', 'media');
  kaleyraFormData.append('channel', 'whatsapp');
  kaleyraFormData.append('from', kaleyraConfig.wa_kaleyra_numero_telefono);
  kaleyraFormData.append('media', file);
  kaleyraFormData.append('caption', caption);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': wa_kaleyra_apikey,
      },
      body: kaleyraFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Errore nella risposta di Kaleyra:', errorData);
      return NextResponse.json({ error: 'Errore nell\'invio del file' }, { status: response.status });
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
          [codice_spotty, mobile, caption, data.id]
        );
      } catch (dbError) {
        console.error('Errore nel salvataggio del messaggio nel database:', dbError);
      } finally {
        await clientConnection.end();
      }
    } else {
      console.error('Impossibile connettersi al database del cliente');
    }

    return NextResponse.json({
      media_url: data.media_url,
      mime_type: file.type,
      message_id: data.id,
    });
  } catch (error) {
    console.error('Errore nell\'invio del file:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}