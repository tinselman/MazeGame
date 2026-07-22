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
| `E` | press buttons, take crystals, cross from a stand to its vault |
| mouse button or `Space` | fire the gun you carry (hold for machine gun and laser) |
| `M` | sound on / off |

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
at the pallet racks" instead of counting turns.

**Uniform, but modelled.** A chair has tapered legs, a lipped seat, stretchers and four
slats; a banquet table has a moulded lip, an apron and legs turned on a lathe; racking
has diagonal bracing; a monitor has a bezel and a vent. Nineteen kinds, 1,352 pieces,
244k triangles — and one instanced draw call each, because the same chair stands
everywhere in the building. That is the trade taken deliberately: triangles are cheap
and draw calls are not, so heavy geometry repeated buys detail almost for free, where
distinct models per room would have bought variety at real cost. Three.js ships its
geometry merger as an addon and this file has none, so there is a small one here that
bakes each part's transform into the vertices and concatenates.

**Three kinds of balustrade**, chosen by what a run overlooks rather than where it is,
so the rail tells you what sort of space you are in before you have looked up: turned
spindles under a moulded handrail bordering restaurants and living rooms, stanchions and
horizontal tubes on galleries, museums and halls, tensioned wire on anything industrial.
334 / 572 / 520 across the building.

**Mouldings, not scaled boxes.** Skirting with a bead and a fillet, a cornice stepping
out through a cove, boxed soffits hanging below the ceiling with a shadow gap behind,
fluted pilasters down the halls, moulded reveals around every doorway — about 2,900
pieces. It is what your torch actually rakes across as you walk, because a flat wall
gives a moving beam nothing to find.

**Two banquet halls are lit by chandelier** rather than by strip light, which makes them
the only rooms in the building that were ever meant to be beautiful. Cut glass and
steel, no gilt — nothing here carries colour in its material, so their warmth is in
their light alone. 164 bicone drops per fitting in their own instanced mesh, so a torch
sweeping across one lights the drops in turn rather than all at once. No browser is
going to bounce that light for us; each fitting instead carries two additive caustic
sheets, ceiling and floor, turning slowly against each other and brightening with how
squarely your beam is on it. Those rooms skip the fluorescent strike model entirely —
their tubes stay dark.

**The X-ray is a hole, not a diagram.** It used to draw the next room as a line plan
floating over the wall, which read as a map rather than as sight. Now the second camera
is *your* camera — same position, same orientation, same lens — with its near plane
pushed just past the surface you are aiming at, so everything between you and that wall
is clipped away and what it renders is exactly what is on the other side. The aperture
samples that render by its own screen position rather than by a UV, which is what makes
the view through the hole line up with the world around it instead of sliding as you
move. Aim at a wall and it opens in the wall; look down and it opens in the floor.

**Brutalist, and minimal with it.** Brutalism does not decorate a pier, it makes it heavy
and lets the light do the rest: a blunt square shaft on plain pads with one recessed
shadow line down each face, which is all a moving torch needs to read the mass.
Pilasters are plain ribs standing off the wall with a shadow gap either side — no plate,
no rivets, no capital. Cornices are one deep band and the shadow under it. Living rooms
and restaurants are the exception and keep a domestic moulded profile, because those are
the rooms that were somebody's: 616 industrial to 156 domestic. The arches stay.

**Coffered ceilings** — downstand beams on a three-metre grid wherever there is a slab
overhead, about 4,300 of them. This is the cheapest brutalist move in the building and
the most effective: a flat ceiling gives a torch beam nothing at all, a coffer grid gives
it an edge every three metres and a pool of shadow between, and it makes the place read
as poured concrete rather than as an extruded plan without touching a single material.

**Rails go up the stairs**, which is the one place in the building you most want
something to hold and the one place that had nothing. 120 units, raked to the pitch of
their own flight rather than stepped, so a balustrade climbs with the treads.

They are built from the segment, not from an angle. The first attempt composed a yaw and
a rake as Euler angles and let the rotation order sort it out, which raked some flights
about the wrong axis and sent them up sideways. Each unit is now handed the two world
points its handrail has to span, and its matrix comes straight from that basis: X down
the segment, Y the part of world-up perpendicular to it, Z their cross product. A rail
cannot come out bent, because it is told where both of its ends go.

