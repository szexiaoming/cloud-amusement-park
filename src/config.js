// Central configuration for the floating amusement park (Day + Night).
// Palette, park identity, dimensions, layout, environment presets, decorative
// lighting and particle settings all live here so the scene can be re-tuned
// from a single editable place.

// Uniform horizontal scale for the island and every hand-placed object.
// Object SIZES stay the same, so a larger WORLD_SCALE gives the town more room
// without making buildings bigger.
export const WORLD_SCALE = 1.3;

const P2 = (x, z) => [x * WORLD_SCALE, z * WORLD_SCALE];
const P3 = (x, y, z) => [x * WORLD_SCALE, y, z * WORLD_SCALE];
const B3 = (x, z, yaw) => [x * WORLD_SCALE, z * WORLD_SCALE, yaw];

export const PARK_NAME = 'Sze的小世界';

export const PARK_SUBTITLE = 'Xiaoming · Interactive 3D Town';

export const CAPTIONS = {
  day: '今天也在小镇里慢慢逛。',
  night: '今晚，星光为你留着。',
};

export const UI = {
  day: '晴日',
  night: '星夜',
};

// localStorage key for the saved day/night mode.
export const MODE_KEY = 'cloudPark.mode';

// Day/Night blend duration (ms). Ignored when the user prefers reduced motion.
export const TRANSITION = { duration: 2000 };

export const PALETTE = {
  sky: '#cdeaf4',
  skyLight: '#e6f5fb',
  grass: '#b5d596',
  grassDark: '#9dc57f',
  grassLight: '#c6e2a9',
  mint: '#a8dcc5',
  mintDark: '#8cc8ad',
  peach: '#f2b6b0',
  peachDark: '#e79890',
  butter: '#f4d88a',
  butterDark: '#e3c56c',
  cream: '#fff4df',
  creamDark: '#f1e0c0',
  rock: '#b9aa98',
  rockDark: '#a08d79',
  rockDeep: '#8b7a69',
  wood: '#92745e',
  woodDark: '#7a5f4b',
  gold: '#e8c57a',
  cloud: '#fffdf6',
  cloudShade: '#eaf2f5',
  white: '#ffffff',
};

export const FLOWER_COLORS = ['#f2b6b0', '#f4d88a', '#ffffff', '#a8dcc5', '#f0a9c9', '#ecc89a'];

export const ISLAND = {
  topRadius: 15 * WORLD_SCALE,
  bottomRadius: 11 * WORLD_SCALE,
  height: 1.8,
  rimTube: 0.5 * WORLD_SCALE,
  undersideLayers: 6,
  flowers: 100,
  grassTufts: 190,
  fencePosts: 84,
};

export const LAYOUT = {
  ferrisWheel: { position: P3(-9.5, 0, -7) },
  carousel: { position: P3(7, 0, 5) },
  entranceSign: { position: P3(0, 0, 12.6) },
  // [x, z, yaw] benches along the tram loop and the plaza
  benches: [
    B3(-4.8, 8.6, 0.6), // 中央车站旁
    B3(2.8, 8.8, 0.7), // 入口 / 广场旁
    B3(-7.4, 3.4, 1.2), // 环线内的小花园
    B3(4.4, 6.6, -0.5), // 旋转木马旁
  ],
};

// Cozy Stardew-style town tram linking the districts in order (A → B → C).
// Authored in design space; the module scales the whole loop by WORLD_SCALE.
export const MINI_TRAIN = {
  points: [
    [-7.6, 11.4],
    [-9.8, 9.6],
    [-10.9, 7.4],
    [-11.0, 4.8],
    [-9.2, 2.4],
    [-6.0, 1.4],
    [-2.8, 2.6],
    [-1.4, 5.4],
    [-2.0, 8.6],
    [-4.4, 10.6],
  ],
  gauge: 0.55,
  speed: 0.02, // laps per second
  stations: [
    { x: -3.2, z: 7.6, yaw: 0.2, name: '中央车站' },
    { x: -6.6, z: 11.2, yaw: 0.25, name: '回忆小屋' },
    { x: -10.3, z: 7.1, yaw: 1.15, name: '知识学园' },
    { x: -10.3, z: 4.5, yaw: 1.5, name: 'AI 研究塔' },
  ],
};

