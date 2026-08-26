// Floor-plan generator + validator.  node tools/genmaze.js [--write]
//
// This is a BUILDING, not a maze. Halls run on a street grid, which is a loop
// network — so dead ends are structurally impossible rather than something to
// detect and patch afterwards. The blocks between the halls are rooms, each
// opened onto at least two different halls, so you can always continue through
// rather than turn around. The six crystal chambers are the deliberate
// exception: sealed, one door, which is what makes finding their button matter.
//
// Three storeys. Several blocks are cut clean through all three as atriums and
// ringed with balconies, so standing on the ground you read two floors of
// frontage above you.
//
// Legend
//   ' ' void (no geometry)   #  wall            .  hall floor
//   +   room floor           ~  water           /  stair run
//   H   hub floor            S  start           1-6 crystal
//   a-f door                 A-F door button    *  light switch   P portal
//
// --write splices maps, room metadata and drop points into index.html.

const fs = require('fs');
const path = require('path');

// The building is 66 cells square, but the grid is bigger than the building:
// a ring of empty cells all round lets walkways cantilever out past the outer
// wall on the upper floors with nothing beneath them. Everything the plan
// authors by hand in absolute coordinates is shifted by PAD immediately after
// it is declared, so the plan itself is still written in building coordinates.
/* The level is a FILE, not a constant. tools/level.json holds every decision a
   person makes about what this building is — where the halls run, which block
   is which kind of room, where the stairs and the galleries go — and this
   script is the machine that turns those decisions into a map. Run with
   --dump to write the file back out from the values below, which is how it was
   first made; the editor reads and rewrites the same file.

   If the file is missing, the built-in values below stand in, so the generator
   still runs from a bare checkout. */
const LEVEL = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'level.json'), 'utf8')); }
  catch (e) { return null; }
})();
// Two shapes of level file. The old one described the building as hall lines
// with rooms in the gaps; the new one describes it as ROOMS, and corridor is
// whatever is left over inside the envelope — which is the way a person
// actually thinks about a floor plan, and the way you can move one room
// without moving its neighbours.
const ROOMS_FIRST = !!(LEVEL && LEVEL.rooms);
const PAD = LEVEL ? LEVEL.pad : 6;
const SIZE = LEVEL ? LEVEL.size : 66 + 2 * PAD;
const NLEV = LEVEL ? LEVEL.levels : 3;
const B0 = PAD, B1 = SIZE - 1 - PAD;      // the building's own extent
const VOID = ' ', WALL = '#';
const DOORCH = 'abcdef';

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260719);

/* ================================================================ THE PLAN */

// Halls, as [start, width]. Spacing and width are both deliberately uneven —
// a regular grid reads as graph paper. Blocks therefore come out at a range of
// sizes, from cramped service rooms to long galleries.
const LINES = (LEVEL && LEVEL.lines) ? LEVEL.lines : [
  [1, 3], [11, 2], [21, 4], [41, 3], [50, 2], [62, 3],
].map(([s0, w]) => [s0 + PAD, w]);
// -> bands 7, 8, 16, 6, 10 cells wide. Nothing so small it cannot hold a room
// with two ways out, nothing so uniform that the plan reads as graph paper.
// Bands between the halls become blocks.
const BANDS = [];
for (let i = 0; i < LINES.length - 1; i++) {
  BANDS.push([LINES[i][0] + LINES[i][1], LINES[i + 1][0] - 1]);
}
// -> [4,11] [14,22] [26,39] [43,50] [53,61]
const MID = 2;                                   // the central band index

const HUB = (LEVEL && LEVEL.hub) ? { r1: LEVEL.hub.r1, c1: LEVEL.hub.c1, r2: LEVEL.hub.r2, c2: LEVEL.hub.c2 }
  : { r1: BANDS[MID][0], c1: BANDS[MID][0], r2: BANDS[MID][1], c2: BANDS[MID][1] };
const START = [HUB.r1 + 2, HUB.c1 + 2];

// Six ways out of the centre, all onto the ring halls that bound it.
const HUB_EXITS = (LEVEL && LEVEL.hubExits) ? LEVEL.hubExits : [
  { side: 'N', at: 29 }, { side: 'N', at: 36 },
  { side: 'S', at: 29 }, { side: 'S', at: 36 },
  { side: 'W', at: 32 }, { side: 'E', at: 32 },
].map((e) => ({ ...e, at: e.at + PAD }));

// Which halls exist on each level. Level 1 carries the whole grid, so its
// walkways ring every atrium; level 2 keeps only the inner loop, so the
// building thins as it rises.
const LEVEL_LINES = (LEVEL && LEVEL.levelLines) ? LEVEL.levelLines : [
  [0, 1, 2, 3, 4, 5],
  [0, 1, 2, 3, 4, 5],
  [1, 2, 3, 4],
];

// Blocks are addressed [bandRow][bandCol]. `t` is the room type, which drives
// the props; `atrium` cuts the block through every floor.
const B = (r, c) => ({ br: r, bc: c });
const PLAN = (LEVEL && LEVEL.plan) ? LEVEL.plan : [
  // ---- level 0: the ground floor, deliberately open
  { lev: 0, ...B(0, 0), t: 'warehouse' },
  { lev: 0, ...B(0, 1), t: 'atrium' },
  { lev: 0, ...B(0, 2), t: 'gallery' },
  { lev: 0, ...B(0, 3), t: 'cubicles' },
  { lev: 0, ...B(0, 4), t: 'warehouse' },
  { lev: 0, ...B(1, 0), t: 'restaurant' },
  { lev: 0, ...B(1, 1), t: 'chamber' },
  { lev: 0, ...B(1, 2), t: 'hall' },
  { lev: 0, ...B(1, 3), t: 'museum' },
  { lev: 0, ...B(1, 4), t: 'atrium' },
  { lev: 0, ...B(2, 0), t: 'cubicles' },
  { lev: 0, ...B(2, 1), t: 'gallery' },
  { lev: 0, ...B(2, 3), t: 'museum' },
  { lev: 0, ...B(2, 4), t: 'living' },
  { lev: 0, ...B(3, 0), t: 'atrium' },
  { lev: 0, ...B(3, 1), t: 'museum' },
  { lev: 0, ...B(3, 2), t: 'hall' },
  { lev: 0, ...B(3, 3), t: 'chamber' },
  { lev: 0, ...B(3, 4), t: 'restaurant' },
  { lev: 0, ...B(4, 0), t: 'cubicles' },
  { lev: 0, ...B(4, 1), t: 'warehouse' },
  { lev: 0, ...B(4, 2), t: 'atrium' },
  { lev: 0, ...B(4, 3), t: 'living' },
  { lev: 0, ...B(4, 4), t: 'gallery' },
  // ---- level 1
  { lev: 1, ...B(0, 0), t: 'cubicles' },
  { lev: 1, ...B(0, 2), t: 'museum' },
  { lev: 1, ...B(0, 4), t: 'living' },
  { lev: 1, ...B(1, 1), t: 'gallery' },
  { lev: 1, ...B(1, 3), t: 'chamber' },
  { lev: 1, ...B(2, 0), t: 'restaurant' },
  { lev: 1, ...B(2, 1), t: 'warehouse' },
  { lev: 1, ...B(2, 3), t: 'cubicles' },
  { lev: 1, ...B(2, 4), t: 'cubicles' },
  { lev: 1, ...B(3, 1), t: 'chamber' },
  { lev: 1, ...B(3, 3), t: 'warehouse' },
  { lev: 1, ...B(4, 0), t: 'gallery' },
  { lev: 1, ...B(4, 3), t: 'office' },
  { lev: 1, ...B(4, 4), t: 'museum' },
  // ---- level 2
  { lev: 2, ...B(1, 1), t: 'gallery' },
  { lev: 2, ...B(1, 3), t: 'living' },
  { lev: 2, ...B(2, 1), t: 'chamber' },
  { lev: 2, ...B(2, 3), t: 'chamber' },
  { lev: 2, ...B(3, 1), t: 'museum' },
  { lev: 2, ...B(3, 3), t: 'cubicles' },
];

