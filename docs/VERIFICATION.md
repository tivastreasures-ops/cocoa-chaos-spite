# Verification ledger

Do not confuse mocked protocol tests or local previews with real Twitch integration.

## Phase 1 — OAuth and Twitch ingestion

Implemented: installed broadcaster flow, exact registered callback, two scopes, cookie-bound OAuth state, ignored server token storage, startup/hourly validation, refresh serialization and API retry, EventSub subscription.

Exercised: mocked token concurrency and bounded 401 retry; mocked EventSub subscription, frame deduplication, invalid data and revocation. Local HTTP rejects forged OAuth callbacks and unauthorized dashboard access.

**LIVE VERIFIED:** broadcaster account `mermaidtiva` is authorized and the real chat listener is subscribed. Real `!hello` received at 2026-10-31 10:15:46 AM Pacific; the Director explicitly confirmed seeing the greeting. Tokens were not printed or inspected. Real token refresh and outage recovery remain unverified.

## Phase 2 — Commands and overlay

Automated checks verify viewer permissions, both public commands, restricted chaos, preview isolation, structured events, and local HTTP → SSE delivery. Browser checks verify preview greeting/cocoa/chaos appearance, 5.5-second cleanup, and cooldown feedback. These are local previews, not Twitch evidence.

**LIVE VERIFIED:** real Twitch `!hello` → EventSub → visible greeting (Director confirmation). **NOT VERIFIED:** ordinary-viewer live permissions, live cocoa and other effects, chat API replies, or PRISM capture. The original running build’s reply failed; the corrected payload is tested in code and not yet activated/live-tested.

## Phase 3 — Reliability and diagnostics

Twenty automated tests pass on Node 24.22.1 (October 31, 2026). New coverage includes verified subscriber/founder versus moderator roles, hydration cooldown boundaries, new-subscription fixtures and duplicate suppression, optional-listener failure isolation, bounded overlay queuing/cleanup, and the user-token reply regression. Browser checks exercised hydration, marshmallow cats, running cat, flail, calculator, and automatic removal in the isolated sandbox. An initial browser timer-binding failure was fixed and cleanup was rechecked. Mocked events are not live event verification.

## Phase 4 — Sebastian

Authenticated local tool contract and Director approval UI implemented. No ElevenLabs agent or voice was created, changed, or tested. Live voice, push-to-talk, and outbound local agent adapter remain incomplete. No microphone is opened.

## Phase 5 — Submission

Source, setup, phase ledger, demo shot list, and submission draft prepared. Official competition overview/rules reviewed. One real greeting is confirmed; demo recording, public repository, Codex session ID, and final submission remain pending. CAT CHAOS update is staged while the existing port-3000 process stays connected; activation needs one controlled restart and overlay reload.

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
