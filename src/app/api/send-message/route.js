import { NextResponse } from 'next/server';
import { getKaleyraConfig, getClientDbConfig, connectToClientDb } from '../../../utils/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  // Il resto del codice rimane invariato
  // ...
}