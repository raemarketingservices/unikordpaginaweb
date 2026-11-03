$env:UNIKO_LOCAL_MESSAGES = 'true'
$env:UNIKO_VITE_CACHE_DIR = 'node_modules/.vite-5056'
Set-Location -LiteralPath $PSScriptRoot
npm run dev -- --host 127.0.0.1 --port 5056
