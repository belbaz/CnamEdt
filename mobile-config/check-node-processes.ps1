# Script PowerShell pour vérifier et tuer les processus Node.js
# Utile avant de lancer build-apk.bat

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verification des processus Node.js" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Chercher tous les processus node.exe
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "⚠️  Processus Node.js detectes:" -ForegroundColor Yellow
    Write-Host ""
    
    $nodeProcesses | ForEach-Object {
        Write-Host "  PID: $($_.Id)" -ForegroundColor White
        Write-Host "  Nom: $($_.ProcessName)" -ForegroundColor White
        Write-Host "  Chemin: $($_.Path)" -ForegroundColor Gray
        
        # Essayer d'afficher la ligne de commande
        try {
            $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
            if ($cmdLine) {
                Write-Host "  Commande: $cmdLine" -ForegroundColor Gray
            }
        } catch {
            # Ignorer les erreurs d'accès WMI
        }
        Write-Host ""
    }
    
    # Demander confirmation
    $response = Read-Host "Voulez-vous arreter ces processus ? (O/N)"
    
    if ($response -eq "O" -or $response -eq "o" -or $response -eq "Y" -or $response -eq "y") {
        Write-Host ""
        Write-Host "Arret des processus Node.js en cours..." -ForegroundColor Yellow
        
        try {
            Stop-Process -Name "node" -Force -ErrorAction Stop
            Write-Host "✓ Tous les processus Node.js ont ete arretes avec succes" -ForegroundColor Green
            
            # Attendre un peu pour s'assurer que les verrous sont libérés
            Start-Sleep -Seconds 2
        } catch {
            Write-Host "✗ Erreur lors de l'arret des processus: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "  Essayez de fermer manuellement le serveur de developpement" -ForegroundColor Red
        }
    } else {
        Write-Host "Operation annulee" -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ Aucun processus Node.js en cours d'execution" -ForegroundColor Green
}

Write-Host ""
Write-Host "Vous pouvez maintenant lancer build-apk.bat" -ForegroundColor Cyan
Write-Host ""
Pause