// Stairs thread up and down all over, rather than sitting in dedicated shafts.
// Each is placed inside a hall so both ends land on the loop network.
const STAIRS = [
  { lo: 0, cells: [[22, 28], [22, 29], [22, 30], [22, 31]] },
  { lo: 0, cells: [[42, 37], [42, 36], [42, 35], [42, 34]] },
  { lo: 0, cells: [[11, 15], [11, 16], [11, 17], [11, 18]] },
  { lo: 0, cells: [[28, 22], [29, 22], [30, 22], [31, 22]] },
  { lo: 0, cells: [[37, 42], [36, 42], [35, 42], [34, 42]] },
  { lo: 0, cells: [[30, 51], [31, 51], [32, 51], [33, 51]] },
  { lo: 1, cells: [[22, 45], [22, 46], [22, 47], [22, 48]] },
  { lo: 1, cells: [[42, 18], [42, 17], [42, 16], [42, 15]] },
  { lo: 1, cells: [[45, 22], [46, 22], [47, 22], [48, 22]] },
  { lo: 1, cells: [[18, 42], [17, 42], [16, 42], [15, 42]] },
].map((st) => ({ ...st, cells: st.cells.map(([r, c]) => [r + PAD, c + PAD]) }));
if (LEVEL && LEVEL.stairs) { STAIRS.length = 0; for (const st of LEVEL.stairs) STAIRS.push({ lo: st.lo, cells: st.cells.map((c) => c.slice()) }); }
// Kept separate because OVERPASSES and the exterior galleries both append their
// own flights to STAIRS below, and the level file wants only what was authored.
const AUTHORED_STAIRS = STAIRS.map((s2) => ({ lo: s2.lo, cells: s2.cells.map((c) => c.slice()) }));

/* Over-and-back bridges. Each climbs off an atrium floor, crosses above that
   same floor on a narrow span, and descends again on the far side — so the
   route you are walking passes over the route you were just on. Built from two
   ordinary stair runs plus a level-1 walkway between them, which means the
   game's existing stair handling picks them up with no special case.
   `a` and `b` are the outer ends; the middle becomes the span.             */
const OVERPASSES = [
  { lo: 0, axis: 'c', at: 56, a: 26, b: 39, rise: 4 },   // over the south atrium
  { lo: 0, axis: 'c', at: 7,  a: 13, b: 20, rise: 3 },   // over the north-west atrium
  { lo: 0, axis: 'r', at: 56, a: 13, b: 20, rise: 3 },   // over the east atrium
].map((o) => ({ ...o, at: o.at + PAD, a: o.a + PAD, b: o.b + PAD }));
if (LEVEL && LEVEL.overpasses) { OVERPASSES.length = 0; for (const o of LEVEL.overpasses) OVERPASSES.push({ ...o }); }
for (const o of OVERPASSES) {
  const cell = (i) => (o.axis === 'c' ? [o.at, i] : [i, o.at]);
  const up = [], down = [];
  for (let k = 0; k < o.rise; k++) up.push(cell(o.a + k));
  for (let k = 0; k < o.rise; k++) down.push(cell(o.b - k));
  STAIRS.push({ lo: o.lo, cells: up }, { lo: o.lo, cells: down });
  o.span = [];
  for (let i = o.a + o.rise; i <= o.b - o.rise; i++) o.span.push(cell(i));
}

// Two balconies with a gap in the parapet: step off and you drop to the floor
// below. `at` is the balcony cell; `into` is the void you fall through.
const DROPS = [
  { lev: 1, at: [11, 16], into: [10, 16] },
  { lev: 1, at: [51, 32], into: [52, 32] },
].map((d) => ({ ...d, at: [d.at[0] + PAD, d.at[1] + PAD], into: [d.into[0] + PAD, d.into[1] + PAD] }));
if (LEVEL && LEVEL.drops) { DROPS.length = 0; for (const d of LEVEL.drops) DROPS.push({ ...d }); }

/* ---------------------------------------------------------- pre-flight
   Two rules about the third dimension, both of which are silent disasters if
   broken: an atrium cuts every floor above it, so nothing may be planned there;
   and a room upstairs must have something under it or it floats in mid-air,
   which is exactly what "looking up must make sense" rules out.             */
{
  const key = (p) => `${p.br},${p.bc}`;
  const atriums = new Set(PLAN.filter((p) => p.t === 'atrium').map(key));
  const occupied = [0, 1, 2].map((l) => new Set(PLAN.filter((p) => p.lev === l).map(key)));
  const bad = [];
  for (const p of PLAN) {
    if (p.lev > 0 && atriums.has(key(p))) {
      bad.push(`${p.t} at L${p.lev} block ${key(p)} sits where an atrium cuts through`);
    }
    // a hall always runs between blocks, so support means: a room below, or the
    // level below carries the full hall grid around it
    if (p.lev > 0 && !occupied[p.lev - 1].has(key(p)) && p.t !== 'atrium') {
      bad.push(`${p.t} at L${p.lev} block ${key(p)} has nothing beneath it`);
    }
  }
  const seen = new Set();
  for (const p of PLAN) {
    const k = `${p.lev}|${key(p)}`;
    if (seen.has(k)) bad.push(`block ${key(p)} is planned twice on L${p.lev}`);
    seen.add(k);
  }
  if (bad.length) {
    console.log('PLAN PRE-FLIGHT FAILED:');
    for (const m of bad) console.log('  - ' + m);
    process.exit(1);
  }
}

