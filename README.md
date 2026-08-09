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

**The concrete has been standing a long time.** The surface was flat noise, which at this
resolution reads as television static rather than as a material. It is 256px now and
carries four things over that base, all of them grey — nothing in this building has ever
held colour in its material and aging it is no reason to start. A slow tonal drift, so a
wall is lighter at one end than the other. Hairline cracks that branch and wander, drawn
dark and then traced a half-pixel off in white so each has a lip that catches the torch.
A scatter of pits and chips. And a wash of staining down from the top edge, heaviest on
the ceilings where damp goes first and lightest on the floors, which are walked on rather
than weathered.

Cracks are kept clear of the tile edges on purpose: the texture repeats every three
metres, and a crack that ran off one side and back on the other would let the eye find the
seam immediately. Two fine ones per tile is aging; the three heavy branching ones I drew
first read as scratches.

**Mouldings, not scaled boxes.** Skirting with a bead and a fillet, a cornice stepping
out through a cove, boxed soffits hanging below the ceiling with a shadow gap behind,
fluted pilasters down the halls, moulded reveals around every doorway — about 2,900
pieces. It is what your torch actually rakes across as you walk, because a flat wall
gives a moving beam nothing to find.

**Somebody decorated, and never took it down.** Eight rooms carry strings of fairy lights,
624 bulbs across three runs each. They are chosen a floor at a time after the furnish
sweep rather than first-come — room order is ground floor first, so a first-come cap put
every string on the one floor that already had plenty to look at — and they come up with
the room's switch.

Five other rooms are strung with Japanese lanterns instead: round paper globes and square
ones alternating along a sagging cord, two runs to a room. They follow the switch the same
way but burn steadily rather than twinkling — paper over a flame, with a slow breath in
it. Cream, vermilion and amber sit in the material, which makes the lanterns the third
sanctioned exception to the grey rule after the crystals and the bulbs. No room gets both
kinds, and warehouses get neither: the pallet racking stands taller than the cord hangs.

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

**Balconies you can stand out on.** Forty-eight small decks hang off the walkways that
ring the atriums upstairs, four feet out and six wide — barely two paces, which is the
point: you step out over three storeys of nothing with the building at your back. They
are the first ground in the game that is not a grid cell. Everything else stands on whole
three-metre squares, so a deck needs its own support, its own edges and its own rule
about who may use it. Only the player: an Anti-player asks the same ground question
through the same function and the decks are invisible to it, so the drop is a way out
that only you have.

Half are railed on three sides. On the other half the outer rail is missing — two stubs
where it broke off — and stepping through is a real fall to the atrium floor, which costs
nothing but the climb back, since nothing in this building has ever hurt you by landing.

**Alcoves.** Three small rooms on the second floor and five on the third, carved into the
corner of a block the plan left empty rather than filling it — a block interior is seven
cells across at its narrowest and would read as another room. An alcove is three by three
inside its own wall ring, tucked where two halls meet, with one door on each of them: two
doors, so it stays a through-route and the no-dead-ends rule holds. It is a corner you
can cut as much as a recess you can duck into.

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
it comes up a storey at a time from where you stand: the balcony ring over your head
strikes first and lights the floor you are on, then the one above it, then the pendants
under the roof.

**A switch lights its whole column.** Rooms are stacked — the same footprint carries a
room on each storey — and flipping one switch now lights every room above it as well as
its own, a storey at a time and later the higher it climbs, so the building comes up from
the floor you are on rather than one room at a time. Fourteen columns across the map. The
slabs between them are solid, so you meet the upper floors already lit when you climb
rather than seeing them through the ceiling — but the whole column appears on the chart
the moment you throw the switch.

**Chandelier rooms keep some hard light.** They were lit by the fittings alone, which left
them dim and strange; every third fluorescent strikes now as well, so the banquet halls
have working tubes under the sparkle.

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

**You can see where they are, but only just.** Every Anti-player draws as a tagged dot on
the chart, each dragging a trail barely a centimetre long — a second of motion, no more, so
you read the direction it is heading without being handed its whole route. And wherever one
walks it briefly lights the plan: the halls and rooms it crosses flicker onto the map and
fade over the next few seconds, so the structure keeps revealing itself along their paths
and going dark again behind them.

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

**Something else is walking.** A clock hangs over the hub counting down from 4:00, and
the same countdown draws at the foot of the screen. When it runs out an Anti-player is
loosed from the hub, and another every four minutes after. The first thing a new one does
is leave: it fixes on a point well out in the building and walks off into the halls rather
than milling by the centre.

