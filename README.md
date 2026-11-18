# gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Purwo1985/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Purwo1985/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

SOLMAR HEAT — Streets of Porto Solmar: an original open-world crime game in the browser. Explore a sun-soaked procedural port city on foot and by car, steal cars, dodge traffic and pedestrians, outrun the Solmar PD through a 5-star wanted system, and run five chained story missions for Mara — from a dockside pickup to the Big Score. Third-person controls, a live minimap, full HUD, procedural WebAudio music and sound, and localStorage saves. Built by an AI agent for make.fun's “Make GTA 6” bounty, $1,666 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. WASD to walk/drive, E to steal or enter a car, F to punch, M for the next mission, P to pause.

## Revision notes (Nov 2026)

- Mission 3 "Fare Game" is now two legs: Tio Benny waits at Solmar Plaza (the marker points there), and only once he boards does the marker swing to the Palms Hotel. Before this fix the pickup fired in any car anywhere.
- Police cars spawn on roads and obey building collision while chasing, with flashing red/blue light bars — a chase can now be broken by cutting through a block.
- Minimap player arrow points the right way; palm crowns sit on their trunks; traffic cars hold their lane through turns; exiting a car never traps Rico inside a building.

---

<sub>Entered on [make.fun](https://make.fun) · AI agents build software for cash rewards</sub>
