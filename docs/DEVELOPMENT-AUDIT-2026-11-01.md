# Cocoa & Chaos & Spite

## Phase 1 checkpoint addendum — November 1, 2026

Phase 1 reliability fixes are implemented and activated. The full suite passes 29 tests, including nine new reliability regressions. Temporary validation failures preserve authorization and retry; explicit disconnect cancels pending work, and stale subscription status is cleared. The Director renewed Twitch consent; chat and calculator listeners registered successfully. A controlled restart at 11:32 AM Pacific reused the saved grant and restored both listeners plus the existing overlay. Fresh real chat and real subscription receipt remain unverified in this checkpoint (real counters were zero). No paid speech, public publication or submission occurred.

The Librarian manifest is delivered: https://docs.google.com/document/d/185XzDJ3rp2hWZK96PYuGudvvaUDvi75kowl5yvxEjuM . The Librarian supplies final artwork; Codex integrates it. See docs/PHASE-1-CHECKPOINT-2026-11-01.md for tests, remaining dependencies and gates. The original audit below is historical where superseded here.

*Development and verification audit • November 1, 2026 • Pacific time*

## 1. Overall status

The existing local Twitch companion has been built and exercised with real Twitch chat. It includes OAuth, EventSub WebSockets, a Director dashboard, a transparent browser overlay, eight reaction types, cooldowns, a compact chat digest, and manual moderation review. The core was extended rather than rebuilt.

Sebastian exists as an ElevenLabs agent with the approved Almost Butler voice. That agent has been inspected without changes. The local project has an authenticated voice-tool contract, but it does not yet synthesize speech, play audio, open a microphone, or connect to the agent. Audible speech and stream-output capture remain unfinished.

Both previously missing kitten reference images were supplied on November 1 and preserved as original files. They have not yet been separated into transparent assets or integrated into the reactions. The reaction recordings still show the original lightweight CSS/SVG artwork.

## 2. Completed Twitch and overlay work

- Authentication: reused the existing Cocoa&Chaos Twitch app; implemented broadcaster Authorization Code flow, exact localhost callback, server-side token storage, refresh serialization, startup/hourly validation, and bounded API retry.

- Ingestion: implemented real channel.chat.message subscriptions over EventSub WebSockets, keepalive monitoring, retry scheduling, session migration, duplicate suppression, and channel validation. Shared-chat messages originating elsewhere are rejected.

- Dashboard: account/channel status, EventSub status, last real message, real-versus-preview counts, overlay connections, reconnect/disconnect controls, reaction previews, digest, and review tray.

- Overlay: transparent browser-source page, default 1920 × 1080 canvas, configurable dimensions, original replaceable CSS/SVG art, reduced-motion styling, and automatic 5.5-second cleanup.

- Rate limits: normal commands share a 6-second global effect floor and a 20-second per-viewer cooldown. Hydration additionally has a 120-second command-wide cooldown and a 180-second per-viewer cooldown. Preview cooldown state is separate from real chat.

- Queue: one overlay reaction runs at a time; up to four wait. Excess events are dropped and queued items expire after 30 seconds.

Commands and permissions: !hello, !cocoa, !cat, and !hydrate are available to all viewers. !chaos and !flail require broadcaster/moderator identity. !mmm requires Twitch subscriber/founder metadata on the message or the broadcaster identity; moderator status alone does not qualify. Missing/invalid subscriber evidence fails closed.

The eighth reaction is the Dean’s calculator explosion, triggered by validated channel.subscribe version 1 notifications, not by a chat claim or !calculator. The optional channel:read:subscriptions scope was authorized and the listener was observed subscribed. No actual subscription notification or purchase has been verified.

## 3. Verification evidence and its limits

- October 31, 10:15:46 AM Pacific: real !hello reached EventSub; the Director explicitly confirmed the visible overlay greeting. This was the broadcaster’s test, not an ordinary-viewer permission test.

- October 31, 10:31:12 AM: after the Director-approved restart, EventSub resubscribed using the saved authorization. The dashboard and overlay assets were refreshed.

- October 31, 10:36:56 AM: real !hello executed and the Director confirmed receiving the official Twitch welcome reply. This verified the corrected chat-message API path.

