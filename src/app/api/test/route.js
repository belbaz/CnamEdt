import { NextResponse } from 'next/server';

// Route de test simple pour vérifier que les API routes fonctionnent
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'API routes fonctionnent correctement',
    timestamp: new Date().toISOString()
  });
}