They wander the whole building, all three floors, and every one of them carries a pistol
from the start. Every so often one settles on a storey to head for and climbs the nearest
stair toward it, so over a few minutes the crowd spreads up through the structure rather
than pooling on the ground. They head for a gun only when one is close by on their own
floor, and otherwise strike out for a far corner — and if you cross their sight, out of a
lit room, one holds you for the better part of a second and shoots. They are not as sharp
as you: they only see in a straight line and only chase what is in front of them. Their
flashlight is how they see, not how they kill — being caught in the beam does nothing; only
a bullet takes you. They douse any lit switch they pass (and leave it off, because they
prefer the dark and the dark eats your map). They cannot enter the crystal vaults: a shut
gate stops them exactly as it stops you. Lit rooms and the hub are sanctuary from the gun.

**Being shot costs you the gun and the walk back, not the game.** Work you finished stays
finished: anything already seated on a pedestal stays seated. Only the crystal in your
hands goes back to its vault, and the weapon ladder restarts from the bare pistol.

And it is not a cut to black. You get a beat on the floor to see what found you, then the
building takes you back itself — the walls streak past, the view closes to a tunnel, and
you are set down by the heap. The flight runs after movement and gravity for the frame and
overwrites both, so there is no collision to fight with, and the vignette is shut far
enough by then that a wall passing through you is never visible.

**The aim thickens near a walker.** The kill window is narrow at range — the shot tests a
0.9 m radius, a hair over two and a half degrees at twenty metres — while the arrow keys
turn at a fixed rate, so one tap used to step straight over somebody at the far end of a
hall. Inside a cone about three times the width of that window the keys now slow, hardest
at the middle: a tap that turns 17° in the open turns 8.6° near a target, and the
crosshair thickens so the drag reads as the controls doing it rather than the game
stuttering. It is friction, not aim-assist — nothing is ever pulled anywhere, and the
mouse is untouched, because it is already precise and easing it reads as lag. Each axis
is measured against its own tolerance, since the shot is 0.9 m across but 1.27 m up and
down, and only walkers you could actually hit count: same floor, clear line.

**Killing one breaks the light apart.** Fifty-six shards along the spectrum, red through
violet, spinning and fading. They fan by colour — red slowest, violet fastest — so the
burst separates into bands the way a prism does. Whatever it was carrying falls where it
stood, and killing one puts the clock back to 4:00.

## Guns

The torch stopped being a weapon. It lights the way, it charges in lit rooms, and it is
how you find the guns — **a gun in an unlit room is invisible**, not dimmed but absent,
until either you throw that room's switch or your own beam falls across it. That is the
rule the whole loop now turns on: lighting a room is how you arm yourself.

**One at a time.** You start with the pistol, and there is only ever a single gun lying
in the building: the next rung up from whatever you carry. Taking it drops yours where you
stand and puts the one after that somewhere new, so the ladder is walked rung by rung.
Scattering all four at once let you stumble on the laser in the first minute and skip the
whole climb.

Guns stand in rooms, never corridors — corridors have no fixtures and never will, so a
gun left in one could never be lit and could only be found by sweeping a torch down every
hall in the building. What you drop stays dropped, and the wanderers are drawn to it:
arming yourself is also how you arm them.

| | | |
|---|---|---|
| 1 | **Pistol** | Six rounds. Chips the wall — a divot and two chips of concrete per shot. |
| 2 | **Shotgun** | Eight shells, nine pellets each, a wide cone. |
| 3 | **Machine gun** | Held trigger, a hundred rounds. |
| 4 | **Blaster** | Four shots. Bursts a permanent hole you can walk through and kills everything within six metres. |
| 5 | **Laser** | A held beam, ten seconds of charge. Bores through the first wall it meets and stops there — it no longer kills what it cannot reach, it makes its own line of sight. |

**A detector for the nearest gun worth having.** It clicks, faster the closer you are,
the way a metal detector reads — so you can sweep a floor by ear rather than by staring at
the chart. A warmer/colder bar under the readout does the same for the sound off, filling
as you close on the next weapon up. Both go quiet past 34m and when nothing on the floor
beats what you carry.

**The chart says which gun and which floor.** Each gun is a ring with its tier inside —
2 is the shotgun, 5 the laser — bright on your storey and faint on another, with a caret
above it pointing the way to go. One better than what you carry pulses; one weaker sits
still. A vending machine is a small cabinet, filled while it is stocked and hollow while
it is not. The lower left names the next gun worth crossing the building for, with its
distance and its floor.

These were plain diamond outlines, which was wrong twice over: the six crystal slots
along the foot of the screen are diamonds too, so one shape meant two things, and an
outline said a gun was somewhere without saying which gun or which storey.