export const ATTRACTIONS = {
  ferrisWheel: {
    radius: 4.3,
    cabinCount: 8,
    spokes: 10,
    hubHeight: 6.0,
    rotationSpeed: 0.12, // radians / second
  },
  carousel: {
    platformRadius: 2.75,
    platformHeight: 0.34,
    horseCount: 5,
    rotationSpeed: 0.35,
    bobAmplitude: 0.16,
    bobSpeed: 1.8,
  },
};

export const CLOUDS = {
  count: 14,
  skyClouds: 4, // peripheral clouds, floating higher/around
  minPuffs: 4,
  maxPuffs: 7,
  radius: [0.6, 1.7],
  spread: 5,
  drift: 0.3,
  bob: 0.5,
};

export const BALLOONS = {
  count: 2,
  colors: ['#f2b6b0', '#a8dcc5'],
  positions: [[-32, 11, -14], [32, 13, -15]],
  bob: 0.7,
  sway: 0.14,
};

// Real-world weather (Open-Meteo, no API key). Browser geolocation is used when
// available; otherwise this fallback location is used.
export const WEATHER = {
  enabled: true,
  refreshMinutes: 30,
  fallback: { lat: 51.5074, lon: -0.1278 }, // London
};

export const CAMERA = {
  defaultPosition: [0, 50, 73],
  defaultTarget: [0, 2, -1],
  frustumHalfHeight: 28,
  near: 0.1,
  far: 250,
  minZoom: 0.75,
  maxZoom: 3.2,
  minPolar: 0.436,
  maxPolar: 1.187,
  minDistance: 5,
  maxDistance: 200,
  dampingFactor: 0.08,
};

// Shadow settings for the single shadow-casting directional (sun/moon) light.
export const LIGHTS = {
  shadowMapSize: 2048,
  shadowRadius: 4.0,
  shadowBounds: 48,
};

// Day / Night environment presets. Every value here is interpolated on switch.
export const ENV = {
  day: {
    skyTop: '#7fc1dd',
    skyBottom: '#e4f5fb',
    fog: '#cdeaf4',
    fogNear: 120,
    fogFar: 380,
    hemiSky: '#eaf5fb',
    hemiGround: '#cbb99c',
    hemiIntensity: 0.8,
    ambientColor: '#fff6ea',
    ambientIntensity: 0.18,
    keyColor: '#ffedcf', // warm sun
    keyIntensity: 2.0,
    keyPosition: [16 * WORLD_SCALE, 26 * WORLD_SCALE, 12 * WORLD_SCALE],
    cloudTint: '#fffdf6',
    emissive: 0, // decorative lights off
    fireflies: 0,
    stars: 0,
    bloom: 0,
    exposure: 1.05,
  },
  night: {
    skyTop: '#42466b', // muted indigo
    skyBottom: '#827ca6', // lavender horizon
    fog: '#6f6a99',
    fogNear: 100,
    fogFar: 330,
    hemiSky: '#7d84b8', // lavender fill
    hemiGround: '#3c3f58', // dark indigo (never black)
    hemiIntensity: 0.5,
    ambientColor: '#b7c0ea',
    ambientIntensity: 0.38,
    keyColor: '#a9b8ff', // cool moonlight
    keyIntensity: 0.62,
    keyPosition: [-14 * WORLD_SCALE, 22 * WORLD_SCALE, -10 * WORLD_SCALE],
    cloudTint: '#d3cce8', // pale lavender
    emissive: 1,
    fireflies: 1,
    stars: 1,
    bloom: 0.45,
    exposure: 0.95,
  },
};

