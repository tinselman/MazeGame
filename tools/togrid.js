// Put the plan back on a grid.  node tools/togrid.js [--write]
//
// The building is going to start moving: whole columns of rooms sliding a slot
// north or south, whole rows sliding east or west, and then every floor rising
// one storey with the top floor wrapping to the bottom. None of that can work
// on a freeform plan. A room can only take another room's place if there is a
// place to take — so the rooms go back into ranks and files, five by five, the
// same five by five on every floor.
//
// What this does NOT do is make the rooms the same size. The bands are
// deliberately uneven — 7, 8, 16, 6 and 10 cells — so a room sliding from one
// slot to the next has to grow or shrink to fit, which is the whole feel of the
// thing: the building resizing around you while you stand in it.
//
// Floor 0 is already on the grid and is left exactly as it is, so everything
// authored against it — the buttons, the parapet gaps, the overpasses — stays
// where it was. The upper floors are filled out to match.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'level.json');
const L = JSON.parse(fs.readFileSync(FILE, 'utf8'));

// The five bands, in cells. Rows and columns use the same table: the building
// is square, and a row shifting east has to land on the same ladder a column
// shifting south does.
const BAND = [[10, 16], [19, 26], [31, 46], [50, 55], [58, 67]];
const slotOf = (v) => BAND.findIndex(([a, b]) => v >= a && v <= b);

/* Where the holes are. An atrium is declared once, on the ground floor, and the
   generator cuts it through every storey above — so the voids the upper floors
   need are not something this file has to write down, and the explicit void
   rectangles the old freeform plan carried are just clutter that would fight
   the grid. Same for the hub. */
const ATRIUM = [[0, 1], [1, 4], [3, 0], [4, 2]];
const HUB = [2, 2];
const isHole = (i, j) => (i === HUB[0] && j === HUB[1])
  || ATRIUM.some(([a, b]) => a === i && b === j);

/* The twenty slots that hold a room, filled in on the floors that were half
   empty. Chosen rather than generated: the middle column above and below the
   hub reads as a hall on every floor, the corners stay heavy, and no two of a
   kind sit next to each other where it could be helped. */
const FILL = {
  1: { '0,3': 'office', '1,0': 'living', '1,2': 'hall',
       '3,2': 'hall', '3,4': 'restaurant', '4,1': 'warehouse' },
  2: { '0,0': 'warehouse', '0,2': 'gallery', '0,3': 'office', '0,4': 'living',
       '1,0': 'restaurant', '1,2': 'hall',
       '2,0': 'cubicles', '2,4': 'warehouse',
       '3,2': 'hall', '3,4': 'gallery',
       '4,0': 'museum', '4,1': 'living', '4,3': 'restaurant', '4,4': 'cubicles' },
};

// ---- read the plan as it stands -------------------------------------------
const held = {};                        // "lev,i,j" -> the room already there
let offGrid = 0, alcoves = 0, voids = 0;
for (const rm of L.rooms) {
  if (rm.t === 'void') { voids++; continue; }
  if (rm.t === 'alcove') { alcoves++; continue; }
  const i = slotOf(rm.r1), j = slotOf(rm.c1);
  const exact = i >= 0 && j >= 0
    && rm.r1 === BAND[i][0] && rm.r2 === BAND[i][1]
    && rm.c1 === BAND[j][0] && rm.c2 === BAND[j][1];
  if (!exact) { offGrid++; continue; }
  held[`${rm.lev},${i},${j}`] = rm;
}

// ---- write it back out, on the grid ---------------------------------------
const rooms = [];
let kept = 0, added = 0;
for (let lev = 0; lev < L.levels; lev++) {
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    if (isHole(i, j) && lev > 0) continue;          // cut through from below
    const was = held[`${lev},${i},${j}`];
    let t;
    if (was) { t = was.t; kept++; }
    else if (isHole(i, j)) continue;                // ground-floor atrium/hub
    else { t = (FILL[lev] || {})[`${i},${j}`]; added++; }
    if (!t) { console.error(`nothing to put in ${lev}:${i},${j}`); process.exit(1); }
    const r = {
      lev, r1: BAND[i][0], c1: BAND[j][0], r2: BAND[i][1], c2: BAND[j][1],
      t, id: was ? was.id : `g${lev}${i}${j}`,
    };
    // contents and hand-placed doorways survive the move
    if (was && was.doors) r.doors = was.doors;
    if (was && was.enclosed === false) r.enclosed = false;
    rooms.push(r);
  }
}
// the ground-floor atriums, declared once and cut through every storey above
for (const [i, j] of ATRIUM) {
  const was = held[`0,${i},${j}`];
  rooms.push({ lev: 0, r1: BAND[i][0], c1: BAND[j][0], r2: BAND[i][1], c2: BAND[j][1],
               t: 'atrium', id: was ? was.id : `a${i}${j}` });
}

const before = { rooms: L.rooms.length, stairs: L.stairs.length };
L.rooms = rooms;
/* No stairs. Between floors is going to be the building's business, not a
   staircase's — and a flight that stayed put while the storey it lands on
   rotated away would be a hole you fall down. Put them back in the editor if
   a particular plan wants them. */
L.stairs = [];
// keep every room's authored contents that still points at a room
const ids = new Set(rooms.map((r) => r.id));
for (const k of Object.keys(L.roomItems || {})) if (!ids.has(k)) delete L.roomItems[k];

const out = JSON.stringify(L, null, 2);
if (process.argv.includes('--write')) {
  fs.writeFileSync(FILE, out);
  console.log('wrote tools/level.json');
} else {
  console.log('(dry run — pass --write to save)');
}
console.log(`  rooms ${before.rooms} -> ${rooms.length}   kept ${kept}  added ${added}`);
console.log(`  dropped: ${alcoves} alcoves, ${voids} void rects, ${offGrid} off-grid`);
console.log(`  stairs ${before.stairs} -> 0`);
for (let l = 0; l < L.levels; l++) {
  const n = rooms.filter((r) => r.lev === l && r.t !== 'atrium').length;
  console.log(`  floor ${l}: ${n} rooms`);
}
