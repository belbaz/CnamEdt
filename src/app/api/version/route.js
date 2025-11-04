import { NextResponse } from 'next/server';
import packageJson from '../../../../package.json';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering pour Vercel
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

	// Valeurs par défaut
	let latestVersion = packageJson.version;
	let resolvedUrl = `${origin}/api/download/apk`;

	// Optionnel: essayer de déterminer la dernière version disponible depuis Supabase
	try {
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aeftxgwfokzlspojzisx.supabase.co';
		const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;
		const BUCKET_NAME = 'Apk Edt Eicnam';

		if (supabaseServiceRole) {
			const supabase = createClient(supabaseUrl, supabaseServiceRole);
			const { data: files, error } = await supabase.storage
				.from(BUCKET_NAME)
				.list('apk', { limit: 100 });

			if (error) throw error;
			if (!files || files.length === 0) throw new Error('Aucun fichier APK trouvé');

			const relevantFiles = files.filter(file => {
				return file.name.startsWith('edt_cnam_v') && !file.name.includes('_test_') && file.name.endsWith('.apk');
			});

			const extractVersion = (filename) => {
				const m = filename.match(/edt_cnam_v(\d+\.\d+(?:\.\d+)?)\.apk$/);
				return m ? m[1] : null;
			};

			const compareVersions = (a, b) => {
				const pa = a.split('.').map(Number);
				const pb = b.split('.').map(Number);
				while (pa.length < 3) pa.push(0);
				while (pb.length < 3) pb.push(0);
				for (let i = 0; i < 3; i++) {
					if (pa[i] > pb[i]) return 1;
					if (pa[i] < pb[i]) return -1;
				}
				return 0;
			};

			let latest = null;
			for (const f of relevantFiles) {
				const v = extractVersion(f.name);
				if (!v) continue;
				if (!latest || compareVersions(v, latest) > 0) latest = v;
			}

			if (latest) {
				latestVersion = latest;
				resolvedUrl = `${origin}/api/download/apk?version=${encodeURIComponent(latestVersion)}`;
			}
		}
	} catch (e) {
		console.warn('[API Version] Impossible de déterminer la dernière version exacte, utilisation des valeurs par défaut:', e?.message || e);
	}

	const responseBody = {
		version: latestVersion,
		url: resolvedUrl,
		changelog: null
	};

	console.log(`📦 Version API → ${latestVersion}`);

	return NextResponse.json(responseBody, {
		headers: {
			'Cache-Control': 'no-store, max-age=0'
		}
	});
}