/* ================================================================ CARVING */
const G = [];
for (let l = 0; l < NLEV; l++) {
  G.push(Array.from({ length: SIZE }, () => Array(SIZE).fill(l === 0 ? WALL : VOID)));
}
const inb = (r, c) => r >= 0 && c >= 0 && r < SIZE && c < SIZE;
const blockRect = (br, bc) => ({ r1: BANDS[br][0], c1: BANDS[bc][0], r2: BANDS[br][1], c2: BANDS[bc][1] });

function rect(l, r1, c1, r2, c2, ch) {
  for (let r = Math.max(0, r1); r <= Math.min(SIZE - 1, r2); r++)
    for (let c = Math.max(0, c1); c <= Math.min(SIZE - 1, c2); c++) G[l][r][c] = ch;
}

// halls — only in the band shape. Rooms-first fills its envelope with corridor
// and lets the rooms displace it, so there is no hall grid to lay down.
if (!ROOMS_FIRST) for (let l = 0; l < NLEV; l++) {
  for (const li of LEVEL_LINES[l]) {
    const [s, w] = LINES[li];
    rect(l, s, B0, s + w - 1, B1, '.');           // horizontal
    rect(l, B0, s, B1, s + w - 1, '.');           // vertical
  }
  // trim to the interior so the outer wall survives
  rect(l, B0, B0, B0, B1, l === 0 ? WALL : VOID);
  rect(l, B1, B0, B1, B1, l === 0 ? WALL : VOID);
  rect(l, B0, B0, B1, B0, l === 0 ? WALL : VOID);
  rect(l, B0, B1, B1, B1, l === 0 ? WALL : VOID);
  // and everything beyond the building is genuinely outside: nothing at all
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (r < B0 || r > B1 || c < B0 || c > B1) G[l][r][c] = VOID;
  }
}
// rooms-first draws its own outer wall around each envelope
if (ROOMS_FIRST) for (let l = 0; l < NLEV; l++) {
  const e = LEVEL.envelope[l];
  if (!e) continue;
  rect(l, e.r1 - 1, e.c1 - 1, e.r1 - 1, e.c2 + 1, l === 0 ? WALL : VOID);
  rect(l, e.r2 + 1, e.c1 - 1, e.r2 + 1, e.c2 + 1, l === 0 ? WALL : VOID);
  rect(l, e.r1 - 1, e.c1 - 1, e.r2 + 1, e.c1 - 1, l === 0 ? WALL : VOID);
  rect(l, e.r1 - 1, e.c2 + 1, e.r2 + 1, e.c2 + 1, l === 0 ? WALL : VOID);
}

/* ---- rooms first --------------------------------------------------------
   Fill the envelope with corridor, then put the rooms into it. What is left
   over between them IS the hallway — there is no separate hall grid to keep in
   step, which is why a room can be moved or resized on its own without
   dragging its neighbours along with it. */
const rooms = [], chamberSlots = [], atriumBlocks = [];
if (ROOMS_FIRST) {
  for (let l = 0; l < NLEV; l++) {
    const e = LEVEL.envelope[l];
    if (e) rect(l, e.r1, e.c1, e.r2, e.c2, '.');
  }
  // Corridor you placed yourself, on top of the corridor that is simply left
  // over. Carved before the rooms, so a room dropped on one displaces it — the
  // rooms are always the thing that wins.
  for (const cd of (LEVEL.corridors || [])) {
    rect(cd.lev, cd.r1, cd.c1, cd.r2, cd.c2, '.');
  }
  for (const rm of LEVEL.rooms) {
    const R = { r1: rm.r1, c1: rm.c1, r2: rm.r2, c2: rm.c2 };
    /* What the construction kit was told this particular room should and
       should not contain. Resolved here, against the room's own id, so nothing
       downstream has to carry the id or know the kit exists. A room nobody
       touched has none, and the splice comes out byte-identical. */
    const ov = (LEVEL.roomItems || {})[rm.id];
    const items = ov && ((ov.add || []).length || (ov.remove || []).length)
      ? { ...(ov.add && ov.add.length ? { add: ov.add } : {}),
          ...(ov.remove && ov.remove.length ? { remove: ov.remove } : {}) }
      : null;
    if (rm.t === 'atrium') { atriumBlocks.push({ ...R, lev: rm.lev }); continue; }
    if (rm.t === 'chamber') { chamberSlots.push({ ...R, lev: rm.lev, gate: rm.gate }); continue; }
    // a hole in the floor: no room, and no corridor either
    if (rm.t === 'void') { rect(rm.lev, R.r1, R.c1, R.r2, R.c2, VOID); continue; }
    if (rm.enclosed === false) {
      rect(rm.lev, R.r1, R.c1, R.r2, R.c2, rm.t === 'water' ? '~' : '+');
      rooms.push({ lev: rm.lev, r1: R.r1, c1: R.c1, r2: R.r2, c2: R.c2, type: rm.t, open: true, ...(items ? { items } : {}), ...(rm.doors ? { doors: rm.doors } : {}) });
    } else {
      rect(rm.lev, R.r1, R.c1, R.r2, R.c2, WALL);
      rect(rm.lev, R.r1 + 1, R.c1 + 1, R.r2 - 1, R.c2 - 1, rm.t === 'water' ? '~' : '+');
      rooms.push({ lev: rm.lev, r1: R.r1 + 1, c1: R.c1 + 1, r2: R.r2 - 1, c2: R.c2 - 1, type: rm.t, ...(items ? { items } : {}), ...(rm.doors ? { doors: rm.doors } : {}) });
    }
  }
}
if (!ROOMS_FIRST)
for (const p of PLAN) {
  const R = blockRect(p.br, p.bc);
  if (p.t === 'atrium') { atriumBlocks.push({ ...R, lev: p.lev }); continue; }
  if (p.t === 'chamber') { chamberSlots.push({ ...R, lev: p.lev, br: p.br, bc: p.bc }); continue; }
  /* Enclosed or open. An enclosed room is the normal case: a wall ring with
     doorways punched through it, so the room is a place you go INTO. An open
     one has no ring at all — its floor runs straight out to the halls that
     bound it, so it reads as a bay off the corridor rather than a room, and it
     needs no doorways because every edge is one. */
  const open = p.enclosed === false;
  if (open) {
    rect(p.lev, R.r1, R.c1, R.r2, R.c2, p.t === 'water' ? '~' : '+');
    rooms.push({ lev: p.lev, r1: R.r1, c1: R.c1, r2: R.r2, c2: R.c2, type: p.t, open: true });
  } else {
    rect(p.lev, R.r1, R.c1, R.r2, R.c2, WALL);
    rect(p.lev, R.r1 + 1, R.c1 + 1, R.r2 - 1, R.c2 - 1, p.t === 'water' ? '~' : '+');
    rooms.push({ lev: p.lev, r1: R.r1 + 1, c1: R.c1 + 1, r2: R.r2 - 1, c2: R.c2 - 1, type: p.t });
  }
}