**Vending machines, not floating clips.** Twelve light-green cabinets stand against walls
across the three floors, and the strip inside each is still burning, so the sweets and the
cans on its three shelves are lit from within and the whole front glows pale orange. That
makes a machine the one thing in the building exempt from the rule that you cannot see
what your torch has not found — it is a lamp, so you spot it across a dark room and walk
to it, which is the point of them. Take a magazine and the strip goes dark for thirty
seconds while it restocks, the only tell that a machine is spent. The chart keeps any
machine you have laid eyes on, since it does not move and knowing where the nearest one
is is the whole of its value.

In the hub, somebody emptied every machine in the building into one pile on the floor
under the clock. The heap is the whole of the hub's supply: standing anywhere inside the
hub used to rearm you, which meant coming home was enough and walking to the middle was
not worth doing. It is a child of the hub floor, because the hub floor is a lift and a
scene-parented heap would be left on the ground when the platform climbs.

**Ceilings, floors and furniture all take fire.** The ray only tested walls, so shooting up
or down sent the round into the next storey and nothing marked it. Worse, the first
attempt to fix that fired at the storey boundary — 4.5m — when the ceiling you can
actually see is at 3.6m with the slab filling the gap between: the round passed visibly
through the ceiling and buried its hole nearly a metre inside the slab, with the debris
appearing to fall out of nothing. It uses the real planes now, the ceiling of the storey
you are in going up and its floor going down, from any floor, with any gun.

Furniture is a target too, tested analytically — the perpendicular distance from each
piece to the line, once per shot, rather than every piece at every step, which a machine
gun burst could not afford. One round puts a chair over.

Debris comes to rest on whatever walkable surface is actually beneath the impact, found
with the same ground probe the player falls onto, so a chip knocked off a ceiling lands on
the floor below it rather than hanging at the height it was born. A bullet in the ceiling brings
dust and fragments down, and shakes any light fitting within a couple of metres off its
housing — it falls, it breaks, and it does not come back on. Putting out a room you are
standing in is a genuinely bad idea and therefore worth allowing.

The blaster and the laser open a slab the way they open a wall: the floor above, the
ceiling below and the slab between all lose that cell, the rim is left ragged, and you can
drop through into the room beneath.

**A blast leaves a mess.** The wall block comes out, jagged fragments stay clinging to
whichever sides still have wall behind them and to the slab above, and two dozen lumps of
concrete burst out, fall, bounce and settle on the floor — where they stay for the rest
of the run. Furniture within a few metres goes over with them and stays over. Both pools
are instanced and fixed in size, so a blast costs no allocation and no extra draw call.

There used to be a translucent blue box the size of the whole cell marking every opening
— a leftover from the walk-through lamp, where it told you where the hole was. Through a
blaster it read as a glowing crate sitting in the wall. There is no marker at all now.

## Sound

**Sound is on when the game begins.** A SOUND switch over the chart and `M` toggle it for
the session, but a game always starts with sound — a muted previous session no longer
carries over. The starting click is also where the audio context is resumed, which
browsers hold suspended until a gesture.

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

`tools/level.json` is the plan and `tools/genmaze.js` builds it. The plan is a list of
**rooms**: rectangles placed on a floor, each with a type and, if you want them, its own
doorways. Corridor is not drawn at all — it is whatever is left over inside the building's
outline once the rooms are in it. That is the whole model, and it is what makes a room
something you can move on its own; under the old one, hall lines came first and rooms were
the gaps between them, so "make this room wider" could only mean "slide a wall the length
of the floor".

```
node tools/genmaze.js            # print the three levels and validate
node tools/genmaze.js --write    # splice them into index.html
```

### The construction kit

`tools/editor.html` is the plan on screen. Open it over a local server — `python3 -m
http.server` in the project root, then `/tools/editor.html`. It reads `tools/level.json`,
keeps a draft in local storage as you work, and exports a new `level.json` to save over
the old one.

