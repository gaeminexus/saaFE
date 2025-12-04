# Script para iniciar Angular con proxy funcional
Write-Host "=== Iniciando servidor Angular con Proxy ===" -ForegroundColor Green
Write-Host ""

# Verificar si el backend está corriendo
$backendRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8080/SaaBE/rest/usro/getAll" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    $backendRunning = $true
    Write-Host "✓ Backend detectado en http://127.0.0.1:8080" -ForegroundColor Green
} catch {
    Write-Host "✗ ADVERTENCIA: Backend NO está corriendo en http://127.0.0.1:8080" -ForegroundColor Yellow
    Write-Host "  El proxy redirigirá las peticiones pero el backend debe estar activo." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Iniciando Angular Dev Server..." -ForegroundColor Cyan
Write-Host "Proxy configurado: /SaaBE -> http://127.0.0.1:8080" -ForegroundColor Cyan
Write-Host ""

# Iniciar ng serve con proxy
npm start
