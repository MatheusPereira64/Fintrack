# Script para rodar o FinTrack no Android (Windows)
# Configura JAVA_HOME, ANDROID_HOME e PATH automaticamente

$env:JAVA_HOME    = "C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH         = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:JAVA_HOME\bin;$env:PATH"

Set-Location $PSScriptRoot

Write-Host "JAVA_HOME:    $env:JAVA_HOME"
Write-Host "ANDROID_HOME: $env:ANDROID_HOME"
Write-Host ""

# Verifica dispositivo/emulador
$devices = & "$env:ANDROID_HOME\platform-tools\adb.exe" devices 2>&1 | Select-String "device$"
if (-not $devices) {
  Write-Host "Nenhum dispositivo conectado. Iniciando emulador Medium_Phone..."
  Start-Process -FilePath "$env:ANDROID_HOME\emulator\emulator.exe" -ArgumentList "-avd","Medium_Phone"
  Write-Host "Aguardando emulador iniciar (pode levar 1-2 min)..."
  & "$env:ANDROID_HOME\platform-tools\adb.exe" wait-for-device
  Start-Sleep -Seconds 15
}

npx react-native run-android
