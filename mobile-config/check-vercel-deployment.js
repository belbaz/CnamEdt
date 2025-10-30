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

        // Vérifier si l'utilisateur est connecté à Vercel
        try {
            execSync('vercel whoami', { stdio: 'ignore', timeout: 5000 });
        } catch (authError) {
            return { 
                available: true, 
                error: 'Non connecté à Vercel. Exécutez: vercel login', 
                status: 'NOT_LOGGED_IN',
                needsLogin: true
            };
        }

        // Récupérer les déploiements récents avec plusieurs méthodes
        let latest = null;
        let output;
        
        // Essayer vercel ls --json (format le plus simple)
        try {
            output = execSync('vercel ls --limit 5 --json', { 
                encoding: 'utf-8', 
                stdio: ['ignore', 'pipe', 'ignore'],
                timeout: 15000
            });
            
            if (output && output.trim()) {
                const lines = output.trim().split('\n').filter(line => {
                    const trimmed = line.trim();
                    return trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['));
                });
                
                const deployments = [];
                for (const line of lines) {
                    try {
                        const parsed = JSON.parse(line);
                        if (Array.isArray(parsed)) {
                            deployments.push(...parsed);
                        } else if (parsed && typeof parsed === 'object') {
                            deployments.push(parsed);
                        }
                    } catch (e) {
                        // Ignorer les lignes non-JSON valides
                    }
                }
                
                if (deployments.length > 0) {
                    // Trier par date (plus récent en premier)
                    deployments.sort((a, b) => {
                        const timeA = a.createdAt || a.created || 0;
                        const timeB = b.createdAt || b.created || 0;
                        return timeB - timeA;
                    });
                    latest = deployments[0];
                } else if (output.trim().length > 0) {
                    // Si on a une sortie mais pas de JSON valide, afficher un warning
                    // Mais continuer quand même
                }
            }
        } catch (error) {
            // Si vercel ls échoue, on retourne une erreur avec plus d'infos
            return { 
                available: true, 
                error: `Erreur vercel ls: ${error.message || 'Commande échouée'}. Essayez: vercel login`, 
                status: 'ERROR_CHECK' 
            };
        }
        
        if (!latest) {
            return { available: true, status: 'NO_DEPLOYMENT', message: 'Aucun déploiement trouvé' };
        }

        // Extraire les informations du déploiement
        const state = latest.state || latest.readyState || latest.status || 'UNKNOWN';
        const url = latest.url || latest.ready?.url || latest.deployment?.url || latest.target?.url || 'N/A';
        const createdAt = latest.createdAt ? new Date(latest.createdAt * 1000).toLocaleTimeString('fr-FR') : 
                         latest.created ? new Date(latest.created * 1000).toLocaleTimeString('fr-FR') :
                         latest.readyAt ? new Date(latest.readyAt * 1000).toLocaleTimeString('fr-FR') : 'N/A';

        // Normaliser le statut - Vercel utilise différents noms
        const normalizedState = String(state).toUpperCase().trim();
        // READY, DEPLOYED, COMPLETED sont terminés
        // BUILDING, QUEUED, INITIALIZING, ANALYZING sont en cours
        // ERROR, FAILED, CANCELED sont en erreur
        const isReady = normalizedState === 'READY' || 
                       normalizedState === 'DEPLOYED' || 
                       normalizedState === 'COMPLETED' ||
                       normalizedState === 'PREVIEW';
        const isError = normalizedState.includes('ERROR') || 
                       normalizedState === 'CANCELED' || 
                       normalizedState === 'FAILED' || 
                       normalizedState.includes('BUILD_ERROR') ||
                       normalizedState.includes('FAIL');

        return {
            available: true,
            status: normalizedState,
            url: url,
            createdAt: createdAt,
            ready: isReady,
            error: isError
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

        if (result.needsLogin || result.status === 'NOT_LOGGED_IN') {
            // Utilisateur non connecté
            console.log(`\n⚠️  ========================================`);
            console.log(`   VERCEL CLI NON CONNECTE`);
            console.log(`========================================\n`);
            console.log(`Pour suivre le déploiement, connectez-vous avec:`);
            console.log(`   vercel login`);
            console.log(`\nLe déploiement est probablement en cours.`);
            console.log(`Consultez le dashboard: https://vercel.com/dashboard\n`);
            process.exit(0);
        } else if (result.error && result.status === 'ERROR_CHECK') {
            // Erreur de vérification, afficher l'erreur et continuer
            if (checks === 0 || checks % 6 === 0) {
                console.log(`\n⚠️  ${result.error || 'Impossible de récupérer le statut'}`);
                console.log(`   Le déploiement est probablement terminé.`);
                console.log(`   Consultez le dashboard: https://vercel.com/dashboard`);
                console.log(`   Ou vérifiez manuellement: vercel ls\n`);
            }
            process.stdout.write(`\r⏳ Vérification... (${checks + 1}/${maxChecks})`);
        } else if (result.status === 'NO_DEPLOYMENT') {
            // Si on n'a pas de déploiement après plusieurs tentatives, considérer qu'il est terminé
            if (checks >= 6) {
                console.log(`\n\n✅ Déploiement probablement terminé (détection impossible)`);
                console.log(`   Vérifiez manuellement: https://vercel.com/dashboard\n`);
                process.exit(0);
            }
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
                              result.status === 'QUEUED' ? '⏸️' : 
                              result.status === 'INITIALIZING' ? '🚀' :
                              result.status === 'ANALYZING' ? '🔍' : '⏳';
            
            // Afficher le statut avec plus d'infos toutes les 3 vérifications
            if (checks % 3 === 0) {
                process.stdout.write(`\r${statusEmoji} Statut: ${result.status}... (${checks + 1}/${maxChecks})`);
            } else {
                process.stdout.write(`\r${statusEmoji} ${result.status}... (${checks + 1}/${maxChecks})`);
            }
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

