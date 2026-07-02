import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

/* ══════════════════════════════════════
   Pixel Isometric Office — Sims-style
   Pure 2D · Standard isometric slope 0.5 (26.57°)
   Two low walls + door + mailbox + stone path
   ══════════════════════════════════════ */

type TimePhase = 'dawn' | 'noon' | 'dusk' | 'night';

const PHASE_BG: Record<TimePhase, string> = {
  dawn:  'linear-gradient(180deg, #ffcc88 0%, #eebb66 20%, #88cc55 42%, #5dba47 56%, #5dba47 100%)',
  noon:  'linear-gradient(180deg, #88ccee 0%, #66bbdd 20%, #66bb44 42%, #5dba47 56%, #5dba47 100%)',
  dusk:  'linear-gradient(180deg, #cc5533 0%, #dd7744 18%, #bb8844 32%, #558833 50%, #4a8838 62%, #4a8838 100%)',
  night: 'linear-gradient(180deg, #0a1428 0%, #162040 20%, #1a3328 42%, #2a5530 56%, #2a5530 100%)',
};

const TIME_LABELS: Record<TimePhase, string> = {
  dawn: '清晨 6:00', noon: '正午 12:00', dusk: '黃昏 18:00', night: '深夜 23:00',
};

/* Animations */
const bob = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}`;
const typeCursor = keyframes`0%,100%{opacity:1}50%{opacity:0}`;
const starTwinkle = keyframes`0%,100%{opacity:.2}50%{opacity:1}`;
const flagWave = keyframes`0%,100%{transform:skewY(0)}50%{transform:skewY(-3deg)}`;

const Container = styled.div<{ $p: TimePhase }>`
  width: 100%;
  aspect-ratio: 4 / 5;
  background: ${p => PHASE_BG[p.$p]};
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  user-select: none;
  image-rendering: auto;
  transition: background 2s ease;
`;

/* Stars */
const StarsWrap = styled.div<{ $on: boolean }>`
  position:absolute;inset:0;pointer-events:none;z-index:0;
  opacity:${p => p.$on?1:0};transition:opacity 2s;
`;
const Star = styled.div<{$x:number;$y:number;$d:string}>`
  position:absolute;left:${p=>p.$x}%;top:${p=>p.$y}%;
  width:2px;height:2px;background:#fff;
  animation:${starTwinkle} ${p=>p.$d} ease-in-out infinite;
`;

/* Light beams */
const Beam = styled.div<{$p:TimePhase;$i:number}>`
  position:absolute;width:50px;height:130%;top:-15%;
  pointer-events:none;z-index:1;transition:all 2s;
  opacity:${p=>p.$p==='night'?0:p.$p==='noon'?.06:.12};
  background:${p=>p.$p==='dawn'?'rgba(255,200,100,.3)':p.$p==='dusk'?'rgba(255,100,50,.25)':'rgba(255,255,200,.15)'};
  left:${p=>p.$i===0?(p.$p==='dawn'?'8%':p.$p==='dusk'?'50%':'20%'):(p.$p==='dawn'?'35%':p.$p==='dusk'?'72%':'55%')};
  transform:skewX(${p=>p.$p==='dawn'?'-15deg':p.$p==='dusk'?'12deg':'5deg'});
`;

/* HUD */
const Pill = styled.div`
  position:absolute;top:6px;left:6px;
  background:rgba(0,0,0,.5);color:#fff;
  font:700 8px/1 monospace;padding:3px 7px;
  border-radius:3px;z-index:30;letter-spacing:.5px;
`;
const Btns = styled.div`position:absolute;top:6px;right:6px;display:flex;gap:3px;z-index:30;`;
const Btn = styled.button<{$on?:boolean;$c:string}>`
  width:14px;height:14px;border:2px solid ${p=>p.$on?'#fff':'rgba(255,255,255,.3)'};
  border-radius:2px;background:${p=>p.$c};cursor:pointer;padding:0;transition:border-color .3s;
`;

/* ══ SVG Scene ══ */
const SceneSvg = styled.svg`
  position: absolute;
  bottom: 0; left: 0;
  width: 100%; height: 100%;
