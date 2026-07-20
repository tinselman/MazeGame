# Crystal Maze

A first-person maze in the dark, three levels deep. You start in the lit central
hub, walk out into a black 66×66 maze, and bring six crystals home. When all six
are seated they merge and the room lifts you out.

Single self-contained HTML file. Three.js is the only dependency, loaded from a CDN
via import map.

## Run

```
python3 -m http.server 5178 --directory .
```

Then open <http://localhost:5178>. Any static server works; it needs to be served
over HTTP rather than opened as a `file://` URL, because it loads an ES module.

## Controls

| | |
|---|---|
| `W` `A` `S` `D` | move |
| `Shift` | run |
| `←` `→` | turn |
| `↑` `↓` | look up and down |
| mouse | look, after clicking to capture the pointer |
| `E` or `Space` | press buttons, take crystals, enter portals |

Movement, turning and pitch are all analog. Velocity and both look axes chase
their target exponentially rather than snapping on and off, and you accelerate
harder than you coast (`ACCEL` 12 vs `DECEL` 6.5), so setting off feels
responsive while stopping keeps some weight. Pitch clamps at about 66° and zeroes
its velocity at the stop so it cannot wind up against the limit. Scraping a wall
removes only the velocity heading into it, so you slide along rather than
sticking. The mouse writes both look axes directly — it is already an analog
device, and easing it reads as lag rather than weight.

**The torch is carried, not worn.** It sits at chest height in the right hand
rather than at the eye, so light comes from below eye level and throws shadows
upward — which is what makes a walkway overhead read as an object rather than a
texture. Its aim target lives in world space and eases toward where you are
looking, so the beam trails during a fast turn and settles after, and it sways
gently as you walk.

## How it works

**The colour arc is carried entirely by light, not by materials.** Every surface is
neutral grey. The flashlight is near-white, so the maze reads black-and-white; the
fluorescents are warm yellow, so a room you switch on reads yellow; the crystals are
coloured, so the hub turns chromatic as you fill it; the finale is white. No material
is ever swapped — changing `FLUOR` or a crystal's `color` restyles the whole game.

**It is a building, not a maze.** Halls run on a street grid, which is a loop network,
so dead ends are structurally impossible rather than something to detect and patch. The
blocks between the halls are rooms, each opened onto at least two different halls, so
you can always continue through rather than turn around. The six crystal chambers are
the deliberate exception — sealed, one door, which is what makes finding their button
matter.

**Every room is a landmark.** Abandoned restaurants with banquet tables and stacked
chairs, living rooms with sofa clusters and shelving, museums with vitrines on plinths,
galleries with hung panels, warehouses with pallet racking and crates, offices with desk
grids, colonnaded halls, and cubicle floors where the terminals are still running —
green text on black behind the partitions. You navigate by "past the banquet hall, left
at the pallet racks" instead of counting turns. All of it is silhouette-level geometry
in a handful of instanced meshes with per-instance colour, so 34 furnished rooms cost
about four draw calls.

The monitors are the one thing in the building still making light on their own: every
fourth screen feeds the light pool, so a cubicle floor glows faintly green before you
have found its switch. It is the only room type you can locate in the dark.

**Nothing snaps downward.** Any drop deeper than a kerb becomes a real fall under
gravity — off a balcony, off the side of a stair flight, off anything — and you land
with a damped-spring jolt and a touch of camera roll, scaled by how hard you hit. The
landing probe is anchored to where your feet were *before* the frame's step, not after:
a window measured from the new position is narrower than the distance a fast fall
covers in one frame, and you drop straight through the floor.

**Three storeys with atriums cut through them.** Several blocks — including the grand
central hub — are open through all three floors and ringed by the balconies of the halls
above, so standing on the ground you read two floors of frontage over your head. The
ceiling rule is simply: if something is built above, its slab is your ceiling; if nothing
is, the space stays open. A single roof caps every column that is open to the sky, so an
atrium reads as a tall interior room rather than a shaft into nothing. Walkways that meet
a drop get a parapet, a coping course and corbels — except at two balconies, where the
parapet has a gap and you can step off and fall to the ground floor.

**The tubes are fluorescent, and they behave like it.** A light does not simply come
on. Each one strikes at its own rate after its own delay, stuttering and catching and
stuttering again before it settles, so a room assembles itself over a couple of
seconds. Per room, one to four tubes never catch at all — they try twice and give up —
and one to three never stop dropping out. It is all deterministic from the room's
position, so a room looks the same every playthrough.

Two atriums have a switch of their own that lights the whole three-storey volume, and
it comes up a storey at a time from the bottom: the first balcony ring strikes, then
the one above it, then the pendants under the roof.

**Light lives in rooms.** Corridors have no fixtures at all and never will — they are
the dark you cross. Each room has exactly one switch, which lights that room and
nothing else, and a room is also the only shelter where the flashlight recharges.
Because charging is decided by which room you stand in rather than by how bright it
is where you stand, light spilling out of a doorway looks natural without muddying
the rule: stand in the spill and you still drain.

**Floors are solid volumes, not planes.** Every floor cell is a closed box — top,
bottom and four sides — with the faces buried between neighbouring cells culled, so it
is geometrically identical to a slab of boxes from any angle without paying for the
interiors.

