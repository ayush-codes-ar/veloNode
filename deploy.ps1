# deploy.ps1 - VeloNode Automated Deployment v3
$ErrorActionPreference = "Stop"

[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls11 -bor [System.Net.SecurityProtocolType]::Tls

function Check-Command ($cmd) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        Write-Host "$cmd is installed." -ForegroundColor Green
        return $true
    }
    Write-Host "$cmd is MISSING." -ForegroundColor Red
    return $false
}

Write-Host "--- Checking Dependencies ---" -ForegroundColor Cyan

# Rust (Already installed by user)
if (-not (Check-Command "rustc")) {
    Write-Host "Please restart your terminal if you just installed Rust!" -ForegroundColor Red
    # We won't re-install here to avoid conflicts, just warn.
}

# Solana (Direct Binary Download - No Installer Prompt)
if (-not (Check-Command "solana")) {
    Write-Host "Installing Solana (Portable Mode)..."
    
    # URL for Windows Release Archive (Pre-built binaries)
    $SolanaReleaseUrl = "https://github.com/solana-labs/solana/releases/download/v1.18.4/solana-release-x86_64-pc-windows-msvc.tar.bz2"
    $InstallDir = "C:\solana-release"
    $ZipPath = "C:\solana-release.tar.bz2"
    
    # Download
    Write-Host "Downloading Solana Binaries..."
    Invoke-WebRequest -Uri $SolanaReleaseUrl -OutFile $ZipPath -UseBasicParsing

    # Extract using native tar (Windows 10+)
    Write-Host "Extracting..."
    tar -xf $ZipPath -C "C:\"
    
    # Add to PATH for this session
    $SolanaBin = "C:\solana-release\bin"
    $env:PATH += ";$SolanaBin"
    
    # Check again
    if (Check-Command "solana") {
        Write-Host "Solana Installed Successfully!" -ForegroundColor Green
    } else {
        Write-Error "Failed to verify Solana installation at $SolanaBin"
    }
}

# Anchor
if (-not (Check-Command "anchor")) {
    Write-Host "Installing Anchor..."
    try {
        cargo install --git https://github.com/coral-xyz/anchor avm --locked
        avm install latest
        avm use latest
    } catch {
        Write-Error "Failed to install Anchor: $_"
        Write-Host "Please ensure you have C++ Build Tools installed for Rust." -ForegroundColor Yellow
    }
}

# Navigation & Build
$ContractDir = "contract"
if (-not (Test-Path $ContractDir)) { throw "Contract directory not found!" }

Push-Location $ContractDir

try {
    Write-Host "--- Building ---" -ForegroundColor Cyan
    anchor build

    # Get ID
    $KeyPair = "target/deploy/velonode-keypair.json"
    if (-not (Test-Path $KeyPair)) { throw "Keypair not generated!" }
    $ProgramId = solana address -k $KeyPair
    Write-Host "Generated ID: $ProgramId" -ForegroundColor Yellow

    # Replacements
    $LibRs = "programs\velonode\src\lib.rs"
    $Toml = "Anchor.toml"

    # Use simple Regex
    $RustRegex = 'declare_id!\(".*"\);'
    $RustReplace = "declare_id!(""$ProgramId"");"
    
    $TomlRegex = 'velonode = ".*"'
    $TomlReplace = "velonode = ""$ProgramId"""

    (Get-Content $LibRs) -replace $RustRegex, $RustReplace | Set-Content $LibRs
    (Get-Content $Toml) -replace $TomlRegex, $TomlReplace | Set-Content $Toml

    Write-Host "Updated Program ID in source files."

    # Final Deploy
    Write-Host "--- Rebuilding & Deploying ---" -ForegroundColor Cyan
    anchor build
    
    solana config set --url https://api.devnet.solana.com
    solana airdrop 2
    anchor deploy --provider.cluster devnet

    Write-Host "--- Success ---" -ForegroundColor Green
    Write-Host "Program ID: $ProgramId"
    solana program show $ProgramId

} catch {
    Write-Error "Deployment Failed: $_"
} finally {
    Pop-Location
}