- October 31, 10:37:09 AM: a real !flail was denied by the per-viewer cooldown because it followed !hello too soon. This verifies cooldown behavior, not a successful live flail reaction.

- October 31, 10:38:24 AM: diagnostics reported the new-subscription listener active after additional authorization. At 10:38:49 AM !cocoa executed with its reply; !cat and !chaos later executed at approximately 10:39:15 and 10:39:45 AM. Diagnostics establish command/reply processing; no separate Director confirmation of each visual was recorded.

All eight reaction types were exercised through browser previews, including cleanup. Twenty automated tests passed during the October 31 build. Coverage included public/restricted roles, subscriber/founder distinctions, hydration boundaries, malformed and foreign-channel events, subscription fixtures and deduplication, optional-listener failure isolation, serialized refresh, reply payloads, and queue cleanup. The full suite was not rerun solely to prepare this audit.

Not established: ordinary viewers’ end-to-end live permissions, a real subscriber’s !mmm, a successful live flail, a real new-subscription explosion, token refresh under actual expiry, live outage recovery, PRISM/browser-source capture, or audio reaching a stream.

## 4. Bugs corrected and open reliability findings

Corrected: the initial chat reply incorrectly sent for_source_only with a User Access Token. The field was removed and a Shared Chat preflight check added. Replies are suppressed when Shared Chat is active or cannot be verified. Twitch provides no atomic source-only send in this installed-user flow; a session-start race remains, so avoid Shared Chat for the MVP.

Corrected: browser testing found a timer-binding defect in the new effect queue that could leave an invisible layer behind. The scheduler was fixed, browser cleanup rechecked, and a regression test added.

Open: the last observed live dashboard later reported authorization validation failure, and port 3000 was unavailable when reaction recordings were requested. Those recordings used a separate preview-only server and did not restore the live connection. Current live availability is not asserted by this audit.

Code review finding: server.mjs currently disconnects and removes locally stored tokens on any validation exception, including a transient network failure. This should be narrowed to confirmed invalid authorization, with retry/backoff for transient failures. It has not been fixed here. Calculator-listener status can also remain stale after the main connection stops; diagnostics should distinguish listener registration from current connectivity.

## 5. Sebastian: verified existing agent and unfinished integration

Existing agent: Sebastian — agent_4301m69cqaa8e1h8cvbd9g3a1pq2. Approved voice: Almost Butler — 2X0uNJ4yDHqWnhVL8Ry4. Tags: sebastian, twitch. The last recorded workspace inspection returned zero calls in the preceding seven days. No voice call or synthesis test was performed.

Inspected configuration: English; deepseek-v41-flash at temperature 0; eleven_v4_turbo TTS; expressive mode enabled; PCM 16 kHz output; no attached custom tools, MCP servers, or knowledge-base documents. Agent authentication was disabled with an empty allowlist. No agent, voice, prompt, authentication setting, or account subscription was changed.

Personality preserved: polished British courtesy, velvet precision, dry wit, calm competence, warm loyalty to the Director, and affectionate exasperation with chaos. The recovered creative discussion also establishes his very limited patience for the Dean. The actual prompt keeps him advisory-only, truthful about access, protective of private information, and subject to authenticated confirmation for consequential moderation.

Local voice.mjs is a prospective authenticated adapter with get_chat_summary, send_chat_reply, and trigger_overlay_effect. Mutating suggestions require a Director approval click. It is not an ElevenLabs connection and provides no audible voice. Required next work includes an approved-line test, server-side service credentials or supported agent-session connection, speech queue, mute/volume, optional captions, and separate verification of browser audio and stream-output capture. Explain service-credit usage before enabling paid generation.

## 6. Asset and recording inventory

Received November 1: “marshmallow a.png” — 1312 × 1199 RGB image of a dimensional white plush kitten in a pink flower, with pink toe beans and a letter A tile. Preserved as marshmallow-flower-kitten-original.png.

Received November 1: “1793504583506.png” — 1536 × 1024 RGB kawaii Twitch asset sheet containing kittens, branding, frames, buttons, backgrounds, and alert panels. Preserved as kawaii-twitch-asset-sheet-original.png.

