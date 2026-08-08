const fs=require('fs');
const L=JSON.parse(fs.readFileSync('/tmp/level.v1','utf8'));
const LINES=L.lines, PAD=L.pad, SIZE=L.size;
const BANDS=[];
for(let i=0;i<LINES.length-1;i++) BANDS.push([LINES[i][0]+LINES[i][1], LINES[i+1][0]-1]);
const blockRect=(br,bc)=>({r1:BANDS[br][0],c1:BANDS[bc][0],r2:BANDS[br][1],c2:BANDS[bc][1]});
const HUB={r1:BANDS[2][0],c1:BANDS[2][0],r2:BANDS[2][1],c2:BANDS[2][1]};
const rooms=[];
// 1. void first: upstairs slots with nothing planned are holes you look through
for(let l=1;l<L.levels;l++)
  for(let br=0;br<BANDS.length;br++) for(let bc=0;bc<BANDS.length;bc++){
    if(L.plan.some(p=>p.lev===l&&p.br===br&&p.bc===bc)) continue;
    const R=blockRect(br,bc);
    rooms.push({lev:l,r1:R.r1,c1:R.c1,r2:R.r2,c2:R.c2,t:'void'});
  }
// 2. the rooms themselves
for(const p of L.plan){
  const R=blockRect(p.br,p.bc);
  const o={lev:p.lev,r1:R.r1,c1:R.c1,r2:R.r2,c2:R.c2,t:p.t};
  if(p.enclosed===false) o.enclosed=false;
  rooms.push(o);
}
// 3. alcoves last, so they carve back into the void they sit in
const ALC=L.alcoveInterior;
for(const a of L.alcoves){
  const R=blockRect(a.br,a.bc), span=ALC+1;
  const wr1=a.v==='N'?R.r1:R.r2-span, wc1=a.h==='W'?R.c1:R.c2-span;
  rooms.push({lev:a.lev,r1:wr1,c1:wc1,r2:wr1+span,c2:wc1+span,t:'alcove'});
}
const M=3, env=[];
for(let l=0;l<L.levels;l++){
  const on=rooms.filter(r=>r.lev===l);
  env.push({r1:Math.min(...on.map(r=>r.r1))-M, c1:Math.min(...on.map(r=>r.c1))-M,
            r2:Math.max(...on.map(r=>r.r2))+M, c2:Math.max(...on.map(r=>r.c2))+M});
}
fs.writeFileSync('tools/level2.json', JSON.stringify({
  note:'Rooms are rectangles placed on each floor. Corridor is whatever is left inside the envelope. A void rectangle is a hole.',
  size:SIZE,pad:PAD,levels:L.levels,envelope:env,
  hub:{lev:0,...HUB}, hubExits:L.hubExits, rooms,
  stairs:L.stairs,overpasses:L.overpasses,drops:L.drops,
  buttonPrefs:L.buttonPrefs,galleries:L.galleries,
  roomItems:L.roomItems||{},edits:L.edits||{},placed:L.placed||{},
},null,2));
console.log('rooms:',rooms.length,'of which void:',rooms.filter(r=>r.t==='void').length);
