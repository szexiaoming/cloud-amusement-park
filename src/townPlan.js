// Authored masterplan data from design/sze-layout-v1.json.
// ALL coordinates are FINAL WORLD units — no WORLD_SCALE is applied to them.
export const PLAN = {
  island: {
    boundaryXZ: [
      [-35, 0], [-32, -23], [-20, -26], [0, -27], [20, -26], [32, -23],
      [35, -10], [34, 6], [28, 17], [15, 23], [-2, 25], [-20, 22], [-31, 13],
    ],
    topYRange: [0, 1.2],
    undersideMinY: -7,
    edgeThickness: 2,
  },

  camera: {
    position: [0, 50, 73],
    target: [0, 2, -1],
    near: 0.1,
    far: 250,
    pad: 0.14,
    polarDeg: [25, 68],
    zoomRange: [0.75, 3.2],
  },

  square: { centerXZ: [-5, 5], radius: 3.2, padY: 0.1 },
  squareProps: {
    well: [-5, 4.4],
    notice: [-6.6, 5.6],
    benches: [[-6.8, 4.2, 0.9], [-3.2, 4.2, -0.9]],
    lamps: [[-6.4, 6.2], [-3.6, 6.2]],
  },
  entranceSign: { centerXZ: [-6, 17.4], yawDeg: 0, maxHeight: 2 },

  attractions: [
    { id: 'ferrisWheel', name: '摩天轮', centerXZ: [19, -8], padY: 0.5, yawDeg: 0, envelopeXZ: [12, 5], maxHeight: 14, entryXZ: [19, -4.8] },
    { id: 'carousel', name: '旋转木马', centerXZ: [19, 7], padY: 0.1, yawDeg: 0, envelopeXZ: [8, 8], maxHeight: 6, entryXZ: [19, 11.5] },
  ],

  paths: [
    { id: 'main-lane', width: 1.8, pointsXZ: [[-6, 19], [-6, 14], [-6, 9], [-5, 5], [-6, 0], [-6, -6], [-6, -10]] },
    { id: 'memory-door', width: 1.1, pointsXZ: [[-6, 6], [-9, 6.5], [-12.5, 5.6]] },
    { id: 'academy-door', width: 1.2, pointsXZ: [[-6, -3], [-9, -3.5], [-12.6, -5]] },
    { id: 'neighbor-walk', width: 1.0, pointsXZ: [[-10, 6.2], [-9, 2], [-9, -3.5]] },
    { id: 'research-door', width: 1.1, pointsXZ: [[-6, -10], [-3, -9], [1, -8.7]] },
    { id: 'robotics-door', width: 1.0, pointsXZ: [[-6, 0], [-12, -0.5], [-19, -1], [-20.8, -3], [-20.8, -5.2]] },
    { id: 'studio-door', width: 1.0, pointsXZ: [[-6, 12], [-13, 12.5], [-18, 12], [-19.8, 10.8]] },
    { id: 'future-door', width: 1.0, pointsXZ: [[-2, 6], [1, 7.5], [4.5, 7.6]] },
    { id: 'meadow-lane', width: 1.5, pointsXZ: [[-6, 14], [0, 14], [7, 14.5], [12, 15], [19, 15]] },
    { id: 'east-lane', width: 1.4, pointsXZ: [[19, 15], [12, 15], [12, 8], [12, 0], [12, -8], [12, -15], [15, -16.8]] },
    { id: 'ferris-entry', width: 1.2, pointsXZ: [[12, -4], [16, -4], [19, -4.8]] },
    { id: 'carousel-entry', width: 1.2, pointsXZ: [[19, 15], [19, 11.5]] },
    { id: 'west-platform-link', width: 1.5, pointsXZ: [[-15, -16.8], [-10, -16], [-6, -14], [-6, -10]] },
  ],

  railway: {
    centerlineXZ: [
      [-21, -20.5], [-14, -22], [-4, -22.8], [6, -22.8], [16, -22.2],
      [27, -20.5], [33, -9], [29.5, 8], [24, 16],
      [13, 20.5], [-2, 21], [-17, 19], [-27, 12], [-32, 3],
      [-30, -9], [-28.5, -16],
    ],
    closed: true,
    railTopY: 1.2,
    terrainUnderTrackY: 0.9,
    reservedHalfWidth: 2.3,
    safetyMargin: 0.6,
    maxConsistLength: 11.0,
    maxCarWidth: 1.4,
    maxCarHeight: 2.6,
    platforms: [
      { id: 'rail-west', name: '来时路站', centerXZ: [-27.5, 1.0], dimsXZ: [1.8, 9], stopXZ: [-31.5, 3], accessXZ: [-24, 1] },
      { id: 'rail-east', name: '云上游乐站', centerXZ: [21, -16.8], dimsXZ: [11, 1.6], stopXZ: [23, -18.5], accessXZ: [15, -16.8] },
    ],
    cars: [
      { id: 'loco', length: 2.73, width: 1.3, height: 2.5, offset: 0 },
      { id: 'car1', length: 2.54, width: 1.3, height: 1.7, offset: 3.2 },
      { id: 'car2', length: 2.54, width: 1.3, height: 1.7, offset: 6.4 },
      { id: 'car3', length: 2.54, width: 1.3, height: 1.7, offset: 9.6 },
    ],
  },

  groves: [
    { centerXZ: [-29, 0], radius: 2.0, count: 3, maxHeight: 4 },
    { centerXZ: [-24, 16], radius: 2.0, count: 3, maxHeight: 2.5 },
    { centerXZ: [-2, -2], radius: 1.7, count: 3, maxHeight: 3 },
    { centerXZ: [6, -6], radius: 2.0, count: 4, maxHeight: 4 },
    { centerXZ: [29, 0], radius: 2.0, count: 4, maxHeight: 4 },
    { centerXZ: [28, 12], radius: 2.0, count: 3, maxHeight: 2.5 },
    { centerXZ: [6, 18], radius: 1.8, count: 4, maxHeight: 1.2 },
  ],

  clouds: { centerY: [-9, -4], maxRadius: 2.5 },
  balloons: { anchors: [[-32, 11, -14], [32, 13, -15]] },
};