// Warm decorative lighting.
export const DECOR = {
  warmCream: '#ffe6b3',
  warmAmber: '#ffd093',
  emissiveBoost: 1.35, // multiplier applied to bulb emissive at night
  starDay: 0.28,
  starNight: 1.2,
  // Lanterns are provided by props.js around the square, so none here.
  lanterns: [],
  // Warm pools of light at night (world space).
  pointLights: [
    { color: '#ffd093', intensity: 12, distance: 8, position: [0, 2.4, 9.6] }, // square
    { color: '#ffe6b3', intensity: 8, distance: 6.5, position: [-7.4, 2.2, 9.9] }, // café
    { color: '#ffd093', intensity: 9, distance: 7, position: [3.8, 2.4, 17.6] }, // station
    { color: '#ffe6b3', intensity: 8, distance: 6.5, position: [10.9, 2.2, 2.1] }, // carousel
  ],
};

// Fireflies (soft warm points; no per-particle lights).
export const FIREFLIES = {
  count: 60,
  color: [1.0, 0.9, 0.62], // warm yellow
  minY: 0.25,
  maxY: 1.5,
  wanderRadius: 0.6,
  pulseSpeed: 1.5,
  size: 50, // point-size divisor
};

// Twinkling stars behind the island.
export const STARS = {
  count: 130,
  radius: 150,
  minY: 12,
  maxY: 140,
  size: 1.8,
  twinkleSpeed: 0.8,
};

// Restrained bloom settings (strength is driven by the active environment).
export const BLOOM = {
  radius: 0.55,
  threshold: 0.62,
};

export const ATTRACTION_NAMES = {
  ferrisWheel: '摩天轮',
  carousel: '旋转木马',
};

// ---------------------------------------------------------------------------
// DISTRICTS — Xiaoming's Little World, chapter by chapter.
// Data-driven: `building` picks a factory, `status` marks built vs planned, and
// the content fields feed the info card. Personal details that have not been
// supplied are clearly marked placeholders (示例文字 / 占位文字).
// ---------------------------------------------------------------------------
export const DISTRICTS = [
  {
    id: 'memory',
    letter: 'A',
    name: '回忆小屋',
    englishName: 'Memory Cottage',
    theme: '童年 · 家人 · 家',
    position: P3(-8.0, 0, 9.6),
    building: 'cottage',
    status: 'built',
    tags: ['家', '童年', '起点'],
    story: '示例文字：这里放一段关于童年和家的回忆——院子里的树、夏天的蝉鸣、饭桌上的笑声。',
    note: '更多私人回忆将持续补充。',
  },
  {
    id: 'academy',
    letter: 'B',
    name: '知识学园',
    englishName: 'Academy of Knowledge',
    theme: '本科 · 人工智能 · 成长',
    position: P3(-11.0, 0, 6.2),
    building: 'academy',
    status: 'built',
    tags: ['本科', '人工智能', '成长'],
    story: '示例文字：我在这里第一次接触人工智能——第一行代码、第一次比赛、第一次熬夜调模型。',
    projects: [
      {
        title: '示例：本科课程 / 竞赛项目',
        summary: '占位文字：这里会放本科阶段的课程项目、竞赛经历或研究方向。',
        stack: [],
      },
    ],
    note: '具体奖项与项目细节待补充。',
  },
  {
    id: 'research',
    letter: 'C',
    name: 'AI 研究塔',
    englishName: 'AI Research Tower',
    theme: '硕士 · 机器人 & AI · University of Glasgow',
    position: P3(-11.4, 0, 2.6),
    building: 'tower',
    status: 'built',
    tags: ['硕士', 'University of Glasgow', '计算机视觉'],
    story: '示例文字：在格拉斯哥攻读 Robotics & AI 硕士期间，我专注于计算机视觉与医学图像分割。',
    projects: [
      {
        title: 'Semi-Supervised Tooth Segmentation and Identification in Panoramic Dental X-Ray Images',
        summary: '示例文字：面向全景牙科 X 光片的半监督牙齿分割与识别，结合伪标签与匈牙利匹配提升标注效率。',
        stack: [
          'Deep Learning',
          'Medical Image Segmentation',
          'YOLO',
          'SAM',
          'U-Net',
          'Pseudo-Labeling',
          'Hungarian Matching',
          'Semi-Supervised Learning',
        ],
        links: [],
      },
    ],
    note: '可在此补充论文链接 / 可视化对比图。',
  },
  {
    id: 'robotics',
    letter: 'D',
    name: '机器人工坊',
    englishName: 'Robotics Workshop',
    theme: '机器人 · 嵌入式 · 工程',
    position: P3(-6.0, 0, 12.8),
    building: 'reserved',
    status: 'planned',
    tags: ['机器人', '嵌入式', '工程'],
    projects: [
      { title: 'NAO Robot Soccer', summary: '占位文字：NAO 机器人足球项目。', stack: [] },
      { title: 'Webots Robot Simulation', summary: '占位文字：Webots 机器人仿真。', stack: [] },
      { title: 'QBot Vision Project', summary: '占位文字：QBot 视觉项目。', stack: [] },
      { title: 'STM32-Based Embedded Systems', summary: '占位文字：基于 STM32 的嵌入式系统。', stack: [] },
    ],
    note: '该区域规划中，下一阶段开放。',
  },
  {
    id: 'studio',
    letter: 'E',
    name: '创造工作室',
    englishName: "Creator's Studio",
    theme: 'AI Agent · Vibe Coding · 创作',
    position: P3(11.0, 0, 3.0),
    building: 'reserved',
    status: 'planned',
    tags: ['AI Agent', 'Vibe Coding', '创作'],
    projects: [
      { title: '示例：AI Agent / 小游戏 / 网页应用', summary: '占位文字：这里会放 AI Agent、Vibe Coding 作品与交互 Demo。', stack: [] },
    ],
    note: '该区域规划中，下一阶段开放。',
  },
  {
    id: 'station',
    letter: 'G',
    name: '未来车站',
    englishName: 'Future Station',
    theme: '未来 · 梦想 · 下一站',
    position: P3(5.0, 0, 13.0),
    building: 'reserved',
    status: 'planned',
    tags: ['未来', '梦想', '下一站'],
    note: '该区域规划中，敬请期待。',
  },
];

