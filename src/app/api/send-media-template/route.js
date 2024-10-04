import { NextResponse } from 'next/server';
import { getKaleyraConfig, getClientDbConfig, connectToClientDb } from '../../../utils/db';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request) {
  const formData = await request.formData();
  const codice_spotty = formData.get('codice_spotty');
  const mobile = formData.get('mobile');
  const template_name = formData.get('template_name');
  const lang_code = formData.get('lang_code');
  const media_url = formData.get('media_url');
  const caption = formData.get('caption');

  console.log('Dati ricevuti:', {
    codice_spotty,
    mobile,
    template_name,
    lang_code,
    media_url,
    caption
  });

  if (!codice_spotty || !mobile || !template_name || !media_url) {
    console.log('Parametri mancanti:', { codice_spotty, mobile, template_name, media_url });
    return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
  }

  const kaleyraConfig = await getKaleyraConfig(codice_spotty);

  if (!kaleyraConfig) {
    console.log('Configurazione Kaleyra non trovata per codice_spotty:', codice_spotty);
    return NextResponse.json({ error: 'Configurazione Kaleyra non trovata' }, { status: 400 });
  }

  console.log('Configurazione Kaleyra:', kaleyraConfig);

  const { wa_kaleyra_sid, wa_kaleyra_apikey, wa_kaleyra_numero_telefono } = kaleyraConfig;

  const url = `https://api.kaleyra.io/v1/${wa_kaleyra_sid}/messages`;

  const kaleyraFormData = new FormData();
  kaleyraFormData.append('to', mobile);
  kaleyraFormData.append('type', 'mediatemplate');
  kaleyraFormData.append('template_name', template_name);
  kaleyraFormData.append('channel', 'whatsapp');
  kaleyraFormData.append('from', wa_kaleyra_numero_telefono);
  kaleyraFormData.append('media_url', media_url);
  
  if (caption) {
    kaleyraFormData.append('caption', caption);
  }
  
  if (lang_code) {
    kaleyraFormData.append('lang_code', lang_code);
  }

  console.log('Dati inviati a Kaleyra:', Object.fromEntries(kaleyraFormData));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': wa_kaleyra_apikey,
      },
      body: kaleyraFormData,
    });

    console.log('Risposta Kaleyra status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Errore nella risposta di Kaleyra:', errorData);
      return NextResponse.json({ error: 'Errore nell\'invio del template con media', details: errorData }, { status: response.status });
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
          VALUES (NOW(), ?, ?, ?, ?, 'template_media', ?, 0)`,
          [codice_spotty, mobile, caption, data.id, template_name]
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
    console.error('Errore nell\'invio del template con media:', error);
    return NextResponse.json({ error: 'Errore interno del server', details: error.message }, { status: 500 });
  }
}