import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import styled, { keyframes, useTheme } from 'styled-components';
import SpriteAvatar from '../SpriteAvatar';
import { AGENTS, FARMER } from '../../config/agents';
import { glassTrack } from '../../styles/liquidGlass';

/* ══════════════════════════════════════════════════════════════
   AuthShell — shared chrome for the Login and Register pages.

   These two pages used to look unrelated: login had the radar hero, the layered
   backdrop and a left content column, while register was a plain centred card.
   Everything visual now lives here so the two can't drift apart again; each page
   supplies only its own heading and form.
   ══════════════════════════════════════════════════════════════ */

export const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'zh-TW', label: '繁' },
  { code: 'zh-CN', label: '简' },
];

/* ── Orbital radar ── */
const orbitSpin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const OrbitalHero = styled.div`
  position: fixed;
  top: 50%;
  right: 0;
  transform: translate(35%, -50%);
  width: 900px;
  height: 900px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 0;
  pointer-events: none;

  &::before {
    content: '';
    position: absolute;
    width: 50%;
    height: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(
      circle,
      ${({ theme }) => theme.colors.accent}18 0%,
      ${({ theme }) => theme.colors.accent}0c 35%,
      ${({ theme }) => theme.colors.accent}06 60%,
      transparent 100%
    );
    filter: blur(30px);
    pointer-events: none;
  }

  /* Radar sweep — a rotating wedge. The product is called ClientRadar, so the
     orbit system reads as a radar rather than generic decoration. */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      ${({ theme }) => theme.colors.accent}00 0deg,
      ${({ theme }) => theme.colors.accent}00 300deg,
      ${({ theme }) => theme.colors.accent}12 350deg,
      ${({ theme }) => theme.colors.accent}26 360deg
    );
    animation: ${orbitSpin} 8s linear infinite;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    &::after { animation: none; }
  }
`;

const OrbitPath = styled.div<{ $frac: number; $dur: number; $reverse?: boolean }>`
  position: absolute;
  width: ${({ $frac }) => $frac * 100}%;
  height: ${({ $frac }) => $frac * 100}%;
  border-radius: 50%;
  /* theme.colors.border on the canvas measured 1.36:1 — effectively invisible.
     Tinted with the accent and faded outward so the rings recede with depth. */
  border: 1px solid ${({ theme, $frac }) => `${theme.colors.accent}${
    $frac < 0.3 ? '4d' : $frac < 0.55 ? '38' : $frac < 0.8 ? '26' : '1a'
  }`};
  animation: ${orbitSpin} ${({ $dur }) => $dur}s linear infinite;
  ${({ $reverse }) => $reverse && 'animation-direction: reverse;'}
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const OrbitNodeWrap = styled.div<{ $dur: number; $reverse?: boolean }>`
  position: absolute;
  transform: translate(-50%, -50%);
  animation: ${orbitSpin} ${({ $dur }) => $dur}s linear infinite;
  animation-direction: ${({ $reverse }) => ($reverse ? 'normal' : 'reverse')};
`;

const OrbitAvatar = styled.div`
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 2px 3px rgba(11, 8, 11, 0.22));
`;

const OrbitName = styled.div`
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.accent};
  opacity: 0.75;
  pointer-events: none;
`;

const OrbitDot = styled.div<{ $color: string; $s: number }>`
  width: ${({ $s }) => $s}px;
  height: ${({ $s }) => $s}px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 ${({ $s }) => $s * 2}px ${({ $color }) => $color}55;
