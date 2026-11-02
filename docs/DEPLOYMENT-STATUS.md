# GreenGeeks preview deployment status — November 1, 2026

The Director explicitly approved creating chaos.toomanytabsopen.net on the existing GreenGeeks Pro plan and deploying the preview-only Android package, protected by authentication and HTTPS. Live Twitch ingestion and paid voice must remain disabled. No production promotion is approved.

The controllable in-app browser currently displays the GreenGeeks cPanel login page. The Director was asked to complete that login privately. The existing external Chrome session was not reused because its browser control was unreliable. The hosting login session has not yet been established in the controlled browser.

No domain, DNS, application, credential or hosting setting has been changed during this deployment attempt. The working desktop app is unchanged.

A read-only HTTPS preflight at 2026-11-02 00:02:41 UTC (November 1, 4:02 PM Pacific) could not reach the target's health, login, protected feeds or manifest endpoints. This is a pre-deployment reachability result, not a failed deployed-app test. HTTPS and hosted authentication are not yet verified. Physical Android layout/audio remain pending; a desktop phone-width preview is not substituted for those checks.

scripts/verify-public-staging.mjs is syntax-checked and ready to repeat the read-only public checks after deployment. It accepts no credentials and invokes no live services. Existing application tests remain at 45 passed from the reviewed staging build.

Next: complete cPanel login; verify the domain is attached to this account; provision the approved hostname, certificate and private app/data directories; upload reviewed sources; configure preview-only mode; have the Director enter new login/overlay credentials privately; verify hosted HTTPS/authentication/SSE and disabled live-service flags; then perform actual Android free-tone/recording checks. Report any failure before enabling additional features.
