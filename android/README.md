# Occanova Android

This is the Android application for Occanova, package `com.occanova.app`. It opens the customer experience at `https://www.occanova.com/app` as a Trusted Web Activity. The first release covers vendor discovery, profiles and enquiries. Vendor registration and subscription billing remain on the website.

## Build and test

Open this `android` directory in Android Studio, or use JDK 17 and Android SDK 36:

```powershell
cd android
.\gradlew.bat :app:assembleDebug
```

The installable test build is `app/build/outputs/apk/debug/app-debug.apk`. Install it on a connected Android device with `adb install -r app/build/outputs/apk/debug/app-debug.apk`. Android 7.0 (API 24) or newer is required. The app needs an internet connection and a browser that supports Trusted Web Activities.

The debug build uses Android's debug signing key. It is for testing only and is not a Play Store release. Until the release certificate is associated with the domain through Digital Asset Links, Android may display a browser toolbar instead of the verified full-screen experience. Do not publish the debug signing fingerprint in production.

## Before Play Store release

1. Create and securely back up a dedicated upload keystore. Keep it and its passwords outside Git. The `signingKey` entry in `twa-manifest.json` is a placeholder; no release keystore is committed.
2. Build and sign an Android App Bundle. Verify the final package ID, version code, target SDK, app icon and Play Console listing.
3. Publish `https://www.occanova.com/.well-known/assetlinks.json` with the SHA-256 fingerprint of the **Play app-signing certificate** for `com.occanova.app`. If testing a sideloaded release APK, its signing certificate needs its own entry. Verify full-screen launch on a physical device.
4. Complete Play Console's data-safety, content, privacy and testing requirements. Review billing rules before adding paid digital features to the Android app.

The project was generated with Bubblewrap, then updated to Android Gradle Plugin 8.12.0 and Gradle 8.14.3 for API 36. Running `bubblewrap update` may overwrite those build-file changes; review the generated diff before building again.
