// Repair a plan the generator has refused.  node tools/repair.js [--write]
//
// Two rules this fixes, both of them things a person should never have to think
// about while laying out a building:
//
//   A vault is sealed. Its gate is the only way in, because finding the button
//   that opens it IS the game. A stairwell driven through its wall does not
//   read as a shortcut, it reads as the lock being broken.
//
//   A room stands on something. A void drawn on the floor below reaches under
//   the room above it and leaves it hanging in the air, which looks like a
//   mistake because it is one.
//
// It changes as little as it can: voids give way where a room needs holding up,
// and a stairwell that has nowhere to stand is moved to the nearest place that
// will take it rather than deleted.

const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'level.json');
const L = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const notes = [];

const overlaps = (a, b) => Math.max(a.r1, b.r1) <= Math.min(a.r2, b.r2)
                        && Math.max(a.c1, b.c1) <= Math.min(a.c2, b.c2);

/* ---- 1. nothing hangs in the air ---------------------------------------- */
const solidRooms = (lev) => L.rooms.filter((r) => r.lev === lev && r.t !== 'void');
for (let lev = 1; lev < L.levels; lev++) {
  for (const up of solidRooms(lev)) {
    for (const hole of L.rooms.filter((r) => r.lev === lev - 1 && r.t === 'void')) {
      if (!overlaps(up, hole)) continue;
      /* Take the hole back clear of the room, from whichever of its four sides
         leaves the MOST of it standing. Choosing the smallest cut instead is
         the obvious thing and it is wrong: the shortest trim is often the one
         that takes the hole's whole width and leaves nothing at all. */
      const options = [
        { r1: up.r2 + 1, c1: hole.c1, r2: hole.r2, c2: hole.c2 },
        { r1: hole.r1, c1: hole.c1, r2: up.r1 - 1, c2: hole.c2 },
        { r1: hole.r1, c1: up.c2 + 1, r2: hole.r2, c2: hole.c2 },
        { r1: hole.r1, c1: hole.c1, r2: hole.r2, c2: up.c1 - 1 },
      ].map((o) => ({ ...o, area: Math.max(0, o.r2 - o.r1 + 1) * Math.max(0, o.c2 - o.c1 + 1) }));
      const keep = options.reduce((a2, b2) => (b2.area > a2.area ? b2 : a2));
      hole.r1 = keep.r1; hole.c1 = keep.c1; hole.r2 = keep.r2; hole.c2 = keep.c2;
      const dead = keep.area === 0;
      notes.push(dead
        ? `dropped the hole on floor ${hole.lev} that ran under the ${up.t} above it`
        : `pulled the hole on floor ${hole.lev} back to ${hole.r1},${hole.c1}-${hole.r2},${hole.c2}, clear of the ${up.t} above`);
      if (dead) hole.__gone = true;
    }
  }
}
L.rooms = L.rooms.filter((r) => !r.__gone);

/* ---- 2. a stairwell stands on something, and never inside a vault -------- */
/* Built the same way the generator builds it, because guessing at it from the
   room list is how you get a stair that looks fine in the plan and lands in a
   wall. */
const N = L.size;
const grid = Array.from({ length: L.levels }, () =>
  Array.from({ length: N }, () => new Array(N).fill(' ')));
const fill = (l, r1, c1, r2, c2, ch) => {
  for (let r = Math.max(0, r1); r <= Math.min(N - 1, r2); r++)
    for (let c = Math.max(0, c1); c <= Math.min(N - 1, c2); c++) grid[l][r][c] = ch;
};
for (let l = 0; l < L.levels; l++) { const e = L.envelope[l]; if (e) fill(l, e.r1, e.c1, e.r2, e.c2, '.'); }
for (const rm of L.rooms) {
  if (rm.t === 'atrium') { fill(0, rm.r1, rm.c1, rm.r2, rm.c2, '.'); for (let l = 1; l < L.levels; l++) fill(l, rm.r1, rm.c1, rm.r2, rm.c2, ' '); continue; }
  if (rm.t === 'void') { fill(rm.lev, rm.r1, rm.c1, rm.r2, rm.c2, ' '); continue; }
  fill(rm.lev, rm.r1, rm.c1, rm.r2, rm.c2, '#');
  fill(rm.lev, rm.r1 + 1, rm.c1 + 1, rm.r2 - 1, rm.c2 - 1, rm.t === 'chamber' ? 'V' : '+');
}
fill(0, L.hub.r1, L.hub.c1, L.hub.r2, L.hub.c2, '#');
fill(0, L.hub.r1 + 1, L.hub.c1 + 1, L.hub.r2 - 1, L.hub.c2 - 1, 'H');
for (let l = 1; l < L.levels; l++) fill(l, L.hub.r1, L.hub.c1, L.hub.r2, L.hub.c2, ' ');

