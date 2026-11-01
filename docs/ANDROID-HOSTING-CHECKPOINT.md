# Android companion — hosting checkpoint, November 1, 2026

## Ready for review

Target chosen by the Director: **https://chaos.toomanytabsopen.net**.

This is an Android-friendly hosted web companion built from the existing project, not a new native Android APK. The isolated worktree/branch is cocoa-chaos-android / android-companion-hosting. The working desktop project, saved authorization, Sebastian identity and voice remain untouched.

Implemented in staging:

- Isolated local preview cookies so visiting a staging port does not expire the working desktop dashboard session.
- Phone navigation, touch-sized controls and a home-screen web manifest. No offline command queue, cached secrets, service-worker interception, or automatic paid speech.
- Opt-in hosted configuration with an HTTPS origin, exact hosted Twitch callback, expected Host validation, configurable provider port and separate persistent private-data directory outside the application.
- Director sign-in with bounded attempts, eight-hour server-side sessions, Secure/HttpOnly cookies, sign-out, and preserved Origin/CSRF control checks.
- Separate read-only overlay credential, exchanged for an origin-bound signed cookie. The long-lived link credential stays in the URL fragment rather than the query string. The overlay can receive effects/audio but cannot read chat diagnostics, perform Director controls, start paid speech or modify permissions. Rotate its environment credential and restart to revoke old links. Overlay cookies last 24 hours; reload the original private link after expiry.
- Authenticated reveal of the streaming-app overlay link, plus checks that overlay credentials do not appear in status responses.
- cPanel/Passenger CommonJS startup wrapper app.cjs, with the existing ES-module application underneath. SSE responses request proxy buffering to be disabled.
- A hosted Twitch cutover gate: CC_TWITCH_INGEST defaults off. OAuth validation or Reconnect cannot turn it on. Explicitly enable only after the desktop ingestion owner is stopped.

## Verification

**45 tests pass**, including hosted HTTPS/configuration safeguards, Director session expiry/logout/throttling, signed read-only overlay access, forged/cross-origin/expired token rejection, HTTP controls/private-audio isolation, disabled paid preview sessions, cPanel startup wrapper, cutover gate, and all prior Twitch role/cooldown/event/voice tests.

The hosted HTTP test simulates a TLS reverse proxy using a local server and fake credentials. It is not a live GreenGeeks TLS or process-management test. An initial harness used fetch's overridden Host header unsuccessfully; an explicit HTTP reverse-proxy request fixed the harness and the full suite passed.

Browser preview at 390 × 844: phone navigation appears and no horizontal overflow was measured. This is a desktop browser viewport test, not physical Android/iPhone certification. The earlier private/overlay free-tone playback and effects remain covered by tests; no new paid ElevenLabs generation occurred for this work.

GreenGeeks account evidence: cPanel exposes Setup Node.js App. The Director's screenshot shows **22.23.4**, compatible with the project's Node 22.16+ requirement. EcoSite Pro is the confirmed plan. No application, DNS record, credential, domain, purchase or deployment was created in the account.

Public DNS check: toomanytabsopen.net uses ns1.greengeeks.net and ns2.greengeeks.net. chaos.toomanytabsopen.net did not have an A record at the check. Nameservers alone do not establish that the domain is attached to this particular cPanel account.

## Proposed GreenGeeks preview setup

Obtain Director approval before these account changes or public deployment. Use the existing plan; do not purchase an upgrade.

1. Confirm toomanytabsopen.net is present in this cPanel's Domains page. Create the dedicated chaos.toomanytabsopen.net hostname and obtain an active certificate through the provider's normal workflow. Preserve existing sites and mail records.
2. Use a private application root such as **/home/ACCOUNT/cocoa-chaos-app**, outside public_html, and a separate persistent directory **/home/ACCOUNT/cocoa-chaos-data**. Confirm the provider permits these paths. Do not upload the desktop .private directory or completed .env files.
3. Upload the reviewed source ZIP into the application root and extract it. Select **Node 22.23.4**, production environment, application URL **https://chaos.toomanytabsopen.net/** and startup file **app.cjs**. There are no runtime npm dependencies.
4. Fill the private host environment using .env.hosted.example. Leave **CC_PREVIEW_ONLY=1** and **CC_TWITCH_INGEST=0**. The Director must choose and enter a unique Director passphrase and a separate random overlay credential. No live Twitch or ElevenLabs keys are needed for this preview stage. Never paste credentials into a chat or put them in the application URL.
5. Start the application and check /health, the login gate and the protected overlay. Confirm that browser-source clients receive fresh SSE events immediately, rather than proxy-buffered batches. Test logout and a private-link reload.
6. On Android, open the Director dashboard in Chrome and try the phone controls. For a home-screen shortcut, use the browser's normal add/install option if offered. There is no offline support.
7. Add the private overlay link to a compatible streaming app's Web source. Test free reactions and the free tone in a short recording. Check landscape 1920 × 1080 or use the overlay's width/height parameters for a portrait scene. Do not infer audio capture from visible captions alone.

For camera-mode versus screencast mode, verify the streaming app's capture behavior. Configure credentials before going live. A screencast can show the Director dashboard if you open it on the captured screen; an available iPhone can serve as a separate private controller while Android broadcasts. “Private dashboard” audio routing does not override device-wide system-audio capture.

## Conditions before live Twitch/voice cutover

- Confirm outbound WSS/TLS to Twitch and ElevenLabs on port 443, long-lived inbound HTTP/SSE, process survival and the provider's idle/recycle policy. This app does not need an inbound WebSocket server; its WebSocket connections are outbound.
- Confirm **one ingestion process**. The cutover flag prevents accidental default activation; it is not a distributed lock. Passenger/host configuration must not spawn multiple active bot owners. If the provider cannot guarantee a suitable process model, keep previews here and evaluate a suitable always-on host before live cutover.
- Confirm persistent private storage survives application restart/redeployment and has appropriate account filesystem permissions. Do not rely on ephemeral deployment storage for rotating Twitch refresh tokens.
- Add **https://chaos.toomanytabsopen.net/auth/twitch/callback** to the existing Cocoa&Chaos Twitch application's allowed redirects; keep the working localhost callback. Do not create a replacement Twitch application.
- Obtain explicit approval before transferring the specific Twitch and ElevenLabs credentials to GreenGeeks. Set **CC_PREVIEW_ONLY=0**, complete hosted Twitch consent, and verify identity without activating ingestion yet.
- Stop the desktop ingestion owner before setting **CC_TWITCH_INGEST=1** on the hosted process. Check a real !hello once and verify only one bot reply. Keep preview evidence separate from real events.
- The Director already confirmed real Sebastian verification and audible speech on the **desktop**. Its server status recorded successful identity verification at 23:20:37 UTC and the 60-second session limit subsequently ended the session. This does not establish hosted/mobile speech or stream-output capture. Hosted paid speech still needs explicit per-session approval and a separate recorded audio test.

Rollback: stop hosted ingestion first; then restart the original desktop app using its saved grant. Do not run both ingestion owners. No public repository publication or final hackathon submission is authorized by this hosting checkpoint.

## Unsent provider questions

The Director can ask GreenGeeks support:

“My existing EcoSite Pro account exposes Node 22.23.4. I need one persistent Node process for a Twitch chat companion: outbound WSS to Twitch and ElevenLabs on 443, inbound long-lived SSE with 15-second heartbeats, and private files outside the app root that survive redeployment. Does this account support that process model without idle termination or multiple Passenger bot processes? What provider-supported settings are required? I am not requesting a plan upgrade yet.”

No support message was sent.
