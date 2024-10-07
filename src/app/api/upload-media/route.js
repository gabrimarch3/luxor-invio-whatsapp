import { NextResponse } from 'next/server';
import { getKaleyraConfig, getClientDbConfig, connectToClientDb } from '../../../utils/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request) {
  // Il resto del codice rimane invariato
  // ...
}