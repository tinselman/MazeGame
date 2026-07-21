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
| `1`–`6` | choose among the lamps you have found |
| `F` | fire the lamp you hold (hold it for the X-ray) |

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
seconds. The delay is positional, not random: a fixture's is its distance along the
room's longer axis, so the room lights as a wave travelling from one end to the other
rather than as scattered bulbs coming up. In a thirteen-cell gallery the correlation
between column and strike time is 0.994. Per room, one to four tubes never catch at all — they try twice and give up —
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

**No reflections, and no water any more.** The flooded rooms were cut when the plan was
rewritten as a building; `~` and `WADE` survive in the legend and the constants but no
map uses them. Reflective floors were considered and rejected: `Reflector` in r169 has
no fog support (it would render as a bright unfogged patch in a black-fogged maze), is
opaque with a hardcoded alpha, and re-renders the whole scene per instance — four
visible ones is 65 scene renders a frame.

**The map is a chart you fill in.** Only the hub, rooms whose lights you switched on,
and tunnels within three cells of those. Corridors you merely walked down in the dark
stay blank forever, which is what makes detouring for a light switch worth doing.
Buttons and doors are marked differently on purpose. A button you pressed draws the
**corridors** around it and nothing else — you stood there, so you know that ground, but
the reveal refuses to flood into rooms. The door it answers gets a single colour-coded
marker at its true position and no floor plan at all, so you learn where the door is
without being handed the route to it.

What you have charted stays charted. The reveal is rebuilt from current state — which
rooms are lit, which buttons are pressed — so without an accumulating set an Anti-player
flicking a switch would erase ground you had already walked.

There is deliberately no floor label on either. The level you are on draws bold and the
others faint, so a marker on a ghosted layer already tells you which storey to go
looking on. Fixed extent, north-up. Where a known hall runs into unrevealed ground it is
drawn open rather than walled off, so the map never invents a dead end.

**Gates and switches both go back.** Doors are hinged, not sliding: pressing its button
swings a gate ~88° into its chamber and lights the button's knob, and pressing it again
swings the gate shut and re-seals the cell. Swing direction is derived per door from
which side its crystal sits on, so a gate never opens out into the corridor you are
standing in. Light switches toggle the same way, and flicking one off forces every
fixture in the room dark rather than waiting for the flicker model to decide.

**Something else is walking.** A clock hangs over the hub counting down from 5:00, and
the same countdown draws at the foot of the screen so it reaches you three floors away.
When it runs out an Anti-player starts from the hub, and another every five minutes
after — so the hub is the last place you want to be on the marker.

**It is not a pursuer. It is a playback head.** The trail records where you were and
which way you faced every tenth of a second, plus every switch, button and portal as a
timestamped event, and an Anti-player is that recording played at 1x with a fixed lag.
It moves at your speed, hesitates where you hesitated, climbs the stairs you climbed and
doubles back where you doubled back. It cannot deviate, cannot turn to look at you,
cannot be steered. It is caught in time. Measured against a reference log of a 26-second
walk: worst position error 0.000m, worst heading error 0.03 degrees.

Which means it never runs you down — it only ever arrives where you have already been.
The threat is not being hunted. It is that your own past keeps walking, that it keeps
arriving at the hub you have to keep returning to, and that it puts out every light you
lit on the way.

**Replaying a flick is what undoes it.** You left the switch on, so its flick turns it
off. You pressed the button to open the gate, so its press closes it. Nothing in the
code knows what "undo" means, and nothing has to detect proximity to a switch: it walks
where you walked, so it arrives at everything you touched, exactly when you touched it
plus the lag.

**Lit rooms are sanctuary.** Its beam cannot take you in a room whose lights are on, or
in the hub — which is precisely why its putting them out matters. If a beam does land on
you, you are held for 1.9 seconds to see the torch that found you, and then every
crystal goes home to its vault and so do you.

Your own beam kills one, but only while it is looking somewhere else — and since it
cannot turn, whether it is looking away was decided by what you did, then. Head-on you
cannot win. Killing one puts the clock back to 5:00, the only way to buy time.