// Atriums: floor on the ground, cut through above. The surrounding halls become
// the balconies that ring them.
for (const a of atriumBlocks) {
  rect(0, a.r1, a.c1, a.r2, a.c2, '.');
  for (let l = 1; l < NLEV; l++) rect(l, a.r1, a.c1, a.r2, a.c2, VOID);
}
// The hub is the grand one: full height, balconies on both upper floors. Walled
// like any other block, so its six doorways are the only ways in.
rect(0, HUB.r1, HUB.c1, HUB.r2, HUB.c2, WALL);
rect(0, HUB.r1 + 1, HUB.c1 + 1, HUB.r2 - 1, HUB.c2 - 1, 'H');
for (let l = 1; l < NLEV; l++) rect(l, HUB.r1, HUB.c1, HUB.r2, HUB.c2, VOID);

/* ---- doorways ---------------------------------------------------------
   Every room is opened onto at least two different halls. That, plus the fact
   that the halls form a loop grid, is what makes dead ends impossible.      */
/* A doorway only makes sense where there is something on the other side of it.
   With rooms placed freely rather than tiled into a hall grid, a room can have
   a face onto open air — an alcove hanging off the edge of a thinned upper
   floor, say — and punching there just opens onto nothing and strands the
   cells behind it. So each side is checked before it is cut, and a room that
   ends up with no way in at all is caught by the dead-end rule rather than
   being silently sealed. */
function canPunch(lev, room, side) {
  const beyond = side === 'N' ? [room.r1 - 2, null] : side === 'S' ? [room.r2 + 2, null]
               : side === 'W' ? [null, room.c1 - 2] : [null, room.c2 + 2];
  const mid = (a, b) => Math.floor((a + b) / 2);
  const r = beyond[0] === null ? mid(room.r1, room.r2) : beyond[0];
  const c = beyond[1] === null ? mid(room.c1, room.c2) : beyond[1];
  if (!inb(r, c)) return false;
  const ch = G[lev][r][c];
  return ch !== VOID && ch !== WALL;
}
function punch(lev, room, side, at, force) {
  if (!force && !canPunch(lev, room, side)) return;
  if (side === 'N') rect(lev, room.r1 - 1, at, room.r1 - 1, at + 1, '.');
  if (side === 'S') rect(lev, room.r2 + 1, at, room.r2 + 1, at + 1, '.');
  if (side === 'W') rect(lev, at, room.c1 - 1, at + 1, room.c1 - 1, '.');
  if (side === 'E') rect(lev, at, room.c2 + 1, at + 1, room.c2 + 1, '.');
}
for (const rm of rooms) {
  const midR = Math.floor((rm.r1 + rm.r2) / 2), midC = Math.floor((rm.c1 + rm.c2) / 2);
  if (rm.open) continue;                   // no ring to punch through
  /* A room with doors of its own gets exactly those and nothing else. `at` is
     an offset along the wall measured from the room's own top-left, so the
     door travels when the room is moved, and a push — which only ever
     translates a rectangle — needs no repair at all. */
  if (rm.doors && rm.doors.length) {
    for (const d of rm.doors) {
      const at = d.side === 'N' || d.side === 'S' ? rm.c1 + d.at : rm.r1 + d.at;
      punch(rm.lev, rm, d.side, at, true);
    }
    continue;
  }
  // two opposite sides always, so the room is a through-route
  const horizontal = (rm.c2 - rm.c1) >= (rm.r2 - rm.r1);
  if (horizontal) { punch(rm.lev, rm, 'W', midR); punch(rm.lev, rm, 'E', midR); }
  else { punch(rm.lev, rm, 'N', midC); punch(rm.lev, rm, 'S', midC); }
  // and a third on a perpendicular side, for choice
  if (horizontal) punch(rm.lev, rm, 'N', midC); else punch(rm.lev, rm, 'W', midR);
}
// hub doorways, cut through its own wall ring
for (const e of HUB_EXITS) {
  if (e.side === 'N') rect(0, HUB.r1, e.at, HUB.r1, e.at + 1, '.');
  if (e.side === 'S') rect(0, HUB.r2, e.at, HUB.r2, e.at + 1, '.');
  if (e.side === 'W') rect(0, e.at, HUB.c1, e.at + 1, HUB.c1, '.');
  if (e.side === 'E') rect(0, e.at, HUB.c2, e.at + 1, HUB.c2, '.');
}

/* ---- crystal chambers -------------------------------------------------- */
const CHAMBERS = [];
/* WHERE A VAULT'S GATE IS, AND WHAT THAT MOVES.
   The gate used to be cut in the middle of the north wall and nowhere else,
   with the crystal in the centre and the portal beside it. Now the gate is a
   thing you place, on any of the four walls — and everything inside turns to
   face it: the crystal sits on the gate's own axis so you see it the moment
   you step through, and the portal home goes on the far wall directly behind
   it. Exactly one gate to a vault; placing a new one is what removes the old.
   `at` is an index along that wall's INTERIOR, clamped, so a vault survives
   being resized under a gate that was placed when it was a different size. */
const gateOf = (slot) => {
  const ir1 = slot.r1 + 1, ic1 = slot.c1 + 1, ir2 = slot.r2 - 1, ic2 = slot.c2 - 1;
  const g = slot.gate;
  const side = (g && 'NSWE'.includes(g.side)) ? g.side : 'N';
  const span = (side === 'N' || side === 'S') ? ic2 - ic1 + 1 : ir2 - ir1 + 1;
  const mid = Math.floor((span - 1) / 2);
  const at = Math.max(0, Math.min(span - 1, g && Number.isFinite(g.at) ? g.at : mid));
  if (side === 'N') return { side, at, cell: [slot.r1, ic1 + at], din: [1, 0] };
  if (side === 'S') return { side, at, cell: [slot.r2, ic1 + at], din: [-1, 0] };
  if (side === 'W') return { side, at, cell: [ir1 + at, slot.c1], din: [0, 1] };
  return { side, at, cell: [ir1 + at, slot.c2], din: [0, -1] };
};