// (The old 人生步道 life path was removed — the town tram now links the districts.)

// Hand-placed environment details. Variant names map to factories in
// environmentDetails.js. Positions are chosen to avoid buildings and paths.
export const ENVIRONMENT = {
  // [x, z, variant, scale]
  trees: [
    [12.0, 6.6, 'broadleaf', 1.0],
    [12.4, 0.8, 'pine', 0.9],
    [11.6, -3.8, 'broadleaf', 0.95],
    [8.4, 9.6, 'pine', 0.85],
    [-12.4, 0.0, 'broadleaf', 0.9],
    [-12.0, -2.8, 'pine', 0.85],
    [2.5, -6.5, 'broadleaf', 0.9],
    [-2.5, -9.5, 'pine', 0.85],
    [6.0, -8.5, 'broadleaf', 0.85],
    [9.5, -5.5, 'pine', 0.9],
  ].map(([x, z, v, s]) => [x * WORLD_SCALE, z * WORLD_SCALE, v, s]),
  // [x, z]
  bushes: [
    [12.4, 5.6],
    [-12.6, 1.6],
    [-2.6, 6.4],
    [5.6, 1.6],
    [9.4, 4.0],
    [2.0, -4.0],
    [7.0, -4.5],
    [-1.0, -8.5],
  ].map(([x, z]) => P2(x, z)),
  // [x, z, yaw]
  gardens: [
    [10.6, 7.2, -0.4],
    [4.5, -6.0, 0.3],
  ].map(([x, z, yaw]) => [x * WORLD_SCALE, z * WORLD_SCALE, yaw]),
  // [x, z]
  lamps: [
    [9.6, 8.0],
    [11.0, 1.2],
    [7.0, 9.8],
    [-7.2, 2.2],
    [4.0, -5.0],
  ].map(([x, z]) => P2(x, z)),
  // [x, z, yaw]
  signposts: [
    [2.0, 9.6, 0.55],
    [5.0, 0.6, -0.7],
  ].map(([x, z, yaw]) => [x * WORLD_SCALE, z * WORLD_SCALE, yaw]),
};