`;

/**
 * With `trim`, SpriteAvatar's `size` is the character's *height*. These animals
 * have very different aspects (the cow is 32x17, the farmer 16x19), so sizing
 * them all by height makes the wide ones overflow the disc. This returns the
 * height that makes the whole character fit inside a `box` square.
 */
const fitSize = (trim: { w: number; h: number }, box: number) =>
  Math.round((trim.h * box) / Math.max(trim.w, trim.h));

const ORBIT_RINGS = [
  { frac: 0.20, dur: 75, reverse: false },
  { frac: 0.34, dur: 105, reverse: true },
  { frac: 0.50, dur: 150, reverse: false },
  { frac: 0.67, dur: 210, reverse: true },
  { frac: 0.83, dur: 270, reverse: false },
  { frac: 0.97, dur: 360, reverse: true },
];

const orbitNodePos = (angle: number) => ({
  top: `${50 - 50 * Math.cos((angle * Math.PI) / 180)}%`,
  left: `${50 + 50 * Math.sin((angle * Math.PI) / 180)}%`,
});

/* ── Page + backdrop ── */
const Page = styled.div`
  position: relative;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.canvas};
  overflow: hidden;
`;

const GRID = 34; // px

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    /* grid */
    repeating-linear-gradient(
      to right,
      ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(11,8,11,0.035)'} 0 1px,
      transparent 1px ${GRID}px
    ),
    repeating-linear-gradient(
      to bottom,
      ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(11,8,11,0.035)'} 0 1px,
      transparent 1px ${GRID}px
    ),
    /* glows */
    radial-gradient(
      680px circle at 12% 18%,
      ${({ theme }) => theme.strong.gold}${({ theme }) => theme.mode === 'dark' ? '14' : '1c'} 0%,
      transparent 68%
    ),
    radial-gradient(
      900px circle at 78% 46%,
      ${({ theme }) => theme.colors.accent}${({ theme }) => theme.mode === 'dark' ? '1a' : '1f'} 0%,
      transparent 70%
    );

  /* Grain on top of the gradients */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    opacity: ${({ theme }) => theme.mode === 'dark' ? 0.05 : 0.035};
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
`;

const TerminalMark = styled.pre`
  position: fixed;
  left: 12vw;
  bottom: 5vh;
  z-index: 1;
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.6875rem;
  line-height: 1.75;
  color: ${({ theme }) => theme.colors.textPrimary};
  opacity: 0.3;
  pointer-events: none;
  user-select: none;
  white-space: pre;

  .prompt { color: ${({ theme }) => theme.colors.accent}; }
  .ok { color: ${({ theme }) => theme.strong.olive}; }
  .dim { opacity: 0.65; }

  @media (max-width: 900px), (max-height: 720px) { display: none; }
`;

const LeftSide = styled.div<{ $compact?: boolean }>`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  /* Register has six fields, so it needs to start higher than login's two */
  padding: ${({ $compact }) => ($compact ? '9vh' : '18vh')} 4vw 6vh 12vw;

  @media (max-width: 900px) {
    padding: ${({ $compact }) => ($compact ? '7vh' : '10vh')} 6vw 4vh;
  }
`;

/* ── Hero text (exported: pages fill in their own copy) ── */
export const Brand = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.accent};
  margin-bottom: 16px;
`;

export const HeroTitle = styled.h1`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: clamp(2.4rem, 5vw, 3.8rem);
  font-weight: 800;
  line-height: 1.15;
  color: ${({ theme }) => theme.colors.textPrimary};
  max-width: 92%;
  margin: 0 0 20px;
  letter-spacing: -0.5px;
`;

export const HeroSub = styled.p`
  font-size: clamp(1rem, 1.5vw, 1.15rem);
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.textSecondary};
  max-width: 88%;
  margin: 0 0 44px;
`;

/* ── Form primitives (exported so both forms match exactly) ── */
export const FormCard = styled.div<{ $wide?: boolean }>`
  width: 100%;
  max-width: ${({ $wide }) => ($wide ? '520px' : '400px')};
`;

export const FormTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 24px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

export const ForgotLink = styled(Link)`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.accent};
  text-decoration: none;
  text-align: right;
  display: block;
  margin-top: -6px;
  &:hover { text-decoration: underline; }
`;

export const FooterRow = styled.div`
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const FooterLink = styled(Link)`
  color: ${({ theme }) => theme.colors.accent};
  text-decoration: none;
  font-weight: 500;
  &:hover { text-decoration: underline; }
`;

export const ErrorMsg = styled.div`
  color: ${({ theme }) => theme.strong.mauve};
  font-size: 0.8125rem;
  text-align: center;
`;

