# Script PowerShell pour tester l'automatisation EDT CNAM
# Usage: .\scripts\test-automation.ps1 [url]
# Exemple: .\scripts\test-automation.ps1 http://localhost:3000
# Exemple: .\scripts\test-automation.ps1 https://votre-domaine.vercel.app

param(
    [string]$BaseUrl = "http://localhost:3000"
)

Write-Host ""
Write-Host "========================================"
Write-Host "  Test d'automatisation EDT CNAM"
Write-Host "========================================"
Write-Host ""
Write-Host "📍 URL de base: $BaseUrl"
Write-Host ""

function Test-Endpoint {
    param(
        [string]$Path,
        [string]$Description
    )
    
    Write-Host "🧪 Test: $Description"
    Write-Host "   URL: $BaseUrl$Path"
    
    try {
        $startTime = Get-Date
        $response = Invoke-WebRequest -Uri "$BaseUrl$Path" -Method GET -UseBasicParsing -ErrorAction Stop
        $duration = (Get-Date) - $startTime
        $durationMs = [math]::Round($duration.TotalMilliseconds)
        
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ Succès ($($response.StatusCode)) - ${durationMs}ms" -ForegroundColor Green
            
            # Essayer de parser le JSON
            try {
                $json = $response.Content | ConvertFrom-Json
                Write-Host "   📊 Réponse:" -ForegroundColor Cyan
                $json | ConvertTo-Json -Depth 3 | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
            } catch {
                $preview = $response.Content.Substring(0, [Math]::Min(100, $response.Content.Length))
                Write-Host "   📊 Réponse: $preview..." -ForegroundColor Gray
            }
            
            Write-Host ""
            return @{ Success = $true; Status = $response.StatusCode; Duration = $durationMs }
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        Write-Host "   ❌ Échec ($statusCode)" -ForegroundColor Red
        Write-Host "   📊 Erreur: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        return @{ Success = $false; Status = $statusCode; Error = $_.Exception.Message }
    }
}

# Exécuter les tests
$results = @()

$results += Test-Endpoint -Path "/api/test-update" -Description "Mise à jour table test_edt"
$results += Test-Endpoint -Path "/api/fetch-ics" -Description "Fetch ICS et mise à jour EDT"

# Résumé
Write-Host "========================================"
Write-Host "  Résumé des tests"
Write-Host "========================================"
Write-Host ""

$successCount = ($results | Where-Object { $_.Success -eq $true }).Count
$totalCount = $results.Count

foreach ($result in $results) {
    if ($result.Success) {
        $icon = "✅"
        $color = "Green"
    } else {
        $icon = "❌"
        $color = "Red"
    }
    
    $status = if ($result.Status) { $result.Status } else { "ERROR" }
    $time = if ($result.Duration) { "($($result.Duration)ms)" } else { "" }
    
    Write-Host "$icon Test $($results.IndexOf($result) + 1): $status $time" -ForegroundColor $color
}

Write-Host ""
Write-Host "📊 Résultat: $successCount/$totalCount tests réussis"

if ($successCount -eq $totalCount) {
    Write-Host ""
    Write-Host "✅ Tous les tests sont passés avec succès !" -ForegroundColor Green
    Write-Host "   L'automatisation devrait fonctionner correctement." -ForegroundColor Green
    Write-Host ""
    exit 0
} else {
    Write-Host ""
    Write-Host "⚠️ Certains tests ont échoué." -ForegroundColor Yellow
    Write-Host "   Vérifiez les logs ci-dessus pour plus de détails." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

