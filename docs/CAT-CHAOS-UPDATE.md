# CAT CHAOS update — October 31, 2026

## Activation completed

The Director approved one brief reconnect. The updated production server started at **10:31:11 AM Pacific** and restored its EventSub chat subscription at **10:31:12 AM** using the saved `mermaidtiva` authorization. The live dashboard and overlay were reloaded; the running-cat preview reached the activated overlay. New commands and the reply correction still need post-update real-chat testing. In-memory counters reset on restart; this does not invalidate the earlier recorded live greeting. Subscription notifications currently report **additional authorization required**. The Director approved preparing the consent link: `http://localhost:3000/auth/twitch?subscriptions=1`. No additional Twitch grant has been claimed.

The staging/activation instructions below describe the preparation history and remain useful for subsequent updates; this version is now activated on port 3000.

## Working live evidence

At 10:15:46 AM Pacific, the port-3000 app received MermaidTiva’s actual Twitch `!hello`. Diagnostics advanced from zero to one real message, and the Director replied “yes i see the greeting.” This verifies the real chat → EventSub → visible greeting path. This was the broadcaster’s test, not an ordinary-viewer permission test. No other new effect or subscription notification is live-verified.

The original app’s chat API reply failed. Investigation found a forbidden `for_source_only` field in its user-token request. The staged fix removes it, checks for Shared Chat, and refuses replies when Shared Chat is active or the check fails. It has automated regression coverage, but has not sent a live corrected reply. Avoid Shared Chat in the MVP: Twitch offers no source-only send option with user tokens, and the preflight check cannot eliminate a session-start race.

## Implemented and preview-tested

| Trigger | Server permission | Cooldown | Artwork |
| --- | --- | --- | --- |
| `!hello` | All viewers | 6s global / 20s viewer | Existing greeting |
| `!cocoa` | All viewers | 6s global / 20s viewer | Existing hot cocoa and marshmallows |
| `!chaos` | Broadcaster/moderator | 6s global / 20s viewer | Falling papers, plus mischievous cat |
| `!hydrate` | All viewers | 120s command-wide / 180s viewer, plus 6s effect floor | Water glass, splash, requested reminder text |
| `!mmm` | Twitch subscriber/founder badge or broadcaster | 6s global / 20s viewer | 32 original marshmallow cats |
| `!cat` | All viewers | 6s global / 20s viewer | Running SVG cat, tail, kicked papers |
| `!flail` | Broadcaster/moderator | 6s global / 20s viewer | Original cat-eared celebration silhouette |
| Twitch `channel.subscribe` v1 | Validated EventSub notification for this channel | Deduplication; bounded renderer queue | Shaking calculator, flying keys and number confetti |

No new assets depend on external services. Builders are in `public/new-effects.js`; animations are isolated in `public/new-effects.css`. Artwork can be swapped without changing command rules. All effects clear in 5.5 seconds. One runs at a time, at most four wait, and stale queued effects are discarded after 30 seconds. Reduced-motion styling removes falling fragments and arm flailing. Preview events remain labelled as preview and never increment live counters.

Subscriber verification reads Twitch metadata only after channel validation. A moderator badge, Prime/Turbo badge, gifter badge, chat claim, or absent/invalid subscriber metadata does not qualify. Founder chat badges count because Twitch displays them only for current subscribers. No membership cache or user-provided claim grants access. The optional subscription API scope is not needed for badge verification.

## Staging and activation

The update was tested with `CC_PREVIEW_ONLY=1` at **http://localhost:3001** and **http://localhost:3001/overlay**. This process never initializes the stored Twitch session, registers listeners, refreshes tokens, or permits Twitch OAuth. The live app at port 3000 was left running with its existing connection. Source changes are staged on disk; the old process retains its original backend modules and already-loaded browser renderer. Avoid reloading the live dashboard/overlay until activation because new static assets need the new backend routes.

Activation requires one controlled stop/start of port 3000 using `start.ps1` or `node src/server.mjs`, with `CC_PREVIEW_ONLY` unset. Keep `.private/` and `.env` intact. Existing authorization is reused on startup, and the chat listener resubscribes. Reload the live dashboard and browser-source overlay afterward. This causes a brief EventSub interruption; request the Director’s approval because the update explicitly asks not to disturb that connection. Do not start two live copies or change app credentials.

After activation, use **Authorize subscription notifications** to consent to **`channel:read:subscriptions`** alongside the existing two chat scopes. This permits reading new-subscription events. The Director completes Twitch consent; it is not silently granted. Until then, the listener clearly reports additional authorization required and chat stays usable. An ineligible channel or Twitch rejection is reported without breaking chat. Do not buy a subscription for testing. The JSON fixture and calculator preview are sufficient for development but never count as real Twitch subscription evidence.

## Tests and next checks

20 automated tests pass, covering hydration boundaries, subscriber roles, public/restricted commands, malformed and foreign-channel events, subscription duplicates, optional listener failure/revocation, reply payload, and queue bounds/cleanup. Browser preview checks passed for each new effect and cleanup after the timer-binding fix. The active live process has not loaded these changes.

After activation: repeat real `!hello` and confirm API reply; test `!hydrate`, broadcaster `!mmm`, `!cat`, and `!flail` at safe intervals; have an ordinary viewer verify public commands and restricted denials; obtain optional scope consent; wait for an organic new-subscription notification if available. Record only observed outcomes. Preserve the November 2 deadline and the Director’s final submission approval.

Sources: [subscription type and scope](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channel-subscribe), [chat badges](https://dev.twitch.tv/docs/chat/send-receive-messages/#chat-badges), [Founder badge eligibility](https://help.twitch.tv/s/article/founders-badge?language=en_US), [Twitch message API and Shared Chat](https://dev.twitch.tv/docs/api/reference/#send-chat-message).
