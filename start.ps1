$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) { & $nodeCommand.Source 'src/server.mjs'; exit $LASTEXITCODE }
$bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
if (Test-Path -LiteralPath $bundledNode) { & $bundledNode 'src/server.mjs'; exit $LASTEXITCODE }
throw 'Install Node.js 22.16 or later, then run node src/server.mjs from this folder.'
