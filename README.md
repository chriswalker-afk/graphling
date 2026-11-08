# Graphlings

A mathematics-first puzzle game about guiding tiny creatures through a dangerous landscape. Specialists eventually build or excavate physical paths along mathematical functions.

## Pass A — World Lab

Open `index.html` in any modern browser. No installation, server or build tools are required. The game is compatible with GitHub Pages after merge and Pages setup.

This first pass is a **physics and terrain sandbox** rather than the finished puzzle game. Graphlings emerge automatically, walk right, reverse at walls, fall from ledges, squish on spikes or after drops longer than four grid units, and are rescued on reaching the exit. Try the three landscapes.

- Choose a terrain brush and click or drag across tiles to edit. Painting pauses the game.
- **Earth** and **bedrock** are both solid; only earth will be diggable in Pass B.
- **Walkways** are solid constructed surfaces; **spikes** are non-solid lethal hazards.
- **Pause**, **Step**, **Speed**, **Restart**, and **Restore landscape** aid testing. Space toggles pause outside form controls.
- Optional coordinate grid shows tiles in world units. The eventual mathematical origin is fixed at the entrance.
- The test landscapes intentionally include obstacles that cannot be solved through Graphling abilities yet. Painting is an editor/developer aid, not a specialist action.

## Run tests

Requires Node.js 18 or later:

```sh
node --test tests/physics.test.js
```

The codebase separates `src/physics.js` (world and movement model, testable without a browser) and `src/game.js` (canvas presentation, input, and game lifecycle).

## Pass B (not in this PR)

Introduce Rampwrights and Trenchers, `y = mx + c`, a graph editor, proximity and tick checks, and physical building/digging along a route. A specialist assignment is temporary; on completion the Graphling resumes ordinary movement.
