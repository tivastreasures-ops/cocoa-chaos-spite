# Cocoa & Chaos & Spite

A local Twitch stream companion for Cat Girl’s faculty office. Real Twitch chat ingestion is implemented using EventSub WebSockets, with a separate transparent browser overlay, Director dashboard, and compact chat digest. Vanilla Node.js ES modules keep setup dependency-free. Node 22.16+ is required; tested on Node 24.22.1.

**Status:** real Twitch `!hello` reached EventSub and the Director confirmed the visible greeting on October 31 at 10:15:46 AM Pacific. New CAT CHAOS commands are implemented and preview-tested in isolated mode, pending activation on port 3000. Chat replies failed in the original running version; the user-token payload fix is regression-tested but awaits live retesting. Sebastian voice is an incomplete enhancement. Do not present preview footage as Twitch evidence. See `docs/CAT-CHAOS-UPDATE.md`.

## Start

```powershell
cd path\to\cocoa-chaos
node src/server.mjs
```

Open **http://localhost:3000**. On this machine, if Node is not on PATH, use the included `start.ps1` launcher (it also checks the Codex bundled runtime).

1. In the existing Twitch developer application **Cocoa&Chaos**, verify the redirect URI is exactly `http://localhost:3000/auth/twitch/callback`. Use a confidential client with a client secret for this implementation. Do not create a second application.
2. Enter the app’s Client ID and Client secret in the local setup form. They are written to ignored `.private/credentials.json`. Alternatively copy `.env.example` to `.env` and fill values there. Environment values take precedence; restart after changing `.env`.
3. Click **Connect Twitch**, sign in as the Director’s broadcaster account, and approve `user:read:chat user:write:chat`. The channel is locked to this account. No extra scopes are requested.
4. Wait for **subscribed** in the EventSub card.
5. Open **http://localhost:3000/overlay**. Its blank idle state is intentional. The page background is transparent (a normal browser may display transparency as white).
6. Add that URL as a browser source in PRISM Live Studio or any application supporting browser sources. Set source size to **1920 × 1080**. No OBS-specific APIs are used. Set `CANVAS_WIDTH` / `CANVAS_HEIGHT` in `.env` and restart, or use `/overlay?width=1280&height=720` for another canvas. Match source dimensions to canvas dimensions.
7. From actual Twitch chat, send `!hello`, then wait **at least 21 seconds if using the same viewer**, and send `!cocoa`. Confirm an effect and a reply for each. Ordinary viewers may run both.

`!chaos` and `!flail` accept only the broadcaster or a moderator. `!cat`, `!hello`, `!cocoa`, and `!hydrate` are public. `!mmm` accepts only the broadcaster or a message bearing Twitch’s current subscriber/founder badge; moderators without such a badge are denied. Cross-channel Shared Chat messages are discarded. User-token replies omit the forbidden `for_source_only` parameter and are suppressed if the channel is in a Shared Chat session or that check fails. A Shared Chat session starting between the check and send remains a race inherent in this installed-user flow; use this MVP outside Shared Chat.

## Local verification

For isolated tests, keep the live server running and start a separate sandbox (it does not initialize Twitch tokens or authorize Twitch):

```powershell
$env:CC_PREVIEW_ONLY='1'
node src/server.mjs
# http://localhost:3001 and /overlay
```

Run the suite in another terminal. Its HTTP test defaults to port 3001 so it cannot consume live command cooldowns:

```powershell
node --test test/*.test.mjs
```

The suite includes mocked EventSub welcome/subscription, notification deduplication, session migration, malformed input, revocation, role/subscriber permissions, hydration cooldowns, refresh serialization, digest/approval behavior, reply payload regression, bounded renderer queue cleanup, and actual local HTTP → SSE transport. The subscription fixture is synthetic; it does not cause a purchase. HTTP tests increment only the sandbox preview counter. Restart the sandbox to clear its state.

Browser previews cover all eight effects. Live commands use a 6-second global effect cooldown and 20 seconds per viewer, except hydration which adds a 120-second command-wide cooldown and 180 seconds per viewer. Director previews have separate cooldown state and one identity per effect; wait 6 seconds between different previews and 21 seconds to repeat the same ordinary effect. Hydration preview retains its longer cooldown. Calculator previews are limited to once per 6 seconds. Real chat replies are capped at 5 per 30 seconds. The overlay runs one effect at a time, queues up to four, drops excess events, and expires queued items after 30 seconds. Every effect clears after 5.5 seconds.

## New-subscription calculator