**Two dead hearths** in the living rooms — surround, lintel, mantel, chimney breast and a
cold grate, set against a real wall and facing in. Never a fire; nobody has been here to
light one.

**A DETAIL switch sits over the chart**, HIGH or LOW. Furniture survives both, because
the rooms are how you navigate and a warehouse with no racking is not a landmark;
ornament goes first. Hovering a lamp icon names it and says what it does and what it
costs. Both need the pointer free, so press escape first.

The monitors are the one thing in the building still making light on their own: every
fourth screen feeds the light pool, so a cubicle floor glows faintly green before you
have found its switch. It is the only room type you can locate in the dark.

**The terminals say something.** 640x480 with a 19px monospace face — a real character
cell — and every line is something a machine would plausibly have printed: hex dumps,
`TAPE-43 RETRY FAIL A27`, progress bars, `WAIT: OPERATOR RESPONSE`, and a cursor sitting
where the operator left it. Phosphor bloom, scanlines and a vignette so it reads as a
tube rather than a poster. Six variants, one instanced mesh each, because a floor of
seventy screens all saying exactly the same thing is the tell that gives the trick away.
Content is generated from a seeded hash rather than `Math.random`, so a given screen says
the same thing on every playthrough — the room is somewhere you can come to recognise.

They are drawn unlit. A screen that is both lit and emissive saturates to flat white the
moment you put a torch on it from a metre away, which is exactly the failure this was
meant to fix: a tube emits, it is not a surface you illuminate.

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

**A room's floor plan lasts exactly as long as its lights do.** Only what a walker charted
as it passed, and what a button revealed, is permanent — a room you lit is on the chart
while it is lit and off it when it goes out. That is the whole point of them putting the
lights out: the map is something you can lose. It used to be sticky for the opposite
reason, so that a walker could not erase ground you had walked; losing it is better,
because it gives the dark somewhere to spread.

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

**Something else is walking.** A clock hangs over the hub counting down from 1:00, and
the same countdown draws at the foot of the screen. When it runs out an Anti-player is
loosed from the hub, and another every minute after.

They wander. They are not smart — they are drawn to any gun left lying anywhere in the
building, they douse any lit switch they pass (and leave it off, because they prefer the
dark and the dark eats your map), and every one of them carries a knife. Some of them,
by the time you meet them, carry something you dropped — and you cannot tell which until
it fires. They cannot enter the crystal vaults: a shut gate stops them exactly as it
stops you. Lit rooms and the hub are sanctuary from knife and bullet alike.

Being caught — knifed up close, or shot by an armed one — sends every crystal home to
its vault and you back to the hub.

**Killing one breaks the light apart.** Fifty-six shards along the spectrum, red through
violet, spinning and fading. They fan by colour — red slowest, violet fastest — so the
burst separates into bands the way a prism does. Whatever it was carrying falls where it
stood, and killing one puts the clock back to 1:00.

## Guns

The torch stopped being a weapon. It lights the way, it charges in lit rooms, and it is
how you find the guns — a gun in a dark hall is a dark object, and nothing here glows
for your convenience.

You start with the pistol. The other four hang in the air at random hall cells — a fresh
scatter every game — turning slowly, and they show on the chart from the first moment as
small diamonds: you know where they are, you just do not know what is between you and
them, and the chart does not say which storey. Taking a better one drops the one you
carry where you stand, and the wanderers are drawn to anything left on the floor. What
they pick up, they use on you.

| | | |
|---|---|---|
| 1 | **Pistol** | Six shots. Leaves holes in the wall. |
| 2 | **Shotgun** | One shell, nine pellets, a wide cone. |
| 3 | **Machine gun** | Held trigger, a hundred rounds. |
| 4 | **Blaster** | Four shots. Blows a permanent hole in the wall you can walk through, and kills everything within six metres of the impact. |
| 5 | **Laser** | Held beam, ten seconds of charge. Kills everything in its path, straight through the walls. |

**Reloading happens at the hub and nowhere else.** Every magazine is a promise about how
far from home you can afford to be. The mouse button is the trigger; walking into a
higher-tier gun takes it.

The six crystal lamps are set aside while the guns are tried in their place — the code
remains, dormant, behind `__maze.grantAll()`.