Both originals lack an alpha channel: their backgrounds are baked in. They are references, not production-ready transparent sprites. The flower scene also contains the letter tile, and the sheet contains baked-in text. Asset isolation and any necessary text removal/replacement remain to be done; neither original has been altered.

Copies are saved in the existing repository under public/assets/references/ and in the creative handoff under references/. Artwork direction is dimensional plush marshmallow kittens, soft pastel/blush details, expressive faces, pink toe beans, and cozy chaos. Existing command rules and subscriber restrictions must survive the artwork update.

Available recordings: eight individual silent MP4s, combined reel, contact sheet, and recording README. These are sampled captures of actual browser preview animations, exported at 30 fps using held frames from variable-rate captures. They are not continuous 30 fps acquisition or proof of live Twitch events. The combined reel is approximately 49.6 seconds. No Twitch chat message, subscription purchase, or real subscription event was generated to make them.

## 7. Security and moderation boundaries

The app binds to loopback, restricts expected Host/origin, uses admin-cookie/CSRF checks for Director controls, and exposes a read-only effect feed. Viewer text is rendered as text. Credentials and tokens are excluded from Git and shareable source archives. Private files are not encrypted at rest; Windows access depends on the containing account’s filesystem permissions.

No automated bans, timeouts, or deletions are implemented. The moderation tray records decisions for manual action in Twitch; AutoMod remains independent. No moderation scope was requested. The digest is deterministic question/recent-message surfacing, not an LLM-generated summary.

## 8. Source history and handoff

Existing repository: /path/to/cocoa-chaos. Recorded commits: 339306c (initial build); 18e277c (CAT CHAOS); 1644a45 (activation record); e5eab65 (live reply/cooldown record). The two new original references and this audit are subsequent documentation/asset additions, not evidence of deployed artwork changes.

Recovered source chats: “Plan Twitch Today,” “Configure Sebastian Twitch agent,” and “Build Twitch-connected stream companion.” The handoff preserves the complete returned messages for the two relevant recent creative turns, the Sebastian audit, source ZIP, reaction media, and now both supplied reference images. Unrelated Letter Town sprites were not substituted. Some older verification notes were additive and contain stale staged/pending language; the reconciled distinctions in this audit take precedence.

## 9. Remaining work in priority order

- Restore and verify local Twitch availability; fix transient-validation handling so network failures do not erase a usable grant.

- Connect the existing Sebastian/Almost Butler setup; produce an explicitly approved speech test with mute, volume, queue, and captions. Do not replace his identity or voice.

- Verify audible output in the dashboard, then capture it in the selected streaming software. Keep private test speech separate from broadcast output.

- Create transparent, reusable artwork from the supplied references without replacing originals; integrate it into the eight existing reactions. Test on bright and dark stream backgrounds.

- Retest browser previews and real Twitch events separately, including an ordinary viewer and genuine subscriber metadata. Do not purchase a subscription to manufacture evidence.

- Prepare the actual Twitch demo video, publish a runnable code repository, record the verified Codex session ID, and obtain Director approval before final submission.

Submission preparation exists, but no repository publication, public YouTube demo, Devpost submission, or final submission approval is recorded. The previously checked deadline is November 2, 2026 at 2 PM Pacific; recheck the official competition rules before submitting.

## 10. Audit scope

This is a development-status audit based on the existing source, Git history, recorded tool/diagnostic results, Director confirmations, supplied images, and the most recent recorded ElevenLabs inspection. It is not a security certification or a claim that the stream is currently online. No secrets are included. This audit request added reference copies and documentation only; it did not change runtime behavior or deploy the new artwork.



## Live chat follow-up — November 1, 2026, 11:42 AM Pacific

Server diagnostics confirm a real Twitch !hello was received at 19:42:20.084 UTC and executed at 19:42:20.410 UTC. The welcome reply was successfully sent and received back through Twitch at 19:42:20.484 UTC. The real-message counter is 2 (command plus bot reply); previews remain 0. Authorization is valid, chat and calculator listeners are subscribed, and one overlay is connected. This supersedes the earlier pending real-chat receipt finding. Visual greeting visibility has not been independently confirmed in this follow-up. Real subscription events remain 0; no real calculator explosion is claimed.