/** Two fields side by side; collapses to one column when there's no room. */
export const FieldPair = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  @media (max-width: 620px) { grid-template-columns: minmax(0, 1fr); }
`;

/* ── Language switcher ── */
const LangPill = styled.div`
  position: absolute;
  top: 20px;
  left: 12vw;
  display: inline-flex;
  border-radius: 999px;
  z-index: 3;
  ${glassTrack}
  padding: 3px;

  @media (max-width: 900px) {
    left: 6vw;
  }
`;

const LangPillInner = styled.div`
  position: relative;
  display: inline-flex;
`;

const LangSlider = styled.div<{ $index: number }>`
  position: absolute;
  top: 0;
  left: 0;
  width: calc(100% / 3);
  height: 100%;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.accent};
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateX(${({ $index }) => $index * 100}%);
`;

const LangBtn = styled.button<{ $active?: boolean }>`
  padding: 5px 14px;
  border: none;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  color: ${({ $active, theme }) => $active ? theme.colors.textInverted : theme.colors.textSecondary};
  transition: color 0.25s;
  position: relative;
  z-index: 1;
  &:hover { opacity: 0.8; }
`;

/* ══════════════════════════════════════════════════════════════ */

interface AuthShellProps {
  children: React.ReactNode;
  /** Start the content column higher — for forms with many fields. */
  compact?: boolean;
}

/**
 * Renders the page background, the language switcher, the orbiting agent cast
 * and the terminal watermark, then drops `children` into the left column.
 */
export const AuthShell: React.FC<AuthShellProps> = ({ children, compact }) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();

  return (
    <Page>
      <Backdrop />

      <LangPill>
        <LangPillInner>
          <LangSlider $index={Math.max(0, LANGUAGES.findIndex(l => l.code === i18n.language))} />
          {LANGUAGES.map((lang) => (
            <LangBtn
              key={lang.code}
              $active={i18n.language === lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
            >
              {lang.label}
            </LangBtn>
          ))}
        </LangPillInner>
      </LangPill>

      <LeftSide $compact={compact}>{children}</LeftSide>

      {/* ── Orbital system (center at top-right, oversized) ── */}
      <OrbitalHero>
        {/* Ring 0 — S1 + S3 */}
        <OrbitPath $frac={ORBIT_RINGS[0].frac} $dur={ORBIT_RINGS[0].dur}>
          <OrbitNodeWrap style={orbitNodePos(0)} $dur={ORBIT_RINGS[0].dur}>
            <OrbitAvatar>
              <SpriteAvatar src={AGENTS.S1.sprite} frames={AGENTS.S1.frames} frameW={AGENTS.S1.frameW} frameH={AGENTS.S1.frameH} trim={AGENTS.S1.trim} size={fitSize(AGENTS.S1.trim, 44)} />
            </OrbitAvatar>
            <OrbitName>{t(AGENTS.S1.nameKey)}</OrbitName>
          </OrbitNodeWrap>
          <OrbitNodeWrap style={orbitNodePos(180)} $dur={ORBIT_RINGS[0].dur}>
            <OrbitAvatar>
              <SpriteAvatar src={AGENTS.S3.sprite} frames={AGENTS.S3.frames} frameW={AGENTS.S3.frameW} frameH={AGENTS.S3.frameH} trim={AGENTS.S3.trim} size={fitSize(AGENTS.S3.trim, 44)} />
            </OrbitAvatar>
            <OrbitName>{t(AGENTS.S3.nameKey)}</OrbitName>
          </OrbitNodeWrap>
        </OrbitPath>

        {/* Ring 1 — S2 + S4 + Farmer */}
        <OrbitPath $frac={ORBIT_RINGS[1].frac} $dur={ORBIT_RINGS[1].dur} $reverse>
          <OrbitNodeWrap style={orbitNodePos(30)} $dur={ORBIT_RINGS[1].dur} $reverse>
            <OrbitAvatar>
              <SpriteAvatar src={AGENTS.S2.sprite} frames={AGENTS.S2.frames} frameW={AGENTS.S2.frameW} frameH={AGENTS.S2.frameH} trim={AGENTS.S2.trim} size={fitSize(AGENTS.S2.trim, 44)} />
            </OrbitAvatar>
            <OrbitName>{t(AGENTS.S2.nameKey)}</OrbitName>
          </OrbitNodeWrap>
          <OrbitNodeWrap style={orbitNodePos(150)} $dur={ORBIT_RINGS[1].dur} $reverse>
            <OrbitAvatar>
              <SpriteAvatar src={AGENTS.S4.sprite} frames={AGENTS.S4.frames} frameW={AGENTS.S4.frameW} frameH={AGENTS.S4.frameH} trim={AGENTS.S4.trim} size={fitSize(AGENTS.S4.trim, 44)} />
            </OrbitAvatar>
            <OrbitName>{t(AGENTS.S4.nameKey)}</OrbitName>
          </OrbitNodeWrap>
          <OrbitNodeWrap style={orbitNodePos(270)} $dur={ORBIT_RINGS[1].dur} $reverse>
            <OrbitAvatar>
              <SpriteAvatar src={FARMER.sprite} frames={FARMER.frames} frameW={FARMER.frameW} frameH={FARMER.frameH} trim={FARMER.trim} size={fitSize(FARMER.trim, 44)} />
            </OrbitAvatar>
            <OrbitName>{t(FARMER.nameKey)}</OrbitName>
          </OrbitNodeWrap>
        </OrbitPath>

        {/* Rings 2-3 — signal dots */}
        <OrbitPath $frac={ORBIT_RINGS[2].frac} $dur={ORBIT_RINGS[2].dur}>
          <OrbitNodeWrap style={orbitNodePos(0)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.colors.accent} $s={10} /></OrbitNodeWrap>
          <OrbitNodeWrap style={orbitNodePos(72)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.colors.accent} $s={7} /></OrbitNodeWrap>
          <OrbitNodeWrap style={orbitNodePos(144)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.strong.olive} $s={9} /></OrbitNodeWrap>
          <OrbitNodeWrap style={orbitNodePos(216)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.strong.mauve} $s={6} /></OrbitNodeWrap>
          <OrbitNodeWrap style={orbitNodePos(288)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.strong.gold} $s={8} /></OrbitNodeWrap>
        </OrbitPath>
        <OrbitPath $frac={ORBIT_RINGS[3].frac} $dur={ORBIT_RINGS[3].dur} $reverse>
          <OrbitNodeWrap style={orbitNodePos(20)} $dur={ORBIT_RINGS[3].dur} $reverse><OrbitDot $color={theme.colors.accent} $s={8} /></OrbitNodeWrap>
          <OrbitNodeWrap style={orbitNodePos(110)} $dur={ORBIT_RINGS[3].dur} $reverse><OrbitDot $color={theme.colors.accent} $s={6} /></OrbitNodeWrap>
          <OrbitNodeWrap style={orbitNodePos(200)} $dur={ORBIT_RINGS[3].dur} $reverse><OrbitDot $color={theme.strong.olive} $s={7} /></OrbitNodeWrap>
          <OrbitNodeWrap style={orbitNodePos(290)} $dur={ORBIT_RINGS[3].dur} $reverse><OrbitDot $color={theme.strong.gold} $s={5} /></OrbitNodeWrap>
        </OrbitPath>
        <OrbitPath $frac={ORBIT_RINGS[4].frac} $dur={ORBIT_RINGS[4].dur} />
        <OrbitPath $frac={ORBIT_RINGS[5].frac} $dur={ORBIT_RINGS[5].dur} $reverse />
      </OrbitalHero>

      <TerminalMark aria-hidden="true">
        <span className="prompt">$</span> clientradar scan --industry=restaurant --region=HK{'\n'}
        <span className="ok">  ✓</span> 31 leads found <span className="dim">· 4 agents on duty</span>{'\n'}
        <span className="ok">  ✓</span> 2 qualified <span className="dim">· 28 contacted · 0 bounced</span>
      </TerminalMark>
    </Page>
  );
};

export default AuthShell;
