# Script to find pg_dump and add it to PATH

Write-Host "Searching for pg_dump..." -ForegroundColor Cyan

# Common PostgreSQL installation paths
$searchPaths = @(
    "C:\Program Files\PostgreSQL",
    "C:\Program Files (x86)\PostgreSQL",
    "$env:LOCALAPPDATA\Programs\PostgreSQL",
    "$env:ProgramFiles\PostgreSQL"
)

$pgDumpPath = $null

# Search in common locations
foreach ($path in $searchPaths) {
    if (Test-Path $path) {
        Write-Host "Checking: $path" -ForegroundColor Gray
        $found = Get-ChildItem -Path $path -Recurse -Filter "pg_dump.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $pgDumpPath = $found.FullName
            Write-Host "Found pg_dump at: $pgDumpPath" -ForegroundColor Green
            break
        }
    }
}

# Also check if it's in PATH but not found by 'where'
$envPathDirs = $env:PATH -split ';'
foreach ($dir in $envPathDirs) {
    if (Test-Path "$dir\pg_dump.exe") {
        $pgDumpPath = "$dir\pg_dump.exe"
        Write-Host "Found pg_dump in PATH: $pgDumpPath" -ForegroundColor Green
        break
    }
}

if (-not $pgDumpPath) {
    Write-Host ""
    Write-Host "pg_dump.exe not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "You have two options:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Install PostgreSQL Client Tools" -ForegroundColor Cyan
    Write-Host "  1. Download PostgreSQL from: https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "  2. During installation, make sure to install 'Command Line Tools'" -ForegroundColor White
    Write-Host "  3. The installer will ask if you want to add PostgreSQL to PATH - say YES" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2: Use Chocolatey (if installed)" -ForegroundColor Cyan
    Write-Host "  Run: choco install postgresql --params '/Password:YourPassword'" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 3: Download standalone client tools" -ForegroundColor Cyan
    Write-Host "  Download from: https://www.enterprisedb.com/download-postgresql-binaries" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Extract the bin directory
$binDir = Split-Path $pgDumpPath -Parent
Write-Host ""
Write-Host "Bin directory: $binDir" -ForegroundColor Cyan
Write-Host ""

# Check if it's already in PATH
$currentPath = $env:PATH
if ($currentPath -like "*$binDir*") {
    Write-Host "[SUCCESS] This directory is already in your PATH!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Try running: npm run backup:db" -ForegroundColor Yellow
} else {
    Write-Host "This directory is NOT in your PATH." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To add it permanently:" -ForegroundColor Cyan
    Write-Host "  1. Press Win + X and select 'System'" -ForegroundColor White
    Write-Host "  2. Click 'Advanced system settings'" -ForegroundColor White
    Write-Host "  3. Click 'Environment Variables'" -ForegroundColor White
    Write-Host "  4. Under 'System variables', find 'Path' and click 'Edit'" -ForegroundColor White
    Write-Host "  5. Click 'New' and add: $binDir" -ForegroundColor White
    Write-Host "  6. Click OK on all dialogs" -ForegroundColor White
    Write-Host "  7. Restart your terminal/PowerShell" -ForegroundColor White
    Write-Host ""
    Write-Host "Or run this command to add it temporarily (for current session only):" -ForegroundColor Cyan
    Write-Host '  $env:PATH += ";' + $binDir + '"' -ForegroundColor White
    Write-Host ""
    Write-Host "Would you like to add it to PATH for this session now? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq 'Y' -or $response -eq 'y') {
        $env:PATH += ";$binDir"
        Write-Host ""
        Write-Host "[SUCCESS] Added to PATH for this session!" -ForegroundColor Green
        Write-Host "You can now run: npm run backup:db" -ForegroundColor Yellow
    }
}

