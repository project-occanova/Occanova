# Occanova Android: Play release preparation

The current sideload build opens `https://www.occanova.com/app`. It includes customer account entry and access to the website's existing customer and vendor routes. **Do not submit version 0.3 to Play yet:** vendor registration leads to Razorpay AutoPay for a platform subscription. Google Play's Payments policy may require Play Billing or an enrolled alternative-billing program for this flow. Settle that flow and update the store copy and Data safety answers before distribution through Play.

## Store listing draft

- **App name:** Occanova
- **Short description:** Discover event vendors across India and connect with them directly.
- **Full description:**

  Plan your event with the right people. Occanova helps you discover event professionals across India, explore their work and make the first connection.

  Browse approved vendor profiles by service and location. View portfolios, compare starting prices and contact a vendor by phone, WhatsApp or enquiry form. Whether you are planning a wedding, celebration or business event, find people who fit your plans.

  Occanova helps you connect with vendors. Availability, bookings and service terms are agreed directly with the vendor.

- **Support email:** info@occanova.com
- **Privacy policy:** https://www.occanova.com/privacy
- **Website:** https://www.occanova.com

Review this copy against the app installed from Play before submitting the store listing. Add real screenshots of the installed app, not design mockups.

## Internal test sequence

1. Securely back up `android.keystore` and `../.env.android.local`. Both are ignored by Git and are needed to sign future updates.
2. Create the app in Play Console, then upload `app-release-bundle.aab` to **Internal testing**. The bundle's package ID is `com.occanova.app`. It is signed with the local upload key; Google Play may use a different app-signing key for installed copies.
3. Find the **App signing key certificate** SHA-256 fingerprint in Play Console. Add it to `../public/.well-known/assetlinks.json` alongside the existing upload-key fingerprint and deploy the website before testing the Play-installed app.
4. Install through the internal-test link on a physical Android phone. Check launch without a browser toolbar; search and filters; vendor photos; profile links; phone and WhatsApp actions; enquiry submission; customer signup, verification, login, saved vendors and dashboard; vendor login, studio and uploads; offline message; and Android back navigation.
5. Complete Play Console's store listing and app-content declarations based on the actual released functionality. Account flows collect identity and contact details; enquiries share event details with the selected vendor; uploads add vendor media. Reflect those flows in Data safety and the privacy policy. Do not claim that no user data is collected.

Keep the first Play release in internal testing until the physical-device and billing-policy checks pass. The sideload APK can be used for direct testing in the meantime.

Official guidance: [Create and set up an app](https://support.google.com/googleplay/android-developer/answer/9859152), [Internal testing](https://support.google.com/googleplay/android-developer/answer/9845334), [Play app-signing fingerprint](https://developer.android.com/training/app-links/faq), and [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469).
