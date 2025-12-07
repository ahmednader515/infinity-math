# Database Backup Script for PostgreSQL
# This script exports the database to a SQL dump file

# Load environment variables from .env file if it exists
$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Get database URL from environment
$databaseUrl = $env:DATABASE_URL
if (-not $databaseUrl) {
    $databaseUrl = $env:DIRECT_DATABASE_URL
}

if (-not $databaseUrl) {
    Write-Host "Error: DATABASE_URL or DIRECT_DATABASE_URL environment variable not found!" -ForegroundColor Red
    Write-Host "Please set one of these environment variables or create a .env file." -ForegroundColor Yellow
    exit 1
}

# Remove quotes if present (common in .env files)
$databaseUrl = $databaseUrl.Trim('"', "'")

# Parse the database URL using regex (more reliable than Uri for postgres://)
try {
    # Pattern to match: postgresql:// or postgres:// [user[:password]@] host [:port] / database [?params]
    # This regex handles:
    # - Optional user:password@
    # - Host (can contain dots, dashes)
    # - Optional port
    # - Database name (before ? or end of string)
    $pattern = '^(?:postgresql|postgres)://(?:([^:]+)(?::([^@]+))?@)?([^:/]+)(?::(\d+))?/([^?]+)'
    
    if ($databaseUrl -match $pattern) {
        $dbUser = if ($matches[1]) { $matches[1] } else { "postgres" }
        $dbPassword = if ($matches[2]) { $matches[2] } else { "" }
        $dbHost = $matches[3]
        $dbPort = if ($matches[4]) { $matches[4] } else { "5432" }
        $dbName = $matches[5]
        
        # URL decode the password in case it contains encoded characters
        if ($dbPassword) {
            try {
                $dbPassword = [System.Uri]::UnescapeDataString($dbPassword)
            } catch {
                # If decoding fails, use the password as-is
            }
        }
        
        # Validate we have the minimum required info
        if (-not $dbHost) {
            throw "Host not found in URL"
        }
        if (-not $dbName) {
            throw "Database name not found in URL"
        }
    } else {
        throw "URL format does not match expected pattern"
    }
    
} catch {
    Write-Host "Error: Could not parse DATABASE_URL!" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    $urlPreview = if ($databaseUrl.Length -gt 50) { "$($databaseUrl.Substring(0, 50))..." } else { $databaseUrl }
    Write-Host "URL format detected: $urlPreview" -ForegroundColor Gray
    Write-Host "Expected format: postgresql://user:password@host:port/database" -ForegroundColor Yellow
    Write-Host "                 or postgres://user:password@host:port/database" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Note: The URL may contain query parameters (e.g., ?connection_limit=1) which are ignored." -ForegroundColor Gray
    exit 1
}

# Create backups directory if it doesn't exist
$backupDir = "backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "Created backups directory: $backupDir" -ForegroundColor Green
}

# Generate backup filename with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFile = "$backupDir\backup_$timestamp.sql"

# Check if pg_dump is available
$pgDumpExe = $null
$pgDumpPath = Get-Command pg_dump -ErrorAction SilentlyContinue

if ($pgDumpPath) {
    $pgDumpExe = $pgDumpPath.Source
} else {
    # Search in common PostgreSQL installation locations
    Write-Host "pg_dump not found in PATH. Searching common locations..." -ForegroundColor Yellow
    $searchPaths = @(
        "C:\Program Files\PostgreSQL",
        "C:\Program Files (x86)\PostgreSQL",
        "$env:LOCALAPPDATA\Programs\PostgreSQL",
        "$env:ProgramFiles\PostgreSQL"
    )
    
    foreach ($path in $searchPaths) {
        if (Test-Path $path) {
            $found = Get-ChildItem -Path $path -Recurse -Filter "pg_dump.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($found) {
                $pgDumpExe = $found.FullName
                Write-Host "Found pg_dump at: $pgDumpExe" -ForegroundColor Green
                break
            }
        }
    }
}

if (-not $pgDumpExe) {
    Write-Host ""
    Write-Host "Error: pg_dump command not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install PostgreSQL client tools:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "  2. During installation, select 'Command Line Tools'" -ForegroundColor White
    Write-Host "  3. Add PostgreSQL bin directory to your PATH" -ForegroundColor White
    Write-Host ""
    Write-Host "Or run this helper script to find and configure pg_dump:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/find-pgdump.ps1" -ForegroundColor White
    exit 1
}

Write-Host "Starting database backup..." -ForegroundColor Cyan
Write-Host "Database: $dbName" -ForegroundColor Gray
Write-Host "Host: ${dbHost}:${dbPort}" -ForegroundColor Gray
Write-Host "Backup file: $backupFile" -ForegroundColor Gray
Write-Host ""

# Set PGPASSWORD environment variable for pg_dump
$env:PGPASSWORD = $dbPassword

# Run pg_dump
try {
    $pgDumpArgs = @(
        "-h", $dbHost,
        "-p", $dbPort,
        "-U", $dbUser,
        "-d", $dbName,
        "-F", "p",
        "-f", $backupFile,
        "--no-owner",
        "--no-acl"
    )
    
    & $pgDumpExe $pgDumpArgs
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $backupFile).Length / 1MB
        Write-Host ""
        Write-Host "[SUCCESS] Backup completed successfully!" -ForegroundColor Green
        Write-Host "  File: $backupFile" -ForegroundColor Green
        Write-Host "  Size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Error: pg_dump failed with exit code $LASTEXITCODE" -ForegroundColor Red
        if (Test-Path $backupFile) {
            Remove-Item $backupFile
        }
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "Error: Failed to run pg_dump" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Backup saved to: $backupFile" -ForegroundColor Cyan
