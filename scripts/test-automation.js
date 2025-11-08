#!/usr/bin/env node

/**
 * Script de test pour vérifier l'automatisation
 * Usage: node scripts/test-automation.js [url]
 * Exemple: node scripts/test-automation.js http://localhost:3000
 * Exemple: node scripts/test-automation.js https://votre-domaine.vercel.app
 */

const baseUrl = process.argv[2] || 'http://localhost:3000';

console.log('\n========================================');
console.log('  Test d\'automatisation EDT CNAM');
console.log('========================================\n');
console.log(`📍 URL de base: ${baseUrl}\n`);

async function testEndpoint(path, description) {
    console.log(`🧪 Test: ${description}`);
    console.log(`   URL: ${baseUrl}${path}`);
    
    try {
        const startTime = Date.now();
        const response = await fetch(`${baseUrl}${path}`);
        const duration = Date.now() - startTime;
        
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        
        if (response.ok) {
            console.log(`   ✅ Succès (${response.status}) - ${duration}ms`);
            if (typeof data === 'object') {
                console.log(`   📊 Réponse:`, JSON.stringify(data, null, 2).split('\n').map(l => '      ' + l).join('\n').trim());
            } else {
                const preview = String(data).slice(0, 100);
                console.log(`   📊 Réponse: ${preview}${data.length > 100 ? '...' : ''}`);
            }
            return { success: true, status: response.status, data, duration };
        } else {
            console.log(`   ❌ Échec (${response.status})`);
            console.log(`   📊 Erreur:`, data);
            return { success: false, status: response.status, data, duration };
        }
    } catch (error) {
        console.log(`   ❌ Erreur réseau: ${error.message}`);
        return { success: false, error: error.message };
    } finally {
        console.log('');
    }
}

async function runTests() {
    const tests = [
        { path: '/api/test-update', description: 'Mise à jour table test_edt' },
        { path: '/api/fetch-ics', description: 'Fetch ICS et mise à jour EDT' },
    ];
    
    const results = [];
    
    for (const test of tests) {
        const result = await testEndpoint(test.path, test.description);
        results.push({ ...test, ...result });
    }
    
    console.log('========================================');
    console.log('  Résumé des tests');
    console.log('========================================\n');
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    results.forEach(r => {
        const icon = r.success ? '✅' : '❌';
        const status = r.status || 'ERROR';
        const time = r.duration ? `(${r.duration}ms)` : '';
        console.log(`${icon} ${r.description}: ${status} ${time}`);
    });
    
    console.log('');
    console.log(`📊 Résultat: ${successCount}/${totalCount} tests réussis`);
    
    if (successCount === totalCount) {
        console.log('\n✅ Tous les tests sont passés avec succès !');
        console.log('   L\'automatisation devrait fonctionner correctement.\n');
        process.exit(0);
    } else {
        console.log('\n⚠️ Certains tests ont échoué.');
        console.log('   Vérifiez les logs ci-dessus pour plus de détails.\n');
        process.exit(1);
    }
}

// Vérifier que fetch est disponible (Node 18+)
if (typeof fetch === 'undefined') {
    console.error('❌ Erreur: fetch n\'est pas disponible.');
    console.error('   Node.js 18+ est requis, ou installez node-fetch.\n');
    process.exit(1);
}

runTests().catch(error => {
    console.error('\n❌ Erreur fatale:', error.message);
    process.exit(1);
});

