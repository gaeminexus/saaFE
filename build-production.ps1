Write-Host "Compilando para PRODUCCION..." -ForegroundColor Yellow
ng build --configuration production

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en compilacion" -ForegroundColor Red
    exit 1
}

Write-Host "Aplanando estructura (eliminar /browser)..." -ForegroundColor Yellow

$distPath = "dist\saaFE"
$browserPath = "$distPath\browser"

if (-not (Test-Path $browserPath)) {
    Write-Host "Error: No se encontro dist/saaFE/browser/" -ForegroundColor Red
    exit 1
}

Get-ChildItem -Path $browserPath | Move-Item -Destination $distPath -Force
Remove-Item -Path $browserPath -Force

Write-Host "Estructura aplanada correctamente" -ForegroundColor Green

Write-Host "Creando WEB-INF/web.xml..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "$distPath\WEB-INF" | Out-Null

$webXml = @'
<?xml version="1.0" encoding="UTF-8"?>
<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee
         http://xmlns.jcp.org/xml/ns/javaee/web-app_4_0.xsd"
         version="4.0">

    <display-name>SaaFE</display-name>

    <welcome-file-list>
        <welcome-file>index.html</welcome-file>
    </welcome-file-list>

    <error-page>
        <error-code>404</error-code>
        <location>/index.html</location>
    </error-page>

    <mime-mapping>
        <extension>html</extension>
        <mime-type>text/html</mime-type>
    </mime-mapping>
    <mime-mapping>
        <extension>js</extension>
        <mime-type>application/javascript</mime-type>
    </mime-mapping>
    <mime-mapping>
        <extension>css</extension>
        <mime-type>text/css</mime-type>
    </mime-mapping>
    <mime-mapping>
        <extension>json</extension>
        <mime-type>application/json</mime-type>
    </mime-mapping>
    <mime-mapping>
        <extension>woff</extension>
        <mime-type>font/woff</mime-type>
    </mime-mapping>
    <mime-mapping>
        <extension>woff2</extension>
        <mime-type>font/woff2</mime-type>
    </mime-mapping>

    <security-constraint>
        <web-resource-collection>
            <web-resource-name>Public Resources</web-resource-name>
            <url-pattern>/*</url-pattern>
        </web-resource-collection>
    </security-constraint>
</web-app>
'@

$webXml | Out-File -FilePath "$distPath\WEB-INF\web.xml" -Encoding UTF8

Write-Host "Creando SaaFE.war..." -ForegroundColor Yellow
Set-Location $distPath
jar -cvf ..\SaaFE.war * | Out-Null
Set-Location ..\..

Write-Host ""
Write-Host "BUILD COMPLETO - SaaFE.war generado" -ForegroundColor Green
Write-Host "Ubicacion: $PWD\dist\SaaFE.war" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verificar estructura del WAR:" -ForegroundColor Yellow
$warFiles = jar -tf dist\SaaFE.war
$warFiles | Select-String "^index\.html$" | ForEach-Object { Write-Host "   OK index.html" -ForegroundColor Green }
$warFiles | Select-String "^WEB-INF/web\.xml$" | ForEach-Object { Write-Host "   OK WEB-INF/web.xml" -ForegroundColor Green }
$warFiles | Select-String "^main-.*\.js$" | Select-Object -First 1 | ForEach-Object { Write-Host "   OK $_" -ForegroundColor Green }
Write-Host ""
Write-Host "Listo para desplegar en EAR" -ForegroundColor Green
