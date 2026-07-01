# Script para rodar o FinTrack no Android (Windows) - celular fisico via USB
# Build nativo via W:\ (evita limite 260 chars). Metro/JS no caminho real do projeto.

$projectRoot = (Resolve-Path $PSScriptRoot).Path.TrimEnd('\')
$shortDrive  = "W:"
$shortRoot   = "${shortDrive}\"

$env:JAVA_HOME        = "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"
$env:ANDROID_HOME     = "$env:LOCALAPPDATA\Android\Sdk"
$env:GRADLE_USER_HOME = "C:\gradle"
$env:PATH             = "$env:ANDROID_HOME\platform-tools;$env:JAVA_HOME\bin;$env:PATH"

# ANDROID_SERIAL vazio no ambiente faz o Gradle/adb nao ver dispositivos
Remove-Item Env:ANDROID_SERIAL -ErrorAction SilentlyContinue

if (-not (Test-Path $env:GRADLE_USER_HOME)) {
  New-Item -ItemType Directory -Path $env:GRADLE_USER_HOME -Force | Out-Null
}

$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"

function Ensure-SubstDrive {
  $substLines = cmd /c "subst" 2>$null
  $existing   = $substLines | Where-Object { $_ -like "${shortDrive}*" }
  if ($existing) {
    if ($existing -notlike "*$projectRoot*") {
      Write-Host "Erro: $shortDrive ja esta em uso. Libere com: subst $shortDrive /d" -ForegroundColor Red
      exit 1
    }
    return
  }
  cmd /c "subst $shortDrive `"$projectRoot`""
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao mapear $shortDrive para o projeto." -ForegroundColor Red
    exit 1
  }
}

function Get-PhysicalDevices {
  $result = [System.Collections.ArrayList]@()
  $lines = & $adb devices 2>&1 | Select-Object -Skip 1 | Where-Object { $_.Trim() -ne "" }
  foreach ($line in $lines) {
    if ($line -match '^(\S+)\s+(\S+)$') {
      $serial = $Matches[1]
      $state  = $Matches[2]
      if ($serial -like 'emulator-*') { continue }
      if ($state -eq 'device') {
        [void]$result.Add($serial)
      }
    }
  }
  return ,$result.ToArray()
}

function Require-PhysicalDevice {
  $devices = @(Get-PhysicalDevices) | Where-Object { $_ -and $_.Trim() -ne '' }
  if ($devices.Count -eq 0) {
    Write-Host "Nenhum celular fisico conectado via USB." -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifique cabo USB, depuracao USB ativa e aceite o popup no celular."
    Write-Host "Teste: & `"$adb`" devices"
    exit 1
  }
  return $devices[0].Trim()
}

function Stop-MetroOnPort($port) {
  $lines = netstat -ano 2>$null | Select-String ":$port\s+.*LISTENING"
  foreach ($line in $lines) {
    if ($line -match '\s+(\d+)\s*$') {
      $procId = [int]$Matches[1]
      if ($procId -gt 0) {
        Write-Host "Encerrando processo na porta ${port} (PID $procId)..."
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
      }
    }
  }
  Start-Sleep -Seconds 2
}

function Wait-MetroPort($port, $timeoutSec) {
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  while ((Get-Date) -lt $deadline) {
    if (netstat -ano 2>$null | Select-String ":$port\s+.*LISTENING") {
      return $true
    }
    Start-Sleep -Seconds 2
  }
  return $false
}

Write-Host "JAVA_HOME:    $env:JAVA_HOME"
Write-Host "ANDROID_HOME: $env:ANDROID_HOME"
Write-Host "Projeto:      $projectRoot"
Write-Host ""

& $adb start-server | Out-Null
$deviceId = Require-PhysicalDevice
$env:ANDROID_SERIAL = $deviceId
Write-Host "Celular detectado: $deviceId"
Write-Host ""

Ensure-SubstDrive

# Revalida antes do build (cabo pode ter caido)
$deviceId = Require-PhysicalDevice
$env:ANDROID_SERIAL = $deviceId

# Build nativo ANTES do Metro (Gradle recria .cxx e derruba o file watcher)
Write-Host "Compilando APK (caminho curto $shortRoot)..."
Push-Location "$shortRoot\android"
.\gradlew.bat app:assembleDebug -x lint --no-daemon
$gradleExit = $LASTEXITCODE
Pop-Location

if ($gradleExit -ne 0) {
  Write-Host "Build Gradle falhou (codigo $gradleExit)." -ForegroundColor Red
  exit $gradleExit
}

$apkPath = "$shortRoot\android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apkPath)) {
  Write-Host "APK nao encontrado: $apkPath" -ForegroundColor Red
  exit 1
}

$deviceId = Require-PhysicalDevice
Write-Host "Instalando APK no celular $deviceId ..."
& $adb -s $deviceId install -r $apkPath
if ($LASTEXITCODE -ne 0) {
  Write-Host "Falha ao instalar APK no celular." -ForegroundColor Red
  exit 1
}

# Metro no caminho REAL (subst W:\ quebra resolucao de modulos)
Stop-MetroOnPort 8081
Write-Host "Iniciando Metro em $projectRoot ..."
Start-Process powershell -ArgumentList @(
  '-NoExit', '-NoProfile', '-Command',
  "Set-Location '$projectRoot'; npx react-native start --reset-cache"
) | Out-Null

if (-not (Wait-MetroPort 8081 45)) {
  Write-Host "Metro nao respondeu na porta 8081." -ForegroundColor Red
  exit 1
}

& $adb -s $deviceId reverse tcp:8081 tcp:8081
& $adb -s $deviceId shell am force-stop com.fintrackapp
& $adb -s $deviceId shell am start -n com.fintrackapp/.MainActivity

Write-Host ""
Write-Host "App iniciado no celular. Se a tela ficar vermelha, balance e toque Reload." -ForegroundColor Green
