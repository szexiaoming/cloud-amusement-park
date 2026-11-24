import * as THREE from 'three';

/**
 * Unified hover + click interaction for attractions and town places.
 * - Hover: soft highlight + Chinese label.
 * - Click an attraction: pause / resume its animation.
 * - Click a town place: open its memory card (onPlaceClick).
 * - Click empty ground: close any open card (onBackgroundClick).
 * Drag vs. tap is disambiguated by pointer movement distance.
 */
export function createInteraction({
  camera,
  dom,
  attractions = [],
  places = [],
  onPlaceClick,
  onBackgroundClick,
}) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const label = document.getElementById('hover-label');

  const clickables = [];
  for (const a of attractions) {
    const meshes = [];
    a.root.traverse((o) => {
      if (o.isMesh) meshes.push(o);
    });
    clickables.push({ kind: 'attraction', item: a, meshes });
  }
  for (const p of places) {
    const meshes = [];
    p.root.traverse((o) => {
      if (o.isMesh) meshes.push(o);
    });
    clickables.push({ kind: 'place', item: p, meshes });
  }

  let hovered = null;
  let downX = 0;
  let downY = 0;
  let moved = false;

  function pick(clientX, clientY) {
    const rect = dom.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    // Choose the closest hit so a nearer town house wins over a landmark behind it.
    let best = null;
    let bestDist = Infinity;
    for (const c of clickables) {
      const hits = raycaster.intersectObjects(c.meshes, false);
      if (hits.length > 0 && hits[0].distance < bestDist) {
        bestDist = hits[0].distance;
        best = c;
      }
    }
    return best;
  }

  function setHover(c) {
    if (hovered === c) return;
    if (hovered) hovered.item.setHighlight(false);
    hovered = c;
    if (hovered) hovered.item.setHighlight(true);
    refreshLabel();
  }

  function refreshLabel() {
    if (!hovered) {
      label.style.display = 'none';
      return;
    }
    if (hovered.kind === 'attraction') {
      label.textContent = hovered.item.paused
        ? `${hovered.item.name} · 已暂停`
        : hovered.item.name;
    } else {
      label.textContent = `${hovered.item.name} · 点击看看`;
    }
    label.style.display = 'block';
  }

  dom.addEventListener('pointerdown', (e) => {
    downX = e.clientX;
    downY = e.clientY;
    moved = false;
  });

  dom.addEventListener('pointermove', (e) => {
    if (e.buttons & 1) {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) moved = true;
      if (moved) setHover(null);
      return;
    }
    setHover(pick(e.clientX, e.clientY));
  });

  dom.addEventListener('pointerup', (e) => {
    if (moved) return;
    const c = pick(e.clientX, e.clientY);
    if (!c) {
      onBackgroundClick?.();
      return;
    }
    if (c.kind === 'attraction') {
      c.item.toggle();
      refreshLabel();
    } else {
      onPlaceClick?.(c.item);
    }
  });

  dom.addEventListener('pointerleave', () => setHover(null));

  const v = new THREE.Vector3();

  function update() {
    if (!hovered) return;
    hovered.item.labelAnchor.getWorldPosition(v);
    v.project(camera);
    const rect = dom.getBoundingClientRect();
    const x = (v.x * 0.5 + 0.5) * rect.width + rect.left;
    const y = (-v.y * 0.5 + 0.5) * rect.height + rect.top;
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
  }

  return { update };
}