Everything with a position is one kind of thing: rooms, corridors, stairwells, vending
machines, guns, gate buttons, parapet gaps. Click it to select it, drag it to move it,
press delete to remove it. There are no tools and no modes to switch between — what you
click is what you get, and the panel says in words what you have hold of ("up stairwell,
floor 1 — joins floor 0 and floor 1, four steps, running east–west").

Rooms carry eight handles. Drag one and the room resizes; drag the room itself and it
moves. Either way, whatever it runs into gives way, and whatever *that* runs into gives
way in turn. Two rooms may share a wall or stand two cells apart, and the drag steps
straight over the gaps of one and zero: a one-cell gap is a corridor slot walled on both
sides, which is a dead end, and at zero the generator's doorway probe lands on the
neighbour's wall and quietly declines to cut anything, sealing both rooms.

The whole cascade is re-solved every frame from a snapshot taken when the drag began,
never nudged along incrementally. Drag a room out across the floor and back, and you get
your layout returned to you rather than a quietly compacted version of it.

A room left alone gets the generator's own doorways — two opposite faces so it is a
through-route, a third for choice, and none at all on a face that opens onto void. Select
a room and those show bright against the pale squares of every other place one could go;
click a pale square to cut a doorway, a bright one to seal it. From the first click the
doors are yours and the automatic pattern stops applying. Offsets are measured from the
room's own corner, so doors travel with it — and because a push only ever translates a
rectangle, a shoved neighbour needs no repair at all.

The building's outline follows the rooms rather than fencing them in: drag a room outward
and the floorplate extends to meet it, and if the plan outgrows the board the board grows
too. The panel on the right re-checks the plan on every edit — overlaps, illegal gaps,
rooms too small to hold a doorway, dead ends — and clicking a complaint takes you to it.

Two things are drawn dashed and cannot be selected: the overpass bridges and the exterior
gallery walkways, which the generator cuts on its own. They are shown anyway, because a
plan that hides them is a plan you can run a room straight through without seeing what
you broke. The generator still has the final word — vault gating and stair footings are
its business, and it will refuse a plan this page was willing to draw.

### What is in a room

A room's type furnishes it, and the panel lists what that comes to — a museum's vitrines
and benches, a warehouse's racking, a restaurant's banquet tables. Dashed entries are what
the type gives you. Click the ✕ on one to take it out, or pick from the pulldown to add
something the type would never place: a chandelier in a warehouse, fairy lights in a room
that is not on the list, a sofa where there is no reason for one.

Nothing is written to the file unless you change it. Defaults live in the game, not in the
plan, so retyping a room re-furnishes it rather than leaving the last type's furniture
behind under a new name — and a plan nobody has touched this way builds byte-identically.

Two kinds of thing behave differently, and the panel says which is which. Most entries are
**props**, placed to a layout the type works out from the room's own shape; one you add is
set down clear of the middle instead, because only the type knows that plan. **Fittings** —
chandelier, fairy lights, paper lanterns, hearth — are not props but memberships: whether
this room is one of the ones lit that way. Fairy lights and lanterns are capped across the
building (eight and five), so a room that asks for them by name is seated before the draw
runs rather than left to lose a lottery, and an explicit request also steps around the
rules that would normally exclude it. Ask for lanterns in a warehouse and you get them,
racking or no racking.

A few things are removable but not addable, and say so: a gallery's hung panels need a
solid wall picked out behind each one, and a cubicle's screen glow is positioned against a
particular desk. Taking a vitrine out takes its glass; taking the racking out takes what is
stacked on it, though the loose crates on the floor stay where they are.

About half of what a room looks like is not type-driven at all — the strip lights and their
dead and flickering ones, the wall switch, skirting and cornice, coffered beams, the window
arcade. Those are listed under **it also gets**, as information rather than as choices,
because there is no per-room switch for them to hunt for.

### Build me

**build me** writes the plan straight over `tools/level.json` and puts the one command you
still have to run on your clipboard. The first click asks which file — navigate to
`tools/level.json` and pick it — and after that it is remembered, so it is a click and a
paste. If the browser has lapsed the permission it asks again; it never makes you find the
file twice.

The page cannot run the generator itself. It is a file in a browser with no way to reach a
terminal, and that is a boundary worth keeping — so the last step is yours:

```
node tools/genmaze.js --write
```

If you run it from somewhere other than the project folder, **change the command** stores
whatever you type instead, absolute path and all. Or say *build it* to Claude and it runs.

On a browser without the file-writing API, **build me** falls back to downloading the plan
and says so rather than pretending it saved.

### Keeping and reloading a plan

**export level.json** downloads the plan. **open a plan…** reads one back. The editor also
keeps a draft in the browser as you work, but that is one browser's memory — clear the site
data or move machine and it is gone, so the exported file is the copy that lasts. Opening
one is undoable, and a file that is not a plan is refused rather than half-loaded.

### The walkways

The overpass bridges and the exterior gallery are in the plan like everything else, and
behave like everything else: click to select, drag to move, delete to remove. They are
drawn dashed because they cross the floor rather than sit on it — the three overpasses
carry you over the atrium voids on floor one, and the gallery leaves the building
altogether with nothing at all beneath it.

The one part the generator keeps is how far their ramps and legs run inwards to reach the
building, because that depends on where the floorplate has ended up. Move the building and
they follow. The editor will not let you park one over a parapet gap, which is a hole you
are meant to be able to fall through.

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
