# Last Quarter

A two-player, 90s-style arcade fighting game that runs in the browser. Build 0.3.

Open `index.html` in a browser to play. No install, no build step.

## Modes

- **1P Start** – arcade ladder against the CPU (fight the other three, then your mirror).
- **2P Start** – player versus player. Player 2 can also press start mid-fight to challenge.

## Practice mode

Press `9` on the title screen (no coin needed). The dummy cannot win, health and super refill, and the screen shows
every stick direction and button the game receives plus a checklist of special moves. In practice: `1` dummy behaviour,
`2` reset, `5` your fighter, `6` dummy fighter, `7` hit boxes, `8` stage, `9` exit. Remove or hide this for the cabinet launch.

## Controls

Each player has an 8-way stick and six buttons (light/medium/heavy punch, light/medium/heavy kick).

| | Stick | Punches (L M H) | Kicks (L M H) | Start | Coin |
|---|---|---|---|---|---|
| Player 1 | W A S D | U I O | J K L | 1 | 5 |
| Player 2 | Arrow keys | Numpad 4 5 6 | Numpad 1 2 3 | 2 | 6 |

No numpad? The **KEYS** button on the panel switches to a shared-keyboard layout
(P1: R T Y / F G H, P2: I O P / K L ;). Arcade sticks and gamepads also work:
the first one is Player 1, the second is Player 2. `M` mutes.

Hold back to block. Light and medium attacks cancel into specials on contact.

## Fighters

| Fighter | Style | Specials | Super (full bar) |
|---|---|---|---|
| Nic | Electricity | Volt Ball `D,DF,F+P` · Thunder Upper `F,D,DF+P` · Sky Strike `D,DB,B+K` | Storm Surge `D,F,D,F+P` |
| Eli | Every attack hits twice | Twin Fang `D,DF,F+P` · Double Rise `F,D,DF+K` · Blitz Dash `hold B, then F+K` | Double or Nothing `D,F,D,F+P` |
| Brandon | AK47 | Burst Fire `D,DF,F+P` · Flak Burst `F,D,DF+P` · Stock Charge `D,DB,B+K` | Full Auto `D,F,D,F+P` |
| Cody | Handgun | Quick Draw `D,DF,F+P` · Sky Shot `F,D,DF+P` · Combat Roll `D,DB,B+K` | Donut Hole finisher `D,F,D,F+P` |

## Stages

Stormfront Roof · Deadeye Range · Twin Lantern Dojo · Midnight Donuts · Quarter Palace

## Files

- `index.html`, `style.css` – the cabinet page
- `js/01-core.js` – screen, bitmap font, input, sound
- `js/02-chars.js` – fighter rigs, poses, frame data, move lists
- `js/03-stages.js` – the five arenas
- `js/04-game.js` – fight engine, CPU, screens
- `build.js` – `node build.js` regenerates `index.html` and a single-file `dist/last-quarter.html`

All art and sound are generated in code; there are no image or audio assets.
