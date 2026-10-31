$ErrorActionPreference = 'Stop'

$repository = Split-Path $PSScriptRoot -Parent
$credentialsPath = Join-Path $repository '.env.android.local'
$keystorePath = Join-Path $repository 'android/android.keystore'
$sdkRoot = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { $env:ANDROID_SDK_ROOT }

if (-not $sdkRoot -or -not (Test-Path -LiteralPath $credentialsPath) -or -not (Test-Path -LiteralPath $keystorePath)) {
    throw 'Android SDK, ignored signing credentials, and the existing release keystore are required.'
}

$signer = Join-Path $sdkRoot 'build-tools/36.0.0/apksigner.bat'
if (-not (Test-Path -LiteralPath $signer)) {
    throw 'Android SDK Build Tools 36.0.0 are required for the React Native preview.'
}

$shortDrive = $null
$locationPushed = $false
$substitute = Join-Path $env:SystemRoot 'System32/subst.exe'
try {
    foreach ($line in [IO.File]::ReadAllLines($credentialsPath)) {
        if ($line -match '^BUBBLEWRAP_KEYSTORE_PASSWORD=(.+)$') {
            $env:OCCANOVA_PREVIEW_STORE_PASSWORD = $Matches[1]
        } elseif ($line -match '^BUBBLEWRAP_KEY_PASSWORD=(.+)$') {
            $env:OCCANOVA_PREVIEW_KEY_PASSWORD = $Matches[1]
        }
    }
    if (-not $env:OCCANOVA_PREVIEW_STORE_PASSWORD -or -not $env:OCCANOVA_PREVIEW_KEY_PASSWORD) {
        throw 'The ignored Android signing passwords are missing.'
    }
    $env:OCCANOVA_PREVIEW_KEYSTORE = $keystorePath

    $assetsDirectory = Join-Path $PSScriptRoot 'android/app/src/main/assets'
    New-Item -ItemType Directory -Force -Path $assetsDirectory | Out-Null
    Push-Location $PSScriptRoot
    try {
        & '.\node_modules\.bin\react-native.cmd' bundle --platform android --dev false --entry-file index.js --bundle-output 'android/app/src/main/assets/index.android.bundle' --assets-dest 'android/app/src/main/res'
        if ($LASTEXITCODE -ne 0) { throw "React Native bundle failed with exit code $LASTEXITCODE" }
    } finally {
        Pop-Location
    }

    $buildAndroidPath = Join-Path $PSScriptRoot 'android'
    if ($repository.Length -gt 30) {
        foreach ($letter in @('O', 'P', 'Q', 'R', 'S', 'T')) {
            if (Get-PSDrive -Name $letter -ErrorAction SilentlyContinue) { continue }
            & $substitute ($letter + ':') $repository
            if ($LASTEXITCODE -eq 0) {
                $shortDrive = $letter + ':'
                $buildAndroidPath = Join-Path ($shortDrive + '\') 'mobile/android'
                break
            }
        }
        if (-not $shortDrive) { throw 'Could not make a temporary short drive path for the Android C++ build.' }
    }

    Push-Location $buildAndroidPath
    $locationPushed = $true
    & .\gradlew.bat :app:assembleRelease '-PoccanovaPrebundled=true' '-Pkotlin.incremental=false' --console=plain
    if ($LASTEXITCODE -ne 0) { throw "Gradle build failed with exit code $LASTEXITCODE" }

    $source = 'app/build/outputs/apk/release/app-release.apk'
    $destination = Join-Path $PSScriptRoot 'occanova-native-preview.apk'
    Copy-Item -LiteralPath $source -Destination $destination -Force
    & $signer verify --verbose $destination
    if ($LASTEXITCODE -ne 0) { throw "APK signature verification failed with exit code $LASTEXITCODE" }
    Write-Output "Preview APK: $destination"
} finally {
    if ($locationPushed) { Pop-Location }
    if ($shortDrive) { & $substitute $shortDrive /D }
    Remove-Item Env:\OCCANOVA_PREVIEW_KEYSTORE -ErrorAction SilentlyContinue
    Remove-Item Env:\OCCANOVA_PREVIEW_STORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:\OCCANOVA_PREVIEW_KEY_PASSWORD -ErrorAction SilentlyContinue
}
