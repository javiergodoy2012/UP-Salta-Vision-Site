@echo off
setlocal
pushd "%~dp0"
if not exist "serve-windows.cs" (
  echo Descomprimi TODO el ZIP antes de abrir INICIAR-PREVIEW.bat.
  pause
  exit /b 1
)
echo Iniciando Site Vision. Deja esta ventana abierta mientras uses la preview.
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -Command "$ErrorActionPreference = 'Stop'; $server = $null; try { Add-Type -LiteralPath (Join-Path (Get-Location).Path 'serve-windows.cs'); $server = [SiteVisionPreview.Server]::Start((Split-Path (Get-Location).Path -Parent), 8765); Write-Host ('Preview: ' + $server.Url); Write-Host 'Para cerrar: Ctrl+C o cerrar esta ventana.'; try { Start-Process $server.Url } catch { Write-Host 'Abri la direccion anterior en tu navegador.' }; while ($server.IsRunning) { Start-Sleep -Milliseconds 250 } } catch { Write-Host ('No se pudo iniciar: ' + $_.Exception.Message); exit 1 } finally { if ($null -ne $server) { $server.Dispose() } }"
popd
pause
endlocal