`;


/* ══════════════════════════════════════ */
const PHASES: TimePhase[] = ['dawn','noon','dusk','night'];
const BC: Record<TimePhase,string> = {dawn:'#ffaa55',noon:'#55aadd',dusk:'#dd6644',night:'#334477'};

/* ── Seated person typing at desk (side view, facing right) — refined ── */
const TypingPerson = ({x,y,hair,skin,shirt,dur='0.4s'}:{x:number;y:number;hair:string;skin?:string;shirt:string;dur?:string}) => {
  const s = skin||'#fcc88a';
  return (
  <g transform={`translate(${x},${y})`}>
    {/* Shadow */}
    <ellipse cx="8" cy="34" rx="9" ry="3" fill="rgba(0,0,0,.08)" />
    {/* Back leg (seated, bent) */}
    <path d="M1,24 Q0,24 0,25 L0,29 Q0,30 1,30 L5,32 Q7,33 7,31 L7,29 Q7,28 6,27 L5,25 Q5,24 4,24 Z" fill="#3a3f4a" />
    {/* Front leg (seated, extended) */}
    <path d="M6,25 Q5,25 5,26 L5,29 Q5,30 6,30 L11,32 Q13,33 13,31 L13,30 Q13,29 12,28 L11,26 Q11,25 10,25 Z" fill="#445" />
    {/* Shoes */}
    <ellipse cx="12.5" cy="31.5" rx="2" ry="1.5" fill="#333" />
    <ellipse cx="3.5" cy="32" rx="2" ry="1.2" fill="#333" />
    {/* Body (slight lean forward) */}
    <path d="M2,12 Q0,12 0,14 L0,24 Q0,26 2,26 L10,26 Q12,26 12,24 L12,14 Q12,12 10,12 Z" fill={shirt} />
    {/* Shirt shadow fold */}
    <path d="M1,20 Q0,20 0,21 L0,25 Q0,26 1,26 L11,26 Q12,26 12,25 L12,21 Q12,20 11,20 Z" fill="#000" opacity="0.06" />
    {/* Collar */}
    <ellipse cx="7" cy="12" rx="4" ry="1.5" fill={shirt} stroke="#fff" strokeWidth="0.3" opacity="0.4" />
    {/* Back arm (resting) */}
    <path d="M0,16 Q-2,16 -2,18 L-2,22 Q-2,24 0,24 L2,24 Q3,24 3,22 L3,18 Q3,16 2,16 Z" fill={shirt} opacity=".7" />
    {/* Front arm (typing — bobs up/down) */}
    <g>
      <animateTransform attributeName="transform" type="translate" values="0,0;0,-1.5;0,0;0,1;0,0" dur={dur} repeatCount="indefinite" />
      <path d="M11,17 Q11,16 12,16 L16,17 Q18,17.5 18,19 L17,20 Q16,20.5 14,20 L12,20 Q11,20 11,19 Z" fill={s} />
      {/* Fingers */}
      <path d="M16,18 Q18,17.5 19,18.5 Q19,19.5 17,19.5 Z" fill={s} opacity="0.8" />
    </g>
    {/* Head (3/4 view) — rounded */}
    <ellipse cx="7.5" cy="5.5" rx="6.5" ry="6" fill={s} />
    {/* Face shadow (chin/jaw) */}
    <ellipse cx="7.5" cy="9" rx="5.5" ry="2.5" fill="#000" opacity="0.04" />
    {/* Ear */}
    <ellipse cx="13" cy="5.5" rx="1.5" ry="2" fill={s} opacity="0.8" />
    {/* Hair — with highlight */}
    <path d="M1,4 Q1,-2 7.5,-2 Q14,-2 14,4 L14,2 Q14,0 7.5,-1 Q1,0 1,2 Z" fill={hair} />
    <ellipse cx="5" cy="0" rx="3" ry="1.5" fill="#fff" opacity="0.08" />
    {/* Eye — with white */}
    <ellipse cx="10.5" cy="5" rx="1.8" ry="1.2" fill="#fff" />
    <circle cx="10.8" cy="5" r="1" fill="#222" />
    {/* Eye highlight */}
    <circle cx="10.5" cy="4.5" r="0.5" fill="#fff" opacity="0.5" />
    {/* Eyebrow */}
    <path d="M9,3 Q10.5,2.2 12,3" fill="none" stroke={hair} strokeWidth="0.8" opacity="0.5" />
    {/* Nose */}
    <ellipse cx="13" cy="6.2" rx="1" ry="0.8" fill={s} opacity="0.6" />
    {/* Mouth */}
    <path d="M10,8 Q11,8.8 12,8" fill="none" stroke="#c8907a" strokeWidth="0.8" />
  </g>
  );
};

/* ── Walking person (side view, facing right, legs & arms swing) — refined ── */
const WalkingPerson = ({x,y,hair,skin,shirt,path,pathDur='8s'}:{x:number;y:number;hair:string;skin?:string;shirt:string;path?:string;pathDur?:string}) => {
  const s = skin||'#fcc88a';
  return (
  <g>
    {path && (
      <animateTransform attributeName="transform" type="translate" values={path} dur={pathDur} repeatCount="indefinite" />
    )}
    {!path && <animateTransform attributeName="transform" type="translate" values={`${x},${y}`} dur="0s" repeatCount="indefinite" />}
    {/* Shadow */}
    <ellipse cx="7" cy="42" rx="8" ry="3" fill="rgba(0,0,0,.1)" />
    {/* Back leg (swings) */}
    <g>
      <animateTransform attributeName="transform" type="rotate" values="-12,5,28;12,5,28;-12,5,28" dur="0.5s" repeatCount="indefinite" />
      <path d="M3,28 Q2,28 2,30 L2,38 Q2,40 4,40 L6,40 Q7,40 7,39 L7,30 Q7,28 6,28 Z" fill="#3a3f4a" />
      <ellipse cx="4.5" cy="40" rx="3" ry="1.8" fill="#444" />
    </g>
    {/* Front leg (swings opposite) */}
    <g>
      <animateTransform attributeName="transform" type="rotate" values="12,9,28;-12,9,28;12,9,28" dur="0.5s" repeatCount="indefinite" />
      <path d="M7,28 Q6,28 6,30 L6,38 Q6,40 8,40 L10,40 Q11,40 11,39 L11,30 Q11,28 10,28 Z" fill="#445" />
      <ellipse cx="8.5" cy="40" rx="3" ry="1.8" fill="#555" />
    </g>
    {/* Body */}
    <path d="M2,14 Q0,14 0,17 L0,28 Q0,30 2,30 L12,30 Q14,30 14,28 L14,17 Q14,14 12,14 Z" fill={shirt} />
    {/* Shirt shadow fold */}
    <path d="M1,24 Q0,24 0,25 L0,29 Q0,30 2,30 L12,30 Q14,30 14,29 L14,25 Q14,24 13,24 Z" fill="#000" opacity="0.06" />
    {/* Collar */}
    <ellipse cx="7" cy="14" rx="4" ry="1.5" fill={shirt} stroke="#fff" strokeWidth="0.3" opacity="0.4" />
    {/* Back arm (swings) */}
    <g>
      <animateTransform attributeName="transform" type="rotate" values="15,3,16;-15,3,16;15,3,16" dur="0.5s" repeatCount="indefinite" />
      <path d="M0,15 Q-1,15 -1,17 L-1,23 Q-1,25 1,25 L3,25 Q4,25 4,23 L4,17 Q4,15 3,15 Z" fill={shirt} opacity=".7" />
      <ellipse cx="1.5" cy="25.5" rx="2" ry="1.8" fill={s} opacity=".7" />
    </g>
    {/* Front arm (swings opposite) */}
    <g>
      <animateTransform attributeName="transform" type="rotate" values="-15,11,16;15,11,16;-15,11,16" dur="0.5s" repeatCount="indefinite" />
      <path d="M10,15 Q9,15 9,17 L9,23 Q9,25 11,25 L13,25 Q14,25 14,23 L14,17 Q14,15 13,15 Z" fill={shirt} />
      <ellipse cx="12" cy="25.5" rx="2" ry="1.8" fill={s} />
    </g>
    {/* Head — rounded */}
    <ellipse cx="7.5" cy="7.5" rx="6.5" ry="6" fill={s} />
    {/* Face shadow */}
    <ellipse cx="7.5" cy="11" rx="5.5" ry="2.5" fill="#000" opacity="0.04" />
    {/* Ear */}
    <ellipse cx="13" cy="7.5" rx="1.5" ry="2" fill={s} opacity="0.8" />
    {/* Hair — with highlight */}
    <path d="M1,6 Q1,0 7.5,0 Q14,0 14,6 L14,4 Q14,1 7.5,1 Q1,1 1,4 Z" fill={hair} />
    <ellipse cx="5" cy="2" rx="3" ry="1.5" fill="#fff" opacity="0.08" />
    {/* Eye — with white */}
    <ellipse cx="10.5" cy="7" rx="1.8" ry="1.2" fill="#fff" />
    <circle cx="10.8" cy="7" r="1" fill="#222" />
    <circle cx="10.5" cy="6.5" r="0.5" fill="#fff" opacity="0.5" />
    {/* Eyebrow */}
    <path d="M9,5.5 Q10.5,4.7 12,5.5" fill="none" stroke={hair} strokeWidth="0.8" opacity="0.5" />
    {/* Nose */}
    <ellipse cx="13" cy="8" rx="1" ry="0.8" fill={s} opacity="0.6" />
    {/* Slight body bob while walking */}
    <animateTransform attributeName="transform" type="translate" values="0,0;0,-1;0,0" dur="0.25s" repeatCount="indefinite" additive="sum" />
  </g>
  );
};

/*
  ══ Geometry — Standard isometric slope = 0.5 (2:1 ratio) ══

  ViewBox: 0 0 400 460

  Floor diamond:
    top(200,200)  right(370,285)  bottom(200,370)  left(30,285)
    Edge slope: dy/dx = ±85/170 = ±0.5

  Walls extruded 55px upward:
    Left wall:  (30,285) (200,200) (200,145) (30,230)
    Right wall: (200,200) (370,285) (370,230) (200,145)

  Windows/door edges follow the same slope, sitting flush on walls.
*/

/* Determine phase from current hour */
const getPhaseFromTime = (): TimePhase => {
  const h = new Date().getHours();
  if (h >= 5 && h < 9) return 'dawn';
  if (h >= 9 && h < 17) return 'noon';
  if (h >= 17 && h < 20) return 'dusk';
  return 'night';
};

const IsometricWorld: React.FC = () => {
  const [phase, setPhase] = useState<TimePhase>(getPhaseFromTime);

  // Sync with real time every minute
  useEffect(() => {
    const t = setInterval(() => {
      setPhase(getPhaseFromTime());
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  // Floor diamond — slope 0.5
  const floorPts = '200,200 370,285 200,370 30,285';

  // Walls — 55px height
  const leftWallPts  = '30,285 200,200 200,145 30,230';
  const rightWallPts = '200,200 370,285 370,230 200,145';

  // Door — on right wall, t=0.7 to t=0.9
  // t=0.7: x=319, bot=259.5, top=204.5
  // t=0.9: x=353, bot=276.5, top=221.5
  // Door reaches floor, 5px gap at top
  const doorPts = '319,260 353,277 353,227 319,210';

  return (
    <Container $p={phase}>
      <StarsWrap $on={phase==='night'}>
        {[[8,4,'2.2s'],[22,7,'3.1s'],[45,3,'2.8s'],[65,6,'1.9s'],[82,9,'2.5s'],[38,11,'3.4s'],[55,2,'2.1s'],[12,13,'2.7s'],[88,5,'3s'],[72,2,'2.6s']].map(([x,y,d],i)=>(
          <Star key={i} $x={x as number} $y={y as number} $d={d as string} />
        ))}
      </StarsWrap>

      <Beam $p={phase} $i={0} />
      <Beam $p={phase} $i={1} />

      <Pill>{TIME_LABELS[phase]}</Pill>
      <Btns>{PHASES.map(p=>(
        <Btn key={p} $on={phase===p} $c={BC[p]} onClick={()=>setPhase(p)} />
      ))}</Btns>


      <SceneSvg viewBox="0 0 400 460" preserveAspectRatio="xMidYMax meet">
        {/* ══ Victoria Harbour Skyline ══ */}
        {(() => {
          const bFar  = phase==='night'?'#1a2444':phase==='dusk'?'#6a4a3a':phase==='dawn'?'#8a7a6a':'#99aabb';
          const bMid  = phase==='night'?'#1e2a4e':phase==='dusk'?'#5a3a2e':phase==='dawn'?'#7a6a5a':'#8899aa';
          const bNear = phase==='night'?'#222e52':phase==='dusk'?'#4e322a':phase==='dawn'?'#6a5a4a':'#788899';
          const bDark = phase==='night'?'#162038':phase==='dusk'?'#3e2822':phase==='dawn'?'#5a4a3a':'#667788';
          const winFlicker = phase==='night'||phase==='dusk';
          const winC  = phase==='night'?'#ffe8aa':phase==='dusk'?'#ffe088':phase==='dawn'?'#fff4dd':'#d0e8f4';
          // Water gradient colors
          const wTop  = phase==='night'?'#0a1525':phase==='dusk'?'#2a3a55':phase==='dawn'?'#5a88aa':'#3a7099';
          const wBot  = phase==='night'?'#0e1e30':phase==='dusk'?'#1e3040':phase==='dawn'?'#4a7a60':'#3a8060';
          // Ferris wheel color
          const fwC   = phase==='night'?'#334466':phase==='dusk'?'#5a4a44':'#889988';
          const fwLit = phase==='night'||phase==='dusk';

          /* Generate window grid for a building */
          const bldgWins = (bx: number, by: number, bw: number, bh: number, cols: number, rows: number) => {
            const ws: [number,number,number,number][] = []; // x,y,animDur,animDelay
            const padX = 2, padY = 3;
            const cellW = (bw - padX*2) / cols;
            const cellH = (bh - padY*2) / rows;
            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) {
                // ~70% chance window is lit
                if (((bx*7+r*13+c*31)%10) < 3) continue;
                const wx = bx + padX + c * cellW + 0.5;
                const wy = by + padY + r * cellH + 0.5;
                const dur = 2 + ((bx+r*3+c*7)%8); // 2-9s
                const delay = ((bx*3+r*5+c*11)%20)/10; // 0-2s
                ws.push([wx, wy, dur, delay]);
              }
            }
            return ws;
          };

          // Collect all window positions from major buildings
          const allWins = [
            // Near buildings
            ...bldgWins(42,30,20,50,4,10),   // IFC-like
            ...bldgWins(80,38,22,42,4,8),
            ...bldgWins(130,32,16,48,3,10),  // Lippo
            ...bldgWins(170,40,18,40,3,8),   // Jardine
            ...bldgWins(290,30,18,50,3,10),
            ...bldgWins(330,35,20,45,4,9),
            ...bldgWins(360,42,18,38,3,7),
            ...bldgWins(380,48,16,32,3,6),
            // Mid buildings
            ...bldgWins(55,20,16,60,3,12),   // IFC tower
            ...bldgWins(100,25,18,55,3,11),  // BoC
            ...bldgWins(260,18,16,62,3,12),  // ICC
            ...bldgWins(20,45,14,35,2,7),
            ...bldgWins(200,35,13,45,2,9),
            ...bldgWins(235,42,11,38,2,7),
            ...bldgWins(310,38,14,42,2,8),
            ...bldgWins(340,30,12,50,2,10),
            ...bldgWins(365,40,15,40,3,8),
            ...bldgWins(148,55,35,25,6,4),   // Convention
          ];

          return (
            <g>
              {/* ── Gradient defs ── */}
              <defs>
                <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={wTop} stopOpacity="0" />
                  <stop offset="30%" stopColor={wTop} stopOpacity="0.3" />
                  <stop offset="60%" stopColor={wTop} stopOpacity="0.7" />
                  <stop offset="100%" stopColor={wBot} stopOpacity="0.95" />
                </linearGradient>
                {/* Building shading overlays */}
                <linearGradient id="bldgHi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="bldgSh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#000" stopOpacity="0" />
                  <stop offset="70%" stopColor="#000" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#000" stopOpacity="0.15" />
                </linearGradient>
                <linearGradient id="bldgSide" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#000" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#000" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* ── Wispy clouds — thin, long, semi-transparent ── */}
              {(() => {
                const cloudC = phase==='night'?'#334455':phase==='dusk'?'#cc8866':phase==='dawn'?'#e8c8a0':'#ffffff';
                const cloudOp = phase==='night'?0.08:phase==='dusk'?0.15:phase==='dawn'?0.2:0.18;
                return (
                  <g>
                    {/* Cloud 1 — long wispy streak */}
                    <g opacity={cloudOp}>
                      <animateTransform attributeName="transform" type="translate" values="-80,0;420,0" dur="90s" repeatCount="indefinite" />
                      <ellipse cx="60" cy="18" rx="45" ry="2.5" fill={cloudC} />
                      <ellipse cx="40" cy="16" rx="20" ry="1.8" fill={cloudC} opacity="0.6" />
                      <ellipse cx="85" cy="20" rx="25" ry="1.5" fill={cloudC} opacity="0.5" />
                    </g>
                    {/* Cloud 2 — thinner, higher */}
                    <g opacity={cloudOp * 0.7}>
                      <animateTransform attributeName="transform" type="translate" values="450,0;-100,0" dur="120s" repeatCount="indefinite" />
                      <ellipse cx="200" cy="8" rx="55" ry="2" fill={cloudC} />
                      <ellipse cx="230" cy="10" rx="30" ry="1.5" fill={cloudC} opacity="0.5" />
                    </g>
                    {/* Cloud 3 — sparse wisps */}
                    <g opacity={cloudOp * 0.5}>
                      <animateTransform attributeName="transform" type="translate" values="-50,0;380,0" dur="150s" repeatCount="indefinite" />
                      <ellipse cx="120" cy="28" rx="35" ry="1.8" fill={cloudC} />
                      <ellipse cx="150" cy="26" rx="18" ry="1.2" fill={cloudC} opacity="0.4" />
                    </g>
                  </g>
                );
              })()}

              {/* ── Airplane — tiny, subtle, flies across occasionally ── */}
              {(() => {
                const planeC = phase==='night'?'#556677':phase==='dusk'?'#887766':'#99aabb';
                const planeOp = phase==='night'?0.15:0.12;
                return (
                  <g opacity={planeOp}>
                    <animateTransform attributeName="transform" type="translate" values="-30,0;430,-8" dur="45s" repeatCount="indefinite" />
                    {/* Fuselage */}
                    <rect x="0" y="12" width="8" height="1.5" rx="0.75" fill={planeC} />
                    {/* Wings */}
                    <rect x="2" y="10" width="3" height="5" rx="0.5" fill={planeC} opacity="0.7" />
                    {/* Tail */}
                    <rect x="-1" y="10.5" width="1.5" height="3" rx="0.5" fill={planeC} opacity="0.6" />
                    {/* Blinking light (night only) */}
                    {phase==='night' && (
                      <circle cx="8" cy="12.5" r="0.5" fill="#ff3333">
                        <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                    )}
                  </g>
                );
              })()}

              {/* ── Far buildings (depth layer 1) — with rooftop variety ── */}
              <g opacity="0.4">
                {[[10,42,12,38],[30,48,10,32],[50,35,14,45],[72,50,9,30],[88,38,11,42],
                  [108,52,10,28],[125,44,8,36],[140,48,12,32],[160,40,10,40],[178,55,8,25],
                  [195,45,11,35],[215,50,9,30],[232,42,12,38],[252,54,8,26],[268,46,10,34],
                  [285,50,12,30],[305,40,9,40],[322,52,11,28],[340,44,10,36],[358,48,12,32],
                  [378,42,14,38]].map(([x,y,w,h],i) => (
                  <g key={`bf${i}`}>
                    <rect x={x} y={y} width={w} height={h} fill={bFar} />
                    <rect x={x} y={y} width={w} height={h} fill="url(#bldgHi)" />
                    <rect x={x} y={y} width={w} height={h} fill="url(#bldgSh)" />
                    {/* Left edge highlight */}
                    <line x1={x} y1={y} x2={x} y2={y+h} stroke="#fff" strokeWidth="0.4" opacity="0.15" />
                    {/* Rooftop details — alternate between antenna, flat equipment, spire */}
                    {i%5===0 && <rect x={x+w/2-0.5} y={y-6} width="1" height="6" fill={bFar} />}
                    {i%5===1 && <rect x={x+2} y={y-2} width={w-4} height="2" rx="0.5" fill={bFar} opacity="0.7" />}
                    {i%5===2 && <polygon points={`${x+w/2},${y-4} ${x+w/2-2},${y} ${x+w/2+2},${y}`} fill={bFar} />}
                    {i%5===3 && <>
                      <rect x={x+1} y={y-1.5} width="2" height="1.5" fill={bFar} opacity="0.6" />
                      <rect x={x+w-3} y={y-1.5} width="2" height="1.5" fill={bFar} opacity="0.6" />
                    </>}
                  </g>
                ))}
              </g>

              {/* ── Mid buildings (depth layer 2) — with architectural detail ── */}
              <g opacity="0.6">
                {/* IFC Tower — stepped crown */}
                <rect x="55" y="20" width="16" height="60" fill={bMid} />
                <rect x="55" y="20" width="16" height="60" fill="url(#bldgHi)" />
                <line x1="55" y1="20" x2="55" y2="80" stroke="#fff" strokeWidth="0.5" opacity="0.12" />
                <rect x="58" y="16" width="10" height="6" fill={bMid} />
                <rect x="61" y="10" width="4" height="8" fill={bMid} />
                <rect x="62" y="6" width="2" height="5" fill={bMid} opacity="0.8" />
                {/* Horizontal bands */}
                <line x1="55" y1="35" x2="71" y2="35" stroke="#fff" strokeWidth="0.3" opacity="0.1" />
                <line x1="55" y1="50" x2="71" y2="50" stroke="#fff" strokeWidth="0.3" opacity="0.1" />
                <line x1="55" y1="65" x2="71" y2="65" stroke="#fff" strokeWidth="0.3" opacity="0.1" />

                {/* Bank of China — triangulated facade */}
                <rect x="100" y="25" width="18" height="55" fill={bMid} />
                <rect x="100" y="25" width="18" height="55" fill="url(#bldgHi)" />
                <polygon points="100,25 109,8 118,25" fill={bMid} />
                <line x1="100" y1="25" x2="100" y2="80" stroke="#fff" strokeWidth="0.5" opacity="0.12" />
                {/* Diagonal cross-bracing (BoC signature) */}
                <line x1="100" y1="25" x2="118" y2="55" stroke="#fff" strokeWidth="0.4" opacity="0.08" />
                <line x1="118" y1="25" x2="100" y2="55" stroke="#fff" strokeWidth="0.4" opacity="0.08" />
                <line x1="100" y1="55" x2="118" y2="80" stroke="#fff" strokeWidth="0.4" opacity="0.08" />
                {/* Antenna mast */}
                <rect x="108" y="2" width="1" height="7" fill={bMid} opacity="0.7" />

                {/* Convention Centre — curved roof */}
                <rect x="148" y="55" width="35" height="25" rx="2" fill={bMid} />
                <rect x="148" y="55" width="35" height="25" fill="url(#bldgSh)" />
                <polygon points="148,55 165,48 183,55" fill={bMid} />
                <line x1="165" y1="48" x2="165" y2="55" stroke="#fff" strokeWidth="0.3" opacity="0.1" />

                {/* ICC Tower — tallest, tapered top */}
                <rect x="260" y="18" width="16" height="62" fill={bMid} />
                <rect x="260" y="18" width="16" height="62" fill="url(#bldgHi)" />
                <line x1="260" y1="18" x2="260" y2="80" stroke="#fff" strokeWidth="0.5" opacity="0.12" />
                <rect x="263" y="12" width="10" height="8" fill={bMid} />
                <rect x="266" y="6" width="4" height="8" fill={bMid} />
                <rect x="267" y="1" width="2" height="6" fill={bMid} opacity="0.7" />
                {/* Horizontal bands */}
                <line x1="260" y1="30" x2="276" y2="30" stroke="#fff" strokeWidth="0.3" opacity="0.1" />
                <line x1="260" y1="45" x2="276" y2="45" stroke="#fff" strokeWidth="0.3" opacity="0.1" />
                <line x1="260" y1="60" x2="276" y2="60" stroke="#fff" strokeWidth="0.3" opacity="0.1" />

                {/* Secondary towers */}
                <rect x="20" y="45" width="14" height="35" fill={bMid} />
                <rect x="20" y="45" width="14" height="35" fill="url(#bldgHi)" />
                <rect x="24" y="42" width="6" height="4" fill={bMid} opacity="0.7" />

                <rect x="200" y="35" width="13" height="45" fill={bMid} />
                <rect x="200" y="35" width="13" height="45" fill="url(#bldgHi)" />
                <rect x="204" y="32" width="5" height="4" fill={bMid} opacity="0.7" />

                <rect x="235" y="42" width="11" height="38" fill={bMid} />
                <rect x="235" y="42" width="11" height="38" fill="url(#bldgHi)" />

                <rect x="310" y="38" width="14" height="42" fill={bMid} />
                <rect x="310" y="38" width="14" height="42" fill="url(#bldgHi)" />
                <rect x="314" y="35" width="6" height="4" fill={bMid} opacity="0.7" />

                <rect x="340" y="30" width="12" height="50" fill={bMid} />
                <rect x="340" y="30" width="12" height="50" fill="url(#bldgHi)" />
                <rect x="344" y="26" width="4" height="5" fill={bMid} opacity="0.7" />

                <rect x="365" y="40" width="15" height="40" fill={bMid} />
                <rect x="365" y="40" width="15" height="40" fill="url(#bldgHi)" />
              </g>

              {/* ── Near buildings (depth layer 3) — detailed silhouettes ── */}
              <g opacity="0.85">
                {/* IFC-like twin tower */}
                <rect x="42" y="30" width="20" height="50" fill={bNear} />
                <rect x="42" y="30" width="20" height="50" fill="url(#bldgHi)" />
                <rect x="42" y="30" width="20" height="50" fill="url(#bldgSh)" />
                <line x1="42" y1="30" x2="42" y2="80" stroke="#fff" strokeWidth="0.6" opacity="0.15" />
                <rect x="47" y="24" width="10" height="8" fill={bDark} />
                <rect x="50" y="20" width="4" height="5" fill={bDark} opacity="0.8" />
                {/* Rooftop helipad marker */}
                <ellipse cx="52" cy="31" rx="4" ry="1" fill="none" stroke="#fff" strokeWidth="0.3" opacity="0.12" />

                {/* Wide commercial tower */}
                <rect x="80" y="38" width="22" height="42" fill={bNear} />
                <rect x="80" y="38" width="22" height="42" fill="url(#bldgHi)" />
                <rect x="80" y="38" width="22" height="42" fill="url(#bldgSh)" />
                <line x1="80" y1="38" x2="80" y2="80" stroke="#fff" strokeWidth="0.6" opacity="0.15" />
                {/* Rooftop equipment */}
                <rect x="84" y="36" width="6" height="2.5" fill={bDark} opacity="0.7" />
                <rect x="94" y="35" width="4" height="3.5" fill={bDark} opacity="0.7" />

                {/* Lippo Centre — koala tree style */}
                <rect x="130" y="32" width="16" height="48" fill={bNear} />
                <rect x="130" y="32" width="16" height="48" fill="url(#bldgHi)" />
                <line x1="130" y1="32" x2="130" y2="80" stroke="#fff" strokeWidth="0.6" opacity="0.15" />
                {/* Side fins (Lippo signature) */}
                <rect x="128" y="44" width="4" height="14" fill={bDark} />
                <rect x="146" y="44" width="4" height="14" fill={bDark} />
                <rect x="128" y="62" width="3" height="10" fill={bDark} opacity="0.7" />
                <rect x="147" y="62" width="3" height="10" fill={bDark} opacity="0.7" />

                {/* Jardine House — circular windows style */}
                <rect x="170" y="40" width="18" height="40" fill={bNear} />
                <rect x="170" y="40" width="18" height="40" fill="url(#bldgHi)" />
                <rect x="170" y="40" width="18" height="40" fill="url(#bldgSh)" />
                <line x1="170" y1="40" x2="170" y2="80" stroke="#fff" strokeWidth="0.6" opacity="0.15" />
                <rect x="176" y="37" width="6" height="4" fill={bDark} opacity="0.7" />

                {/* Kowloon side towers */}
                <rect x="290" y="30" width="18" height="50" fill={bNear} />
                <rect x="290" y="30" width="18" height="50" fill="url(#bldgHi)" />
                <rect x="290" y="30" width="18" height="50" fill="url(#bldgSh)" />
                <line x1="290" y1="30" x2="290" y2="80" stroke="#fff" strokeWidth="0.6" opacity="0.15" />
                <rect x="296" y="27" width="6" height="4" fill={bDark} opacity="0.7" />

                <rect x="330" y="35" width="20" height="45" fill={bNear} />
                <rect x="330" y="35" width="20" height="45" fill="url(#bldgHi)" />
                <rect x="330" y="35" width="20" height="45" fill="url(#bldgSh)" />
                <line x1="330" y1="35" x2="330" y2="80" stroke="#fff" strokeWidth="0.6" opacity="0.15" />
                <rect x="337" y="32" width="6" height="4" fill={bDark} opacity="0.7" />

                <rect x="360" y="42" width="18" height="38" fill={bNear} />
                <rect x="360" y="42" width="18" height="38" fill="url(#bldgHi)" />
                <line x1="360" y1="42" x2="360" y2="80" stroke="#fff" strokeWidth="0.6" opacity="0.15" />

                <rect x="380" y="48" width="16" height="32" fill={bNear} />
                <rect x="380" y="48" width="16" height="32" fill="url(#bldgHi)" />
                <line x1="380" y1="48" x2="380" y2="80" stroke="#fff" strokeWidth="0.6" opacity="0.15" />
              </g>

              {/* ── Ferris wheel (HK Observation Wheel) — red gondolas ── */}
              {(() => {
                const fwStruct = phase==='night'?'#445566':phase==='dusk'?'#6a5a4a':'#778888';
                const gondolaDay = '#cc3333';
                return (
                <g transform="translate(210,18)" opacity={phase==='night'?0.85:0.6}>
                  {/* Support legs (static) */}
                  <line x1="22" y1="50" x2="6" y2="70" stroke={fwStruct} strokeWidth="2" />
                  <line x1="22" y1="50" x2="38" y2="70" stroke={fwStruct} strokeWidth="2" />
                  {/* Cross brace */}
                  <line x1="14" y1="60" x2="30" y2="60" stroke={fwStruct} strokeWidth="1" opacity="0.5" />
                  {/* Base platform */}
                  <rect x="4" y="68" width="36" height="3" rx="1" fill={fwStruct} opacity="0.6" />
                  {/* Rotating parts — pivot around local center (22,22) */}
                  <g>
                    <animateTransform attributeName="transform" type="rotate" values="0,22,22;360,22,22" dur="40s" repeatCount="indefinite" />
                    {/* Rim */}
                    <circle cx="22" cy="22" r="28" fill="none" stroke={fwStruct} strokeWidth="1.8" />
                    {/* Inner rim */}
                    <circle cx="22" cy="22" r="25" fill="none" stroke={fwStruct} strokeWidth="0.3" opacity="0.4" />
                    {/* Spokes */}
                    {[0,45,90,135].map((a,i) => {
                      const rad = a * Math.PI / 180;
                      return <line key={`sp${i}`} x1={22+28*Math.cos(rad)} y1={22+28*Math.sin(rad)} x2={22-28*Math.cos(rad)} y2={22-28*Math.sin(rad)} stroke={fwStruct} strokeWidth="0.5" />;
                    })}
                    {/* Hub */}
                    <circle cx="22" cy="22" r="3" fill={fwStruct} />
                    {/* Gondolas — red by day, colorful lights at night */}
                    {[0,30,60,90,120,150,180,210,240,270,300,330].map((a,i) => {
                      const rad = a * Math.PI / 180;
                      const gx = 22 + 28*Math.cos(rad);
                      const gy = 22 + 28*Math.sin(rad);
                      const nightColors = ['#ff4466','#44aaff','#ffcc00','#44ff88','#ff88cc','#88ddff'];
                      return <circle key={`gd${i}`} cx={gx} cy={gy} r={fwLit?2.2:1.5} fill={fwLit?nightColors[i%6]:gondolaDay} opacity={fwLit?0.9:0.7}>
                        {fwLit && <animate attributeName="opacity" values="0.4;1;0.4" dur={`${1.2+i*0.15}s`} repeatCount="indefinite" />}
                      </circle>;
                    })}
                  </g>
                </g>
                );
              })()}

              {/* ── Window lights — all phases ── */}
              <g>
                {allWins.map(([wx,wy,dur,delay],i) => (
                  <rect key={`wl${i}`} x={wx} y={wy} width="2" height="1.5" fill={winC}
                    opacity={winFlicker ? undefined : (0.35 + ((i*7)%5)/20)}>
                    {winFlicker && (
                      <animate attributeName="opacity"
                        values={`${0.3+((i*7)%5)/10};${0.7+((i*3)%4)/10};${0.2+((i*11)%6)/10};${0.8+((i*5)%3)/10};${0.3+((i*7)%5)/10}`}
                        dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
                    )}
                  </rect>
                ))}
              </g>

              {/* ── Victoria Harbour — wider gradient water, bottom-up fade ── */}
              <rect x="0" y="60" width="400" height="50" fill="url(#waterGrad)" />
              {/* Soft shimmer reflections */}
              <g opacity="0.18">
                {[[15,85,30],[60,90,25],[100,88,20],[150,92,35],[210,87,28],[265,91,22],[310,89,30],[365,93,20],
                  [40,95,18],[130,97,22],[190,94,16],[280,96,20],[340,98,25]].map(([x,y,w],i) => (
                  <rect key={`wr${i}`} x={x} y={y} width={w} height="1.5" rx="1" fill="#fff">
                    <animate attributeName="opacity" values="0.1;0.3;0.1" dur={`${2+i*0.3}s`} repeatCount="indefinite" />
                  </rect>
                ))}
              </g>
              {/* Night window reflections in water */}
              {winFlicker && (
                <g opacity="0.15">
                  {[[50,92,4],[100,90,5],[170,95,4],[220,92,5],[265,94,4],[335,93,5],[80,98,3],[300,97,4]].map(([rx,ry,rw],i) => (
                    <rect key={`nr${i}`} x={rx} y={ry} width={rw} height="12" fill={winC} rx="1">
                      <animate attributeName="opacity" values="0.08;0.22;0.08" dur={`${3+i*0.5}s`} repeatCount="indefinite" />
                    </rect>
                  ))}
                </g>
              )}

              {/* ── Golden Bauhinia sculpture (金紫荊廣場) — smaller, base on horizon ── */}
              <g transform="translate(155,58) scale(0.65)">
                {/* Pedestal — tiered base, bottom aligns with building ground y≈80 */}
                <rect x="-8" y="28" width="22" height="5" rx="1" fill="#8a7008" />
                <rect x="-6" y="23" width="18" height="6" rx="1" fill="#b8960a" />
                <rect x="-4" y="19" width="14" height="5" rx="1" fill="#d4aa0c" />
                {/* Stem */}
                <rect x="1" y="8" width="4" height="12" fill="#c8a00c" />
                {/* Petals blooming upward (side view — fan shape) */}
                <path d="M3,8 Q-8,-4 -5,-14 Q-2,-6 3,0" fill="#d4aa0c" stroke="#b8960a" strokeWidth="0.4" />
                <path d="M3,8 Q-3,-2 0,-13 Q1,-4 3,1" fill="#e0b810" stroke="#c8a00c" strokeWidth="0.3" />
                <path d="M3,8 Q3,-5 3,-16 Q4,-5 4,8" fill="#e8c020" stroke="#d4aa0c" strokeWidth="0.3" />
                <path d="M3,8 Q6,-2 6,-13 Q6,-4 4,1" fill="#e0b810" stroke="#c8a00c" strokeWidth="0.3" />
                <path d="M3,8 Q14,-4 11,-14 Q8,-6 4,0" fill="#d4aa0c" stroke="#b8960a" strokeWidth="0.4" />
                {/* Stamen dots */}
                <circle cx="0" cy="-6" r="0.8" fill="#f0d030" />
                <circle cx="3" cy="-9" r="0.8" fill="#f0d030" />
                <circle cx="6" cy="-6" r="0.8" fill="#f0d030" />
              </g>

              {/* ── Hong Kong flag — pole base on horizon line, natural wave ── */}
              <g transform="translate(130,30)">
                {/* Pole — base at local y=50 → global y=80 = horizon */}
                <rect x="0" y="0" width="1.8" height="50" fill="#999" />
                <circle cx="0.9" cy="-1" r="1.8" fill="#bbb" />
                {/* Waving flag — path morphing for natural ripple */}
                <g>
                  <path fill="#de2910">
                    <animate attributeName="d" dur="3s" repeatCount="indefinite"
                      values="M1.8,2 C6,1 13,3 19.8,2 L19.8,14 C13,15 6,13 1.8,14 Z;M1.8,2 C6,4.5 13,-0.5 19.8,3 L19.8,15 C13,11.5 6,16.5 1.8,14 Z;M1.8,2 C6,-0.5 13,5 19.8,1 L19.8,13 C13,17 6,11 1.8,14 Z;M1.8,2 C6,3 13,1 19.8,3.5 L19.8,15.5 C13,13 6,15 1.8,14 Z;M1.8,2 C6,1 13,3 19.8,2 L19.8,14 C13,15 6,13 1.8,14 Z" />
                  </path>
                  {/* Shadow/fold lines on flag for depth */}
                  <path fill="rgba(0,0,0,0.1)" strokeWidth="0">
                    <animate attributeName="d" dur="3s" repeatCount="indefinite"
                      values="M7,2.5 C9,2 11,3 13,2.5 L13,13.5 C11,14 9,13 7,13.5 Z;M7,5 C9,3 11,5 13,3 L13,14 C11,15 9,13 7,15 Z;M7,1 C9,3 11,1 13,3.5 L13,15 C11,13 9,15 7,12 Z;M7,3.5 C9,2 11,4 13,2.5 L13,14.5 C11,14 9,14 7,14 Z;M7,2.5 C9,2 11,3 13,2.5 L13,13.5 C11,14 9,13 7,13.5 Z" />
                  </path>
                  {/* White bauhinia — gently shifts with wave */}
                  <g>
                    <animateTransform attributeName="transform" type="translate" values="0,0;0.5,0.6;-0.3,-0.4;0.3,0.3;0,0" dur="3s" repeatCount="indefinite" />
                    <g transform="translate(10.8,8)">
                      {[0,72,144,216,288].map((a,i) => {
                        const rad = (a - 90) * Math.PI / 180;
                        return <ellipse key={`fb${i}`} cx={1.5*Math.cos(rad)} cy={1.5*Math.sin(rad)} rx="1" ry="2.2" fill="#fff"
                          transform={`rotate(${a},${1.5*Math.cos(rad)},${1.5*Math.sin(rad)})`} />;
                      })}
                    </g>
                  </g>
                </g>
              </g>
            </g>
          );
        })()}

        {/* ── Natural grass landscape ── */}
        {/* Scattered grass tufts — varied sizes and shades */}
        {[[15,170,1],[375,180,0.8],[12,360,1.1],[380,355,0.9],[20,310,1],[375,300,0.7],
          [55,410,1.2],[340,420,0.8],[45,155,0.7],[355,160,0.9],[25,260,0.6],[385,270,0.8],
          [180,140,0.5],[200,155,0.6],[160,160,0.7],[50,190,0.8],[345,195,0.6],
          [35,390,0.9],[365,385,0.7],[80,430,0.5],[310,435,0.6],
          [190,405,0.8],[155,390,0.5],[240,395,0.7]].map(([x,y,s],i) => (
          <g key={`g${i}`} transform={`translate(${x},${y}) scale(${s})`}>
            <path d="M1.5,8 Q0,4 -1,1 Q1.5,3 3,8 Z" fill={i%3===0?'#3da832':i%3===1?'#4cb840':'#55c84a'} />
            <path d="M5.5,8 Q6,3 8,2 Q6.5,4 7,8 Z" fill={i%2===0?'#4cb840':'#3da832'} />
            {i%4===0 && <path d="M8,8 Q9,3 10,1 Q9.5,4 9.5,8 Z" fill="#45b838" />}
          </g>
        ))}

        {/* Small bushes — layered, with shadow */}
        {[[30,180],[365,175],[40,280],[360,275],[180,125],[200,130],[15,400],[385,395]].map(([x,y],i) => (
          <g key={`bush${i}`} transform={`translate(${x},${y})`}>
            {/* Bush shadow */}
            <ellipse cx="7" cy="7" rx={6+i%3} ry="2" fill="rgba(0,0,0,.05)" />
            {/* Base layer (darker) */}
            <ellipse cx="5" cy="3" rx={5+i%3} ry={3+i%2} fill={i%2===0?'#2d8a24':'#3a9a2e'} />
            {/* Top layer (lighter) */}
            <ellipse cx="4" cy="1" rx={4+i%3} ry={2+i%2} fill={i%2===0?'#45a835':'#4aaa3a'} />
            <ellipse cx="9" cy="3" rx={4+i%2} ry={2.5} fill={i%2===0?'#3a9a30':'#3a8a2a'} />
            {/* Highlight */}
            <ellipse cx="4" cy="0" rx={2} ry={1} fill="#fff" opacity="0.06" />
          </g>
        ))}

        {/* ── Trees — multi-layered foliage ── */}
        {[[8,130,false],[370,145,true],[5,345,false],[375,350,true]].map(([x,y,dark],i) => (
          <g key={`t${i}`} transform={`translate(${x as number},${y as number})`}>
            {/* Tree shadow on ground */}
            <ellipse cx="11" cy="40" rx="10" ry="3" fill="rgba(0,0,0,.06)" />
            {/* Trunk with bark texture */}
            <rect x="9" y="26" width="5" height="14" fill="#7a5a14" />
            <rect x="9" y="26" width="2" height="14" fill="#8B6914" />
            <line x1="10" y1="28" x2="10" y2="38" stroke="#6a4a0e" strokeWidth="0.4" opacity="0.3" />
            <line x1="12" y1="27" x2="12" y2="39" stroke="#6a4a0e" strokeWidth="0.3" opacity="0.2" />
            {/* Bottom foliage (largest, darkest) */}
            <ellipse cx="11" cy="22" rx="12" ry="10" fill={dark?'#2d7a24':'#3a9a30'} />
            {/* Middle foliage */}
            <ellipse cx="10" cy="14" rx="10" ry="8" fill={dark?'#3a8a30':'#4caf40'} />
            {/* Top foliage (smallest, lightest) */}
            <ellipse cx="11" cy="6" rx="7" ry="6" fill={dark?'#4aa83e':'#5cc450'} />
            {/* Highlight spots */}
            <ellipse cx="8" cy="10" rx="3" ry="2" fill="#fff" opacity="0.06" />
            <ellipse cx="13" cy="4" rx="2" ry="1.5" fill="#fff" opacity="0.08" />
          </g>
        ))}

        {/* ── Flowers — with petal detail ── */}
        <g transform="translate(42,320)">
          <path d="M3.5,8 Q3,5 4,4 Q5,5 4.5,8 Z" fill="#4a8a35" />
          <path d="M2,7 Q0.5,5 1.5,4.5 Q2.5,5 2.5,7 Z" fill="#5a9a40" />
          {/* Flower petals */}
          {[0,72,144,216,288].map((a,i) => {
            const rad = a * Math.PI / 180;
            return <ellipse key={`fp1${i}`} cx={4+2.5*Math.cos(rad)} cy={2+2.5*Math.sin(rad)} rx="1.8" ry="2.5" fill="#e85070" transform={`rotate(${a},${4+2.5*Math.cos(rad)},${2+2.5*Math.sin(rad)})`} />;
          })}
          <circle cx="4" cy="2" r="1.5" fill="#ffdd44" />
          <rect x="0" y="8" width="8" height="5" rx="2.5" fill="#c47a5a" stroke="#aa6644" strokeWidth="0.3" />
        </g>
        <g transform="translate(365,290)">
          <path d="M3.5,8 Q3,5 4,4 Q5,5 4.5,8 Z" fill="#4a8a35" />
          <path d="M6,7 Q7,5 6.5,4 Q5.5,5 5.5,7 Z" fill="#5a9a40" />
          {[0,72,144,216,288].map((a,i) => {
            const rad = a * Math.PI / 180;
            return <ellipse key={`fp2${i}`} cx={4+2.5*Math.cos(rad)} cy={2+2.5*Math.sin(rad)} rx="1.8" ry="2.5" fill="#ffaa44" transform={`rotate(${a},${4+2.5*Math.cos(rad)},${2+2.5*Math.sin(rad)})`} />;
          })}
          <circle cx="4" cy="2" r="1.5" fill="#fff4aa" />
          <rect x="0" y="8" width="8" height="5" rx="2.5" fill="#c47a5a" stroke="#aa6644" strokeWidth="0.3" />
        </g>
        {/* Extra small flowers — with center dot */}
        {[[55,165,'#ff6b8a'],[350,170,'#ffaa55'],[25,285,'#dd77cc'],[380,290,'#77bbee']].map(([x,y,c],i) => (
          <g key={`fl${i}`} transform={`translate(${x},${y})`}>
            <path d="M2.5,6 Q2,4 2.8,3 Q3.5,4 3,6 Z" fill="#4a8a35" />
            {[0,90,180,270].map((a,j) => {
              const rad = a * Math.PI / 180;
              return <ellipse key={`sfp${i}${j}`} cx={3+1.5*Math.cos(rad)} cy={1.5+1.5*Math.sin(rad)} rx="1" ry="1.5" fill={c as string} transform={`rotate(${a},${3+1.5*Math.cos(rad)},${1.5+1.5*Math.sin(rad)})`} />;
            })}
            <circle cx="3" cy="1.5" r="1" fill="#ffee88" />
          </g>
        ))}

        {/* ── Street lamps (middle grass area) ── */}
        {(() => {
          const lampOn = phase === 'night' || phase === 'dusk';
          const lampGlow = phase === 'night' ? '#ffe8aa' : '#ffdd88';
          return (
            <>
              {/* Lamp 1 — left side */}
              <g transform="translate(55,140)">
                {/* Pole */}
                <rect x="3" y="5" width="2.5" height="35" rx="1.2" fill="#666" />
                {/* Arm */}
                <path d="M5,4 Q5,2 7,2 L12,2 Q13,2 13,3 L13,4 Q13,5 12,5 L7,5 Q5,5 5,4 Z" fill="#666" />
                {/* Lamp head */}
                <rect x="10" y="0" width="6" height="5" rx="2.5" fill={lampOn?'#ffe8aa':'#888'} stroke="#555" strokeWidth="0.5" />
                {lampOn && (
                  <>
                    <rect x="10" y="0" width="6" height="5" rx="2.5" fill={lampGlow} opacity="0.9" />
                    {/* Glow effect */}
                    <ellipse cx="13" cy="8" rx="10" ry="14" fill={lampGlow} opacity="0.06" />
                    <ellipse cx="13" cy="6" rx="5" ry="8" fill={lampGlow} opacity="0.1" />
                  </>
                )}
                {/* Base */}
                <rect x="1" y="38" width="6" height="3" rx="1" fill="#555" />
              </g>

              {/* Lamp 2 — right side */}
              <g transform="translate(340,145)">
                <rect x="3" y="5" width="2.5" height="35" rx="1.2" fill="#666" />
                <path d="M3,4 Q3,2 1,2 L-4,2 Q-5,2 -5,3 L-5,4 Q-5,5 -4,5 L1,5 Q3,5 3,4 Z" fill="#666" />
                <rect x="-8" y="0" width="6" height="5" rx="2.5" fill={lampOn?'#ffe8aa':'#888'} stroke="#555" strokeWidth="0.5" />
                {lampOn && (
                  <>
                    <rect x="-8" y="0" width="6" height="5" rx="2.5" fill={lampGlow} opacity="0.9" />
                    <ellipse cx="-5" cy="8" rx="10" ry="14" fill={lampGlow} opacity="0.06" />
                    <ellipse cx="-5" cy="6" rx="5" ry="8" fill={lampGlow} opacity="0.1" />
                  </>
                )}
                <rect x="1" y="38" width="6" height="3" rx="1" fill="#555" />
              </g>
            </>
          );
        })()}

        {/* ── Park benches (below the lamps) ── */}
        {/* Bench 1 — left */}
        <g transform="translate(45,182)">
          {/* Seat */}
          <polygon points="0,4 20,14 20,16 0,6" fill="#8B6914" stroke="#6a4a0e" strokeWidth="0.5" />
          {/* Backrest */}
          <polygon points="0,0 20,10 20,13 0,3" fill="#a07818" stroke="#6a4a0e" strokeWidth="0.5" />
          {/* Legs */}
          <rect x="1" y="6" width="2" height="6" fill="#555" />
          <rect x="17" y="16" width="2" height="6" fill="#555" />
          <rect x="9" y="11" width="2" height="6" fill="#555" />
          {/* Armrests */}
          <rect x="0" y="2" width="2" height="5" rx="0.5" fill="#6a4a0e" />
          <rect x="18" y="12" width="2" height="5" rx="0.5" fill="#6a4a0e" />
        </g>
        {/* Bench 2 — right */}
        <g transform="translate(335,187)">
          <polygon points="20,4 0,14 0,16 20,6" fill="#8B6914" stroke="#6a4a0e" strokeWidth="0.5" />
          <polygon points="20,0 0,10 0,13 20,3" fill="#a07818" stroke="#6a4a0e" strokeWidth="0.5" />
          <rect x="17" y="6" width="2" height="6" fill="#555" />
          <rect x="1" y="16" width="2" height="6" fill="#555" />
          <rect x="9" y="11" width="2" height="6" fill="#555" />
          <rect x="18" y="2" width="2" height="5" rx="0.5" fill="#6a4a0e" />
          <rect x="0" y="12" width="2" height="5" rx="0.5" fill="#6a4a0e" />
        </g>

        {/* ── Floor (diamond) — refined with subtle gradient ── */}
        <defs>
          <linearGradient id="floorGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#efe8da" />
            <stop offset="50%" stopColor="#e8dfd0" />
            <stop offset="100%" stopColor="#ddd4c4" />
          </linearGradient>
        </defs>
        <polygon points={floorPts} fill="url(#floorGrad)" stroke="#c8c0a8" strokeWidth="1.5" />
        {/* Floor tile grid — denser for detail */}
        <g stroke="#d5ccba" strokeWidth="0.6" opacity="0.4">
          {/* Parallel to left edge (slope -0.5) — more lines */}
          <line x1="52" y1="296" x2="222" y2="211" />
          <line x1="73" y1="306" x2="243" y2="221" />
          <line x1="94" y1="317" x2="264" y2="232" />
          <line x1="115" y1="328" x2="285" y2="243" />
          <line x1="137" y1="339" x2="307" y2="254" />
          <line x1="158" y1="349" x2="328" y2="264" />
          <line x1="179" y1="360" x2="349" y2="275" />
          {/* Parallel to right edge (slope +0.5) */}
          <line x1="349" y1="296" x2="179" y2="211" />
          <line x1="328" y1="306" x2="158" y2="221" />
          <line x1="307" y1="317" x2="137" y2="232" />
          <line x1="285" y1="328" x2="115" y2="243" />
          <line x1="264" y1="339" x2="94" y2="254" />
          <line x1="243" y1="349" x2="73" y2="264" />
          <line x1="222" y1="360" x2="52" y2="275" />
        </g>
        {/* Subtle floor shadow near walls */}
        <polygon points="200,200 370,285 200,230 30,285" fill="#000" opacity="0.03" />

        {/* ── Left wall — with gradient and detailed brick ── */}
        <defs>
          <linearGradient id="lwGrad" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor="#e5dfd4" />
            <stop offset="100%" stopColor="#d0c8b8" />
          </linearGradient>
        </defs>
        <polygon points={leftWallPts} fill="url(#lwGrad)" stroke="#bbb4a0" strokeWidth="1" />
        {/* Brick courses — more lines for detail */}
        <g stroke="#c8c0b0" strokeWidth="0.4" opacity="0.3">
          <line x1="30" y1="275" x2="200" y2="190" />
          <line x1="30" y1="267" x2="200" y2="182" />
          <line x1="30" y1="258" x2="200" y2="173" />
          <line x1="30" y1="248" x2="200" y2="163" />
          <line x1="30" y1="239" x2="200" y2="154" />
        </g>
        {/* Vertical mortar joints (staggered) */}
        <g stroke="#c8c0b0" strokeWidth="0.3" opacity="0.15">
          {[60,90,120,150,170].map((x,i) => {
            const yBot = 285 - (x-30)*0.5;
            const yTop = yBot - 55;
            return <line key={`lmj${i}`} x1={x} y1={yBot} x2={x} y2={yTop} />;
          })}
        </g>
        {/* Wall top edge highlight */}
        <line x1="30" y1="230" x2="200" y2="145" stroke="#fff" strokeWidth="0.6" opacity="0.2" />

        {/* Left wall window — enhanced glass effect */}
        <polygon points="75,253 140,220 140,185 75,218" fill="#78bbdd" stroke="#4a7a99" strokeWidth="1.5" />
        {/* Glass gradient overlay */}
        <polygon points="75,253 140,220 140,185 75,218" fill="url(#bldgHi)" />
        {/* Window cross */}
        <line x1="108" y1="236" x2="108" y2="201" stroke="#4a7a99" strokeWidth="1" />
        <line x1="75" y1="236" x2="140" y2="203" stroke="#4a7a99" strokeWidth="1" />
        {/* Shine — brighter */}
        <polygon points="78,249 78,222 100,211 100,238" fill="rgba(255,255,255,.25)" />
        {/* Window sill shadow */}
        <line x1="75" y1="253" x2="140" y2="220" stroke="#000" strokeWidth="0.8" opacity="0.08" />

        {/* ── Right wall — with gradient and detailed brick ── */}
        <defs>
          <linearGradient id="rwGrad" x1="0.7" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#eeead0" />
            <stop offset="100%" stopColor="#ddd6c4" />
          </linearGradient>
        </defs>
        <polygon points={rightWallPts} fill="url(#rwGrad)" stroke="#bbb4a0" strokeWidth="1" />
        {/* Brick courses */}
        <g stroke="#d0c8b8" strokeWidth="0.4" opacity="0.3">
          <line x1="200" y1="190" x2="370" y2="275" />
          <line x1="200" y1="182" x2="370" y2="267" />
          <line x1="200" y1="173" x2="370" y2="258" />
          <line x1="200" y1="163" x2="370" y2="248" />
          <line x1="200" y1="154" x2="370" y2="239" />
        </g>
        {/* Vertical mortar joints */}
        <g stroke="#d0c8b8" strokeWidth="0.3" opacity="0.15">
          {[230,260,290,320,350].map((x,i) => {
            const yBot = 200 + (x-200)*0.5;
            const yTop = yBot - 55;
            return <line key={`rmj${i}`} x1={x} y1={yBot} x2={x} y2={yTop} />;
          })}
        </g>
        {/* Wall top edge highlight */}
        <line x1="200" y1="145" x2="370" y2="230" stroke="#fff" strokeWidth="0.6" opacity="0.2" />

        {/* Right wall window — enhanced glass effect */}
        <polygon points="255,218 320,250 320,215 255,183" fill="#78bbdd" stroke="#4a7a99" strokeWidth="1.5" />
        <polygon points="255,218 320,250 320,215 255,183" fill="url(#bldgHi)" />
        {/* Window cross */}
        <line x1="288" y1="234" x2="288" y2="199" stroke="#4a7a99" strokeWidth="1" />
        <line x1="255" y1="201" x2="320" y2="233" stroke="#4a7a99" strokeWidth="1" />
        {/* Shine — brighter */}
        <polygon points="258,215 258,188 280,199 280,226" fill="rgba(255,255,255,.25)" />
        {/* Window sill shadow */}
        <line x1="255" y1="218" x2="320" y2="250" stroke="#000" strokeWidth="0.8" opacity="0.08" />

        {/* ── Door (right wall, near front) — refined wood grain ── */}
        <defs>
          <linearGradient id="doorGrad" x1="0" y1="0" x2="1" y2="0.5">
            <stop offset="0%" stopColor="#9a7520" />
            <stop offset="50%" stopColor="#8B6914" />
            <stop offset="100%" stopColor="#7a5a10" />
          </linearGradient>
        </defs>
        <polygon points={doorPts} fill="url(#doorGrad)" stroke="#5a3a08" strokeWidth="1.5" />
        {/* Door panels — with depth */}
        <polygon points="322,258 336,265 336,234 322,227" fill="#9a7520" stroke="#6a4a0e" strokeWidth="0.8" />
        <polygon points="323,256 335,263 335,236 323,229" fill="rgba(255,255,255,0.06)" />
        <polygon points="339,267 350,272 350,241 339,236" fill="#9a7520" stroke="#6a4a0e" strokeWidth="0.8" />
        <polygon points="340,265 349,270 349,243 340,238" fill="rgba(255,255,255,0.06)" />
        {/* Wood grain lines */}
        <g stroke="#7a5510" strokeWidth="0.3" opacity="0.2">
          <line x1="326" y1="230" x2="326" y2="260" />
          <line x1="330" y1="232" x2="330" y2="262" />
          <line x1="343" y1="240" x2="343" y2="270" />
          <line x1="347" y1="242" x2="347" y2="272" />
        </g>
        {/* Handle — metallic effect */}
        <circle cx="348" cy="265" r="2.8" fill="#e8b830" stroke="#aa7718" strokeWidth="1" />
        <circle cx="347.5" cy="264.5" r="1" fill="#fff" opacity="0.3" />
        {/* MAD MAD text — with shadow */}
        <text x="336.5" y="244.5" fill="rgba(0,0,0,0.3)" fontSize="5" fontWeight="900" fontFamily="monospace" textAnchor="middle" transform="rotate(26.57,336.5,244.5)">MAD</text>
        <text x="336" y="244" fill="#fff" fontSize="5" fontWeight="900" fontFamily="monospace" textAnchor="middle" transform="rotate(26.57,336,244)">MAD</text>
        <text x="336.5" y="252.5" fill="rgba(0,0,0,0.3)" fontSize="5" fontWeight="900" fontFamily="monospace" textAnchor="middle" transform="rotate(26.57,336.5,252.5)">MAD</text>
        <text x="336" y="252" fill="#fff" fontSize="5" fontWeight="900" fontFamily="monospace" textAnchor="middle" transform="rotate(26.57,336,252)">MAD</text>

        {/* ── Stone path: OUTSIDE diamond, from door → around bottom → left to mailbox ── */}
        {[
          [375,290],[370,310],[358,330],[340,348],
          [315,360],[285,372],[250,380],[200,385],
          [150,380],[110,372],[75,360],[45,350],[25,345]
        ].map(([x,y],i) => (
          <g key={`s${i}`}>
            {/* Stone shadow */}
            <ellipse cx={x} cy={y+1.5} rx={8} ry={3.5} fill="rgba(0,0,0,.06)" />
            {/* Stone */}
            <ellipse cx={x} cy={y} rx={8} ry={4}
              fill={i%3===0?'#c4b890':i%3===1?'#b8a878':'#c0b488'} stroke="#a89870" strokeWidth="0.5" />
            {/* Surface highlight */}
            <ellipse cx={x-1} cy={y-1} rx={4} ry={2} fill="#fff" opacity="0.06" />
            {/* Surface crack */}
            <line x1={x-2} y1={y} x2={x+2} y2={y-0.5} stroke="#a08860" strokeWidth="0.3" opacity="0.2" />
          </g>
        ))}

        {/* ── Mailbox — refined ── */}
        <g transform="translate(10,328)">
          {/* Shadow */}
          <ellipse cx="10" cy="42" rx="8" ry="2" fill="rgba(0,0,0,.06)" />
          {/* Post */}
          <rect x="8" y="18" width="4" height="22" fill="#555" />
          <rect x="8" y="18" width="2" height="22" fill="#666" />
          {/* Box body — with depth */}
          <rect x="0" y="0" width="20" height="18" rx="4" fill="#2a55bb" stroke="#1a4499" strokeWidth="1.5" />
          {/* Top highlight */}
          <rect x="1" y="1" width="18" height="4" rx="3" fill="#3a66cc" opacity="0.4" />
          {/* Mail slot */}
          <rect x="3" y="5" width="14" height="3" rx="1.5" fill="rgba(255,255,255,.8)" />
          <rect x="3" y="5" width="14" height="1.5" rx="1" fill="rgba(255,255,255,.3)" />
          {/* MAIL text with shadow */}
          <text x="10.5" y="15.5" fill="rgba(0,0,0,0.3)" fontSize="5" fontWeight="700" fontFamily="monospace" textAnchor="middle">MAIL</text>
          <text x="10" y="15" fill="#fff" fontSize="5" fontWeight="700" fontFamily="monospace" textAnchor="middle">MAIL</text>
          {/* Flag arm */}
          <rect x="20" y="2" width="2" height="12" fill="#555" />
          {/* Flag */}
          <rect x="22" y="2" width="8" height="5" rx="0.5" fill="#ea4335" />
          <rect x="22" y="2" width="8" height="2" rx="0.3" fill="#f05545" opacity="0.4" />
        </g>

        {/* ══ Office Furniture (back wall area) ══ */}

        {/* ── Filing cabinet (against left wall) — metallic ── */}
        <g transform="translate(60,248)">
          <polygon points="12,0 28,8 12,16 -4,8" fill="#808890" stroke="#606870" strokeWidth="0.5" />
          {/* Top highlight */}
          <polygon points="12,0 20,4 12,8 4,4" fill="#fff" opacity="0.08" />
          <polygon points="-4,8 12,16 12,30 -4,22" fill="#606870" />
          <polygon points="12,16 28,8 28,22 12,30" fill="#505860" />
          {/* Drawer divider lines */}
          <line x1="-4" y1="14" x2="12" y2="22" stroke="#505860" strokeWidth="0.5" />
          <line x1="-4" y1="18" x2="12" y2="26" stroke="#505860" strokeWidth="0.5" />
          {/* Drawer handles — chrome */}
          <rect x="0" y="11" width="6" height="1.2" rx="0.5" fill="#bbc" />
          <rect x="0" y="11" width="6" height="0.5" rx="0.3" fill="#fff" opacity="0.15" />
          <rect x="0" y="17" width="6" height="1.2" rx="0.5" fill="#bbc" />
          <rect x="0" y="17" width="6" height="0.5" rx="0.3" fill="#fff" opacity="0.15" />
          <rect x="0" y="23" width="6" height="1.2" rx="0.5" fill="#bbc" />
          <rect x="0" y="23" width="6" height="0.5" rx="0.3" fill="#fff" opacity="0.15" />
        </g>

        {/* ── Router + blinking lights (near left wall) ── */}
        <g transform="translate(82,235)">
          <rect x="0" y="0" width="14" height="4" rx="2" fill="#222" />
          <path d="M1.5,-2 Q1.5,-2.5 1,-2.5 Q0.5,-2.5 0.5,-2 L0.5,0.5 Q0.5,1 1.5,1 Z" fill="#333" />
          <path d="M5.5,-3 Q5.5,-3.5 5,-3.5 Q4.5,-3.5 4.5,-3 L4.5,0.5 Q4.5,1 5.5,1 Z" fill="#333" />
          <path d="M12.5,-2 Q12.5,-2.5 12,-2.5 Q11.5,-2.5 11.5,-2 L11.5,0.5 Q11.5,1 12.5,1 Z" fill="#333" />
          {/* LEDs */}
          <circle cx="3" cy="2" r="1" fill="#0f0">
            <animate attributeName="opacity" values="1;.2;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="7" cy="2" r="1" fill="#0f0">
            <animate attributeName="opacity" values=".2;1;.2" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="11" cy="2" r="1" fill="#fa0">
            <animate attributeName="opacity" values="1;.3;1" dur="0.8s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* ── Water dispenser — refined ── */}
        <g transform="translate(290,255)">
          {/* Shadow */}
          <ellipse cx="6" cy="37" rx="7" ry="2" fill="rgba(0,0,0,.06)" />
          {/* Body — with panel detail */}
          <rect x="0" y="8" width="12" height="24" rx="3" fill="#e8e8e8" stroke="#bbb" strokeWidth="0.5" />
          <rect x="0" y="8" width="6" height="24" rx="2" fill="#f0f0f0" opacity="0.3" />
          {/* Water jug — with refraction */}
          <rect x="1" y="0" width="10" height="10" rx="4" fill="#88ccee" stroke="#6699bb" strokeWidth="0.5" />
          <ellipse cx="6" cy="5" rx="3" ry="4" fill="#cceeff" opacity="0.4" />
          <ellipse cx="4" cy="5" rx="1.5" ry="4" fill="#fff" opacity="0.12" />
          {/* Hot/Cold taps */}
          <ellipse cx="3.5" cy="17" rx="1.8" ry="1.2" fill="#e74c3c" />
          <ellipse cx="8.5" cy="17" rx="1.8" ry="1.2" fill="#3498db" />
          {/* Drip tray */}
          <rect x="1" y="20" width="10" height="1.5" rx="0.5" fill="#ccc" />
          {/* Legs */}
          <rect x="1" y="32" width="3" height="4" rx="0.5" fill="#aaa" />
          <rect x="8" y="32" width="3" height="4" rx="0.5" fill="#aaa" />
        </g>

        {/* ── Snack table (moved to far right) ── */}
        <g transform="translate(310,320)">
          {/* Small round table */}
          <ellipse cx="10" cy="0" rx="14" ry="7" fill="#c8a060" stroke="#b89050" strokeWidth="0.5" />
          <rect x="8" y="0" width="4" height="14" fill="#b89050" />
          {/* Snacks */}
          <rect x="2" y="-5" width="6" height="4" rx="2" fill="#e74c3c" />
          <rect x="10" y="-4" width="5" height="3" rx="1.5" fill="#f39c12" />
          <circle cx="18" cy="-2" r="2.5" fill="#27ae60" />
        </g>

        {/* ══ Desks — each unique, wider, with accessories ══ */}

        {/* ── Desk 1: Wide L-desk — Scraper (back-left) ── */}
        <g transform="translate(95,235)">
          {/* Drop shadow */}
          <polygon points="25,4 55,19 25,34 -5,19" fill="#000" opacity="0.06" />
          {/* Main surface (wide) — wood grain feel */}
          <polygon points="25,0 55,15 25,30 -5,15" fill="#c8a060" stroke="#a87838" strokeWidth="0.8" />
          {/* Surface highlight */}
          <polygon points="25,0 40,8 25,15 10,8" fill="#fff" opacity="0.06" />
          <polygon points="-5,15 25,30 25,38 -5,23" fill="#b08040" />
          <polygon points="25,30 55,15 55,23 25,38" fill="#a07030" />
          {/* L-extension */}
          <polygon points="55,15 72,24 55,33 38,24" fill="#c8a060" stroke="#a87838" strokeWidth="0.5" />
          <polygon points="55,33 72,24 72,30 55,39" fill="#a07030" />
          {/* Monitor (large) — bezel detail */}
          <rect x="10" y="-16" width="24" height="16" rx="1" fill="#1a1a1a" stroke="#0a0a0a" strokeWidth="1" />
          <rect x="12" y="-14" width="20" height="12" fill="#4285f4" />
          {/* Screen glow */}
          <rect x="12" y="-14" width="20" height="12" fill="url(#bldgHi)" opacity="0.5" />
          <rect x="16" y="-10" width="4" height="5" fill="rgba(255,255,255,.5)">
            <animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite" />
          </rect>
          <rect x="20" y="0" width="4" height="3" fill="#333" /> {/* Stand */}
          {/* Keyboard */}
          <rect x="6" y="6" width="16" height="5" rx="1" fill="#444" />
          {/* Small potted plant */}
          <g transform="translate(48,4)">
            <rect x="0" y="2" width="6" height="5" rx="1" fill="#c47a5a" />
            <circle cx="3" cy="0" r="4" fill="#3da832" />
            <circle cx="6" cy="-1" r="3" fill="#4cb840" />
          </g>
          {/* Coffee (dawn/noon) or Tea (dusk/night) */}
          {(phase==='dawn'||phase==='noon') ? (
            <g transform="translate(38,8)">
              <rect x="0" y="2" width="5" height="5" rx="1" fill="#fff" stroke="#ccc" strokeWidth="0.5" />
              <rect x="5" y="3" width="2" height="3" rx="1" fill="#fff" stroke="#ccc" strokeWidth="0.3" />
              <rect x="1" y="3" width="3" height="2" rx="0.5" fill="#6f4e37" /> {/* coffee */}
              {/* Steam */}
              <g opacity="0.4">
                <line x1="2" y1="0" x2="1" y2="-3" stroke="#ccc" strokeWidth="0.5">
                  <animate attributeName="y2" values="-3;-5;-3" dur="1.5s" repeatCount="indefinite" />
                </line>
                <line x1="4" y1="0" x2="5" y2="-4" stroke="#ccc" strokeWidth="0.5">
                  <animate attributeName="y2" values="-4;-6;-4" dur="2s" repeatCount="indefinite" />
                </line>
              </g>
            </g>
          ) : (
            <g transform="translate(38,8)">
              <rect x="0" y="2" width="5" height="4" rx="1" fill="#e8e0d0" stroke="#c8b8a0" strokeWidth="0.5" />
              <rect x="5" y="3" width="2" height="2" rx="1" fill="#e8e0d0" stroke="#c8b8a0" strokeWidth="0.3" />
              <rect x="1" y="3" width="3" height="1.5" rx="0.5" fill="#a8c870" /> {/* green tea */}
            </g>
          )}
        </g>

        {/* ── Desk 2: Standing desk — Email (back-right) ── */}
        <g transform="translate(220,242)">
          {/* Drop shadow */}
          <polygon points="22,4 50,18 22,32 -6,18" fill="#000" opacity="0.06" />
          {/* Taller desk surface — darker wood */}
          <polygon points="22,0 50,14 22,28 -6,14" fill="#8B7355" stroke="#6a5238" strokeWidth="0.8" />
          <polygon points="22,0 36,7 22,14 8,7" fill="#fff" opacity="0.05" />
          <polygon points="-6,14 22,28 22,42 -6,28" fill="#7a5e3a" />
          <polygon points="22,28 50,14 50,28 22,42" fill="#6a4e2e" />
          {/* Dual monitors */}
          <rect x="4" y="-18" width="18" height="14" rx="1" fill="#222" stroke="#111" strokeWidth="1" />
          <rect x="6" y="-16" width="14" height="10" fill="#5699a3" />
          <rect x="24" y="-16" width="16" height="12" rx="1" fill="#222" stroke="#111" strokeWidth="0.8" />
          <rect x="26" y="-14" width="12" height="8" fill="#5699a3" />
          <rect x="10" y="-4" width="4" height="6" fill="#333" /> {/* Stand 1 */}
          <rect x="30" y="-4" width="3" height="5" fill="#333" /> {/* Stand 2 */}
          {/* Mouse */}
          <ellipse cx="44" cy="10" rx="3" ry="2" fill="#333" />
          {/* Mini figurine (pixel robot) */}
          <g transform="translate(-2,2)">
            <rect x="0" y="0" width="5" height="6" rx="1" fill="#e74c3c" />
            <rect x="1" y="-2" width="3" height="3" rx="1" fill="#ccc" />
            <rect x="1.5" y="-1" width="1" height="1" fill="#222" />
            <rect x="2.5" y="-1" width="1" height="1" fill="#222" />
          </g>
          {/* Snack bag */}
          <rect x="38" y="2" width="8" height="5" rx="1" fill="#9b59b6" />
          <rect x="39" y="0" width="6" height="2" fill="#8e44ad" />
        </g>

        {/* ── Desk 3: Wide curved desk — Qualifier (front-center) ── */}
        <g transform="translate(130,300)">
          {/* Drop shadow */}
          <polygon points="30,4 65,22 30,40 -5,22" fill="#000" opacity="0.06" />
          {/* Wide surface — dark wood */}
          <polygon points="30,0 65,18 30,36 -5,18" fill="#5a4a3a" stroke="#3a2a1a" strokeWidth="0.8" />
          <polygon points="30,0 48,9 30,18 12,9" fill="#fff" opacity="0.04" />
          <polygon points="-5,18 30,36 30,44 -5,26" fill="#453525" />
          <polygon points="30,36 65,18 65,26 30,44" fill="#3a2818" />
          {/* Ultrawide monitor */}
          <rect x="6" y="-14" width="30" height="13" rx="1" fill="#222" stroke="#111" strokeWidth="1" />
          <rect x="8" y="-12" width="26" height="9" fill="#8b5cf6" />
          <rect x="14" y="-8" width="5" height="4" fill="rgba(255,255,255,.4)">
            <animate attributeName="opacity" values="1;0;1" dur="0.6s" repeatCount="indefinite" />
          </rect>
          <rect x="18" y="-1" width="6" height="3" fill="#333" /> {/* Stand */}
          {/* Mechanical keyboard */}
          <rect x="8" y="6" width="20" height="6" rx="1" fill="#333" />
          <rect x="9" y="7" width="18" height="4" rx="0.5" fill="#444" />
          {/* Mouse pad + mouse */}
          <rect x="42" y="8" width="14" height="10" rx="1" fill="#2a2a3a" />
          <ellipse cx="49" cy="13" rx="3" ry="2" fill="#555" />
          {/* Stack of papers */}
          <g transform="translate(55,2)">
            <rect x="0" y="0" width="8" height="1.5" fill="#f8f4e8" />
            <rect x="0.5" y="-1.5" width="8" height="1.5" fill="#f0ece0" />
            <rect x="0" y="-3" width="8" height="1.5" fill="#e8e4d8" />
          </g>
          {/* Headphones (resting on desk) */}
          <g transform="translate(-2,10)">
            <path d="M0,4 Q2,-2 8,0 Q10,3 8,6" fill="none" stroke="#222" strokeWidth="2" />
            <rect x="-1" y="3" width="3" height="4" rx="1" fill="#333" />
            <rect x="7" y="4" width="3" height="4" rx="1" fill="#333" />
          </g>
        </g>

        {/* ══ Office chairs — refined with depth ══ */}
        {/* Chair 1 — mesh back */}
        <g transform="translate(128,268)">
          {/* Seat cushion */}
          <rect x="0" y="0" width="14" height="8" rx="1.5" fill="#444" />
          <rect x="1" y="1" width="12" height="4" rx="1" fill="#4a4a4a" />
          {/* Backrest — mesh pattern */}
          <rect x="1" y="-10" width="12" height="11" rx="1.5" fill="#555" />
          <g stroke="#666" strokeWidth="0.4" opacity="0.4">
            <line x1="4" y1="-8" x2="4" y2="-2" />
            <line x1="7" y1="-8" x2="7" y2="-2" />
            <line x1="10" y1="-8" x2="10" y2="-2" />
            <line x1="3" y1="-6" x2="11" y2="-6" />
            <line x1="3" y1="-4" x2="11" y2="-4" />
          </g>
          {/* Gas lift */}
          <rect x="5" y="8" width="4" height="4" rx="0.5" fill="#333" />
          {/* Caster base */}
          <ellipse cx="7" cy="13" rx="6" ry="1.5" fill="#333" opacity="0.6" />
        </g>
        {/* Chair 2 — standing stool */}
        <g transform="translate(255,278)">
          <ellipse cx="6" cy="0" rx="7" ry="4" fill="#555" />
          <ellipse cx="6" cy="-1" rx="5" ry="2.5" fill="#606060" opacity="0.4" />
          <rect x="4" y="0" width="4" height="10" fill="#444" />
          <ellipse cx="6" cy="10" rx="5" ry="2" fill="#333" />
        </g>
        {/* Chair 3 — gaming chair */}
        <g transform="translate(168,338)">
          {/* Seat */}
          <rect x="0" y="0" width="16" height="8" rx="1.5" fill="#333" />
          <rect x="1" y="1" width="14" height="4" rx="1" fill="#3a3a3a" />
          {/* Backrest */}
          <rect x="1" y="-12" width="14" height="13" rx="2" fill="#222" />
          {/* Racing stripe */}
          <rect x="2" y="-11" width="12" height="4" rx="1" fill="#e74c3c" />
          <rect x="2" y="-11" width="12" height="1.5" rx="0.5" fill="#f05050" opacity="0.3" />
          {/* Side bolsters */}
          <rect x="0" y="-10" width="2" height="10" rx="0.5" fill="#2a2a2a" />
          <rect x="14" y="-10" width="2" height="10" rx="0.5" fill="#2a2a2a" />
          {/* Gas lift + base */}
          <rect x="6" y="8" width="4" height="4" rx="0.5" fill="#444" />
          <ellipse cx="8" cy="13" rx="6" ry="1.5" fill="#333" opacity="0.6" />
        </g>

        {/* ── Google Maps Pin (before people so speech bubbles render on top) ── */}
        <g transform="translate(123,192)">
          <circle cx="6" cy="5" r="6" fill="#ea4335" />
          <polygon points="6,11 2,5 10,5" fill="#ea4335" />
          <circle cx="6" cy="5" r="3" fill="#fff" />
        </g>

        {/* ══ People (side view, animated) ══ */}

        {/* Person 1 — Scraper dev, typing (with headphones!) */}
        <g transform="translate(108,215)">
          <TypingPerson x={0} y={0} hair="#4a3520" shirt="#3b82f6" dur="0.35s" />
          {/* Headphones on head */}
          <path d="M-1,2 Q1,-4 13,-4 Q15,2 13,4" fill="none" stroke="#333" strokeWidth="2" />
          <rect x="-2" y="1" width="3" height="4" rx="1" fill="#444" />
          <rect x="13" y="1" width="3" height="4" rx="1" fill="#444" />
          {/* Speech bubble — 幫緊你幫緊你 */}
          <g opacity="0.92">
            <animate attributeName="opacity" values="0;0;0.92;0.92;0.92;0;0;0;0;0" dur="8s" repeatCount="indefinite" />
            <rect x="-16" y="-28" width="52" height="18" rx="4" fill="#fff" stroke="#bbb" strokeWidth="0.6" />
            <polygon points="4,-10 9,-10 6.5,-5" fill="#fff" />
            <text x="10" y="-16" fill="#333" fontSize="9" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">幫緊你</text>
          </g>
        </g>

        {/* Person 2 — Email dev at standing desk */}
        <g>
          <TypingPerson x={233} y={222} hair="#8B4513" skin="#f0c080" shirt="#5699a3" dur="0.45s" />
          {/* Speech bubble — 幫緊你幫緊你 (offset timing) */}
          <g transform="translate(233,222)" opacity="0.92">
            <animate attributeName="opacity" values="0;0;0;0;0;0.92;0.92;0.92;0;0" dur="8s" repeatCount="indefinite" />
            <rect x="-14" y="-28" width="52" height="18" rx="4" fill="#fff" stroke="#bbb" strokeWidth="0.6" />
            <polygon points="6,-10 11,-10 8.5,-5" fill="#fff" />
            <text x="12" y="-16" fill="#333" fontSize="9" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">幫緊你</text>
          </g>
        </g>

        {/* Person 3 — Qualifier dev, typing */}
        <TypingPerson x={148} y={280} hair="#2d1810" skin="#e8b878" shirt="#8b5cf6" dur="0.3s" />
        {/* Speech bubble — 幫緊你 (Qualifier, offset timing) */}
        <g transform="translate(148,280)" opacity="0.92">
          <animate attributeName="opacity" values="0;0;0;0;0;0;0;0.92;0.92;0" dur="8s" repeatCount="indefinite" />
          <rect x="-14" y="-28" width="52" height="18" rx="4" fill="#fff" stroke="#bbb" strokeWidth="0.6" />
          <polygon points="6,-10 11,-10 8.5,-5" fill="#fff" />
          <text x="12" y="-16" fill="#333" fontSize="9" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">幫緊你</text>
        </g>

        {/* Person 4 — Manager at big executive desk (right side of office) */}
        <g transform="translate(252,300)">
          <TypingPerson x={0} y={0} hair="#1a1a2e" skin="#f5d0a9" shirt="#e74c3c" dur="0.5s" />
          {/* Extra hair for manager — fuller, slicked back */}
          <path d="M-1,3 Q-1,-4 7.5,-4 Q16,-4 16,3 L16,1 Q16,-2 12,-3 L7.5,-3.5 Q3,-3 1,-2 Q-1,-1 -1,1 Z" fill="#1a1a2e" />
          <path d="M14,1 Q15,-1 15,2 L14,4 Q14,3 14,1 Z" fill="#1a1a2e" opacity="0.7" />
          {/* Side hair volume */}
          <path d="M-1,2 Q-2,0 -1.5,-1 Q-1,-2 0,-1 L0,3 Z" fill="#1a1a2e" opacity="0.6" />
          {/* Manager tie */}
          <rect x="5" y="12" width="4" height="6" rx="0.5" fill="#c0392b" opacity="0.7" />
          <polygon points="7,18 5,22 9,22" fill="#c0392b" opacity="0.5" />
        </g>

        {/* ── Desk 4: Executive L-desk — rendered AFTER manager so desk covers legs ── */}
        <g transform="translate(210,325)">
          {/* Drop shadow */}
          <polygon points="35,5 75,25 35,45 -5,25" fill="#000" opacity="0.08" />
          {/* Main surface — premium dark walnut, extra wide */}
          <polygon points="35,0 75,20 35,40 -5,20" fill="#6b4226" stroke="#4a2e18" strokeWidth="1" />
          {/* Surface highlight */}
          <polygon points="35,0 55,10 35,20 15,10" fill="#fff" opacity="0.06" />
          {/* Front face */}
          <polygon points="-5,20 35,40 35,50 -5,30" fill="#5a3520" />
          {/* Side face */}
          <polygon points="35,40 75,20 75,30 35,50" fill="#4a2818" />
          {/* L-extension (side wing) */}
          <polygon points="55,10 75,20 75,30 55,20" fill="#5e3820" stroke="#4a2e18" strokeWidth="0.5" />
          <polygon points="75,20 85,15 85,25 75,30" fill="#4a2818" />
          {/* Large monitor — bigger than others */}
          <rect x="10" y="-20" width="28" height="16" rx="1.5" fill="#1a1a1a" stroke="#111" strokeWidth="1.2" />
          <rect x="12" y="-18" width="24" height="12" fill="#2c2c2c" />
          {/* Dashboard on screen */}
          <rect x="14" y="-16" width="9" height="4" rx="0.5" fill="#5699a3" opacity="0.7" />
          <rect x="24" y="-16" width="10" height="4" rx="0.5" fill="#d4c8c0" opacity="0.5" />
          <rect x="14" y="-11" width="20" height="3" rx="0.5" fill="#5699a3" opacity="0.4" />
          {/* Monitor stand */}
          <rect x="20" y="-4" width="8" height="5" rx="0.5" fill="#333" />
          <rect x="18" y="1" width="12" height="1.5" rx="0.5" fill="#444" />
          {/* Keyboard */}
          <rect x="12" y="8" width="24" height="7" rx="1.5" fill="#2a2a2a" />
          <rect x="13" y="9" width="22" height="5" rx="1" fill="#333" />
          {/* Mouse pad + mouse */}
          <rect x="50" y="8" width="16" height="12" rx="1.5" fill="#1a1a2a" />
          <ellipse cx="58" cy="14" rx="3.5" ry="2.5" fill="#444" />
          {/* Coffee mug */}
          <rect x="42" y="4" width="5" height="5" rx="1.5" fill="#fff" stroke="#ccc" strokeWidth="0.4" />
          <path d="M47,5 Q49,5 49,7 Q49,8 47,8" fill="none" stroke="#ccc" strokeWidth="0.5" />
          {/* Name plate */}
          <rect x="2" y="10" width="8" height="3" rx="0.5" fill="#c8a060" />
          <rect x="2.5" y="10.5" width="7" height="2" rx="0.3" fill="#b89050" />
        </g>

        {/* Executive chair — rendered after desk */}
        <g transform="translate(255,330)">
          <rect x="0" y="0" width="18" height="8" rx="2" fill="#2a2a2a" />
          <rect x="1" y="1" width="16" height="5" rx="1.5" fill="#333" />
          <rect x="1" y="-16" width="16" height="17" rx="3" fill="#222" />
          <rect x="-2" y="-4" width="4" height="5" rx="1" fill="#333" />
          <rect x="16" y="-4" width="4" height="5" rx="1" fill="#333" />
          <rect x="7" y="8" width="4" height="5" rx="0.5" fill="#444" />
          <ellipse cx="9" cy="14" rx="8" ry="2" fill="#333" opacity="0.6" />
        </g>

        {/* ══ Sleeping cat on the floor — refined ══ */}
        <g transform="translate(195,340)">
          {/* Shadow */}
          <ellipse cx="8" cy="10" rx="10" ry="3" fill="rgba(0,0,0,.06)" />
          {/* Body (curled up) — with fur texture */}
          <ellipse cx="8" cy="5" rx="8" ry="4" fill="#f4a460" />
          <ellipse cx="6" cy="4" rx="5" ry="2.5" fill="#f8b474" opacity="0.5" />
          {/* Stripes */}
          <path d="M4,2 Q6,1 8,3" fill="none" stroke="#e08840" strokeWidth="0.5" opacity="0.3" />
          <path d="M8,2 Q10,1 12,3" fill="none" stroke="#e08840" strokeWidth="0.5" opacity="0.3" />
          {/* Head */}
          <circle cx="15" cy="3" r="4" fill="#f4a460" />
          <circle cx="14" cy="2" r="2" fill="#f8b474" opacity="0.3" />
          {/* Ears — with inner ear */}
          <polygon points="13,-1 14,2 12,1" fill="#e8944a" />
          <polygon points="13,0 13.5,1.5 12.5,1" fill="#f0b890" opacity="0.5" />
          <polygon points="17,-1 18,2 16,1" fill="#e8944a" />
          <polygon points="17,0 17.5,1.5 16.5,1" fill="#f0b890" opacity="0.5" />
          {/* Closed eyes (sleeping) — curved */}
          <path d="M13.5,3 Q14.5,2.5 15.5,3" fill="none" stroke="#333" strokeWidth="0.6" />
          {/* Nose */}
          <ellipse cx="16.5" cy="3.5" rx="0.6" ry="0.4" fill="#d88060" />
          {/* Whiskers */}
          <line x1="17" y1="3" x2="20" y2="2" stroke="#ddd" strokeWidth="0.3" opacity="0.3" />
          <line x1="17" y1="4" x2="20" y2="4.5" stroke="#ddd" strokeWidth="0.3" opacity="0.3" />
          {/* Tail — thicker, curved */}
          <path d="M0,5 Q-5,1 -3,8 Q-1,10 1,8" fill="none" stroke="#e8944a" strokeWidth="2" strokeLinecap="round" />
          {/* Paws tucked in */}
          <ellipse cx="13" cy="6" rx="1.5" ry="1" fill="#f0b870" />
          {/* Zzz */}
          <text x="20" y="-2" fill="#888" fontSize="4" fontFamily="monospace" opacity="0.6">
            z
            <animate attributeName="opacity" values="0;.6;0" dur="2s" repeatCount="indefinite" />
          </text>
          <text x="24" y="-5" fill="#888" fontSize="3" fontFamily="monospace" opacity="0.4">
            z
            <animate attributeName="opacity" values=".4;0;.4" dur="2.5s" repeatCount="indefinite" />
          </text>
        </g>

        {/* ══ Small dog wandering — refined ══ */}
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="260,345;270,348;278,345;270,342;260,345" dur="6s" repeatCount="indefinite" />
          {/* Shadow */}
          <ellipse cx="8" cy="11" rx="7" ry="2" fill="rgba(0,0,0,.06)" />
          {/* Body — smooth ellipse */}
          <ellipse cx="5" cy="4.5" rx="6" ry="3.5" fill="#8B6914" />
          <ellipse cx="5" cy="5" rx="4" ry="2" fill="#a07818" opacity="0.3" />
          {/* Head — rounded */}
          <ellipse cx="13" cy="2.5" rx="4" ry="3.5" fill="#a07818" />
          <ellipse cx="12.5" cy="2" rx="2.5" ry="1.8" fill="#b08828" opacity="0.2" />
          {/* Ears — floppy */}
          <ellipse cx="11.5" cy="-1" rx="1.8" ry="2.2" fill="#7a5510" />
          <ellipse cx="14.5" cy="-1" rx="1.8" ry="2.2" fill="#7a5510" />
          {/* Eye — with white */}
          <circle cx="14.5" cy="2" r="1.2" fill="#fff" />
          <circle cx="14.8" cy="2" r="0.7" fill="#222" />
          <circle cx="14.5" cy="1.7" r="0.35" fill="#fff" opacity="0.5" />
          {/* Nose */}
          <ellipse cx="16.8" cy="3" rx="1" ry="0.7" fill="#333" />
          {/* Tongue (sticking out) */}
          <ellipse cx="16" cy="5" rx="1" ry="1.2" fill="#e87070" opacity="0.7" />
          {/* Tail — curved, wagging */}
          <path d="M-1,2 Q-4,-1 -2,-4 Q-1,-5 0,-3" fill="none" stroke="#a07818" strokeWidth="1.8" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" values="-10,0,1;10,0,1;-10,0,1" dur="0.3s" repeatCount="indefinite" />
          </path>
          {/* Legs — with rounded paws */}
          <g>
            <path d="M2,7 Q1.5,7 1.5,8 L1.5,9.5 Q1.5,10.5 2.5,10.5 L3,10.5 Q3.5,10.5 3.5,9.5 L3.5,8 Q3.5,7 3,7 Z" fill="#7a5a10">
              <animate attributeName="d" values="M2,7 Q1.5,7 1.5,8 L1.5,9.5 Q1.5,10.5 2.5,10.5 L3,10.5 Q3.5,10.5 3.5,9.5 L3.5,8 Q3.5,7 3,7 Z;M2,7 Q1.5,7 1.5,8 L1.5,8.5 Q1.5,9.5 2.5,9.5 L3,9.5 Q3.5,9.5 3.5,8.5 L3.5,8 Q3.5,7 3,7 Z;M2,7 Q1.5,7 1.5,8 L1.5,9.5 Q1.5,10.5 2.5,10.5 L3,10.5 Q3.5,10.5 3.5,9.5 L3.5,8 Q3.5,7 3,7 Z" dur="0.5s" repeatCount="indefinite" />
            </path>
            <ellipse cx="2.5" cy="10.5" rx="1.5" ry="0.8" fill="#6a4a08" />
          </g>
          <g>
            <path d="M7.5,7 Q7,7 7,8 L7,9.5 Q7,10.5 8,10.5 L8.5,10.5 Q9,10.5 9,9.5 L9,8 Q9,7 8.5,7 Z" fill="#7a5a10">
              <animate attributeName="d" values="M7.5,7 Q7,7 7,8 L7,8.5 Q7,9.5 8,9.5 L8.5,9.5 Q9,9.5 9,8.5 L9,8 Q9,7 8.5,7 Z;M7.5,7 Q7,7 7,8 L7,9.5 Q7,10.5 8,10.5 L8.5,10.5 Q9,10.5 9,9.5 L9,8 Q9,7 8.5,7 Z;M7.5,7 Q7,7 7,8 L7,8.5 Q7,9.5 8,9.5 L8.5,9.5 Q9,9.5 9,8.5 L9,8 Q9,7 8.5,7 Z" dur="0.5s" repeatCount="indefinite" />
            </path>
            <ellipse cx="8" cy="10.5" rx="1.5" ry="0.8" fill="#6a4a08" />
          </g>
        </g>

        {/* ── Tags ── */}
        <g fontFamily="monospace" fontWeight="700" fontSize="7">
          <rect x="93" y="205" width="44" height="12" rx="6" fill="#3b82f6" opacity=".85" />
          <text x="115" y="214" fill="#fff" textAnchor="middle">SCRAPER</text>

          <rect x="225" y="213" width="34" height="12" rx="6" fill="#5699a3" opacity=".85" />
          <text x="242" y="222" fill="#fff" textAnchor="middle">EMAIL</text>

          <rect x="133" y="272" width="50" height="12" rx="6" fill="#8b5cf6" opacity=".85" />
          <text x="158" y="281" fill="#fff" textAnchor="middle">QUALIFIER</text>
        </g>

        {/* ── Status LEDs ── */}
        <circle cx="143" cy="210" r="3" fill="#10b981">
          <animate attributeName="opacity" values="1;.4;1" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="265" cy="218" r="3" fill="#d4c8c0">
          <animate attributeName="opacity" values="1;.4;1" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="187" cy="277" r="3" fill="#10b981">
          <animate attributeName="opacity" values="1;.4;1" dur="2s" repeatCount="indefinite" />
        </circle>


      </SceneSvg>
    </Container>
  );
};

export default IsometricWorld;
