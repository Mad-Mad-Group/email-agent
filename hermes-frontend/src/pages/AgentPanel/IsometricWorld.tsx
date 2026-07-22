import React from 'react';
import styled, { keyframes } from 'styled-components';

/* ════════════════════════════════════════════════════════════════
   IsometricWorld — Pixel farm pastoral scene
   Assets from exclusiveOlive "Pixel Farm RPG" (Free License)
   ════════════════════════════════════════════════════════════════ */

const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
  overflow: hidden;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
  background: linear-gradient(180deg, #87CEEB 0%, #A8D8A8 60%, #6AAF5C 100%);
`;

const BgLayer = styled.div`
  position: absolute;
  inset: 0;
  background-image: url('/assets/pixel-world/farm-bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
`;

/* Blue sky tint — turns the grey overcast into sunny blue via screen blend */
const SkyOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg,
    rgba(105, 185, 245, 0.9)  0%,
    rgba(120, 200, 250, 0.78) 10%,
    rgba(140, 210, 250, 0.6)  22%,
    rgba(160, 220, 250, 0.35) 35%,
    rgba(180, 230, 250, 0.12) 45%,
    transparent 52%
  );
  mix-blend-mode: screen;
`;

/* Warm sunlight overlay */
const AmbientOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at 70% 15%, rgba(255, 245, 200, 0.12) 0%, transparent 55%),
              radial-gradient(ellipse at 30% 20%, rgba(255, 250, 220, 0.06) 0%, transparent 40%);
`;

/* Cloud float animation */
const floatCloud = keyframes`
  0%   { transform: translateX(-120px); }
  100% { transform: translateX(calc(100vw + 120px)); }
`;

const floatCloudRtl = keyframes`
  0%   { transform: translateX(calc(100vw + 120px)); }
  100% { transform: translateX(-200px); }
`;

/* Butterfly float animation */
const flutter = keyframes`
  0%   { transform: translate(0, 0) scale(1); }
  25%  { transform: translate(15px, -8px) scale(1.1); }
  50%  { transform: translate(30px, 2px) scale(0.9); }
  75%  { transform: translate(10px, -12px) scale(1.05); }
  100% { transform: translate(0, 0) scale(1); }
`;

const Cloud = styled.div<{ $top: number; $dur: number; $delay: number; $size: number; $rtl?: boolean }>`
  position: absolute;
  top: ${({ $top }) => $top}%;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size * 0.4}px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  filter: blur(1px);
  animation: ${({ $rtl }) => ($rtl ? floatCloudRtl : floatCloud)} ${({ $dur }) => $dur}s linear ${({ $delay }) => $delay}s infinite;
  opacity: 0.5;
  pointer-events: none;

  &::before, &::after {
    content: '';
    position: absolute;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 50%;
  }
  &::before { width: 60%; height: 80%; top: -30%; left: 15%; }
  &::after  { width: 50%; height: 70%; top: -20%; right: 15%; }
`;

const Butterfly = styled.div<{ $top: number; $left: number; $dur: number; $delay: number; $color: string }>`
  position: absolute;
  top: ${({ $top }) => $top}%;
  left: ${({ $left }) => $left}%;
  width: 6px;
  height: 4px;
  background: ${({ $color }) => $color};
  border-radius: 50%;
  animation: ${flutter} ${({ $dur }) => $dur}s ease-in-out ${({ $delay }) => $delay}s infinite;
  pointer-events: none;
  opacity: 0.7;

  &::before, &::after {
    content: '';
    position: absolute;
    width: 4px;
    height: 3px;
    background: ${({ $color }) => $color};
    border-radius: 50%;
    top: -2px;
  }
  &::before { left: -3px; }
  &::after { right: -3px; }
`;

const AnimLayer = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
`;

/* ── Ornate multi-tier fountain ── */