**No body.** A black casing floating at chest height with its lens at the front, so from
behind it occludes its own light and you get a cylinder and nothing else, and from the
front you get the beam. You can always see them: on the chart as a pale dot with the
wedge its beam covers, red while it could actually take you, and in the world as a halo
sprite drawn with fog off and depth-tested — a bare lens is two pixels at thirty metres,
and the one thing that defeats the dark is another flashlight.

Six are pooled, because several playback heads coexist by design; at 4, 9, 14 and 19
seconds' lag they string out 22m apart down a corridor. They are allocated at load and
never added or removed — Three.js bakes light count into its shaders, so a dormant
Anti-player is a live SpotLight at zero intensity.

## The six lights

Each vault hands over its lamp in the order you open them, so the first vault always
yields the X-ray and the last always the Ultra Blast: the route you take decides which
colour carries which power, never which power comes when. You keep every one you find,
pick between them with `1`-`6`, and fire with `F`. The row of icons is drawn as white
vector line, like the rest of the instrument.

| | | |
|---|---|---|
| 1 | **X-ray** | Held, not fired. The room ahead draws through the wall as a plan in pale blue line — its floor cells, its switch, and any crystal or portal inside. Drains while held. |
| 2 | **Holy Light** | Everything walking within 19m, gone, regardless of which way you face. |
| 3 | **Walk Through Walls** | The wall you shine on opens for 14 seconds, then closes again. The block is taken out of the instanced mesh and put back. |
| 4 | **Portal** | Shine at a wall, then click the chart. Restricted to ground you have actually charted, so it can never drop you inside a vault you have not opened. |
| 5 | **Cloak** | Thirty seconds where they cannot see you at all — you can still kill them. The last five seconds it visibly flickers, so you are told before it lapses. |
| 6 | **Ultra Blast** | Everything in a wide cone, through walls, through floors, to the end of the maze. Costs 90% of your light. |

They all run off the same battery as the plain beam, which is what ties them to the rest
of the game: a power is paid for in light, and light only comes back in a lit room — and
the Anti-players are busy putting those out.

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
__maze.step(2.5)      // advance the world 2.5 seconds by hand
__maze.finale(17)     // run the ending; camera should land at y 59.6
__maze.perf()         // frame counter, draw calls, triangles
__maze.spawnAnti()    // let one out at the hub now, replaying from minute zero
__maze.ghost(12)      // one that is exactly 12 seconds behind you
__maze.setClock(10)   // seconds until the next one
__maze.antiOff()      // clear the board and stop spawning
__maze.grantAll()     // hand over all six lamps
__maze.pick(3)        // select one; __maze.fireHeld() fires it
__maze.setCloak(0)    // clear the cloak between experiments
```

`step()` exists because `requestAnimationFrame` is throttled to zero in a preview pane,
so nothing animates unless it is driven by hand. `tick()` is only the rAF wrapper; the
work is in `frame(dt)`, which both paths call.

## Tuning

Constants near the top of the script: `WALK` / `RUN` / `WADE` speeds, `ACCEL` /
`DECEL`, `TURN_RATE` / `TURN_ACCEL` and `PITCH_RATE` / `PITCH_ACCEL` / `PITCH_MAX`
for the analog feel, `ANTI_PERIOD` for how long between walkers, `TRAIL_DT` for how finely you are
recorded, `CATCH_RANGE` / `BEAM_COS` for its reach and `KILL_RANGE` / `KILL_COS` /
`AVERT_COS` for yours, the `POWERS` table for what each lamp costs,
`TORCH_LAG` and `TORCH_SWAY` for how handheld the beam feels,
`TORCH_HOME` for where it is carried, `SLAB` for floor thickness and therefore how
heavy the fascia reads, `BAT_DRAIN` / `BAT_CHARGE`, `POOL_SIZE`, and the `FLUOR`
yellow. Window placements are the `WINDOW_RUNS` table; each entry is a run along a
row or a column and is validated at load against the map.
