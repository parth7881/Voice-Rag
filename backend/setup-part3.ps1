$ErrorActionPreference = "Stop"

$backendRoot = $PSScriptRoot
$projectRoot = Split-Path $backendRoot -Parent
$python = Join-Path $backendRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    throw "Backend virtual environment not found. Complete Part 2 setup first."
}

if (-not (Test-Path (Join-Path $projectRoot ".env"))) {
    throw "Project .env file is missing."
}

Write-Host "Installing Part 3 API dependencies..."
& $python -m pip install -r (Join-Path $backendRoot "requirements.txt")
if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed." }

$env:PYTHONPATH = Join-Path $backendRoot "src"

& $python -c "from goa_rag.config import Settings; s=Settings(); s.require_qdrant(); s.require_groq(); print('[OK] Qdrant and Groq configuration present')"
if ($LASTEXITCODE -ne 0) { throw "Part 3 environment verification failed." }

& $python -m pytest (Join-Path $backendRoot "tests") -q
if ($LASTEXITCODE -ne 0) { throw "Part 3 tests failed." }

& $python -c "from goa_rag.api import app; print('[OK] FastAPI application imports successfully')"
if ($LASTEXITCODE -ne 0) { throw "FastAPI import verification failed." }

Write-Host "PART 3 SETUP VERIFIED - ready for live grounded RAG test"