This matters for more than thickness. A one-sided plane can only be seen from the side
it faces, which makes openings asymmetrical: the stairwell used to have its ceiling
suppressed but keep its floor, so the hole existed while you climbed and vanished the
moment you turned to go back down. A closed volume has no preferred direction. A
stairwell is now a genuine hole punched through the upper floor, with its rim capped
like any other edge, and one predicate — "the neighbour has no slab" — covers voids,
atrium edges and stairwell rims alike. Parapets, a coping course and corbels every
third cell finish the exposed edges. The hub floor is a lift, so its skirt and the six
pedestals are children of it; parented to the scene they would stay on the ground while
it climbed.

**Arched windows.** Large unglazed openings cut through the walls where an enclosed
region faces a void, weighted to the upper two floors, so each run is a gallery looking
out over an atrium. Their locations live in a side table rather than as a map
character: a char that is not `#` reads as walkable to `isWalkableChar`, and twenty-odd
sites test one or the other — `isSolid` among them, which would let you walk straight
through the opening. Geometry is one `ExtrudeGeometry` (a rectangle with an arched
hole, outer contour wound counter-clockwise or r169 leaves the hole uncorrected),
instanced across all sixty for a single draw call.

They are geometric openings, not light apertures. The pooled point lights never cast
shadows, so room light already passes through solid walls — you see *through* an arch,
but it does not throw a shaft of light on the floor.

**Water is wadeable.** Three of the rooms are flooded. Water halves your speed and sits
you slightly lower. The surface is Phong with high shininess and takes the animated
ripple canvas as both colour map and bump map, so every fluorescent, crystal and your
own torch drag moving specular highlights across it while the tiled floor stays visible
underneath. This is deliberately not a planar reflector: `Reflector` in r169 has no fog
support (it would render as a bright unfogged patch in a black-fogged maze), is opaque
with a hardcoded alpha, and re-renders the whole scene per instance — four visible ones
is 65 scene renders a frame.

**The map is a chart you fill in.** Only the hub, rooms whose lights you switched on,
and tunnels within three cells of those. Corridors you merely walked down in the dark
stay blank forever, which is what makes detouring for a light switch worth doing.
Buttons and doors are marked differently on purpose. A button you pressed puts its
surroundings on the chart — you stood there, so you know that ground. The door it
answers gets a numbered marker at its true position and **nothing else**: no floor plan
around it, so you learn where the door is without being handed the route to it. Matching
numbers pair each button with its door.

There is deliberately no floor label on either. The level you are on draws bold and the
others faint, so a marker on a ghosted layer already tells you which storey to go
looking on. Fixed extent, north-up. Where a known hall runs into unrevealed ground it is
drawn open rather than walled off, so the map never invents a dead end.

**Opened doors stay obviously open.** Doors are hinged, not sliding: pressing its
button swings a door ~88° into its chamber, where it stays, and its numeral lights up.
The glow is what carries down an unlit corridor. Swing direction is derived per door
from which side its crystal sits on, so a door never opens out into the corridor you
are standing in.

**Portals remove the retrace.** Beside each crystal is a portal, dormant until you
take it. Stepping through returns you to the hub. The outbound hunt across a maze this
size is the game; walking the same route back would only be the tax on it.

**Lights are pooled.** Three.js compiles the light count into its shaders, so adding
lights during play would stall on a recompile. Instead a fixed pool of 14 `PointLight`s
is allocated once and handed each frame to whichever emitters are nearest. There are
196 fixtures in the maze; only the closest fourteen are ever real lights.

## Editing the maze

`tools/genmaze.js` is the source of truth. It hand-places all the structure — hub,
chambers, rooms, water, stairs, bridges, buttons, portals — and generates only the
connective corridor maze between them, from a fixed seed, so the maze is identical
every playthrough.

```
node tools/genmaze.js            # print the three levels and validate
node tools/genmaze.js --write    # splice them into index.html
```

Legend:

```
' ' void (no geometry)   #  wall            .  corridor floor
+   room floor           ~  water           /  stair run
H   hub floor            S  start           1-6 crystal
a-f door                 A-F door button    *  light switch   P portal
```

It runs a **pre-flight** over the declared layout before carving anything, so a room
quietly overlapping a stairwell is reported by name rather than debugged out of a
broken grid afterwards. Then it validates the carved result: nothing orphaned on any
level, every button and switch reachable with all doors shut, each crystal unreachable
until its own door opens, no two rooms touching, and every stair landing on solid
ground at both ends. Connectivity is guaranteed by construction — isolated components
are tunnelled into the main body, which is also what cuts the doorways into rooms.

Buttons are placed by preference, not by promise: each snaps to the nearest plain
corridor cell, so shifting the layout can never strand one inside a wall.

## Debug handle

```js
__maze.go(1, 33, 20)  // teleport to level, row, col
__maze.face(90)       // heading in degrees
__maze.tilt(20)       // inspection only — not a control
__maze.interact()     // act on whatever is in reach
__maze.finale(16)     // run the ending, stepping 16 seconds by hand
__maze.perf()         // frame counter, draw calls, triangles
```

## Tuning

Constants near the top of the script: `WALK` / `RUN` / `WADE` speeds, `ACCEL` /
`DECEL`, `TURN_RATE` / `TURN_ACCEL` and `PITCH_RATE` / `PITCH_ACCEL` / `PITCH_MAX`
for the analog feel, `TORCH_LAG` and `TORCH_SWAY` for how handheld the beam feels,
`TORCH_HOME` for where it is carried, `SLAB` for floor thickness and therefore how
heavy the fascia reads, `BAT_DRAIN` / `BAT_CHARGE`, `POOL_SIZE`, and the `FLUOR`
yellow. Window placements are the `WINDOW_RUNS` table; each entry is a run along a
row or a column and is validated at load against the map.
