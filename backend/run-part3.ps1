$ErrorActionPreference = "Stop"

$backendRoot = $PSScriptRoot
$python = Join-Path $backendRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    throw "Backend virtual environment not found. Run .\backend\setup-part3.ps1 first."
}

$env:PYTHONPATH = Join-Path $backendRoot "src"
& $python -m uvicorn goa_rag.api:app --host 127.0.0.1 --port 8000
