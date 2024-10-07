// app/api/templates/route.js

import { NextResponse } from 'next/server';
import { getClientDbConfig, connectToClientDb, logKaleyraError } from '../../../utils/db';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const codiceSpotty = searchParams.get('codice_spotty');

  // Verifica che 'codice_spotty' sia stato fornito
  if (!codiceSpotty) {
    return NextResponse.json({ message: 'Codice Spotty non fornito' }, { status: 400 });
  }

  // Ottieni la configurazione del database del cliente
  const clientConfig = await getClientDbConfig(codiceSpotty);

  if (!clientConfig) {
    return NextResponse.json({ message: 'Codice Spotty non valido' }, { status: 400 });
  }

  // Connettiti al database del cliente
  const clientConnection = await connectToClientDb(clientConfig);

  if (!clientConnection) {
    return NextResponse.json({ message: 'Connessione al database del cliente fallita' }, { status: 500 });
  }

  try {
    // Query per recuperare i template abilitati con tutti i testi per le varie lingue
    const [templates] = await clientConnection.execute(
      `
      SELECT 
        m.Uuid, 
        m.Nome, 
        m.NomeTemplate, 
        m.Canale, 
        m.NomeMittente, 
        m.Immagine, 
        m.Status, 
        m.DataCreazione, 
        m.DataModifica,
        t.Lingua, 
        t.CorpoMessaggio, 
        t.Oggetto
      FROM 
        spottymkt_messaggi m
      LEFT JOIN 
        spottymkt_messaggi_testo t 
      ON 
        m.Uuid = t.UuidMessaggio
      WHERE 
        m.Status = 'Approved'
      ORDER BY 
        m.NomeTemplate ASC
      `
    );

    // Organizza i template per lingua
    const groupedByLanguage = {};

    templates.forEach(template => {
      const language = template.Lingua;

      if (!groupedByLanguage[language]) {
        groupedByLanguage[language] = [];
      }

      groupedByLanguage[language].push({
        Uuid: template.Uuid,
        Nome: template.Nome,
        NomeTemplate: template.NomeTemplate,
        Canale: template.Canale,
        NomeMittente: template.NomeMittente,
        Immagine: template.Immagine,
        Status: template.Status,
        DataCreazione: template.DataCreazione,
        DataModifica: template.DataModifica,
        CorpoMessaggio: template.CorpoMessaggio,
        Oggetto: template.Oggetto,
        IsMediaTemplate: !!template.Immagine // Aggiungiamo questo campo per distinguere i template con media
      });
    });

    await clientConnection.end();

    return NextResponse.json({ templates: groupedByLanguage });
  } catch (error) {
    console.error('Errore nel recupero dei template:', error.message);
    return NextResponse.json({ message: 'Errore nel recupero dei template' }, { status: 500 });
  }
}