chamberSlots.forEach((slot, i) => {
  // The interior is the block inset by one, never a fixed size: blocks vary
  // from six cells to sixteen, and a hardcoded 5x5 vault punches straight
  // through the wall ring of a small one, leaving the crystal unsealed.
  const ir1 = slot.r1 + 1, ic1 = slot.c1 + 1, ir2 = slot.r2 - 1, ic2 = slot.c2 - 1;
  rect(slot.lev, slot.r1, slot.c1, slot.r2, slot.c2, WALL);
  rect(slot.lev, ir1, ic1, ir2, ic2, '.');

  const gt = gateOf(slot);
  const door = gt.cell;
  const [dr, dc] = gt.din;
  /* On the gate's own axis, half way in. The old centre-of-the-room rule put
     the crystal off to one side of anything but a north gate. */
  const cr = dr ? Math.floor((ir1 + ir2) / 2) : gt.cell[0];
  const cc = dc ? Math.floor((ic1 + ic2) / 2) : gt.cell[1];
  G[slot.lev][gt.cell[0]][gt.cell[1]] = DOORCH[i];
  G[slot.lev][cr][cc] = String(i + 1);
  /* The portal, beside the crystal — but INSIDE the vault, always. This used
     to step two cells out and only bounds-check some of the ways it could go:
     with a three-cell interior the fallback landed on the wall ring, and since
     the door sits on that same ring the portal overwrote it and left the vault
     standing open. A sealed vault is the whole reason its button matters, so
     the search now stays in the interior by construction and takes the
     furthest free cell from the crystal, whatever the shape of the room. */
  const inside = (r, c) => r >= ir1 && r <= ir2 && c >= ic1 && c <= ic2 && !(r === cr && c === cc);
  let pr = -1, pc = -1;
  /* The way home goes against the wall FACING the gate, straight behind the
     crystal — so stepping through you see the crystal, and the way out beyond
     it, in one look. */
  {
    const fr = dr > 0 ? ir2 : dr < 0 ? ir1 : cr;
    const fc = dc > 0 ? ic2 : dc < 0 ? ic1 : cc;
    if (inside(fr, fc)) { pr = fr; pc = fc; }
  }
  // ...and failing that, two cells to a side, the way it has always been placed
  if (pr < 0) for (const [or_, oc] of [[0, 2], [0, -2], [2, 0], [-2, 0]]) {
    if (inside(cr + or_, cc + oc)) { pr = cr + or_; pc = cc + oc; break; }
  }
  // ...and if the vault is too small for that, the nearest cell that is inside
  if (pr < 0) {
    let best = 1e9;
    for (let r = ir1; r <= ir2; r++) for (let c = ic1; c <= ic2; c++) {
      if (!inside(r, c)) continue;
      const d = Math.abs(r - cr) + Math.abs(c - cc);
      if (d < best) { best = d; pr = r; pc = c; }
    }
  }
  if (pr >= 0) G[slot.lev][pr][pc] = 'P';
  // the rect travels with it so the sealed-vault check has a wall ring to walk
  CHAMBERS.push({ id: i + 1, lev: slot.lev, cr, cc, door, gate: gt.side,
                  r1: slot.r1, c1: slot.c1, r2: slot.r2, c2: slot.c2 });
});

/* ---- alcoves ------------------------------------------------------------
   Small rooms budded off the halls upstairs, carved into the corner of a block
   the plan left empty rather than filling the whole block — a block interior is
   eight cells across at its narrowest and would read as another room. An alcove
   is three by three inside a wall ring, tucked into the corner where two halls
   meet, with one door on each of them. Two doors, so it stays a through-route
   and the no-dead-ends rule holds: an alcove is a corner you can cut as well as
   a recess you can duck into. The rest of its block stays void.

   Every one sits on a block that is empty on its own level, is not under an
   atrium, and has a room beneath it — the same three conditions the pre-flight
   enforces for whole rooms.                                                  */
const ALCOVES = (LEVEL && LEVEL.alcoves) ? LEVEL.alcoves : [
  // second floor
  { lev: 1, br: 0, bc: 3, v: 'S', h: 'W' },
  { lev: 1, br: 1, bc: 0, v: 'N', h: 'E' },
  { lev: 1, br: 3, bc: 4, v: 'S', h: 'W' },
  // third floor, where the building has thinned out and there is more room for them
  { lev: 2, br: 0, bc: 0, v: 'S', h: 'E' },
  { lev: 2, br: 0, bc: 4, v: 'S', h: 'W' },
  { lev: 2, br: 2, bc: 4, v: 'N', h: 'W' },
  { lev: 2, br: 4, bc: 0, v: 'N', h: 'E' },
  { lev: 2, br: 4, bc: 3, v: 'N', h: 'W' },
];
const ALC_IN = (LEVEL && LEVEL.alcoveInterior) ? LEVEL.alcoveInterior : 3;                        // interior is ALC_IN x ALC_IN
for (const a of (ROOMS_FIRST ? [] : ALCOVES)) {
  const R = blockRect(a.br, a.bc);
  const span = ALC_IN + 1;               // wall ring is the interior plus one each side
  const wr1 = a.v === 'N' ? R.r1 : R.r2 - span;
  const wr2 = wr1 + span;
  const wc1 = a.h === 'W' ? R.c1 : R.c2 - span;
  const wc2 = wc1 + span;
  rect(a.lev, wr1, wc1, wr2, wc2, WALL);
  rect(a.lev, wr1 + 1, wc1 + 1, wr2 - 1, wc2 - 1, '+');
  const room = { lev: a.lev, r1: wr1 + 1, c1: wc1 + 1, r2: wr2 - 1, c2: wc2 - 1, type: 'alcove' };
  // one door onto each of the two halls its corner touches
  punch(a.lev, room, a.v, wc1 + 1);
  punch(a.lev, room, a.h, wr1 + 1);
  rooms.push(room);
}

/* ---- stairs, and the spans that turn pairs of them into bridges --------- */
for (const o of OVERPASSES) {
  for (const [r, c] of o.span) G[o.lo + 1][r][c] = '.';
}
for (const s of STAIRS) {
  for (const [r, c] of s.cells) { G[s.lo][r][c] = '/'; G[s.lo + 1][r][c] = '/'; }
}

/* ---- the exterior galleries ---------------------------------------------
   Two walkways that leave the building altogether. They run in the empty ring
   outside the outer wall, on the upper floors, with nothing at all beneath
   them — you are outside the structure, looking back at its face.

   Neither is a spur. The level-one gallery leaves the north hall, runs along
   the outside and comes back in further along, so it is an alternative to
   walking the hall it parallels. From the middle of it a flight climbs to a
   second gallery above, and that one crosses back over the north hall on a
   bridge and lands on the level-two loop — so the way out and the way up are
   the same walk, and it rejoins the building somewhere else entirely.

   Carved as plain hall cells rather than PLAN blocks, which is what keeps
   them out of the support pre-flight: a cantilever has nothing beneath it by
   definition, and the pre-flight only ever sees blocks.                      */
