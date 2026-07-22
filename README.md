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
| `E` or `Space` | press buttons, take crystals, cross from a stand to its vault |
| `1`–`6` | choose among the lamps you have found |
| `F` | fire the lamp you hold (hold it for the X-ray) |
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

**Standing still is not part of a route.** After five seconds the recording stops
advancing altogether, so an Anti-player never replays you doing nothing — and because
playback runs on its own clock while the recording is paused, every second you spend
still is a second it gains on you.

**It charts the building for you.** As one walks it draws the corridors it passes onto
your map in the same white line as everything else, and leaves a short blue trail behind
its dot that fades over nine seconds. Watching your past self walk is how you learn where
you have been.

**It carries a twin.** When it replays the moment you picked a crystal up, it picks up
the negative of that crystal — same shape, lit from inside rather than glowing out — and
carries it along your route. When it replays you setting it down, the real crystal goes
back to the vault it came from, wherever it had got to. So every crystal you bring home
is followed, minutes later, by the memory of you bringing it home, and you have until it
arrives to put that memory out. Killing the carrier destroys the twin and the crystal is
safe. It is the clearest reason the game gives you to hunt one down.

**Lit rooms are sanctuary.** Its beam cannot take you in a room whose lights are on, or
in the hub — which is precisely why its putting them out matters. If a beam does land on
you, you are held for 1.9 seconds to see the torch that found you, and then every
crystal goes home to its vault and so do you.

**The duel is decided by the lamp, not the angle.** You carry every lamp you have found;
an Anti-player carries the lamps you were carrying at the moment it is replaying. Since
it is always replaying an earlier you, its light is never stronger than yours — so the
moment you pick up your first crystal you outgun every version of yourself that came
before, and a head-on exchange is simply won. Equal lamps is the interesting case, and it
goes to whoever came on target first.

Its beam does not take you the instant it touches you; there is a beat of about four
tenths first. That beat has to exist, because the torch is carried and its aim trails a
third of a second behind your view — without it you could never win an exchange you
turned into. For the same reason the duel is timed from where you are *looking* rather
than from where the beam has got to: an Anti-player replays a fixed heading, so its light
is on target the instant it rounds a corner while yours is still swinging. Killing one
puts the clock back to 5:00, the only way to buy time.

**Killing one breaks the light apart.** It is the only moment in the game where white
light comes into colour without a crystal doing it: you put a white beam on it and it
shatters into fifty-six shards along the spectrum, red through violet, spinning and
falling and fading over a second and a quarter. They fan by colour — red leaves slowest
and violet fastest — so the burst separates into bands the way a prism does rather than
flying out as one lump. Additive and unlit, so shards pile into brightness where they
overlap. The pool is fixed and reused; nothing is allocated at the moment of the kill,
and the flash uses a pooled emitter like every other light in the building.

**There is no range on that kill.** Line of sight is the only limit: spot a halo three
rooms down a corridor with its back to you, line it up, and it goes out — verified at
10, 20, 45 and 75 metres, and blocked by a wall in between. This is deliberately the
player's advantage, and the one thing you can do that it can never do back.

Landing that shot used to be fiddly for three reasons, all of them fixed. The test used
your head's yaw, but the beam is carried in your hand and lags behind where you look, so
what you saw and what the test measured were different directions — it now aims from the
torch at the torch's own world target. It was flat, so pointing at one on a stair or
across an atrium threw the pitch away — it is a 3D cone now. And a miss was silent, with
no way to tell "not quite on it" from "on it, but it is facing you, which can never
work". Both states now draw a bracket round it: white while it is yours to take, red
while it is looking back at you. A short dwell finishes the kill, so a beam sweeping past
cannot clip one by luck.

It also produces the sharpest bit of geometry in the game for free. Doubling back along
your own route walks you straight into your past selves *face-on*, because they are
retracing the direction you were going — the one angle you cannot shoot from. To kill
one you have to leave your own line and take it from the side or behind.

Each is named as it arrives — F1, F2, F3 — and keeps the name until it goes out. The
name is over the torch in the world, beside the dot on the chart, and in the
announcements, so with several on the floor you can tell which is which. In the world
it is drawn with size attenuation off and lifted by the sprite's `center` rather than a
world offset: both so it stays legible at the range you can now kill from, and because
a world-space offset shrinks with distance until the label sits inside its own halo.

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

## The six lights

Each vault hands over its lamp in the order you open them, so the first vault always
yields the X-ray and the last always the Ultra Blast: the route you take decides which
colour carries which power, never which power comes when. You keep every one you find,
pick between them with `1`-`6`, and fire with `F`. The row of icons is drawn as white
vector line, like the rest of the instrument.

| | | |
|---|---|---|
| 1 | **X-ray** | Held, not fired. Cuts a hole through the wall or floor you are facing and you look through it. Drains while held. |
| 2 | **Holy Light** | Everything walking within 19m, gone, regardless of which way you face. |
| 3 | **Walk Through Walls** | The wall you shine on opens for 14 seconds, then closes again. The block is taken out of the instanced mesh and put back. |
| 4 | **Portal** | Shine at a wall, then click the chart. Restricted to ground you have actually charted, so it can never drop you inside a vault you have not opened. |
| 5 | **Cloak** | Thirty seconds where they cannot see you at all — you can still kill them. The last five seconds it visibly flickers, so you are told before it lapses. |
| 6 | **Ultra Blast** | Everything in a wide cone, through walls, through floors, to the end of the maze. Costs 90% of your light. |

They all run off the same battery as the plain beam, which is what ties them to the rest
of the game: a power is paid for in light, and light only comes back in a lit room — and
the Anti-players are busy putting those out.

**Portals remove the retrace.** Beside each crystal is a portal, lit from the start —
you can see it glowing through the grate before you have opened the gate. You do not
press it; you walk into it, and it puts you back in the hub. The outbound hunt across a
maze this size is the game; walking the same route back would only be the tax on it.

**The crystal seats itself.** Carry one into the hub and it leaves your hands on its
own, arcing up and spinning down onto its stand. And once a vault has been visited, its
stand in the hub is the way back out to it — occupied or empty, since the crystal itself
is the ticket. If the gate has since been shut behind you, the portal is still there to
get you home.

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
