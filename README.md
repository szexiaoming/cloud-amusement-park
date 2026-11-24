# Sze 的小世界 · Sze's Little World

A runnable, interactive 3D floating woodland town built with Three.js. Three
districts — a town centre with a station and square, a woodland neighbourhood,
and an amusement meadow — are linked by a small railway and a network of gravel
walks. Everything is procedural (no external models).

## Features

- **Floating island** — grassy platform, rounded rim, terrain mounds, tapering
  rocky underside, hanging plants, cream paths, instanced flowers/grass, a low
  fence, benches and the “我的云上乐园” entrance sign (with a star motif).
- **Ferris wheel** — torus rims, spokes, A-frame supports, 8 upright cabins.
- **Carousel** — striped cream/peach canopy, central column, 5 bobbing horses.
- **Town tram (小火车)** — a cozy closed tram loop linking the districts in
  order (A → B → C) with little wooden stations, a locomotive + two carriages
  trundling around slowly, and a headlamp that lights up at night.
- **Day / Night system** — top-right sun/moon toggle (晴日 / 星夜), saved in
  localStorage, ~2s cross-fade of sky gradient, fog, lighting, emissive and
  particles; rapid switching never flashes.
- **Night atmosphere** — indigo → lavender sky gradient, cool moonlight,
  lavender ambient fill, lavender-tinted clouds, sparse twinkling stars.
- **Warm park lights** — emissive bulbs on the wheel rim and canopy, star-motif
  path lanterns, and a few shared PointLights for the sign and bench area, with
  restrained bloom (desktop).
- **Fireflies** — soft additive points near flowers, grass and benches; they
  wander and pulse, fading out by day.
- **Personal town (云上小城)** — a data-driven district layer: one building per
  life chapter, a reserved plot layer for future districts,
  and a rich "district card" that opens when you click a building.
- **Districts (街区)** — A 回忆小屋 (cottage), B 知识学园 (academy), C AI 研究塔
  (research tower), plus reserved plots for D 机器人工坊 / E 创造工作室 /
  G 未来车站, with the existing F 星光游乐园 integrated around them.
- **Environment details** — placed trees (broadleaf / pine), bushes, a vegetable
  garden, wooden street lamps (glow at night) and signposts.
- **District cards** — a cozy journal panel with the letter, Chinese + English
  name, theme, tags, story, project showcases (title / summary / tech stack /
  links) and notes. Content is pure data in `DISTRICTS`.
- **Natural materials** — stone, plaster, timber, roof-tile / slate roofs, soil
  and leaf greens, with warmer sun and softer shadows.
- **Seasons** — spring / summer / autumn / winter chosen from the real computer
  date; grass, trees, bushes and falling petals / leaves / snow all shift.
- **Real weather** — fetched from Open-Meteo (no API key) using browser
  geolocation. Clear / cloudy / fog / rain / snow / storm change the light, fog
  and rain/snow particles. A small chip shows season + weather + temperature.
- **Interaction** — orbit/zoom (damped + bounded), hover highlight with Chinese
  labels, click-to-pause, drag-vs-tap disambiguation, “重置视角” reset button,
  touch support, delta-time animation, capped pixel ratio.
- **Accessibility** — reduced-effects fallback for mobile (bloom disabled, fewer
  fireflies) and `prefers-reduced-motion` (instant transitions, no wandering).

## Setup

Requirements: Node.js 18+ and pnpm (or npm).

```bash
pnpm install
pnpm dev       # start the dev server, then open the printed URL
```

Production build:

```bash
pnpm build     # outputs static site to dist/
pnpm preview   # serve the built site locally
```

You can deep-link a mode with `?mode=night` (or `?mode=day`), and preview a
district card with `?card=research`.

## 季节与真实天气 / Seasons & real weather

- **Season** follows the real computer date (Northern Hemisphere):
  spring Mar–May, summer Jun–Aug, autumn Sep–Nov, winter Dec–Feb. Edit the
  palettes in `SEASONS` (`src/season.js`).
- **Weather** is fetched from [Open-Meteo](https://open-meteo.com/) (free, no API
  key). The browser asks for your location; if you decline, the fallback in
  `WEATHER.fallback` (`src/config.js`) is used. Set `WEATHER.enabled = false` to
  skip it entirely.
- **Preview** a season / weather without waiting for the right date:
  `?season=winter&weather=snow`, `?season=autumn&weather=rain`,
  `?season=spring`, `?weather=fog`, `?weather=storm`.
- The chip under the title shows e.g. `🍂 秋 · 🌧 雨 12°C`. If the network or the
  location is unavailable it shows `秋 · 天气未知` rather than guessing.

## 添加一个街区 / Add a district

Everything about the town lives in the `DISTRICTS` array in `src/config.js`. To
add or edit a district, copy one entry and change it:

```js
{
  id: 'myDistrict',            // unique id (also used by ?card=<id>)
  letter: 'H',                 // chapter letter shown in the card badge
  name: '我的新街区',           // Chinese title
  englishName: 'My District',  // English subtitle
  theme: '主题 · 关键词',       // one-line theme
  position: P3(-9.0, 0, 6.0), // design-space position (scaled by WORLD_SCALE)
  building: 'cottage',         // 'cottage' | 'academy' | 'tower' | 'reserved'
  status: 'built',             // 'built' | 'planned'
  tags: ['关键词'],             // small chips
  story: '示例文字：……',        // story paragraph
  projects: [                  // optional project showcases
    { title: '…', summary: '…', stack: ['…'], links: [{ label: '链接', url: 'https://…' }] },
  ],
  note: '备注 / 待补充说明。',
}
```

That's it — the building (or reserved plot), its hover highlight, the label and
the click → card behaviour all come from the data.

- `building: 'reserved'` renders a marked plot + signpost; its card shows the
  planned content (used for D / E / G).
- `WORLD_SCALE` (top of `config.js`) sets the island size. Positions are written
  in design space via `P2` / `P3` / `B3` and scaled automatically, so you can
  grow the whole town by changing one number.
- Buildings, paths, railway points/stations, groves, hills and the square props
  all live in `src/townPlan.js`. Add a building by appending to `PLAN.buildings`
  (`pos` + `face`); its entrance and the rail/vegetation systems follow the plan.

## Structure

```
src/
  main.js                  entry: renderer, camera, lights, loop, bloom, controls,
                           station selector, train journey + follow camera
  townPlan.js              THE town plan: districts, buildings, paths, railway,
                           stations, groves, hills, square props
  config.js                world name, palette, env presets, weather, bloom
  terrain.js               irregular island silhouette, rim, underside, hills
  buildings.js             reusable cottage / shop / station / greenhouse /
                           booth / library factories
  paths.js                 gravel walking paths + plank crossing
  railway.js               rail loop, sleepers, stations, stopping train
  vegetation.js            layered groves, shrubs, flower clumps
  props.js                 square well, notice board, benches, lamps
  attractions/
    ferrisWheel.js         (+ rim bulbs)
    carousel.js            (+ canopy bulbs)
  clouds.js                merged sphere clouds
  balloons.js              lathe hot-air balloons (with night burners)
  environment.js           day/night presets + transition controller
  sky.js                   gradient sky dome
  decorativeLights.js      bulbs, shared point lights
  particles.js             fireflies + stars
  season.js                four seasons + petals/leaves/snow
  weather.js               real weather (Open-Meteo) + rain/snow/fog
  memoryCard.js            the click-to-open "journal" card
  interaction.js           hover/click + label + drag detection
  helpers.js               rounded boxes, cylinders, star motif, instancing
  materials.js             shared reusable materials
```
