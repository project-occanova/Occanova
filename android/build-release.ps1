$ErrorActionPreference = 'Stop'

$credentialsPath = Join-Path (Split-Path $PSScriptRoot -Parent) '.env.android.local'
$keystorePath = Join-Path $PSScriptRoot 'android.keystore'
$sdkRoot = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { $env:ANDROID_SDK_ROOT }
if (-not $sdkRoot) { throw 'ANDROID_HOME or ANDROID_SDK_ROOT must point to Android SDK 36.' }
$buildTools = Join-Path $sdkRoot 'build-tools/36.0.0'
if (-not (Test-Path -LiteralPath $credentialsPath) -or -not (Test-Path -LiteralPath $keystorePath)) {
    throw 'Missing ignored Android keystore or .env.android.local credentials.'
}
if (-not (Test-Path -LiteralPath (Join-Path $buildTools 'apksigner.bat'))) {
    throw 'Android SDK Build Tools 36.0.0 are required.'
}

foreach ($line in [IO.File]::ReadAllLines($credentialsPath)) {
    if ($line -match '^BUBBLEWRAP_KEYSTORE_PASSWORD=(.+)$') {
        $env:BUBBLEWRAP_KEYSTORE_PASSWORD = $Matches[1]
    } elseif ($line -match '^BUBBLEWRAP_KEY_PASSWORD=(.+)$') {
        $env:BUBBLEWRAP_KEY_PASSWORD = $Matches[1]
    }
}
if (-not $env:BUBBLEWRAP_KEYSTORE_PASSWORD -or -not $env:BUBBLEWRAP_KEY_PASSWORD) {
    throw 'Both signing passwords are required.'
}

Push-Location $PSScriptRoot
try {
    & .\gradlew.bat :app:assembleRelease :app:bundleRelease --console=plain
    if ($LASTEXITCODE -ne 0) { throw "Gradle build failed with exit code $LASTEXITCODE" }

    $unsignedApk = 'app/build/outputs/apk/release/app-release-unsigned.apk'
    $alignedApk = 'app-release-unsigned-aligned.apk'
    $signedApk = 'app-release-signed.apk'
    $unsignedBundle = 'app/build/outputs/bundle/release/app-release.aab'
    $signedBundle = 'app-release-bundle.aab'

    & (Join-Path $buildTools 'zipalign.exe') -f 4 $unsignedApk $alignedApk
    if ($LASTEXITCODE -ne 0) { throw "zipalign failed with exit code $LASTEXITCODE" }

    & (Join-Path $buildTools 'apksigner.bat') sign --ks $keystorePath --ks-key-alias android --ks-pass 'env:BUBBLEWRAP_KEYSTORE_PASSWORD' --key-pass 'env:BUBBLEWRAP_KEY_PASSWORD' --out $signedApk $alignedApk
    if ($LASTEXITCODE -ne 0) { throw "APK signing failed with exit code $LASTEXITCODE" }
    & (Join-Path $buildTools 'apksigner.bat') verify --verbose $signedApk
    if ($LASTEXITCODE -ne 0) { throw "APK verification failed with exit code $LASTEXITCODE" }

    & jarsigner -keystore $keystorePath -storepass:env BUBBLEWRAP_KEYSTORE_PASSWORD -keypass:env BUBBLEWRAP_KEY_PASSWORD -signedjar $signedBundle $unsignedBundle android
    if ($LASTEXITCODE -ne 0) { throw "App Bundle signing failed with exit code $LASTEXITCODE" }
    & jarsigner -verify $signedBundle
    if ($LASTEXITCODE -ne 0) { throw "App Bundle verification failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
    Remove-Item Env:\BUBBLEWRAP_KEYSTORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:\BUBBLEWRAP_KEY_PASSWORD -ErrorAction SilentlyContinue
}
