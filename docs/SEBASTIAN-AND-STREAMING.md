# Sebastian and streaming setup

## What is wired

The local dashboard connects to the existing Sebastian ElevenLabs agent, not a newly written imitation or standalone replacement TTS voice. Agent: agent_4301m69cqaa8e1h8cvbd9g3a1pq2. Approved Almost Butler voice: 2X0uNJ4yDHqWnhVL8Ry4. The current configuration was read again on November 1; no agent or voice settings were changed.

Typed Director messages are sent to the existing conversation engine. Its own opening message and responses supply both speech and captions. The Director's message is input to Sebastian, not a promise that he reads that text verbatim. No microphone is opened. Twitch messages never automatically start a paid conversation or get forwarded to ElevenLabs by this connection.

The earlier voice.mjs authenticated tool-suggestion contract remains separate. The new voice connection cannot execute chat, moderation or overlay tools. Unexpected client tool requests receive a denial. Existing approval controls and Twitch role/subscriber restrictions remain in place.

## First local test

1. Open http://localhost:3000/#sebastian on this PC.
2. Select Private dashboard. Click Test audio path — free tone. This synthesized local beep consumes no ElevenLabs credits and is not Sebastian's voice.
3. Enter an ElevenLabs API key in the local password field, never in a chat. The app needs access to read this agent and obtain a signed conversation URL. The connected ChatGPT workspace does not automatically supply credentials to the local Node server.
4. Click Verify agent and voice. This reads configuration without generating speech. The app rejects an unexpected voice or unsupported audio format before opening a paid session.
5. Only when the Director approves service-credit usage, tick the one-session approval box and click Start approved paid session. The existing opening greeting may generate immediately. This can incur agent/conversation/model charges under the workspace's plan. The app's 60-second timer is a local duration safeguard, not a dollar cap or guarantee about provider billing.
6. Listen privately, then send the prepared Director greeting message if desired. Messages have a six-second cooldown. Stop session and clear audio ends the connection and queued playback.

Paid connections do not automatically retry, and restarting the app never starts a paid session. A session times out after 60 seconds; an incomplete handshake times out after 15 seconds. Audio buffering is bounded to 12 seconds and clears when muted, stopped, interrupted or disconnected. Captions clear automatically.

Credentials are saved server-side in ignored .private/sebastian.json, or read from ELEVENLABS_API_KEY. They are never included in dashboard status, the overlay, audio events, source ZIPs or Git. The local file is not encrypted; it depends on Windows account filesystem permissions. Signed session URLs stay server-side. No paid test has been performed yet.

## Desktop broadcast: one streaming application

You do not need both OBS Studio and Streamlabs Desktop. The existing overlay is a browser source; choose one desktop streaming application that supports browser sources and audio.

For OBS Studio:

1. Download from https://obsproject.com/ if OBS is the chosen desktop application. Do not use similarly named download sites.
2. Add a Browser source pointing to http://localhost:3000/overlay, normally 1920 × 1080.
3. Enable Control audio via OBS in its source properties. If browser audio is blocked, use the source's Interact control and click Enable Sebastian audio.
4. In the companion dashboard, choose Stream overlay and run the free tone. Check the source's audio meter and make a short local recording before any broadcast. Listen to the recording; hearing a tone in a normal browser does not establish stream capture.
5. Adjust the source's stream output and monitoring deliberately. Avoid capturing both the dedicated source audio and a duplicate desktop-audio feed, which can create echo.

Private dashboard routing only means the app does not send those voice events to its overlay feed. Broad desktop/system-audio capture can still capture private dashboard playback. Isolate browser-source audio and use headphones for private testing.

Official source: https://obsproject.com/kb/browser-source

## Android phone-only streaming

Android is the Director's primary target; an iPhone is also available for development. A phone-only broadcast needs a hosted companion. The PC's localhost URL identifies the phone itself when typed on the phone; the current app also binds only to the PC's loopback interface. Merely copying that URL to Android will not connect it.

Target flow:

Twitch → always-running hosted Node companion → HTTPS overlay plus speech feed → web source inside the Android streaming app → Twitch broadcast.

PRISM Live Studio documents a mobile web-browser widget and audio from web/media sources. It is a candidate for the Android integration test; verify the chosen camera or screencast mode, phone model, current app version, audio permissions, background behavior, headphones and echo handling before relying on it. Streamlabs Mobile is another candidate, but full companion audio/overlay behavior is not yet tested on either phone. OBS Studio is a desktop tool, not required for this phone-only path.

Sources:
- https://guide.prismlive.com/mobile/guides/widgets-and-effects/web-widget/using-web-browser-widget
- https://prismlive.com/en_us/faq/faq.html

## Hosting choice and deployment work still required

The Director confirmed the existing plan is EcoSite Pro. Check that existing account first. Its current Node guide lists EcoSite Pro, Premium and managed VPS; another support catalog names Premium, so account entitlement must be verified rather than assumed. Check Setup NodeJS App, a Node version compatible with this app (22.16+), outbound persistent Twitch/ElevenLabs WebSockets, long-lived streaming HTTP/SSE responses, process survival while idle, HTTPS and durable private token storage. Node support alone does not establish that all these are available.

If the existing plan cannot support those requirements, Replit Reserved VM is the clearest fit among the proposed alternatives. Replit explicitly recommends it for chatbots that must stay connected and lists a recurring fixed hosting cost. Autoscale and static hosting are not the intended deployment for this single-process always-connected bot. PythonAnywhere is not a direct fit for the existing Node server; its staff states Node.js web servers are unsupported. Do not rewrite the app in Python solely to change hosts before the deadline.

Sources:
- https://www.greengeeks.com/support/article/create-nodejs-app-cpanel/
- https://docs.replit.com/features/publishing/deployment-types
- https://www.pythonanywhere.com/forums/topic/33573/

This local app is not ready to expose publicly unchanged. Before hosting, add authenticated Director login, restricted setup/OAuth controls, separate revocable overlay access, HTTPS origin/Host configuration, the correct hosted Twitch callback and durable server-side token storage that survives redeployment. A cloud deployment must run one ingestion owner so multiple replicas do not duplicate chat commands or paid agent sessions. Never upload the local .private directory or .env into a public repository.

No hosting account, purchase, public deployment or repository publication was created during this build. Obtain the Director's choice and approval for recurring hosting costs before provisioning a paid VM. Protect the November 2 submission with the working local build while phone-only deployment is evaluated.

## Verification record

Implemented: server-side existing-agent connection; identity/voice preflight; private and stream routes; PCM audio queue; mute/volume/captions; stop/interruption handling; paid approval gate; bounded sessions; secure local key entry; free tone; existing tool boundary preserved.

Automated: 39 tests passed, including fake ElevenLabs socket fixtures, paid gating, identity mismatch, invalid signed URLs, pending-start cancellation, routing/mute, duration limits, denied tools, PCM conversion/queue limits, browser timer binding, private audio HTTP isolation and all earlier Twitch tests.

Browser preview: private dashboard tone/caption delivery; explicit overlay tone/caption delivery; required autoplay-unlock click; no paid ElevenLabs generation. A browser timer-binding error discovered during preview was corrected and regression-tested.

Not yet verified: real Sebastian speech using the local connection, audible output confirmed by the Director, OBS/PRISM stream capture, or Android/iPhone end-to-end operation. Real Twitch chat was independently verified in the Phase 1 checkpoint; it is not evidence of voice output.