const GALLERIES = (LEVEL && LEVEL.galleries) ? LEVEL.galleries : { row: B0 - 3, west: B0 + 18, east: B0 + 46, stairCol: B0 + 30 };
const GALLERY_ROW = GALLERIES.row;          // three cells clear of the wall
// The galleries live on floors one and two, so a level with fewer than three
// floors has nowhere to put them. Without this a small hand-made level dies
// writing into a storey that does not exist.
if (NLEV >= 3 && (!LEVEL || LEVEL.galleries)) {
  /* Where a walkway comes back in. This used to be read off the band model's
     hall lines — LINES[0] and LINES[1] — which a rooms-first plan does not
     have, so the numbers came from the fallback constants and were right only
     because those constants happened to line up with the building as it stands.
     Move a room far enough to shift the floorplate and the walkway would stop
     short in mid-air, an island the validator would then report as orphaned
     rather than as the thing that actually broke.

     So it is found instead of assumed: run in from the walkway until you are
     standing on something that is already part of the building. */
  const solid = (chr) => chr !== WALL && chr !== VOID;
  const landIn = (lev, col) => {
    for (let r = GALLERY_ROW + 1; r < SIZE - 1; r++) if (solid(G[lev][r][col])) return r;
    return GALLERY_ROW + 1;                 // nothing to land on; caught downstream
  };
  const WEST = GALLERIES.west, EAST = GALLERIES.east;

  // level 1: out, along, and back in
  rect(1, GALLERY_ROW, WEST, GALLERY_ROW, EAST, '.');
  rect(1, GALLERY_ROW, WEST, landIn(1, WEST), WEST, '.');
  rect(1, GALLERY_ROW, EAST, landIn(1, EAST), EAST, '.');

  // Level two: a short run from the head of the stair to the bridge. Both ends
  // have to go somewhere — the west end onto the flight (a stair cell counts as
  // an exit, because it continues vertically), the east end onto the bridge.
  const sc = GALLERIES.stairCol;            // the flight, cols sc..sc+3
  const W2 = sc + 4, E2 = W2 + 4;
  rect(2, GALLERY_ROW, W2, GALLERY_ROW, E2, '.');
  // the bridge back in, onto the level-two loop
  rect(2, GALLERY_ROW, E2, landIn(2, E2), E2, '.');

  // The stair pass has already run by this point, so the flight is cut here by
  // hand; it still joins STAIRS so the validator checks its footings.
  for (let k = 0; k < 4; k++) { G[1][GALLERY_ROW][sc + k] = '/'; G[2][GALLERY_ROW][sc + k] = '/'; }
  STAIRS.push({ lo: 1, cells: [[GALLERY_ROW, sc], [GALLERY_ROW, sc + 1],
                               [GALLERY_ROW, sc + 2], [GALLERY_ROW, sc + 3]] });
}

/* ---- markers ----------------------------------------------------------- */
// one switch per room, tucked inside a corner
for (const rm of rooms) {
  const r = rm.r1, c = rm.c1;
  G[rm.lev][r][c] = '*';
  rm.sw = [r, c];
}
G[0][START[0]][START[1]] = 'S';

// Buttons: nearest hall cell to a preferred spot, one per door, spread wide.
const WALKABLE = (chr) => chr !== WALL && chr !== VOID;
const BUTTON_PREFS = [
  { lev: 1, at: [12, 12] }, { lev: 0, at: [52, 52] }, { lev: 2, at: [23, 40] },
  { lev: 0, at: [12, 52] }, { lev: 1, at: [52, 23] }, { lev: 0, at: [23, 12] },
].map((b) => ({ ...b, at: [b.at[0] + PAD, b.at[1] + PAD] }));
if (LEVEL && LEVEL.buttonPrefs) { BUTTON_PREFS.length = 0; for (const b of LEVEL.buttonPrefs) BUTTON_PREFS.push({ ...b }); }

/* ---------------------------------------------------------------- --dump
   Everything above this line is the level: the decisions a person makes about
   what the building is. Everything below is the machine that turns those
   decisions into a map. `--dump` writes the first half out as JSON so an
   editor can read and rewrite it, and `loadLevel` below reads it back.

   Coordinates here are FINAL grid coordinates, padding already applied, so a
   plan editor and the generated map agree cell for cell with no arithmetic in
   between. */
if (process.argv.includes('--dump')) {
  /* This was the one-time bootstrap: it wrote the constants above out as JSON so
     there was a level file to edit in the first place. It has outlived its model
     — what it emits is the BAND plan, `lines` and `plan` and blocks, and the
     level file is rooms now. Writing it over a rooms-first plan does not merely
     lose the room rectangles, the doorways, the hand-placed fittings and the
     per-room contents; because the result has no `rooms` key, the generator
     quietly falls back to the band model and builds a different building
     without complaining. So it refuses to be the thing that destroys your work. */
  const target = path.join(__dirname, 'level.json');
  if (fs.existsSync(target) && !process.argv.includes('--force')) {
    const cur = (() => { try { return JSON.parse(fs.readFileSync(target, 'utf8')); } catch (e) { return null; } })();
    console.error('--dump would overwrite tools/level.json.');
    if (cur && cur.rooms) {
      console.error(`  That file is a rooms-first plan: ${cur.rooms.length} rooms, ` +
        `${Object.keys(cur.roomItems || {}).length} with authored contents, ` +
        `${(cur.placed && cur.placed.vendors || []).length + (cur.placed && cur.placed.guns || []).length} hand-placed fittings.`);
      console.error('  What --dump writes is the older band-line plan, which the generator');
      console.error('  reads as a DIFFERENT building. There is no way back from this.');
    }
    console.error('  Export from tools/editor.html to change the plan. If you really want the');
    console.error('  bootstrap file, move level.json aside first, or pass --force.');
    process.exit(1);
  }
  const authoredStairs = STAIRS.slice(0, STAIRS.length - OVERPASSES.length * 2);
  const level = {
    note: 'Crystal Maze level. Coordinates are final grid cells (padding applied).',
    size: SIZE, pad: PAD, levels: NLEV,
    lines: LINES,
    levelLines: LEVEL_LINES,
    hubExits: HUB_EXITS.map((e) => ({ side: e.side, at: e.at })),
    plan: PLAN.map((p) => ({ lev: p.lev, br: p.br, bc: p.bc, t: p.t,
                             ...(p.enclosed === false ? { enclosed: false } : {}) })),
    alcoves: ALCOVES,
    alcoveInterior: ALC_IN,
    stairs: AUTHORED_STAIRS,
    galleries: GALLERIES,
    overpasses: OVERPASSES.map((o) => ({ lo: o.lo, axis: o.axis, at: o.at, a: o.a, b: o.b, rise: o.rise })),
    drops: DROPS.map((d) => ({ lev: d.lev, at: d.at, into: d.into })),
    buttonPrefs: BUTTON_PREFS.map((b) => ({ lev: b.lev, at: b.at })),
    roomItems: {},          // per-room contents, keyed by room id; the editor writes these
    edits: {},              // sparse hand edits, "lev,r,c" -> character
    placed: {},             // hand-placed fittings by kind: vendors, guns
  };
  fs.writeFileSync(path.join(__dirname, 'level.json'), JSON.stringify(level, null, 2));
  console.log('wrote tools/level.json');
  process.exit(0);
}
const BUTTONS = [];
BUTTON_PREFS.forEach((b, i) => {
  const seen = new Set([b.at.join(',')]), q = [b.at];
  let placed = null;
  for (let h = 0; h < q.length && !placed; h++) {
    const [r, c] = q[h];
    if (G[b.lev][r][c] === '.') { placed = [r, c]; break; }
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc, k = `${nr},${nc}`;
      if (!inb(nr, nc) || seen.has(k)) continue;
      seen.add(k); q.push([nr, nc]);
    }
  }
  if (!placed) throw new Error(`no hall cell near button ${i + 1}`);
  G[b.lev][placed[0]][placed[1]] = 'ABCDEF'[i];
  BUTTONS.push({ door: i + 1, lev: b.lev, at: placed });
});

