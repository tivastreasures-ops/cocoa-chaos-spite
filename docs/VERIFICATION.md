# Verification ledger

Do not confuse mocked protocol tests or local previews with real Twitch integration.

## Phase 1 — OAuth and Twitch ingestion

Implemented: installed broadcaster flow, exact registered callback, two scopes, cookie-bound OAuth state, ignored server token storage, startup/hourly validation, refresh serialization and API retry, EventSub subscription.

Exercised: mocked token concurrency and bounded 401 retry; mocked EventSub subscription, frame deduplication, invalid data and revocation. Local HTTP rejects forged OAuth callbacks and unauthorized dashboard access.

**NOT VERIFIED:** actual OAuth consent, real access/refresh token exchange, Twitch subscription acceptance and receipt of real messages. No app credentials were available.

## Phase 2 — Commands and overlay

Automated checks verify viewer permissions, both public commands, restricted chaos, preview isolation, structured events, and local HTTP → SSE delivery. Browser checks verify preview greeting/cocoa/chaos appearance, 5.5-second cleanup, and cooldown feedback. These are local previews, not Twitch evidence.

**NOT VERIFIED:** actual Twitch chat → overlay or chat API reply delivery; PRISM capture.

## Phase 3 — Reliability and diagnostics

Ten automated tests pass on Node 24.22.1 (October 31, 2026). Tests cover command permissions/cooldowns, malformed/cross-channel data, digest/manual approval, event envelopes, serialized refresh, migration without duplicate subscription, revocation, voice approval boundaries, local HTTP security and SSE. Dashboard shows actual/preview counts separately. Mocked EventSub migration and retry scheduling pass; real network outage behavior still needs live testing.

## Phase 4 — Sebastian

Authenticated local tool contract and Director approval UI implemented. No ElevenLabs agent or voice was created, changed, or tested. Live voice, push-to-talk, and outbound local agent adapter remain incomplete. No microphone is opened.

## Phase 5 — Submission

Source, setup, phase ledger, demo shot list, and submission draft prepared. Official competition overview/rules reviewed. Public repository, actual Twitch evidence, Codex session ID, recorded demo, and final submission are pending.

## Account-backed acceptance checklist (fill with actual timestamps)

- [ ] Existing app credentials configured locally; credentials not in Git tracked files.
- [ ] Broadcaster OAuth succeeds with only two chat scopes; correct account and channel shown.
- [ ] EventSub status subscribed; ordinary viewer’s real `!hello` increments live count and renders greeting.
- [ ] After 21 seconds, same viewer’s `!cocoa` renders cocoa and receives official API reply.
- [ ] Effects disappear after 5.5 seconds. Idle overlay is transparent in chosen browser-source host.
- [ ] Rapid repeated commands do not produce repeated effects/replies.
- [ ] Ordinary viewer and subscriber without moderator privilege cannot run chaos. Moderator/broadcaster can.
- [ ] Disconnect/reconnect and network interruption recover with a new subscription; old chat is not replayed.
- [ ] Real revoked authorization stops ingestion; reauthorization restores connection.
- [ ] Token expiry/401 refresh works with real Twitch grant without exposing tokens.
- [ ] Question digest and review tray work with real conversation. Approval records manual-only moderation decision.
- [ ] Video under three minutes shows actual Twitch and Codex work; no secrets visible.
- [ ] Director approved final submission.

Record counts, timestamps and a safe video timecode; never paste tokens or full callback URLs into this ledger.