## Sound

**There is a SOUND switch over the chart and `M` toggles it**, and the choice is
remembered between sessions. Muted, the bed is never built at all rather than built and
silenced, so starting muted costs nothing; unmuting builds it on the spot.

Everything is synthesised — no files, so nothing to load and nothing to go missing. The
signal path is the whole design: every voice splits into a dry line and a send into a
convolver whose impulse is a five-second exponentially decaying noise burst, tilted low.
That is what a large empty concrete building sounds like, and almost everything goes
through it heavily. The drum is a short low thud dry, and eight seconds of hall behind it.

**Four chords, thirty seconds each: A, D, G, A.** In A minor that is i - iv - VII - i,
and it closes on itself, so the loop runs two minutes and never arrives anywhere.

**On each chord, two voices walk away from each other** — the low one down, the high one
up, four moves across the chord's thirty seconds. The pitch changes cleanly; nothing
slides. Each move ducks the level almost to nothing over a twentieth of a second, changes
pitch down there so the jump is never heard as a click, then swells back over several
seconds — louder every time. A note arrives quiet and grows, and the tail is reverb and
echo rather than a long release. The pair is different on every one of the eight chords across two
loops, so nothing repeats for four minutes, and each move is louder than the last: a
chord gets wider and more intense the longer it is held, and resets when it turns.

Both voices walk the A minor scale rather than in semitones, which is why the scale is
listed as seven degrees and not eight. Listing the octave as well as the root gave it a
repeated note, and stepping down one degree from the root landed back on the root — the
pair stalled instead of opening.

Underneath: sparse struck metal, rare drips, and a heartbeat. **The drip is almost
entirely its pitch envelope** — a sine falling through most of an octave in forty
milliseconds — and then a very long tail of room, which is what makes it read as water in
a large empty place rather than as a blip. **The heartbeat is two notes and only ever two** — A and A sharp, a semitone apart,
alternating, into a feedback delay tuned to its own interval so each hit lands on the
echo of the last. It does not follow the chord, which is the point: a fixed semitone
grinding against a drone that keeps moving underneath it is consonant against some chords
and wrong against others, without the pulse itself ever changing. Percussive and quick —
the pitch is held, the strike is over in a quarter of a second, and everything after that
is the room. Each hit is doubled two octaves up so it reads as bass with a top on it
rather than as a thud. It comes in quietly, builds over ten to eighteen beats, and stops
— then nothing for most of a minute.

Tension still rides on how close the nearest Anti-player is, measured whether or not you
have seen it, with a floor between you counting as fourteen metres. It opens the drone's
filter, raises its level, and fades in a tritone above the root.

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
__maze.spawnAnti()    // loose one from the hub now
__maze.setClock(10)   // seconds until the next one
__maze.antiOff()      // clear the board and stop spawning
__maze.fireOnce()     // one shot from the gun you carry
__maze.gunState       // { tier, ammo, charge } — write to it freely
__maze.worldGuns      // the five guns, wherever they are now
__maze.grantAll()     // the dormant lamps, if you want the old experiment back
```

`step()` exists because `requestAnimationFrame` is throttled to zero in a preview pane,
so nothing animates unless it is driven by hand. `tick()` is only the rAF wrapper; the
work is in `frame(dt)`, which both paths call.

## Tuning

Constants near the top of the script: `WALK` / `RUN` / `WADE` speeds, `ACCEL` /
`DECEL`, `TURN_RATE` / `TURN_ACCEL` and `PITCH_RATE` / `PITCH_ACCEL` / `PITCH_MAX`
for the analog feel, `ANTI_PERIOD` for how long between wanderers, `ANTI_WALK` / `KNIFE_RANGE` /
`SHOOT_RANGE` / `SHOOT_AIM` for how dangerous they are, the `GUNS` table for
magazines and fire rates,
`TORCH_LAG` and `TORCH_SWAY` for how handheld the beam feels,
`TORCH_HOME` for where it is carried, `SLAB` for floor thickness and therefore how
heavy the fascia reads, `BAT_DRAIN` / `BAT_CHARGE`, `POOL_SIZE`, and the `FLUOR`
yellow. Window placements are the `WINDOW_RUNS` table; each entry is a run along a
row or a column and is validated at load against the map.