/* ---- hand edits ---------------------------------------------------------
   Everything above is generated: bands become blocks, blocks become rooms,
   rooms get doorways. This is where a person overrules it. The editor writes
   `edits` as a sparse map of "lev,r,c" to the character that cell should be,
   and it is applied last, so anything drawn by hand wins over anything the
   plan produced — a wall knocked through, a corridor cut across a room, a
   doorway closed up, a walkway run out past the edge of the building.

   Sparse on purpose: a level with no hand edits carries none of this, and the
   plan stays the readable description of the building rather than a bitmap. */
if (LEVEL && LEVEL.edits) {
  let applied = 0, outside = 0;
  for (const k of Object.keys(LEVEL.edits)) {
    const [l, r, c] = k.split(',').map(Number);
    if (l < 0 || l >= NLEV || !inb(r, c)) { outside++; continue; }
    G[l][r][c] = LEVEL.edits[k];
    applied++;
  }
  if (applied) console.log(`  ${applied} hand edit${applied > 1 ? 's' : ''} applied` +
    (outside ? `, ${outside} outside the grid ignored` : ''));
}

/* ================================================================ VALIDATE */
const problems = [];

/* ---- is every room actually open? --------------------------------------
   A doorway is only cut where there is somewhere to go on the other side, and
   with rooms placed freely a room can end up with nothing on any of its four
   faces — most easily by leaving a one-cell gap to its neighbour, where the
   probe lands on the neighbour's wall and every punch quietly declines. The
   room is then sealed, the game is unfinishable, and nothing says a word. The
   orphan rule catches it eventually, but by cell rather than by name, so this
   says which room and why. */
for (const rm of rooms) {
  if (rm.open) continue;
  let ways = 0;
  for (let r = rm.r1 - 1; r <= rm.r2 + 1; r++) for (let c = rm.c1 - 1; c <= rm.c2 + 1; c++) {
    const onRing = r === rm.r1 - 1 || r === rm.r2 + 1 || c === rm.c1 - 1 || c === rm.c2 + 1;
    if (!onRing || !inb(r, c)) continue;
    const ch = G[rm.lev][r][c];
    if (ch !== WALL && ch !== VOID) ways++;
  }
  if (!ways) problems.push(`${rm.type} at ${rm.lev}:${rm.r1},${rm.c1} is sealed — no doorway could be cut ` +
    `(nothing walkable on any face; a one-cell gap to a neighbour does this)`);
}

const isDoor = (chr) => DOORCH.includes(chr);
const isRoom = (chr) => chr === '+' || chr === '~' || chr === '*';

const stairLink = new Map();
for (const s of STAIRS) {
  const top = s.cells[s.cells.length - 1], bot = s.cells[0];
  stairLink.set(`${s.lo},${top[0]},${top[1]}`, [s.lo + 1, top[0], top[1]]);
  stairLink.set(`${s.lo + 1},${bot[0]},${bot[1]}`, [s.lo, bot[0], bot[1]]);
}
function flood(openDoors) {
  const seen = new Set([`0,${START[0]},${START[1]}`]);
  const q = [[0, START[0], START[1]]];
  const push = (l, r, c) => {
    if (!inb(r, c) || l < 0 || l >= NLEV) return;
    const k = `${l},${r},${c}`;
    if (seen.has(k) || !WALKABLE(G[l][r][c])) return;
    if (isDoor(G[l][r][c]) && !openDoors.has(G[l][r][c])) return;
    seen.add(k); q.push([l, r, c]);
  };
  while (q.length) {
    const [l, r, c] = q.pop();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) push(l, r + dr, c + dc);
    // a stair cell is shared by both levels it joins
    if (G[l][r][c] === '/') { push(l + 1, r, c); push(l - 1, r, c); }
  }
  return seen;
}
const allOpen = flood(new Set(DOORCH));
const noneOpen = flood(new Set());

