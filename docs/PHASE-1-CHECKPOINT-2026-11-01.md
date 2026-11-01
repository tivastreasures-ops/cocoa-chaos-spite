# Phase 1 checkpoint — November 1, 2026

## Implemented and activated

- Replaced destructive validation failure handling with a single-flight connection coordinator. Network errors, timeouts, rate limits and service failures preserve the saved grant and retry with exponential backoff from 1 second to a 60-second cap. Failed validation pauses EventSub until validation succeeds.
- Confirmed invalid refresh authorization or missing required scopes ends the authenticated session and asks for renewed consent. Saved application credentials remain intact. Only an explicit Director disconnect removes the token file.
- OAuth callback failures no longer unconditionally erase a usable saved grant. Reconnect validates before starting transport. Startup and hourly validation remain enabled.
- Explicit disconnect cancels pending retry/restart work. Late validation/refresh work cannot recreate a disconnected session. Private-file writes and disconnect deletion are serialized.
- Calculator-listener diagnostics clear on stop/socket loss; late registration responses cannot falsely mark a stopped or replaced socket subscribed. EventSub migration still avoids duplicate subscription requests.
- Dashboard now displays authorization validation state and the next automatic retry time independently of EventSub status.

## Verification evidence

Full suite: **29 passed, 0 failed**, including nine new reliability regression tests. Existing permissions, cooldowns, verified-subscriber rules, fixtures, deduplication, effect queue cleanup, CSRF/private-file isolation and HTTP overlay transport tests remain green. New tests use fake Twitch responses and temporary files, not live revocation or purchases.

The initial sandbox run had a Windows EPERM failure when renaming a temporary fake-token file; the complete suite passed outside that sandbox. This was a test-environment restriction, not an assertion failure.

Live startup initially found saved application credentials but no token file. The old grant could not be recovered. The Director completed Twitch consent for the existing Cocoa&Chaos application and mermaidtiva account. At approximately 11:27 AM Pacific / 19:27 UTC, the updated server successfully validated that grant and registered both channel.chat.message and channel.subscribe listeners. The dashboard showed authorization valid, both listeners subscribed and one overlay connected. A token file was again present; token contents were not exposed.

A controlled restart at 11:32 AM Pacific / 19:32 UTC reused the saved grant without another consent screen. Both chat and calculator listeners registered again, and the existing overlay automatically reconnected. This verifies restart persistence and registration recovery, not live outage or token-expiry recovery.

**Fresh real-chat receipt is pending at this checkpoint:** the observed real-message counter remained zero after consent. The Director was asked to send !hello in actual Twitch chat. Listener registration is not proof that a chat command or a new-subscription notification has arrived. No purchase or synthetic chat subscription claim was used.

The isolated preview server on localhost:3001 passed its HTTP-to-overlay effect test. All eight browser reactions and recordings were previously preview-tested on October 31; this reliability change does not modify their artwork or renderers. A new full visual pass is not claimed here. Real outage recovery and token expiry remain regression-tested with simulated responses, not live-verified.

## Librarian handoff delivered

The asset manifest specifies all eight reactions, exact filenames, source dimensions, registration/padding, transparency, animation states, stream display targets and delivery order. Minimum useful first pack: greeting poses, three rain-kitten expressions, and supervisor run poses. Existing temporary artwork remains the fallback until approved assets arrive.

Local: docs/LIBRARIAN-ASSET-MANIFEST.md

Google Drive: https://docs.google.com/document/d/185XzDJ3rp2hWZK96PYuGudvvaUDvi75kowl5yvxEjuM

The Librarian supplies artwork; Codex integrates it. Original supplied reference images remain unchanged. No new kitten artwork was generated.

## Decisions, blockers and deadline risk

- Continue with existing code and the existing Sebastian agent/Almost Butler voice. No agent, voice or ElevenLabs configuration was changed; no speech generation was purchased or invoked.
- Fresh chat delivery and overlay visibility need the Director's real !hello evidence. A real subscription explosion remains unverified even though its listener is registered.
- Next engineering phase is Sebastian's private dashboard speech integration, followed by separate stream-output capture verification. Paid generation requires Director approval first.
- Approved transparent artwork, fresh live demo evidence and stream audio capture remain schedule dependencies for November 2. Use the minimal asset pack and existing renderers to protect the deadline. No new scope is needed for current Twitch listeners.
- Public repository publication and final hackathon submission remain explicit Director approval gates. Neither occurred.

This checkpoint supplements the earlier development audit; earlier open findings are historical where superseded here.