const waterFall1 = keyframes`
  0%   { opacity: 0.3; transform: translateY(0); }
  50%  { opacity: 0.8; transform: translateY(2px); }
  100% { opacity: 0.3; transform: translateY(0); }
`;
const waterFall2 = keyframes`
  0%   { opacity: 0.5; transform: translateY(0); }
  50%  { opacity: 1;   transform: translateY(1.5px); }
  100% { opacity: 0.5; transform: translateY(0); }
`;
const waterSpout = keyframes`
  0%   { transform: scaleY(1);   opacity: 0.7; }
  50%  { transform: scaleY(1.15); opacity: 1; }
  100% { transform: scaleY(1);   opacity: 0.7; }
`;
const waterDrop = keyframes`
  0%   { transform: translateY(0) scale(1); opacity: 0.8; }
  100% { transform: translateY(8px) scale(0.5); opacity: 0; }
`;
const shimmer = keyframes`
  0%, 100% { opacity: 0.25; }
  50%      { opacity: 0.5; }
`;

const FountainWrap = styled.div`
  position: absolute;
  bottom: 2%;
  right: 20%;
  width: 160px;
  z-index: 0;
  pointer-events: none;
  image-rendering: pixelated;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25));
`;

const FountainSVG: React.FC = () => (
  <svg viewBox="0 0 180 200" width="100%" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
    {/* ── Ground shadow — pixel-art stepped rects ── */}
    <rect x="8" y="194" width="164" height="4" fill="#000" opacity="0.15" />
    <rect x="14" y="192" width="152" height="2" fill="#000" opacity="0.1" />

    {/* ── BASE POOL — thick stone rim + deep water ── */}
    {/* Outer stone wall (front face) */}
    <rect x="4" y="168" width="172" height="24" fill="#8a7a64" />
    <rect x="4" y="168" width="172" height="3" fill="#a89878" />
    <rect x="4" y="188" width="172" height="3" fill="#5a4a34" />
    {/* Inner stone ledge */}
    <rect x="10" y="170" width="160" height="2" fill="#b8a88c" />
    {/* Water surface — pixel-art stepped rects */}
    <rect x="14" y="164" width="152" height="16" fill="#3a8aaa" />
    <rect x="18" y="162" width="144" height="14" fill="#5bb5d5" />
    <rect x="48" y="166" width="60" height="4" fill="#9bdaee" opacity="0.6" />
    <rect x="96" y="168" width="32" height="3" fill="#9bdaee" opacity="0.4" />
    {/* Animated ripples — pixel rect expansion */}
    <rect x="44" y="172" width="12" height="2" fill="#bfe3f5" opacity="0">
      <animate attributeName="width" values="8;36;8" dur="1.6s" begin="0s" repeatCount="indefinite" />
      <animate attributeName="x" values="46;32;46" dur="1.6s" begin="0s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.5;0" dur="1.6s" begin="0s" repeatCount="indefinite" />
    </rect>
    <rect x="124" y="172" width="12" height="2" fill="#bfe3f5" opacity="0">
      <animate attributeName="width" values="8;36;8" dur="1.6s" begin="-0.8s" repeatCount="indefinite" />
      <animate attributeName="x" values="126;116;126" dur="1.6s" begin="-0.8s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.5;0" dur="1.6s" begin="-0.8s" repeatCount="indefinite" />
    </rect>
    <rect x="84" y="174" width="12" height="2" fill="#bfe3f5" opacity="0">
      <animate attributeName="width" values="6;40;6" dur="2s" begin="-0.4s" repeatCount="indefinite" />
      <animate attributeName="x" values="87;70;87" dur="2s" begin="-0.4s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.4;0" dur="2s" begin="-0.4s" repeatCount="indefinite" />
    </rect>
    {/* Greenery around pool */}
    <rect x="0" y="178" width="4" height="8" fill="#5a8a3a" />
    <rect x="2" y="176" width="2" height="10" fill="#4a7a2e" />
    <rect x="176" y="178" width="4" height="8" fill="#5a8a3a" />
    <rect x="178" y="176" width="2" height="10" fill="#4a7a2e" />
    <rect x="2" y="174" width="2" height="2" fill="#ff9ec4" />
    <rect x="178" y="174" width="2" height="2" fill="#ffe066" />

    {/* ── PEDESTAL — 3-tier stepped base ── */}
    <rect x="54" y="160" width="72" height="12" fill="#a89878" />
    <rect x="54" y="160" width="72" height="2" fill="#c4b498" />
    <rect x="54" y="170" width="72" height="2" fill="#7a6a4a" />
    <rect x="60" y="150" width="60" height="10" fill="#c4b498" />
    <rect x="60" y="150" width="60" height="2" fill="#d4c4a8" />
    <rect x="60" y="158" width="60" height="2" fill="#8a7a64" />
    <rect x="66" y="138" width="48" height="12" fill="#c4b498" />
    <rect x="66" y="138" width="48" height="2" fill="#d4c4a8" />
    <rect x="66" y="148" width="48" height="2" fill="#8a7a64" />
    <rect x="68" y="143" width="44" height="1" fill="#8a7a64" opacity="0.5" />

    {/* ── FIRST TIER BOWL (largest) — pixel-art ── */}
    <rect x="44" y="132" width="92" height="10" fill="#b8a88c" />
    <rect x="44" y="132" width="92" height="2" fill="#d4c4a8" />
    {/* Bowl rim — stepped pixel shape */}
    <rect x="48" y="128" width="84" height="6" fill="#b8a88c" />
    <rect x="52" y="126" width="76" height="2" fill="#b8a88c" />
    <rect x="48" y="128" width="84" height="1" fill="#8a7a64" />
    {/* Water in bowl */}
    <rect x="52" y="129" width="76" height="5" fill="#5bb5d5" />
    <rect x="60" y="129" width="36" height="3" fill="#9bdaee" opacity="0.6" />
    {/* Cascade — pixel-art vertical streams */}
    <rect x="48" y="134" width="4" height="38" fill="#7ec8e3">
      <animate attributeName="opacity" values="0.7;1;0.7" dur="1.1s" repeatCount="indefinite" />
    </rect>
    <rect x="54" y="135" width="4" height="37" fill="#9bd9ec">
      <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.3s" repeatCount="indefinite" />
    </rect>
    <rect x="128" y="134" width="4" height="38" fill="#7ec8e3">
      <animate attributeName="opacity" values="0.7;1;0.7" dur="1.2s" repeatCount="indefinite" />
    </rect>
    <rect x="122" y="135" width="4" height="37" fill="#9bd9ec">
      <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.4s" repeatCount="indefinite" />
    </rect>
    {/* Front cascade */}
    <rect x="78" y="136" width="3" height="36" fill="#7ec8e3" opacity="0.5">
      <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.2s" repeatCount="indefinite" />
    </rect>
    <rect x="100" y="136" width="3" height="36" fill="#7ec8e3" opacity="0.5">
      <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.3s" repeatCount="indefinite" />
    </rect>

    {/* ── LOWER COLUMN ── */}
    <rect x="82" y="108" width="16" height="26" fill="#c4b498" />
    <rect x="82" y="108" width="2" height="24" fill="#d4c4a8" />
    <rect x="80" y="114" width="20" height="3" fill="#8a7a64" />
    <rect x="80" y="126" width="20" height="3" fill="#8a7a64" />

    {/* ── SECOND TIER BOWL — pixel-art ── */}
    <rect x="60" y="102" width="60" height="8" fill="#b8a88c" />
    <rect x="60" y="102" width="60" height="2" fill="#d4c4a8" />
    {/* Bowl rim — stepped */}
    <rect x="62" y="98" width="56" height="5" fill="#b8a88c" />
    <rect x="66" y="96" width="48" height="2" fill="#b8a88c" />
    <rect x="62" y="98" width="56" height="1" fill="#8a7a64" />
    {/* Water */}
    <rect x="66" y="99" width="48" height="4" fill="#5bb5d5" />
    <rect x="72" y="99" width="24" height="2" fill="#9bdaee" opacity="0.6" />
    {/* Cascade streams — pixel rects */}
    <rect x="62" y="104" width="4" height="36" fill="#7ec8e3">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="0.9s" repeatCount="indefinite" />
    </rect>
    <rect x="114" y="104" width="4" height="36" fill="#7ec8e3">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" />
    </rect>

    {/* ── UPPER COLUMN ── */}
    <rect x="84" y="80" width="12" height="24" fill="#c4b498" />
    <rect x="84" y="80" width="2" height="22" fill="#d4c4a8" />
    <rect x="82" y="90" width="16" height="2" fill="#8a7a64" />

    {/* ── THIRD TIER BOWL (top) — pixel-art ── */}
    <rect x="70" y="74" width="40" height="6" fill="#b8a88c" />
    <rect x="70" y="74" width="40" height="2" fill="#d4c4a8" />
    {/* Bowl rim — stepped */}
    <rect x="72" y="70" width="36" height="5" fill="#b8a88c" />
    <rect x="76" y="68" width="28" height="2" fill="#b8a88c" />
    <rect x="72" y="70" width="36" height="1" fill="#8a7a64" />
    {/* Water */}
    <rect x="76" y="71" width="28" height="4" fill="#5bb5d5" />
    {/* Small cascades — pixel rects */}
    <rect x="72" y="76" width="3" height="24" fill="#7ec8e3">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="0.8s" repeatCount="indefinite" />
    </rect>
    <rect x="106" y="76" width="3" height="24" fill="#7ec8e3">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="0.85s" repeatCount="indefinite" />
    </rect>

    {/* ── TOP FINIAL ── */}
    <rect x="85" y="56" width="10" height="18" fill="#a89878" />
    <rect x="85" y="56" width="2" height="16" fill="#d4c4a8" />
    <rect x="84" y="48" width="12" height="8" fill="#c4b498" />
    <rect x="84" y="48" width="12" height="2" fill="#e4d4b8" />
    <rect x="86" y="44" width="8" height="4" fill="#c4b498" />
    <rect x="88" y="40" width="4" height="4" fill="#b8a88c" />

    {/* ══ WATER EFFECTS ══ */}

    {/* (1) Central vertical jet — thick, pulsing */}
    <rect x="88" y="20" width="4" height="22" fill="#9bd9ec">
      <animate attributeName="height" values="18;28;22;18" dur="1.4s" repeatCount="indefinite" />
      <animate attributeName="y" values="24;14;20;24" dur="1.4s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.7;1;0.85;0.7" dur="1.4s" repeatCount="indefinite" />
    </rect>
    <rect x="89" y="20" width="2" height="22" fill="#fffaf0" opacity="0.7">
      <animate attributeName="height" values="18;28;22;18" dur="1.4s" repeatCount="indefinite" />
      <animate attributeName="y" values="24;14;20;24" dur="1.4s" repeatCount="indefinite" />
    </rect>

    {/* (2) Arcing water streams — left side (5 staggered droplets) */}
    {[0, -0.28, -0.56, -0.84, -1.12].map((d, i) => (
      <rect key={`wl${i}`} x="88" y="14" width="2" height="2" fill={i % 2 === 0 ? '#9bd9ec' : '#bfe3f5'}>
        <animate attributeName="x" values="90;68;42;32" dur="1.4s" begin={`${d}s`} repeatCount="indefinite" />
        <animate attributeName="y" values="24;8;30;60;174" dur="1.4s" begin={`${d}s`} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;1;1;0.8;0" dur="1.4s" begin={`${d}s`} repeatCount="indefinite" />
      </rect>
    ))}
    {/* Right side (5 staggered droplets) */}
    {[0, -0.28, -0.56, -0.84, -1.12].map((d, i) => (
      <rect key={`wr${i}`} x="90" y="14" width="2" height="2" fill={i % 2 === 0 ? '#9bd9ec' : '#bfe3f5'}>
        <animate attributeName="x" values="90;112;138;148" dur="1.4s" begin={`${d}s`} repeatCount="indefinite" />
        <animate attributeName="y" values="24;8;30;60;174" dur="1.4s" begin={`${d}s`} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;1;1;0.8;0" dur="1.4s" begin={`${d}s`} repeatCount="indefinite" />
      </rect>
    ))}

    {/* (3) Apex spray droplets */}
    <rect x="86" y="10" width="2" height="2" fill="#fffaf0">
      <animate attributeName="y" values="22;6;4;8;22" dur="1.4s" repeatCount="indefinite" />
      <animate attributeName="x" values="90;86;84;86;90" dur="1.4s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;1;1;0.8;0" dur="1.4s" repeatCount="indefinite" />
    </rect>
    <rect x="92" y="10" width="2" height="2" fill="#fffaf0">
      <animate attributeName="y" values="22;6;4;8;22" dur="1.4s" begin="-0.3s" repeatCount="indefinite" />
      <animate attributeName="x" values="90;94;96;94;90" dur="1.4s" begin="-0.3s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;1;1;0.8;0" dur="1.4s" begin="-0.3s" repeatCount="indefinite" />
    </rect>
    <rect x="89" y="6" width="2" height="2" fill="#bfe3f5">
      <animate attributeName="y" values="20;4;2;6;20" dur="1.8s" begin="-0.5s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;0.9;0.7;0" dur="1.8s" begin="-0.5s" repeatCount="indefinite" />
    </rect>

    {/* (4) Splash impacts on base pool */}
    <rect x="40" y="172" width="4" height="2" fill="#fffaf0">
      <animate attributeName="opacity" values="0;1;0" dur="1.4s" repeatCount="indefinite" />
      <animate attributeName="width" values="2;6;2" dur="1.4s" repeatCount="indefinite" />
    </rect>
    <rect x="136" y="172" width="4" height="2" fill="#fffaf0">
      <animate attributeName="opacity" values="0;1;0" dur="1.4s" begin="-0.35s" repeatCount="indefinite" />
      <animate attributeName="width" values="2;6;2" dur="1.4s" begin="-0.35s" repeatCount="indefinite" />
    </rect>
    <rect x="56" y="172" width="4" height="2" fill="#fffaf0">
      <animate attributeName="opacity" values="0;1;0" dur="1.4s" begin="-0.7s" repeatCount="indefinite" />
      <animate attributeName="width" values="2;6;2" dur="1.4s" begin="-0.7s" repeatCount="indefinite" />
    </rect>
    <rect x="124" y="172" width="4" height="2" fill="#fffaf0">
      <animate attributeName="opacity" values="0;1;0" dur="1.4s" begin="-1.05s" repeatCount="indefinite" />
      <animate attributeName="width" values="2;6;2" dur="1.4s" begin="-1.05s" repeatCount="indefinite" />
    </rect>
  </svg>
);

