// app/api/messages/route.js

import { NextResponse } from 'next/server';
import { getClientDbConfig, connectToClientDb, logKaleyraError } from '../../../utils/db';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  // Il resto del codice rimane invariato
  // ...
}
