# Occanova Android: first Play test release

The first Android release opens the customer discovery experience at `https://www.occanova.com/app`. People can search approved event vendors, view portfolios and contact a vendor. Vendor registration, subscription billing and customer account management remain on the website; do not describe them as Android app features yet.

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
4. Install through the internal-test link on a physical Android phone. Check launch without a browser toolbar, search and filters, vendor photos, profile links, phone and WhatsApp actions, enquiry submission, offline message and Android back navigation.
5. Complete Play Console's store listing and app-content declarations based on the actual released functionality. The enquiry form collects a name, contact details and event information and shares the enquiry with the selected vendor, so reflect that in Data safety and the privacy policy. Do not claim that no user data is collected.

Keep the first release in internal testing until the physical-device checks pass. Adding customer accounts or vendor billing inside the Android app will require another review of the listing, privacy disclosures and payment rules.

Official guidance: [Create and set up an app](https://support.google.com/googleplay/android-developer/answer/9859152), [Internal testing](https://support.google.com/googleplay/android-developer/answer/9845334), [Play app-signing fingerprint](https://developer.android.com/training/app-links/faq), and [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469).
