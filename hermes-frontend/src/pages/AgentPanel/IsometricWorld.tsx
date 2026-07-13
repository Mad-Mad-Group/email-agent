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
    <AmbientOverlay />
    {!hideAtmosphere && (
      <AnimLayer>
        {CLOUDS.map((c, i) => (
          <Cloud key={`cloud-${i}`} $top={c.top} $dur={c.dur} $delay={c.delay} $size={c.size} $rtl={c.rtl} />
        ))}
        {BUTTERFLIES.map((b, i) => (
          <Butterfly key={`fly-${i}`} $top={b.top} $left={b.left} $dur={b.dur} $delay={b.delay} $color={b.color} />
        ))}
      </AnimLayer>
    )}
  </Container>
);

export default IsometricWorld;
