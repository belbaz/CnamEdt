import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Force dynamic rendering pour Vercel
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Lire package.json de manière synchrone pour éviter les problèmes d'import en production
function getPackageVersion() {
	try {
		const packagePath = path.join(process.cwd(), 'package.json');
		const packageContent = fs.readFileSync(packagePath, 'utf8');
		const packageJson = JSON.parse(packageContent);
		return packageJson.version || '2.0.66';
	} catch (e) {
		console.warn('[API Version] Impossible de lire package.json, utilisation de la version par défaut:', e.message);
		return '2.0.66';
	}
}

export async function GET(request) {
	// Construire l'origine pour générer des URLs absolues (éviter le mixed-content)
	// Utiliser l'URL de la requête, qui contient déjà le bon protocole (https en prod)
	const origin = (() => {
		try {
			return new URL(request.url).origin;
		} catch {
			return process.env.NEXT_PUBLIC_SITE_URL || 'https://edt-eicnam.vercel.app';
		}
	})();

	// Récupérer la version depuis package.json
	const latestVersion = getPackageVersion();
	const resolvedUrl = `${origin}/api/download/apk`;

	const responseBody = {
		version: latestVersion,
		url: resolvedUrl,
		changelog: null
	};

	console.log(`📦 Version API → ${latestVersion} (depuis package.json)`);

	return NextResponse.json(responseBody, {
		headers: {
			'Cache-Control': 'no-store, max-age=0'
		}
	});
}