After activating the update, click **Authorize subscription notifications** in the live dashboard. This explicitly requests the optional `channel:read:subscriptions` scope in addition to the existing chat scopes. Until approved, chat works normally and the calculator listener remains disabled. Twitch `channel.subscribe` version 1 events cause the explosion; resubscriptions are not included. Gifted new subscribers may generate individual events. Neither chat claims nor `!calculator` can trigger a real subscription event. Optional-listener failure/revocation does not stop chat. Previews require no subscription or payment.

## Security and operations

- The listener binds to `127.0.0.1:3000` and rejects other Host headers. Always use the `localhost` URL. Never expose this service through a tunnel or port forward.
- `.env` and `.private/` are ignored by Git and absent from the deliverable ZIP. Credentials and refresh tokens stay server-side and are never sent to the overlay. Tokens use atomic writes, with restrictive POSIX file modes where supported. On Windows, NTFS permissions inherit from the containing user profile; private files are **not encrypted at rest**. Keep this directory in your own Windows account and out of shared folders.
- Director mutation routes require a local admin cookie, same-origin header, and CSRF header. Overlay SSE is read-only and carries only approved effect events, never tokens or raw chat history. Dashboard chat rendering uses text nodes.
- OAuth state is random, cookie-bound, single-use, and expires in ten minutes. Token validation runs on startup and hourly; API 401s trigger one serialized refresh and retry. Failed validation ends the local Twitch session. Disconnect removes local tokens; it does not revoke the grant at Twitch. Revoke the application in Twitch connections if needed.
- EventSub maintains a keepalive watchdog, exponential retry with jitter, duplicate suppression, and approved-host session migration. A fresh connection resubscribes. Twitch cannot replay chat lost during an outage. The reconnect control is available in the dashboard. Subscription revocation requires reauthorization.
- The server retains up to 200 messages, 100 moderation decisions, and 40 generic diagnostic lines in memory; restart clears them. It does not save chat transcripts to disk or print message bodies to the console.
- The digest deterministically counts activity, surfaces the last five questions, and quotes three recent messages. It is not an LLM summary. The moderation tray records approval/dismissal; timeout, ban and delete must be performed manually in Twitch. No moderation endpoint or moderation OAuth scope exists.

## Architecture and integration contract

`src/auth.mjs` owns OAuth/refresh; `twitch.mjs` owns EventSub; `commands.mjs` owns command permissions/cooldowns; `events.mjs` owns sanitization and SSE; `assistant.mjs` owns the digest/review tray; `voice.mjs` owns the prospective voice tool interface; `server.mjs` composes the service. `public/overlay.js` renders replaceable CSS artwork with automatic 5.5-second cleanup. Reduced-motion preference removes falling items.

Events carry `schemaVersion`, `type`, `timestamp`, `source`, `eventId`, and an explicit sanitized `payload`. An internal event bus emits `stream.chat.received`, `stream.command.executed`, `stream.overlay.effect`, and a throttled `stream.assistant.summary` every 15 seconds. Only effect events reach overlay SSE. The renderer accepts only version 1 and recognized effects/sources. It never replays missed effects on reconnect, to avoid stale bursts. `lettertown.round.completed` and `lettertown.story.completed` are reserved future integration types. Letter Town is not a dependency.

## Sebastian: incomplete enhancement

The existing Sebastian agent and Almost Butler voice were not accessed, altered, or duplicated. There is no microphone or audio session, so no feedback loop can occur. Do not claim voice conversation works.

The local server implements a prospective `POST /api/voice` adapter with a configured random `VOICE_BRIDGE_TOKEN` of at least 32 characters sent in the Authorization Bearer header. It is disabled without that token. It accepts `{ "name": "get_chat_summary", "arguments": {} }`, `send_chat_reply` with `{message}`, or `trigger_overlay_effect` with `{effect}`. Replies and effects create bounded requests in the Director dashboard; only an authenticated Director approval executes them. Mutating suggestions are rate limited. The agent receives no Twitch credentials or moderation execution tool. Because this is localhost, the ElevenLabs cloud cannot call it directly. A future outbound local bridge must connect the existing agent to this contract, pass only needed chat context, and provide push-to-talk/mute. Do not add a public tunnel as a shortcut.

## Remaining release gates

Complete the account-backed checklist in `docs/VERIFICATION.md`, record an actual Twitch demo, publish a code repository, fill in the Devpost fields from `docs/SUBMISSION.md`, and obtain the Director’s approval before final submission. Source here is a local Git repository; it has not been published.

Official implementation references: [installed chatbot authentication](https://dev.twitch.tv/docs/chat/authenticating/), [EventSub WebSocket lifecycle](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/), [token validation](https://dev.twitch.tv/docs/authentication/validate-tokens/), [refreshing tokens](https://dev.twitch.tv/docs/authentication/refresh-tokens/), [Twitch API](https://dev.twitch.tv/docs/api/reference/#send-chat-message).
