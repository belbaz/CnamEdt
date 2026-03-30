#!/usr/bin/env node

/**
 * Script de vérification des optimisations API
 * 
 * Ce script teste :
 * 1. Que la fonction RPC PostgreSQL existe
 * 2. Que l'API retourne bien les compteurs
 * 3. Que le cache fonctionne correctement
 */

const https = require('https');

const BASE_URL = process.env.SITE_URL || 'https://myedt.vercel.app';
const TEST_COURSE_UIDS = [
    "ed42cdce2654b31bb61bd614438ac5d089fc8e5b",
    "737c0565daaaac6e0d7dfc0b709ebcfbaa315845"
];

console.log('🧪 Test des optimisations API\n');
console.log(`Base URL: ${BASE_URL}\n`);

async function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data ? JSON.parse(data) : null,
                    responseTime: Date.now() - startTime
                });
            });
        });

        req.on('error', reject);
        
        const startTime = Date.now();
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function testBatchCounts() {
    console.log('📊 Test 1: Requête /api/files/batch-counts\n');
    
    try {
        const response = await makeRequest('POST', '/api/files/batch-counts', {
            course_uids: TEST_COURSE_UIDS
        });

        console.log(`✅ Statut: ${response.statusCode}`);
        console.log(`⏱️  Temps de réponse: ${response.responseTime}ms`);
        console.log(`📦 Taille de la réponse: ${JSON.stringify(response.body).length} bytes`);
        
        if (response.headers['cache-control']) {
            console.log(`💾 Cache-Control: ${response.headers['cache-control']}`);
        }
        
        if (response.body && response.body.success) {
            console.log(`✅ Compteurs reçus: ${Object.keys(response.body.counts).length} cours`);
            console.log(`📈 Exemple: ${JSON.stringify(response.body.counts).slice(0, 100)}...\n`);
        } else {
            console.log(`❌ Erreur: ${response.body?.error || 'Réponse invalide'}\n`);
        }

        return response.responseTime;
    } catch (error) {
        console.error(`❌ Erreur lors du test:`, error.message);
        return null;
    }
}

async function testCacheEfficiency() {
    console.log('💾 Test 2: Efficacité du cache\n');
    
    try {
        console.log('Requête 1 (sans cache)...');
        const time1 = await testBatchCounts();
        
        console.log('Requête 2 (avec cache potentiel)...');
        const time2 = await testBatchCounts();
        
        if (time1 && time2) {
            const improvement = ((time1 - time2) / time1 * 100).toFixed(1);
            console.log(`\n📊 Analyse:`);
            console.log(`   Première requête: ${time1}ms`);
            console.log(`   Seconde requête: ${time2}ms`);
            
            if (time2 < time1) {
                console.log(`   ✅ Amélioration: ${improvement}% plus rapide`);
            } else {
                console.log(`   ⚠️  Pas d'amélioration détectée (cache CDN peut-être pas actif en local)`);
            }
        }
    } catch (error) {
        console.error(`❌ Erreur lors du test de cache:`, error.message);
    }
}

async function main() {
    console.log('='.repeat(60));
    await testBatchCounts();
    console.log('='.repeat(60));
    await testCacheEfficiency();
    console.log('='.repeat(60));
    console.log('\n✅ Tests terminés!\n');
}

main().catch(console.error);
