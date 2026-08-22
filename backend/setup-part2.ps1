param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$backendRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $backendRoot
$venv = Join-Path $backendRoot ".venv"
$python = Join-Path $venv "Scripts\python.exe"
$requirements = Join-Path $backendRoot "requirements.txt"
$envPath = Join-Path $projectRoot ".env"

if (-not (Test-Path $envPath)) {
    throw "Project .env not found. Copy .env.example to .env and add QDRANT_URL / QDRANT_API_KEY first."
}

if (-not (Test-Path $python)) {
    $launcher = Get-Command py -ErrorAction SilentlyContinue
    if ($launcher) {
        & py -3.11 -m venv $venv
    } else {
        & python -m venv $venv
    }
}

if (-not $SkipInstall) {
    & $python -m pip install --upgrade pip
    & $python -m pip install -r $requirements
}

$env:PYTHONPATH = Join-Path $backendRoot "src"
& $python -m pytest (Join-Path $backendRoot "tests") -q
if ($LASTEXITCODE -ne 0) { throw "Part 2 tests failed." }

& $python -c "from goa_rag.config import Settings; from qdrant_client import QdrantClient; s=Settings(); s.require_qdrant(); c=QdrantClient(url=s.qdrant_url, api_key=(s.qdrant_api_key or None), timeout=15); c.get_collections(); print('[OK] Qdrant connection verified')"
if ($LASTEXITCODE -ne 0) { throw "Qdrant verification failed." }

& $python -c "from goa_rag.dataset import resolve_dataset_revision; from goa_rag.config import Settings; s=Settings(); print('[OK] MSMARCO-XI revision:', resolve_dataset_revision(s.msmarco_dataset, s.msmarco_revision))"
if ($LASTEXITCODE -ne 0) { throw "MSMARCO-XI verification failed." }

Write-Host "PART 2 SETUP VERIFIED - ready for controlled indexing"
