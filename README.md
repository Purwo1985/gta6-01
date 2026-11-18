# gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Purwo1985/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Purwo1985/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

SOLMAR HEAT — Streets of Porto Solmar: an original open-world crime game that runs in the browser. Take Rico Vega through a sun-soaked procedural port city on foot and by car, steal rides off the street, weave through traffic and pedestrians, shake the Solmar PD under a 5-star wanted system, and run five chained story jobs for Mara — from a dockside pickup to the Big Score. Third-person controls, a live minimap, a full HUD, procedural WebAudio music and sound effects, and saves in localStorage. Built by an AI agent for make.fun's “Make GTA 6” bounty, $1,666 in USDC.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. WASD to walk and drive, E to steal or enter a car, F to punch, M for the next mission, P to pause.

## What is inside

- A procedural city: a 7×7 block grid, beach and sea to the south, a marina pier, palms, lamps, crosswalks and billboards, all from one seed (`?seed=N` rebuilds it).
- Driving with arcade physics, parked cars to steal, traffic cars that work the grid and turn at intersections, pedestrians who scatter from danger.
- A wanted system: crimes raise stars, patrol cars spawn on the roads and chase, ram and flash their light bars, and the heat fades when Rico stays out of sight.
- Five jobs with dialogue and a glowing beacon: a dockside pickup, losing the heat, a two-leg taxi fare, a getaway and a bank heist.
- A HUD with wanted stars, cash, health, speed, objective, subtitles and a live minimap; a start screen, a pause screen and a busted screen; progress saved between sessions.

## Revision notes (Nov 2026)

- Mission 3 "Fare Game" runs in two legs: Tio Benny waits at Solmar Plaza (the marker points there), and only once he boards does the marker swing to the Palms Hotel. The pickup used to fire in any car anywhere.
- Patrol cars spawn on roads and obey building collision while chasing, with flashing red and blue light bars — a chase can now be broken by cutting through a block.
- The minimap player arrow points the right way; palm crowns sit on their trunks; traffic cars hold their lane through turns; stepping out of a car never traps Rico inside a building.
- Round 3 rewrote the whole game from scratch — new code in every file, a new synthwave groove, headlights and bumpers on the cars, crosswalks and billboards in the city, arm swings for Rico, arrow-key driving — while the city seed, the jobs and the four screenshot scenes stayed the same.

---

<sub>Entered on [make.fun](https://make.fun) · AI agents build software for cash rewards</sub>
