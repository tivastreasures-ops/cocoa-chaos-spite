# Submission preparation — Director approval required

Official pages checked October 31, 2026: [overview](https://twitchcon-codex.devpost.com/) and [rules](https://twitchcon-codex.devpost.com/rules).

The official deadline is **Monday, November 2, 2026, at 2 PM Pacific (PST)**. Required materials include a runnable code repository, description, Codex session ID, and a public YouTube demo showing Twitch functionality and Codex development. Keep the video under three minutes. Confirm entrant eligibility, ownership, permissions, and the complete rules before submitting. No submission has been made.

## Draft project information

**Title:** Cocoa & Chaos & Spite

**Tagline:** A cozy faculty office where Twitch chat controls the marshmallows.

**Description draft (update after live verification):** Cat Girl’s stream companion translates Twitch chat commands into warm greetings, extravagant hot cocoa, and harmless falling paperwork on a transparent browser overlay. The Director’s local dashboard shows connection health and a compact chat digest. Ordinary viewers can use greeting and cocoa commands; chaos is reserved for broadcaster/moderator identities. Cooldowns contain spam, and moderation decisions remain under human control. OpenAI Codex built the local Node.js service, OAuth/refresh flow, EventSub lifecycle, command engine, overlay renderer, dashboard, tests, and documentation. Sebastian live voice is a planned enhancement and is not included in the working feature claims.

**Built with:** Node.js, JavaScript ES modules, Twitch OAuth, Twitch Helix API, EventSub WebSockets, Server-Sent Events, HTML/CSS.

**Repository URL:** PENDING publication. Exclude `.env` and `.private/`.

**YouTube URL:** PENDING real Twitch recording and upload.

**Codex session ID:** PENDING: copy this build chat’s actual session ID from the Codex interface; never invent one.

**Verified working claims:** fill only after completing VERIFICATION.md. Local previews alone are insufficient.

## 2 minute 40 second demo shot list

- 0:00–0:15: Cat Girl’s problem and the Director dashboard; show authorized account/channel and EventSub subscribed status. Keep setup fields, credentials, authorization callback URLs and developer network tools off camera.
- 0:15–0:45: Show an ordinary viewer typing `!hello` in real Twitch chat and the greeting appearing in the overlay. Show real-message count advancing.
- 0:45–1:15: After the same-viewer cooldown, send `!cocoa` and show the marshmallow effect, reply, and automatic reset.
- 1:15–1:40: Demonstrate cooldown feedback, moderator chaos, and the browser source in PRISM or another selected streamer application.
- 1:40–2:00: Show the compact question digest and manual moderation tray; explain that approvals do not silently ban anyone.
- 2:00–2:25: Show this Codex build chat and substantive source/test contribution. Never display secrets.
- 2:25–2:40: State what works, name Sebastian voice as unfinished, and close on the project branding.

Director must review the finished repository, actual video, description and submission form before final submission. This script is preparation, not a generated demo video.
