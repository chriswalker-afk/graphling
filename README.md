# Graphlings

A mathematics puzzle game about guiding little creatures through a hazardous world. They walk automatically, and you assign temporary specialists to **physically build or excavate routes determined by graphs**.

## Pass B — playable linear specialists

Open `index.html` in a modern browser or publish the repository through GitHub Pages. No build tools or server are required. All assets are local and there are no external packages.

1. Let Graphlings emerge from the entrance, then **click a moving Graphling** to pause.
2. Choose a **Rampwright** (builds a walkable straight path) or **Trencher** (excavates through earth but not bedrock). Each level gives you limited specialist assignments.
3. Use the graph editor to set the gradient `m`, intercept `c`, and number of ticks for `y = mx + c`. Coefficients accept **fractions** such as `-3/4`, or decimals. The transparent world grid and curve preview use the **entrance as (0, 0)**, with positive y upward.
4. The faded curve represents the full line; the highlighted portion represents the proposed action. Preview outcomes before assigning. The game is paused while editing.
5. Commit the assignment. A worker builds or excavates **while travelling along its line**. After the action ends or hits an obstacle, it immediately becomes an ordinary walking Graphling again. The altered terrain remains in the world.
6. Press **Restart** to replay with the current workshop terrain, or use the **Terrain workshop** to paint/restore a landscape. Workshop painting is a test tool, not a specialist ability.

The player may pause, advance with **Step**, and use ½×/1×/2× speed controls.

## Physical rules

- Walking Graphlings turn at solid walls, fall off ledges, and can walk on surfaces constructed by workers, including sloped bridges.
- Earth can be excavated. Bedrock cannot. Wooden walkways can be cut, and spikes are lethal on contact.
- Falls greater than four coordinate units cause a playful, non-graphic **squish** on landing.
- Specialists must be grounded to begin, remain physically supported, travel in the direction they are facing, and cannot use lines with `|m| > 1`.
- A specialist travels one horizontal coordinate unit per **tick**. Its action ends at its tick allowance, at a physical obstacle, when no material remains to excavate, or at a hazard.
- A line must pass within **0.35 units vertically** of a Graphling at activation. A nearby line is joined with a short physical transition; a distant line makes it **shrug and keep walking**, without spending an assignment.
- Tick duration is based on horizontal distance, not real-world seconds. With positive y upward, a mathematical line corresponds to screen height `worldY = entranceY - (m * (worldX - entranceX) + c)`.

## Three prototype levels

- **Bridge the Gap:** A Rampwright can create a horizontal bridge. Try `m = 0`, `c = 0` starting near x = 10 world tiles, with 9 ticks.
- **The Earth Wall:** A Trencher can open a tunnel through soil. Try `m = 0`, `c = 0`, starting near x = 11 world tiles with 8 ticks. The bedrock overhead is indestructible.
- **Spike Garden:** Build a slope to a raised platform. One possible solution is `m = 3/13`, `c = -18/13`, starting around world x = 8 with 13 ticks. The entrance is at world x = 2, so the corresponding mathematical x coordinate at activation is 6.

These are examples, not hard-coded answer checks: the world physics determines whether a strategy works. The prototype remains focused on a single-player sandbox and three small puzzles; a larger campaign and quadratic specialists will come later.

## Development and tests

`src/physics.js` provides deterministic world physics, line interpretation, specialists and non-mutating route previews. `src/game.js` handles canvas rendering, controls, selection, assignment charges, and UI. Neither requires a JavaScript framework.

Run with Node.js 18+:

```sh
node --check src/physics.js
node --check src/game.js
node --test tests/physics.test.js
```

The tests cover collision, falls, spikes, slope traversability, specialist lifecycles, diggable and indestructible terrain, global coordinates, fractions, proximity failures, left-facing paths, non-destructive previews, and solvable demonstration levels.

## Next step — Pass C

Add the distinct quadratic specialists **Arcwright** and **Burrower**, allowing physical construction/excavation following `y = ax² + bx + c` without changing the underlying terrain, movement, or resource rules.
