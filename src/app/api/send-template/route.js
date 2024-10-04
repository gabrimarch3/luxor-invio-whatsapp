import { NextResponse } from 'next/server';
import { getKaleyraConfig, getClientDbConfig, connectToClientDb } from '../../../utils/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  // Il resto del codice rimane invariato
  // ...
}

// Rimuovi la funzione POST se non è necessaria