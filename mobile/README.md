# Occanova native Android preview

This is a separate React Native Android preview (`com.occanova.nativepreview`). It opens the live Occanova site inside Android WebView, so the app launches without the Trusted Web Activity's “Running in Chrome” disclosure. The current `com.occanova.app` APK remains unchanged, and both can be installed on one phone.

The preview keeps the existing website's customer and vendor flows while native screens are developed. It requires internet access. WebView has its own cookie store, so testers must sign in again. The app handles Android Back, connection errors, file selection and external phone, SMS and UPI links. External payment or bank authorization may still open another app or browser.

Launch shows the Occanova logo for at least 2.2 seconds and keeps it visible until the first page finishes loading. If the page fails, the app shows a retry screen instead.

## Build

Use Node 22.11+, JDK 17 and Android SDK Platform/Build Tools 36.0.0:

```powershell
cd mobile
npm ci
.\build-preview.ps1
```

The build script uses the ignored signing credentials and keystore already used by the existing Android project. On Windows it temporarily maps this long workspace path to a short drive for native compilation, then removes that mapping. It produces `mobile/occanova-native-preview.apk` without exposing or committing credentials.

## Device acceptance checks

1. Install the preview beside the existing app. Confirm the Occanova launcher icon, full-screen launch and absence of the “Running in Chrome” disclosure.
2. Browse categories, search and open vendor profiles; test phone, WhatsApp and enquiry actions.
3. Create and sign in to a customer account, verify email and mobile OTP, save vendors and use the customer dashboard.
4. Sign in to a vendor account, edit a profile and upload a portfolio image from both Gallery and Camera.
5. In a controlled account, test vendor registration and Razorpay AutoPay authorization, including UPI and cancellation. Do not distribute this preview to vendors until this passes on a real device.
6. Disable and restore connectivity, retry the failed page, and confirm Android Back navigation.

The preview is an Android WebView shell, not an offline copy of the site or a completed native UI rewrite. Payment and authentication behavior must be validated on a physical device before replacing the current APK.
