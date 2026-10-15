# Occanova Android

This is the Android application for Occanova, package `com.occanova.app`. It opens the customer experience at `https://www.occanova.com/app` as a Trusted Web Activity. The first release covers vendor discovery, profiles and enquiries. Vendor registration and subscription billing remain on the website.

## Build and test

Open this `android` directory in Android Studio, or use JDK 17 and Android SDK 36:

```powershell
cd android
.\gradlew.bat :app:assembleDebug
```

The installable test build is `app/build/outputs/apk/debug/app-debug.apk`. Install it on a connected Android device with `adb install -r app/build/outputs/apk/debug/app-debug.apk`. Android 7.0 (API 24) or newer is required. The app needs an internet connection and a browser that supports Trusted Web Activities.

The debug build uses Android's debug signing key. It is for testing only and is not a Play Store release. Do not publish the debug signing fingerprint in production.

## Signed release build

The upload keystore is `android.keystore` and its passwords are in `../.env.android.local`. Both are ignored by Git. **Back up both files securely before uploading any release to Play Console.** Do not paste the passwords into chat or commit either file.

With Android SDK 36 and Build Tools 36.0.0 installed, run:

```powershell
cd android
.\build-release.ps1
```

The script builds, signs and verifies `app-release-signed.apk` for sideload testing and `app-release-bundle.aab` for Play Console. They are ignored by Git. The APK's certificate fingerprint is published in `../public/.well-known/assetlinks.json`, allowing this sideloaded release app to verify ownership of `www.occanova.com`.

## Before Play Store release

1. Back up the ignored keystore and password file securely. Verify the final package ID, version code, target SDK, app icon and Play Console listing.
2. After Play App Signing is set up, add the **Play app-signing certificate** SHA-256 fingerprint to `../public/.well-known/assetlinks.json` alongside the current upload-key fingerprint. Google Play may sign installed APKs with a different certificate.
3. Verify full-screen launch, navigation and enquiries on a physical Android device, then complete Play Console's data-safety, content, privacy and testing requirements. Review billing rules before adding paid digital features to the Android app.

The project was generated with Bubblewrap, then updated to Android Gradle Plugin 8.12.0 and Gradle 8.14.3 for API 36. Running `bubblewrap update` may overwrite those build-file changes; review the generated diff before building again.