// 1. nothing orphaned
for (let l = 0; l < NLEV; l++) for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
  if (WALKABLE(G[l][r][c]) && !allOpen.has(`${l},${r},${c}`)) problems.push(`orphan ${l}:${r},${c} '${G[l][r][c]}'`);
}
// 2. NO DEAD ENDS. Every walkable cell needs two ways out. Chamber interiors
//    and their door approach are the deliberate exception.
const chamberCell = new Set();
for (const ch of CHAMBERS) {
  for (let r = ch.cr - 3; r <= ch.cr + 3; r++) for (let c = ch.cc - 4; c <= ch.cc + 3; c++) {
    chamberCell.add(`${ch.lev},${r},${c}`);
  }
}
let deadEnds = 0;
for (let l = 0; l < NLEV; l++) for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
  if (!WALKABLE(G[l][r][c]) || chamberCell.has(`${l},${r},${c}`)) continue;
  let n = 0;
  for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (inb(r + dr, c + dc) && WALKABLE(G[l][r + dr][c + dc])) n++;
  }
  if (G[l][r][c] === '/') n++;                       // stairs continue vertically
  if (n < 2) { deadEnds++; if (deadEnds <= 12) problems.push(`dead end ${l}:${r},${c} '${G[l][r][c]}' has ${n} exit(s)`); }
}
if (deadEnds > 12) problems.push(`...and ${deadEnds - 12} more dead ends`);
// 3. buttons and switches reachable with every door shut
for (const b of BUTTONS) if (!noneOpen.has(`${b.lev},${b.at[0]},${b.at[1]}`)) problems.push(`button ${b.door} unreachable with doors shut`);
for (const rm of rooms) if (!noneOpen.has(`${rm.lev},${rm.sw[0]},${rm.sw[1]}`)) problems.push(`switch in ${rm.lev}:${rm.r1},${rm.c1} (${rm.type}) unreachable with doors shut`);
// 4. gating
for (const ch of CHAMBERS) {
  const k = `${ch.lev},${ch.cr},${ch.cc}`;
  if (noneOpen.has(k)) problems.push(`crystal ${ch.id} reachable WITHOUT its door`);
  if (!flood(new Set([DOORCH[ch.id - 1]])).has(k)) problems.push(`crystal ${ch.id} unreachable with its own door open`);
}
// 5. rooms must not touch, or one switch lights its neighbour
for (const rm of rooms) {
  const seen = new Set([rm.sw.join(',')]), q = [rm.sw];
  while (q.length) {
    const [r, c] = q.pop();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc, k = `${nr},${nc}`;
      if (seen.has(k) || !inb(nr, nc) || !isRoom(G[rm.lev][nr][nc])) continue;
      seen.add(k); q.push([nr, nc]);
    }
  }
  const want = (rm.r2 - rm.r1 + 1) * (rm.c2 - rm.c1 + 1);
  if (seen.size !== want) problems.push(`room ${rm.lev}:${rm.r1},${rm.c1} (${rm.type}) floods ${seen.size} of ${want}`);
}
// 6. six ways out of the centre
{
  // Count gaps in the hub's own wall ring. Counting the hall outside it instead
  // just measures the length of the hall, which is walkable end to end.
  let cells = 0;
  for (let c = HUB.c1; c <= HUB.c2; c++) {
    if (WALKABLE(G[0][HUB.r1][c])) cells++;
    if (WALKABLE(G[0][HUB.r2][c])) cells++;
  }
  for (let r = HUB.r1 + 1; r <= HUB.r2 - 1; r++) {
    if (WALKABLE(G[0][r][HUB.c1])) cells++;
    if (WALKABLE(G[0][r][HUB.c2])) cells++;
  }
  if (cells / 2 !== 6) problems.push(`hub has ${cells / 2} exits, wanted 6`);
}
// 7. drop points must be a real balcony over a real floor
for (const d of DROPS) {
  if (!WALKABLE(G[d.lev][d.at[0]][d.at[1]])) problems.push(`drop ${d.lev}:${d.at} is not on a walkway`);
  if (G[d.lev][d.into[0]][d.into[1]] !== VOID) problems.push(`drop ${d.lev}:${d.into} is not open air`);
  if (!WALKABLE(G[0][d.into[0]][d.into[1]])) problems.push(`drop ${d.lev}:${d.into} has no floor to land on`);
}
// 8. stairs land on solid ground at both ends
for (const s of STAIRS) {
  const bot = s.cells[0], top = s.cells[s.cells.length - 1];
  const d = [Math.sign(top[0] - bot[0]), Math.sign(top[1] - bot[1])];
  const below = [bot[0] - d[0], bot[1] - d[1]], above = [top[0] + d[0], top[1] + d[1]];
  if (!WALKABLE(G[s.lo][below[0]][below[1]])) problems.push(`stair ${s.lo}:${bot} has no footing at the bottom`);
  if (!WALKABLE(G[s.lo + 1][above[0]][above[1]])) problems.push(`stair ${s.lo}:${top} has no landing at the top`);
}
/* 9. A GATE IS THE ONLY WAY IN. Finding the button that opens a vault is the
      game; a stairwell driven through the wall beside it does not read as a
      clever shortcut, it reads as the lock being broken. Rule 6 already asks
      whether the crystal is reachable, but it asks it as one flood over the
      whole building, so it announces a breach somewhere without saying where.
      This walks the ring and names the cell. */
for (const ch of CHAMBERS) {
  for (let r = ch.r1; r <= ch.r2; r++) for (let c = ch.c1; c <= ch.c2; c++) {
    if (r > ch.r1 && r < ch.r2 && c > ch.c1 && c < ch.c2) continue;   // interior
    if (r === ch.door[0] && c === ch.door[1]) continue;               // the gate
    const chr = G[ch.lev][r][c];
    if (chr !== WALL) problems.push(`vault ${ch.id} is breached at ${ch.lev}:${r},${c} — '${chr}' where its wall should be`);
  }
}
/* 10. NOTHING HANGS IN THE AIR. A void drawn on one floor reaches under the
       room above it, and the room is then standing on nothing. Walkways over
       an atrium are meant to do that and are left alone; a room is not. */
/* Vaults are built from their own slot list and never land in `rooms`, so
   checking `rooms` alone lets a crystal chamber float. */
const standing = [...rooms.map((r) => ({ ...r, what: r.type })),
                  ...CHAMBERS.map((ch) => ({ ...ch, what: `vault ${ch.id}` }))];
for (const rm of standing) {
  if (rm.lev === 0 || rm.what === 'atrium') continue;
  let hanging = 0;
  for (let r = rm.r1; r <= rm.r2; r++) for (let c = rm.c1; c <= rm.c2; c++) {
    if (G[rm.lev - 1][r][c] === VOID) hanging++;
  }
  if (hanging) problems.push(`${rm.what} at ${rm.lev}:${rm.r1},${rm.c1} hangs over open space (${hanging} cells with nothing under them)`);
}

/* ================================================================ OUTPUT */
const levelText = (l) => G[l].map((row) => row.join('')).join('\n');
const mapBlock = [0, 1, 2].map((l) => '`\n' + levelText(l) + '\n`').join(',\n');
const src = `const MAPS = [\n${mapBlock}\n].map((s) => s.replace(/^\\n/, '').replace(/\\n$/, '').split('\\n'));
const ROOM_META = ${JSON.stringify(rooms.map((r) => ({ lev: r.lev, r1: r.r1, c1: r.c1, r2: r.r2, c2: r.c2, type: r.type, ...(r.items ? { items: r.items } : {}) })))};
const DROP_POINTS = ${JSON.stringify(DROPS)};
/* Hand-placed fittings. Empty means "scatter them the way you always did" —
   the game falls back to its own rules — so a level that says nothing about
   machines still gets twelve of them in the corridors. Anything listed here
   overrides that entirely for its own kind. */
const PLACED = ${JSON.stringify(LEVEL && LEVEL.placed ? LEVEL.placed : {})};`;

if (process.argv.includes('--write')) {
  const file = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const a = html.indexOf('/* MAP:BEGIN */'), b = html.indexOf('/* MAP:END */');
  if (a < 0 || b < 0) throw new Error('MAP:BEGIN / MAP:END markers not found');
  fs.writeFileSync(file, html.slice(0, a) + '/* MAP:BEGIN */\n' + src + '\n' + html.slice(b));
  console.log('spliced into index.html');
} else {
  for (let l = 0; l < NLEV; l++) {
    console.log(`\n--- level ${l} ---`);
    console.log(levelText(l).replace(/ /g, '·'));
  }
}

console.log('');
if (problems.length) {
  console.log(`FAILED (${problems.length}):`);
  for (const p of problems.slice(0, 30)) console.log('  - ' + p);
  if (problems.length > 30) console.log(`  ... and ${problems.length - 30} more`);
  process.exit(1);
}
const counts = [0, 1, 2].map((l) => G[l].flat().filter(WALKABLE).length);
const byType = {};
for (const r of rooms) byType[r.type] = (byType[r.type] || 0) + 1;
console.log(`OK  ${SIZE}x${SIZE}x${NLEV}  walkable per level: ${counts.join(' / ')}  total ${counts.reduce((a, b) => a + b)}`);
console.log(`    rooms ${rooms.length} ${JSON.stringify(byType)}`);
console.log(`    atriums ${atriumBlocks.length + 1}  chambers ${CHAMBERS.length}  stairs ${STAIRS.length}  drops ${DROPS.length}  no dead ends`);
