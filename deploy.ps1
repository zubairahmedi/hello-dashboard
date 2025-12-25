# React Dashboard Deployment Script
# Deploys React build to Hostinger VPS

param(
    [Parameter(Mandatory=$false)]
    [string]$VPS_IP = "72.61.7.184",
    
    [Parameter(Mandatory=$false)]
    [string]$SSH_USER = "root",
    
    [Parameter(Mandatory=$false)]
    [string]$BUILD_PATH = "/docker/hello-dashboard/build",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild
)

# Colors for output
$ErrorColor = @{ ForegroundColor = "Red" }
$SuccessColor = @{ ForegroundColor = "Green" }
$WarningColor = @{ ForegroundColor = "Yellow" }
$InfoColor = @{ ForegroundColor = "Cyan" }

Write-Host "`n" + ("="*60) -ForegroundColor Cyan
Write-Host "REACT DASHBOARD DEPLOYMENT TO HOSTINGER" -ForegroundColor Cyan
Write-Host ("="*60) -ForegroundColor Cyan

# Step 1: Build React App
if ($SkipBuild) {
    Write-Host "`nSkipping build (--SkipBuild flag used)" @WarningColor
} else {
    Write-Host "`nStep 1: Building React app..." @InfoColor
    try {
        npm run build
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Build successful!" @SuccessColor
        } else {
            Write-Host "Build failed! Check errors above." @ErrorColor
            exit 1
        }
    } catch {
        Write-Host "❌ Error running npm build: $_" @ErrorColor
        exit 1
    }
}

# Step 2: Verify URLs in Build
Write-Host "`nStep 2: Verifying new domains in build..." @InfoColor
try {
    $hasNewDomain = @(Get-ChildItem -Path ".\build\" -Recurse -File | Select-String -Pattern "aiclinicgenius.com")
    $hasOldDomain = @(Get-ChildItem -Path ".\build\" -Recurse -File | Select-String -Pattern "srv1123998")
    
    if ($hasOldDomain.Count -gt 0) {
        Write-Host "WARNING: Old domain (srv1123998) found in build!" @WarningColor
        Write-Host "Files affected:" @WarningColor
        $hasOldDomain | ForEach-Object { Write-Host "  - $_" @WarningColor }
        Write-Host "Please update source files and rebuild!" @ErrorColor
        exit 1
    }
    
    if ($hasNewDomain.Count -gt 0) {
        Write-Host "New domain (aiclinicgenius.com) verified in build" @SuccessColor
        Write-Host "   Found in $($hasNewDomain.Count) file(s)" @SuccessColor
    } else {
        Write-Host "WARNING: New domain not found in build" @WarningColor
        Write-Host "   This might be expected if no API calls are in the build" @WarningColor
    }
} catch {
    Write-Host "Could not verify domains: $_" @WarningColor
}

# Step 3: Upload to Hostinger
Write-Host "`nStep 3: Uploading build to Hostinger..." @InfoColor
Write-Host "   Target: $SSH_USER@$VPS_IP`:$BUILD_PATH" @InfoColor

try {
    # Check if pscp is available (PuTTY's Secure Copy)
    $pscpAvailable = $null -ne (Get-Command pscp -ErrorAction SilentlyContinue)
    
    $remoteTarget = "$SSH_USER@$VPS_IP`:$BUILD_PATH\"
    
    if ($pscpAvailable) {
        Write-Host "   Using: pscp (PuTTY Secure Copy)" @InfoColor
        pscp -r ".\build\*" $remoteTarget
    } else {
        # Try scp (OpenSSH - if Git Bash or WSL installed)
        Write-Host "   Using: scp (OpenSSH)" @InfoColor
        $remotePath = "$SSH_USER@$VPS_IP`:$BUILD_PATH/"
        scp -r ".\build\*" $remotePath
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Upload successful!" @SuccessColor
    } else {
        Write-Host "Upload failed! Check connection and credentials." @ErrorColor
        exit 1
    }
} catch {
    Write-Host "Error uploading files: $_" @ErrorColor
    Write-Host "Tips:" @InfoColor
    Write-Host "   - Ensure SSH access is configured: ssh $SSH_USER@$VPS_IP" @InfoColor
    Write-Host "   - Install PuTTY for pscp: https://www.putty.org/" @InfoColor
    Write-Host "   - Or use Git Bash with OpenSSH" @InfoColor
    exit 1
}

# Step 4: Restart Container
Write-Host "`nStep 4: Restarting Docker container..." @InfoColor

try {
    $pscpAvailable = $null -ne (Get-Command pscp -ErrorAction SilentlyContinue)
    
    if ($pscpAvailable) {
        plink -ssh -l $SSH_USER $VPS_IP "docker restart hello-dashboard-hello-dashboard-1"
    } else {
        ssh "$SSH_USER@$VPS_IP" "docker restart hello-dashboard-hello-dashboard-1"
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Container restarted successfully!" @SuccessColor
    } else {
        Write-Host "Container restart may have failed. Check with:" @WarningColor
        Write-Host "   ssh $SSH_USER@$VPS_IP" @WarningColor
        Write-Host "   docker restart hello-dashboard-hello-dashboard-1" @WarningColor
    }
} catch {
    Write-Host "Error restarting container: $_" @WarningColor
    Write-Host "Manual restart needed. SSH into server and run:" @WarningColor
    Write-Host "   docker restart hello-dashboard-hello-dashboard-1" @WarningColor
}

# Step 5: Verify Deployment
Write-Host "`nStep 5: Deployment complete!" @SuccessColor
Write-Host "`nVerification Commands:" @InfoColor
Write-Host "   1. Check container status:" @InfoColor
Write-Host "      ssh $SSH_USER@$VPS_IP" @InfoColor
Write-Host "      docker ps | grep hello-dashboard" @InfoColor
Write-Host "" @InfoColor
Write-Host "   2. Test from browser:" @InfoColor
Write-Host "      https://dashboard.aiclinicgenius.com/" @SuccessColor
Write-Host "" @InfoColor
Write-Host "   3. Check files uploaded:" @InfoColor
Write-Host "      ssh $SSH_USER@$VPS_IP" @InfoColor
Write-Host "      ls -la $BUILD_PATH" @InfoColor

Write-Host "`nAll done!" -ForegroundColor Green