const CLOUDS = [
  { top: 3, dur: 55, delay: 0, size: 75 },
  { top: 8, dur: 65, delay: 12, size: 55, rtl: true },
  { top: 5, dur: 75, delay: 25, size: 90 },
  { top: 12, dur: 50, delay: 8, size: 45 },
];

const BUTTERFLIES = [
  { top: 55, left: 15, dur: 6, delay: 0, color: '#ff9ec4' },
  { top: 48, left: 40, dur: 7, delay: 2, color: '#ffe066' },
  { top: 60, left: 65, dur: 5.5, delay: 1, color: '#c4a0ff' },
  { top: 52, left: 85, dur: 8, delay: 3, color: '#80d4ff' },
  { top: 45, left: 30, dur: 6.5, delay: 4, color: '#ff9ec4' },
];

const IsometricWorld: React.FC<{ bgUrl?: string; hideAtmosphere?: boolean }> = ({ bgUrl, hideAtmosphere }) => (
  <Container>
    <BgLayer style={bgUrl ? { backgroundImage: `url(${bgUrl})` } : undefined} />
    <SkyOverlay />
    <AmbientOverlay />
    {/* Note: the ornate fountain is rendered by AgentPanel so it can be
       a click target — see <FountainWrap onClick={...}> in AgentPanel. */}
    {!hideAtmosphere && (
      <AnimLayer>
        {CLOUDS.map((c, i) => (
          <Cloud key={`cloud-${i}`} $top={c.top} $dur={c.dur} $delay={c.delay} $size={c.size} $rtl={c.rtl} />
        ))}
        {BUTTERFLIES.map((b, i) => (
          <Butterfly key={`fly-${i}`} $top={b.top} $dur={b.dur} $delay={b.delay} $color={b.color} />
        ))}
      </AnimLayer>
    )}
  </Container>
);

export { FountainWrap, FountainSVG };
export default IsometricWorld;
