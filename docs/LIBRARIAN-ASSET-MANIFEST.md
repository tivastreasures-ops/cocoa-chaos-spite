# Librarian asset manifest — Cocoa & Chaos & Spite

**Ready for artwork production · November 1, 2026**

The Librarian creates and approves the finished art. Codex integrates and animates it. Preserve the supplied dimensional plush marshmallow-kitten direction: round soft bodies, expressive faces, blush/pastels, pink toe beans and cozy chaos. No substitute kitten designs are requested.

## Delivery contract

- Deliver individual **transparent RGBA PNG** files; lossless alpha WebP is also accepted. No flattened backgrounds, checkerboards, text, letters, logos, or UI labels in character sprites. Codex renders captions separately.
- Sizes below are **source pixels**, approximately twice the intended display size on the default 1920 × 1080 overlay. Do not deliver full-screen 1920 × 1080 character images.
- Keep every state for one character on an identical canvas, scale and registration point. No automatic tight cropping between states. Leave 8–12% clear padding around ears, paws and tail at their maximum extension. Keep paws grounded on the same baseline (about 88% of canvas height).
- Deliver separate files rather than a sprite sheet. Use the exact lowercase kebab-case names below. Frame numbers are zero-padded. PNG and WebP should not both be delivered for the same image.
- Prefer ≤500 KB per main sprite and ≤100 KB per tiny rain sprite; review larger files before sacrificing visible detail. Keep the first approved pack around 8 MB or less where practical.
- Optional layered source files are welcome but not required for the deadline. Codex will move, rotate, scale and layer the approved sprites; the Librarian need not author video.
- Check silhouettes and soft edges on white, near-black and a saturated background. No black/white matte fringe. Both source references currently have baked-in backgrounds and remain unchanged under public/assets/references/.

## Required assets by reaction

| Reaction | Files to deliver | Source canvas | States and animation intent | Existing stream display target |
| --- | --- | --- | --- | --- |
| !hello | hello-kitten-idle.png; hello-kitten-wave-01.png; hello-kitten-wave-02.png | 640 × 640 each | Welcoming kitten, paw lowered/raised; optional happy blink. Same feet/baseline. Codex bobs and waves beside the welcome caption. | About 280–320 px tall; lower-left |
| !cocoa | cocoa-cup.png; cocoa-kitten-peek.png; cocoa-kitten-paws-up.png | Cup: 640 × 640; kittens: 384 × 384 each | Cup/cocoa separate from kittens so they can peek, overflow and bounce. Keep cup front/rim as optional separate cocoa-cup-front.png layer, same cup canvas. No coffee/caffeine imagery. | Cup about 270–320 px; kittens 90–140 px |
| !cat | supervisor-kitten-idle.png; supervisor-kitten-run-01.png through -04.png | 640 × 400 each | Judgmental office-supervisor kitten; running profile faces RIGHT. Four coordinated walk/run poses; tail included within padded canvas. Codex handles the screen crossing and paper collisions. | About 260–320 px wide; lower lane |
| !hydrate | hydrate-kitten-offer.png; hydrate-kitten-cheer.png; water-glass.png | Kittens: 640 × 640; glass: 256 × 384 | Kitten offers water, then cheers. Glass separate so the reminder can animate independently. The caption is rendered in code: “HYDRATION CHECK! Cat Girl, drink some water!” | Kitten 280–320 px tall; glass 80–110 px |
| !chaos | chaos-kitten-ready.png; chaos-kitten-swipe-01.png; chaos-kitten-swipe-02.png | 640 × 640 each | Mischievous kitten, anticipatory pose and exaggerated paw swipe. Use the same approved family design as the supervisor kitten. Existing code supplies flying papers; do not draw a full paper cloud into the kitten. | About 280–320 px tall; lower lane |
| !flail | flail-kitten-01.png through -04.png | 768 × 768 each | Ridiculous, joyful arms/paws-flailing kitten; both paws and the expressive tail change across the four frames. Keep the torso registered in the center. No third-party character likeness is needed. | About 360–420 px tall; center-lower |
| !mmm | rain-kitten-happy.png; rain-kitten-surprised.png; rain-kitten-sleepy.png | 192 × 192 each | Three readable marshmallow-cat variants with ears, tiny paws/toe beans, tails and expressive faces. No surrounding cloud/background. Codex handles fall, drift and rotation, using repeated copies. | 64–95 px wide, many instances |
| New subscription | calculator-intact.png; calculator-cracked.png; calculator-front.png (optional); calculator-key.png (optional); calculator-kitten-oops.png; calculator-kitten-delighted.png | Calculator: 640 × 800 each; key: 96 × 96; kittens: 640 × 640 each | Dean’s oversized calculator shakes, bursts, then reveals kitten chaos. Intact/cracked layers must align. Use blank display/key surfaces or simple abstract markings; Codex overlays numbers and flying symbols. No letters in kitten art. | Calculator about 310 × 420 px; kitten 240–300 px |

## Deliver first — protect November 2

1. **Minimum useful pack:** hello idle + two wave poses; three rain-kitten expressions; supervisor idle + four run poses. These cover !hello, !mmm and !cat quickly without requiring the whole pack.
2. Then: cocoa layers and hydration poses.
3. Then: chaos swipe, flail sequence and calculator layers.

If a full sequence is not ready, deliver its approved idle/hero pose first. Codex can use restrained bobbing, translation and rotation until additional approved states arrive. Unfinished reactions retain existing temporary artwork rather than blocking the demo.

## Packaging and review

Deliver a ZIP named **cocoa-chaos-kitten-assets-v01.zip** with the files under **reactions/**. Include a contact sheet for review and a short **asset-notes.txt** identifying approved files, intended sequence order, and any incomplete variants. Do not mark a file approved on the Director’s behalf.

Target integration directory: **public/assets/reactions/**. Codex will validate dimensions/alpha, wire only delivered approved files, retain original references, and test light/dark previews plus automatic cleanup. The eight triggers, cooldowns, EventSub subscription source, !mmm subscriber check and !chaos/!flail moderator checks remain unchanged.

**No finished kitten sprites are implied by this manifest.** It specifies delivery needs based on the existing eight renderers; it is not new character artwork or a request to redesign the cast.