/* The generator's own test: somewhere you can stand, meaning anything that is
   not a wall and not open air. A room floor counts. Insisting on corridor
   specifically — which is what this said at first — condemned three stairwells
   that step off onto perfectly good floorboards. */
const hall = (l, r, c) =>
  r > 0 && c > 0 && r < N && c < N && grid[l][r][c] !== '#' && grid[l][r][c] !== ' ';
/* Inside the vault, wall ring included — and no wider. A halo around it was
   the first guess and it is far too greedy: a stairwell running along the
   OUTSIDE of a vault wall breaches nothing, it is just a neighbour, and three
   innocent stairwells were being relocated for standing too close. What breaks
   the rule is going through the wall or landing in the room. */
const vaultish = (l, r, c) => L.rooms.some((v) =>
  v.lev === l && v.t === 'chamber' && r >= v.r1 && r <= v.r2 && c >= v.c1 && c <= v.c2);
/* What the generator actually asks of a stairwell, and nothing more: you can
   step onto it at the bottom and off it at the top. The flight itself is carved
   out of whatever it crosses, so demanding that its own cells already be
   corridor would condemn five perfectly good stairs to being moved for no
   reason — which is what the first version of this did. The one thing added is
   that it must not touch a vault, because that is the rule being enforced. */
const fits = (lo, r, c, dr, dc) => {
  const bot = [r - dr, c - dc], top = [r + dr * 4, c + dc * 4];
  if (!hall(lo, bot[0], bot[1])) return false;
  if (!hall(lo + 1, top[0], top[1])) return false;
  for (let k = -1; k <= 4; k++) {
    const rr = r + dr * k, cc = c + dc * k;
    if (vaultish(lo, rr, cc) || vaultish(lo + 1, rr, cc)) return false;
  }
  return true;
};

for (const [i, st] of L.stairs.entries()) {
  const bot = st.cells[0], top = st.cells[st.cells.length - 1];
  const dr = Math.sign(top[0] - bot[0]), dc = Math.sign(top[1] - bot[1]);
  if (fits(st.lo, bot[0], bot[1], dr, dc)) continue;
  // spiral out from where it was, so it lands as near its old place as it can
  let found = null;
  for (let rad = 1; rad <= 26 && !found; rad++) {
    for (let d = -rad; d <= rad && !found; d++) {
      for (const [nr, nc] of [[bot[0] + d, bot[1] + rad], [bot[0] + d, bot[1] - rad],
                              [bot[0] + rad, bot[1] + d], [bot[0] - rad, bot[1] + d]]) {
        for (const [ar, ac] of [[dr, dc], [-dr, -dc], [dc, dr], [-dc, -dr]]) {
          if (!ar && !ac) continue;
          if (fits(st.lo, nr, nc, ar, ac)) { found = [nr, nc, ar, ac]; break; }
        }
        if (found) break;
      }
    }
  }
  if (!found) { st.__gone = true; notes.push(`stairwell ${i} had nowhere to stand at all, so it is gone`); continue; }
  const [nr, nc, ar, ac] = found;
  st.cells = [0, 1, 2, 3].map((k) => [nr + ar * k, nc + ac * k]);
  notes.push(`moved stairwell ${i} from ${bot} to ${st.cells[0]}, onto corridor at both ends and clear of every vault`);
}
L.stairs = L.stairs.filter((s) => !s.__gone);

console.log(notes.length ? notes.map((n) => '  ' + n).join('\n') : '  nothing needed repairing');
if (process.argv.includes('--write')) {
  fs.writeFileSync(FILE, JSON.stringify(L, null, 2));
  console.log('\nwrote tools/level.json');
} else {
  console.log('\n(dry run — pass --write to save)');
}
