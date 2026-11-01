# Android companion staging package

Target: **https://chaos.toomanytabsopen.net**. This package is prepared and locally tested; it is not deployed.

Read **docs/ANDROID-HOSTING-CHECKPOINT.md** before uploading. The proposed cPanel values, verification evidence, provider questions and approval/cutover boundaries are recorded there.

Use **Node 22.23.4** and startup file **app.cjs**. Configure hosted mode with **.env.hosted.example** in the host's private environment settings. Begin with **CC_PREVIEW_ONLY=1** and **CC_TWITCH_INGEST=0**. No live service credentials are needed for that initial preview.

The Director chooses and enters new login/overlay credentials privately. Never upload the desktop .private folder or a completed .env. Keep persistent credential storage outside the application/public directories. Preserve the working desktop project and existing Twitch/ElevenLabs identities.

45 automated tests passed. A phone-sized browser layout was previewed. GreenGeeks runtime behavior, HTTPS, physical Android operation and mobile audio capture still need verification. Director approval is required before account changes/public deployment, live service credential transfer, additional paid speech, public repository publication or final submission.
