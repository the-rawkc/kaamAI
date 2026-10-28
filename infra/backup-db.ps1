# KaamAI Automated Database Backup Script (PowerShell)
# Performs a timestamped pg_dump and enforces a 7-day retention policy.

param (
    [string]$BackupDir = ".\backups",
    [int]$RetentionDays = 7
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$BackupFile = Join-Path $BackupDir "kaamai_backup_$Timestamp.sql"

Write-Host "Starting KaamAI PostgreSQL backup..." -ForegroundColor Cyan

$PgDumpPath = "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
if (-not (Test-Path $PgDumpPath)) {
    $cmd = Get-Command pg_dump -ErrorAction SilentlyContinue
    if ($cmd) { $PgDumpPath = $cmd.Source }
}

if (-not $PgDumpPath) {
    throw "pg_dump.exe was not found. Please install PostgreSQL client tools."
}

$env:PGPASSWORD = if ($env:PGPASSWORD) { $env:PGPASSWORD } else { "change_me" }
& $PgDumpPath -h localhost -p 5432 -U kaamai -d kaamai -f $BackupFile

if ($LASTEXITCODE -eq 0 -and (Test-Path $BackupFile)) {
    $Size = (Get-Item $BackupFile).Length / 1KB
    Write-Host "Backup created: $BackupFile ($([math]::Round($Size, 2)) KB)" -ForegroundColor Green
} else {
    throw "pg_dump failed with exit code $LASTEXITCODE."
}

# Cleanup older backups
$Cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "kaamai_backup_*.sql" | Where-Object { $_.LastWriteTime -lt $Cutoff } | Remove-Item -Force
Write-Host "Backup routine finished." -ForegroundColor Cyan
