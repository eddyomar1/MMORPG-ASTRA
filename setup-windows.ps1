[CmdletBinding()]
param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$RequiredNodeMajor = 24
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not $IsWindows -and $env:OS -ne 'Windows_NT') { throw 'Este instalador debe ejecutarse en Windows.' }
if (-not (Test-Path package.json) -or -not (Test-Path package-lock.json)) { throw 'Ejecuta este script desde una copia completa del repositorio de Astra.' }

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machine;$user"
}
function Test-Command([string]$Name) { return [bool](Get-Command $Name -ErrorAction SilentlyContinue) }
function Node-Compatible {
  if (-not (Test-Command 'node')) { return $false }
  $major = [int]((node --version).TrimStart('v').Split('.')[0])
  return $major -ge $RequiredNodeMajor
}
function Tool-Version([string]$Name, [scriptblock]$GetVersion) {
  if (Test-Command $Name) { & $GetVersion } else { 'no instalado' }
}
function Show-Status {
  Write-Host ('{0,-16} {1}' -f 'Sistema', [Environment]::OSVersion.VersionString)
  Write-Host ('{0,-16} {1}' -f 'Git', (Tool-Version git { git --version }))
  Write-Host ('{0,-16} {1}' -f 'Node.js', (Tool-Version node { node --version }))
  Write-Host ('{0,-16} {1}' -f 'npm', (Tool-Version npm.cmd { npm.cmd --version }))
  Write-Host ('{0,-16} {1}' -f 'cloudflared', (Tool-Version cloudflared { cloudflared --version | Select-Object -First 1 }))
}
function Invoke-Winget([string[]]$Arguments) {
  & winget @Arguments --accept-package-agreements --accept-source-agreements --disable-interactivity
  if ($LASTEXITCODE -ne 0) { throw "winget terminó con código $LASTEXITCODE." }
  Refresh-Path
}
function Install-Or-Upgrade([string]$Id, [string]$Command) {
  if (Test-Command $Command) {
    Write-Host "Buscando actualización para $Id…"
    & winget upgrade --id $Id --exact --source winget --accept-package-agreements --accept-source-agreements --disable-interactivity
    if ($LASTEXITCODE -notin @(0, -1978335189)) { Write-Warning "winget no pudo actualizar $Id; se conservará la versión instalada." }
    Refresh-Path
  } else {
    Write-Host "Instalando $Id…"
    Invoke-Winget -Arguments @('install', '--id', $Id, '--exact', '--source', 'winget')
  }
}

Write-Host 'Comprobando el entorno de Astra…'
Show-Status
if ($CheckOnly) {
  $missing = @()
  if (-not (Test-Command winget)) { $missing += 'WinGet (App Installer)' }
  if (-not (Test-Command git)) { $missing += 'Git' }
  if (-not (Node-Compatible)) { $missing += "Node.js $RequiredNodeMajor o posterior" }
  if (-not (Test-Command npm.cmd)) { $missing += 'npm' }
  if (-not (Test-Command cloudflared)) { $missing += 'cloudflared' }
  if ($missing.Count) { Write-Error ('Faltan requisitos: ' + ($missing -join ', ')); exit 1 }
  Write-Host 'El entorno cumple todos los requisitos.'
  exit 0
}

if (-not (Test-Command winget)) { throw 'No se encontró winget. Instala o actualiza “App Installer” desde Microsoft Store y vuelve a ejecutar este script.' }
Install-Or-Upgrade 'Git.Git' 'git'
if (-not (Node-Compatible)) {
  if (Test-Command node) { Write-Host "La versión actual de Node.js es anterior a $RequiredNodeMajor; se instalará la versión LTS compatible." }
  Invoke-Winget -Arguments @('install', '--id', 'OpenJS.NodeJS.LTS', '--exact', '--source', 'winget', '--force')
} else { Install-Or-Upgrade 'OpenJS.NodeJS.LTS' 'node' }
Install-Or-Upgrade 'Cloudflare.cloudflared' 'cloudflared'
Refresh-Path

if (-not (Node-Compatible) -or -not (Test-Command npm.cmd)) { throw "Node.js $RequiredNodeMajor o posterior con npm no quedó disponible. Abre PowerShell de nuevo y repite el script." }
Write-Host 'Restaurando dependencias fijadas y compilando…'
& npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci falló.' }
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'La compilación falló.' }
if (Test-Path .git) {
  & npm.cmd run 'git:setup'
  if ($LASTEXITCODE -ne 0) { throw 'No se pudieron configurar los hooks locales.' }
} else { Write-Host 'No se configuraron hooks porque esta carpeta no es un clon de Git.' }

Write-Host ''
Write-Host 'Astra está preparado. Ejecuta: npm start'
Write-Host 'Para publicar temporalmente: npm run tunnel'
Show-Status
