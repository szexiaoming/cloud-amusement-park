# Sze的小世界 — fixed composition V1

Implement the attached `sze-layout-v1.json` as an authored masterplan in the existing project. This file controls placement, rotation, destination reservations, circulation, railway, vegetation envelopes and the default camera. It replaces earlier qualitative layout instructions.

Do not independently redesign the layout or move destinations to make the scene look better. Do not replace personal content with generic village content. The design is a living-memory neighborhood on the left, a research landmark at the rear center, and an amusement meadow on the right, connected by a rear scenic railway and a continuous pedestrian network.

## Preserve content

Preserve all six destination IDs, content, statuses and interactions: memory, academy, research, robotics, studio, station. Preserve working environment controls and attraction interactions. Planned destinations remain planned; their named garden clearings do not authorize constructing completed buildings. Operational stops `rail-west` and `rail-east` are separate from the personal destination `station`.

## Coordinate contract

All JSON positions are FINAL WORLD coordinates. Y is up, +X is right, +Z is foreground. An unrotated building entrance points +Z. Positive yaw around Y turns the entrance toward +X. Rotations in JSON are degrees.

The current project has `WORLD_SCALE = 1.3`, position helpers and a scaled town parent. Replace the competing positioning transformations with one consistent world-space layer. Retain each model's previous actual world size when converting, but never multiply these authored coordinates by 1.3. Do not scale effects with the terrain.

`src/town.js` currently points buildings automatically toward the square. Replace that behavior with the specified per-destination yaw. `src/attractions/ferrisWheel.js` currently derives yaw from the camera. Replace it with the fixed wheel yaw. Use the measured complete geometry bounds: `createDistrictBuilding` currently starts w/d at 3.6/3.0 even for the academy, so those reported dimensions must not be trusted as its full bounding box.

Reserved envelopes are maximum axis-aligned XZ bounds AFTER rotation, including roof eaves, signs and steps. They are not sizes into which to stretch models. Keep actual existing model size where it fits. If it does not fit, report the measured discrepancy rather than moving a destination or distorting it. Modest architectural adjustment within an envelope is acceptable only without changing identity or required scale relationships.

## Terrain and paths

Use the fixed outline; round corners conservatively without consuming the railway margin. Create flat local pads at the specified elevations, blended into low rolling grassland. Keep the foreground open and low. Terrain thickness belongs below the surface: no continuous raised lip or bowl wall.

Use all authored pedestrian route anchors and widths. Round corners within the given tolerance. Join shared segments into one surface, avoid overlapping path meshes, and connect each measured doorstep to its apron. Minor endpoint adjustment is allowed only within the stated tolerance. No global route optimizer, new central spokes or unplanned shortcuts.

The front horizontal path, left village lane and right meadow lane intentionally form a walkable network. Some nearby destinations also have direct links. Do not reconnect every destination separately to the square.

## Railway

Build the fixed rear route. Leave both station-adjacent sections straight and smooth the central scenic section only. Keep the route at the authored rail height with a supported bed.

Station positions in the JSON refer to platform centers, and train stop coordinates refer to the MIDPOINT OF THE COMPLETE CONSIST. They are not locomotive-center stopping points. Keep the physical train below the stated maximum length. Verify the measured current train before implementing stop offsets.

Use an out-and-back shuttle: reverse travel without teleporting, turning every vehicle in place, or clamping multiple carriage positions to one route endpoint. Each vehicle occupies its own valid distance along the route. Maintain the complete train and buffer clearance at both terminals. The existing personal Future Station does not become a railway platform.

Reserve the specified corridor, measure actual swept carriage volume, and check the real platforms, terrain, signs, roofs and tree canopies. Conservative bounds are broad-phase candidates, not proof of actual mesh intersection. Keep at least the configured safety margin. Observe a full out-and-back journey and list remaining findings accurately. Do not silently move destinations to resolve a route bug.

## Camera and visibility

Use the fixed orthographic direction, approximately 33 degrees downward from horizontal. Do not use either the nearly top-down screenshot angle or the low 22-degree angle that stacks silhouettes and leaves excessive sky.

Fit the relevant projected bounds with the specified padding and aspect adjustment. Exclude remote clouds, balloons, particles, labels and helpers. Center the projected composition in the drawable area between the top and bottom UI. This is framing, not permission to change the view angle or rotate the island. Avoid continuous auto-fitting while the user orbits; fit initially, on reset and on resize as appropriate without resetting deliberate user zoom.

The default must show the fronts of the memory cottage and academy, the tower separately at center rear, the Ferris wheel's broad face on the right, the carousel below it, and a visible island underside. Check actual projected silhouettes. Keep foreground planting low and trees within the supplied grove envelopes. Do not add new groves or ground-level clouds.

## Verification and delivery

First produce the fixed layout with simple materials, all destination reservations, path widths and railway envelope visible in a developer-only mode. Then restore the visual materials once coordinates and intersections are checked.

Verify:
- Exact destination centers and yaws, with content/status preserved.
- Measured model bounds within reservations; paths reach entrances.
- No competing transforms, double scaling or camera-dependent object orientation.
- Default composition at the user's portrait-ish viewport and a wide desktop viewport.
- The previously reported orange transparent obstruction and straight foreground cut do not recur across day/night, seasonal and camera changes.
- No clouds obscure rides in the default view.
- Full train outward and return movement, including terminal stops and all carriages.
- Existing destination panels, railway interaction, orbit and reset controls.

Provide a default-view screenshot, a top-view developer-layout screenshot and the actual validation result. A successful build alone is not acceptance. The masterplan itself is not runtime collision certification; report real blockers rather than asserting that authored coordinates guarantee success.

Keep layout constraints fixed. Permitted local freedom is limited to terrain interpolation, path smoothing within tolerance, small decorative details inside reserved areas, and plant placement inside the defined grove envelopes after clearance rejection.
