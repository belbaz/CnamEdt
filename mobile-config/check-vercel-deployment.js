/**
 * Script pour vérifier le statut du dernier déploiement Vercel
 * Usage: node check-vercel-deployment.js [timeoutSeconds]
 */

const { execSync } = require('child_process');
const readline = require('readline');

const timeoutSeconds = parseInt(process.argv[2]) || 180; // 3 minutes par défaut
const checkInterval = 5000; // Vérifier toutes les 5 secondes
const maxChecks = Math.floor((timeoutSeconds * 1000) / checkInterval);

function waitForVercelDeployment() {
    console.log(`\n⏳ Attente de la détection du push par Vercel (10 secondes)...`);
    
    // Attendre que Vercel détecte le push
    return new Promise(resolve => {
        setTimeout(() => {
            console.log(`🔍 Vérification du statut du déploiement...\n`);
            resolve();
        }, 10000);
    });
}

function checkDeploymentStatus() {
    try {
        // Vérifier si vercel CLI est disponible
        try {
            execSync('vercel --version', { stdio: 'ignore' });
        } catch {
            return { available: false, error: 'Vercel CLI non disponible' };
        }

        // Récupérer les déploiements récents
        // Essayer plusieurs formats de sortie selon la version de Vercel CLI
        let output;
        try {
            output = execSync('vercel ls --limit 1 --json', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
        } catch (error) {
            // Si --json ne fonctionne pas, essayer sans JSON et parser
            try {
                output = execSync('vercel ls --limit 1', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
                // Si c'est du texte, on ne peut pas parser facilement
                return { available: true, status: 'PARSING_ERROR', message: 'Format de sortie non-JSON' };
            } catch {
                return { available: true, error: 'Impossible d\'exécuter vercel ls', status: 'ERROR_CHECK' };
            }
        }

        // Parser le JSON
        let deployments;
        try {
            // Vercel peut retourner plusieurs lignes JSON ou un seul objet
            const lines = output.trim().split('\n').filter(line => line.trim());
            if (lines.length === 0) {
                return { available: true, status: 'NO_DEPLOYMENT', message: 'Aucun déploiement trouvé' };
            }
            
            // Essayer de parser chaque ligne comme JSON
            deployments = lines.map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return null;
                }
            }).filter(Boolean);
            
            if (deployments.length === 0) {
                // Essayer de parser toute la sortie comme un tableau JSON
                deployments = JSON.parse(output);
            }
        } catch (parseError) {
            return { available: true, error: 'Erreur de parsing: ' + parseError.message, status: 'ERROR_CHECK' };
        }
        
        if (!deployments || deployments.length === 0) {
            return { available: true, status: 'NO_DEPLOYMENT', message: 'Aucun déploiement trouvé' };
        }

        // Si c'est un tableau, prendre le premier élément
        const latest = Array.isArray(deployments) ? deployments[0] : deployments;
        const state = latest.state || latest.status || 'UNKNOWN';
        const url = latest.url || latest.ready?.url || 'N/A';
        const createdAt = latest.createdAt ? new Date(latest.createdAt * 1000).toLocaleTimeString('fr-FR') : 
                         latest.created ? new Date(latest.created).toLocaleTimeString('fr-FR') : 'N/A';

        return {
            available: true,
            status: state,
            url: url,
            createdAt: createdAt,
            ready: state === 'READY' || state === 'DEPLOYED',
            error: state === 'ERROR' || state === 'CANCELED' || state === 'FAILED'
        };
    } catch (error) {
        return { available: true, error: error.message, status: 'ERROR_CHECK' };
    }
}

async function monitorDeployment() {
    await waitForVercelDeployment();

    let checks = 0;
    
    while (checks < maxChecks) {
        const result = checkDeploymentStatus();

        if (!result.available) {
            console.log(`⚠️  ${result.error}`);
            console.log(`   Le déploiement est probablement en cours, mais Vercel CLI n'est pas disponible pour vérifier.`);
            process.exit(0);
        }

        if (result.error && result.status === 'ERROR_CHECK') {
            // Erreur de vérification, continuer à vérifier
            process.stdout.write(`\r⏳ Vérification... (${checks + 1}/${maxChecks})`);
        } else if (result.status === 'NO_DEPLOYMENT') {
            process.stdout.write(`\r⏳ En attente du démarrage du déploiement... (${checks + 1}/${maxChecks})`);
        } else if (result.ready) {
            console.log(`\n\n✅ ========================================`);
            console.log(`   DEPLOIEMENT VERCEL TERMINE !`);
            console.log(`========================================\n`);
            console.log(`🌐 URL: ${result.url}`);
            console.log(`⏰ Créé à: ${result.createdAt}`);
            console.log(`\n✅ Le site est maintenant en ligne !\n`);
            process.exit(0);
        } else if (result.error) {
            console.log(`\n\n❌ ========================================`);
            console.log(`   DEPLOIEMENT VERCEL EN ERREUR`);
            console.log(`========================================\n`);
            console.log(`État: ${result.status}`);
            console.log(`Consultez le dashboard Vercel pour plus de détails.`);
            process.exit(1);
        } else {
            // En cours (BUILDING, QUEUED, etc.)
            const statusEmoji = result.status === 'BUILDING' ? '🔨' : 
                              result.status === 'QUEUED' ? '⏸️' : '⏳';
            process.stdout.write(`\r${statusEmoji} Statut: ${result.status}... (${checks + 1}/${maxChecks})`);
        }

        checks++;
        
        if (checks < maxChecks) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
    }

    console.log(`\n\n⚠️  Timeout atteint (${timeoutSeconds} secondes)`);
    console.log(`   Le déploiement est probablement toujours en cours.`);
    console.log(`   Consultez le dashboard Vercel: https://vercel.com/dashboard`);
    process.exit(0);
}

monitorDeployment().catch(error => {
    console.error(`\n❌ Erreur: ${error.message}`);
    process.exit(1);
});

