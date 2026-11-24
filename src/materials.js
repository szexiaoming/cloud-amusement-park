import * as THREE from 'three';
import { PALETTE } from './config.js';

const std = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.9,
    metalness: opts.metalness ?? 0.0,
    ...opts,
  });

// Shared, reusable materials for the whole scene (matte clay / painted-wood look).
export function createMaterials() {
  return {
    grass: std(PALETTE.grass, { roughness: 1.0 }),
    grassDark: std(PALETTE.grassDark, { roughness: 1.0 }),
    grassLight: std(PALETTE.grassLight, { roughness: 1.0 }),
    rock: std(PALETTE.rock, { roughness: 0.95 }),
    rockDark: std(PALETTE.rockDark, { roughness: 0.95 }),
    rockDeep: std(PALETTE.rockDeep, { roughness: 0.95 }),
    mint: std(PALETTE.mint, { roughness: 0.82 }),
    mintDark: std(PALETTE.mintDark, { roughness: 0.82 }),
    peach: std(PALETTE.peach, { roughness: 0.82 }),
    peachDark: std(PALETTE.peachDark, { roughness: 0.82 }),
    butter: std(PALETTE.butter, { roughness: 0.8 }),
    butterDark: std(PALETTE.butterDark, { roughness: 0.8 }),
    cream: std(PALETTE.cream, { roughness: 0.85 }),
    creamDark: std(PALETTE.creamDark, { roughness: 0.85 }),
    wood: std(PALETTE.wood, { roughness: 0.85 }),
    woodDark: std(PALETTE.woodDark, { roughness: 0.85 }),
    gold: std(PALETTE.gold, { roughness: 0.55, metalness: 0.12 }),
    cloud: std(PALETTE.cloud, { roughness: 1.0 }),
    cloudTransparent: std(PALETTE.cloud, {
      roughness: 1.0,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
    flower: std(PALETTE.white, { roughness: 0.7 }), // per-instance color
    path: std('#d9cdb4', { roughness: 1.0 }), // warm cobblestone / stone path
    wheelRim: std(PALETTE.mint, { roughness: 0.75 }),

    // --- Natural town materials (stone / plaster / timber / roof / soil / leaf) ---
    stone: std('#c7bfb2', { roughness: 0.95 }),
    stoneDark: std('#a99f90', { roughness: 0.95 }),
    plaster: std('#efe3cd', { roughness: 0.92 }),
    plasterWarm: std('#e6d3b4', { roughness: 0.92 }),
    plasterGable: std('#e6d3b4', { roughness: 0.92, side: THREE.DoubleSide }),
    plasterSage: std('#dfe6dc', { roughness: 0.92 }),
    plasterBlue: std('#dde4ea', { roughness: 0.92 }),
    plasterRose: std('#f0d9c8', { roughness: 0.92 }),
    roofMoss: std('#7d8a72', { roughness: 0.85 }),
    glass: new THREE.MeshStandardMaterial({
      color: '#dff0ea',
      roughness: 0.15,
      metalness: 0,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
    }),
    roofTile: std('#b56f58', { roughness: 0.8 }),
    roofSlate: std('#5c6b74', { roughness: 0.8 }),
    timber: std('#6f5440', { roughness: 0.85 }),
    soil: std('#6a4e39', { roughness: 1.0 }),
    leaf: std('#5c8a4a', { roughness: 0.95 }),
    leafDark: std('#46733c', { roughness: 0.95 }),
    leafLight: std('#7aa862', { roughness: 0.95 }),
    // Window glass: a soft warm glow that strengthens at night.
    window: std('#ffe6b3', { roughness: 0.35, emissive: '#ffcf8a', emissiveIntensity: 0.12 }),

    // Warm decorative bulbs (emissive intensity driven by day/night env).
    bulbCream: std('#ffe6b3', { roughness: 0.6, emissive: '#ffe6b3', emissiveIntensity: 0 }),
    bulbAmber: std('#ffd093', { roughness: 0.6, emissive: '#ffd093', emissiveIntensity: 0 }),
    // Star motif: softly glowing in both modes, brighter at night.
    star: std('#ffe6b3', { roughness: 0.55, emissive: '#ffd093', emissiveIntensity: 0.28 }),
  };
}
