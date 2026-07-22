import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import styled, { keyframes, useTheme } from 'styled-components';
import { Button, FormField } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import SpriteAvatar from '../../components/SpriteAvatar';
import { AGENTS, FARMER } from '../../config/agents';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'zh-TW', label: '繁' },
  { code: 'zh-CN', label: '简' },
];

/* ═══════════════════════════════════════
   Orbital Animation (same as Search page)
   ═══════════════════════════════════════ */
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
`;

const OrbitPath = styled.div<{ $frac: number; $dur: number; $reverse?: boolean }>`
  position: absolute;
  width: ${({ $frac }) => $frac * 100}%;
  height: ${({ $frac }) => $frac * 100}%;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  animation: ${orbitSpin} ${({ $dur }) => $dur}s linear infinite;
  ${({ $reverse }) => $reverse && 'animation-direction: reverse;'}
`;

const OrbitNodeWrap = styled.div<{ $dur: number; $reverse?: boolean }>`
  position: absolute;
  transform: translate(-50%, -50%);
  animation: ${orbitSpin} ${({ $dur }) => $dur}s linear infinite;
  animation-direction: ${({ $reverse }) => ($reverse ? 'normal' : 'reverse')};
`;

const OrbitAvatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${({ theme }) => theme.shadows.card};
  overflow: hidden;
  border: 2px solid ${({ theme }) => theme.colors.border};
`;

const OrbitDot = styled.div<{ $color: string; $s: number }>`
  width: ${({ $s }) => $s}px;
  height: ${({ $s }) => $s}px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 ${({ $s }) => $s * 2}px ${({ $color }) => $color}55;
`;

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

/* ═══════════════════════════════════════
   Page Layout
   ═══════════════════════════════════════ */
const Page = styled.div`
  position: relative;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.canvas};
  overflow: hidden;
`;

const LeftSide = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 18vh 4vw 6vh 12vw;

  @media (max-width: 900px) {
    padding: 10vh 6vw 4vh;
  }
`;

/* ═══════════════════════════════════════
   Hero text
   ═══════════════════════════════════════ */
const Brand = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.accent};
  margin-bottom: 16px;
`;

const HeroTitle = styled.h1`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: clamp(2.4rem, 5vw, 3.8rem);
  font-weight: 800;
  line-height: 1.15;
  color: ${({ theme }) => theme.colors.textPrimary};
  max-width: 92%;
  margin: 0 0 20px;
  letter-spacing: -0.5px;
`;

const HeroSub = styled.p`
  font-size: clamp(1rem, 1.5vw, 1.15rem);
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.textSecondary};
  max-width: 88%;
  margin: 0 0 44px;
`;

/* ═══════════════════════════════════════
   Form
   ═══════════════════════════════════════ */
const FormCard = styled.div`
  width: 100%;
  max-width: 400px;
`;

const FormTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 24px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const ForgotLink = styled(Link)`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.accent};
  text-decoration: none;
  text-align: right;
  display: block;
  margin-top: -6px;
  &:hover { text-decoration: underline; }
`;

const FooterRow = styled.div`
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const FooterLink = styled(Link)`
  color: ${({ theme }) => theme.colors.accent};
  text-decoration: none;
  font-weight: 500;
  &:hover { text-decoration: underline; }
`;

const ErrorMsg = styled.div`
  color: ${({ theme }) => theme.strong.mauve};
  font-size: 0.8125rem;
  text-align: center;
`;

const LangPill = styled.div`
  position: absolute;
  top: 20px;
  left: 12vw;
  display: inline-flex;
  border-radius: 999px;
  z-index: 3;
  background: ${({ theme }) => theme.colors.surface}88;
  backdrop-filter: blur(8px);
  border: 1px solid ${({ theme }) => theme.colors.border};
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

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */
const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const slogan = useMemo(() => {
    const slogans = [
      t('login.slogan1'),
      t('login.slogan2'),
      t('login.slogan3'),
      t('login.slogan4'),
      t('login.slogan5'),
    ];
    return slogans[Math.floor(Math.random() * slogans.length)];
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || t('login.loginFailed'));
    }
  };

  return (
    <Page>
      <LangPill>
        <LangPillInner>
          <LangSlider $index={Math.max(0, LANGUAGES.findIndex(l => l.code === i18n.language))} />
          {LANGUAGES.map((lang) => (
            <LangBtn key={lang.code} $active={i18n.language === lang.code} onClick={() => i18n.changeLanguage(lang.code)}>
              {lang.label}
            </LangBtn>
          ))}
        </LangPillInner>
      </LangPill>
      <LeftSide>
        <Brand>ClientRadar AI</Brand>
        <HeroTitle>{slogan}</HeroTitle>
        <HeroSub>{t('login.heroSub')}</HeroSub>

        <FormCard>
          <FormTitle>{t('login.title')}</FormTitle>
          <Form onSubmit={handleSubmit}>
            <FormField
              label={t('common.email')}
              type="text"
              value={email}
              onChange={setEmail}
              placeholder={t('login.emailPlaceholder')}
            />
            <FormField
              label={t('login.password')}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={t('login.passwordPlaceholder')}
            />
            <ForgotLink to="/forgot-password">
              {t('login.forgotPassword')}
            </ForgotLink>
            {error && <ErrorMsg>{error}</ErrorMsg>}
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? t('auth.loadingBtn') : t('login.loginButton')}
            </Button>
          </Form>
          <FooterRow>
            {t('login.noAccount')}{' '}
            <FooterLink to="/register">{t('login.register')}</FooterLink>
          </FooterRow>
        </FormCard>
      </LeftSide>

      {/* ── Orbital system (center at top-right, oversized) ── */}
      <OrbitalHero>
          {/* Ring 0 — S1 Fox + S3 Chicken */}
          <OrbitPath $frac={ORBIT_RINGS[0].frac} $dur={ORBIT_RINGS[0].dur}>
            <OrbitNodeWrap style={orbitNodePos(0)} $dur={ORBIT_RINGS[0].dur}>
              <OrbitAvatar>
                <SpriteAvatar src={AGENTS.S1.sprite} frames={AGENTS.S1.frames} frameW={AGENTS.S1.frameW} frameH={AGENTS.S1.frameH} size={36} />
              </OrbitAvatar>
            </OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(180)} $dur={ORBIT_RINGS[0].dur}>
              <OrbitAvatar>
                <SpriteAvatar src={AGENTS.S3.sprite} frames={AGENTS.S3.frames} frameW={AGENTS.S3.frameW} frameH={AGENTS.S3.frameH} size={36} />
              </OrbitAvatar>
            </OrbitNodeWrap>
          </OrbitPath>

          {/* Ring 1 — S2 Cow + S4 Duck + Farmer */}
          <OrbitPath $frac={ORBIT_RINGS[1].frac} $dur={ORBIT_RINGS[1].dur} $reverse>
            <OrbitNodeWrap style={orbitNodePos(30)} $dur={ORBIT_RINGS[1].dur} $reverse>
              <OrbitAvatar>
                <SpriteAvatar src={AGENTS.S2.sprite} frames={AGENTS.S2.frames} frameW={AGENTS.S2.frameW} frameH={AGENTS.S2.frameH} size={36} />
              </OrbitAvatar>
            </OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(150)} $dur={ORBIT_RINGS[1].dur} $reverse>
              <OrbitAvatar>
                <SpriteAvatar src={AGENTS.S4.sprite} frames={AGENTS.S4.frames} frameW={AGENTS.S4.frameW} frameH={AGENTS.S4.frameH} size={36} />
              </OrbitAvatar>
            </OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(270)} $dur={ORBIT_RINGS[1].dur} $reverse>
              <OrbitAvatar>
                <SpriteAvatar src={FARMER.sprite} frames={FARMER.frames} frameW={FARMER.frameW} frameH={FARMER.frameH} size={36} />
              </OrbitAvatar>
            </OrbitNodeWrap>
          </OrbitPath>

          {/* Ring 2 — accent dots */}
          <OrbitPath $frac={ORBIT_RINGS[2].frac} $dur={ORBIT_RINGS[2].dur}>
            <OrbitNodeWrap style={orbitNodePos(0)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.colors.accent} $s={10} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(72)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.colors.accent} $s={7} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(144)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.strong.olive} $s={9} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(216)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.strong.mauve} $s={6} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(288)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.strong.gold} $s={8} /></OrbitNodeWrap>
          </OrbitPath>

          {/* Ring 3 */}
          <OrbitPath $frac={ORBIT_RINGS[3].frac} $dur={ORBIT_RINGS[3].dur} $reverse>
            <OrbitNodeWrap style={orbitNodePos(20)} $dur={ORBIT_RINGS[3].dur} $reverse><OrbitDot $color={theme.colors.accent} $s={8} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(110)} $dur={ORBIT_RINGS[3].dur} $reverse><OrbitDot $color={theme.colors.accent} $s={6} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(200)} $dur={ORBIT_RINGS[3].dur} $reverse><OrbitDot $color={theme.strong.olive} $s={7} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(290)} $dur={ORBIT_RINGS[3].dur} $reverse><OrbitDot $color={theme.strong.gold} $s={5} /></OrbitNodeWrap>
          </OrbitPath>

          {/* Ring 4 */}
          <OrbitPath $frac={ORBIT_RINGS[4].frac} $dur={ORBIT_RINGS[4].dur}>
            <OrbitNodeWrap style={orbitNodePos(15)} $dur={ORBIT_RINGS[4].dur}><OrbitDot $color={theme.colors.accent} $s={5} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(87)} $dur={ORBIT_RINGS[4].dur}><OrbitDot $color={theme.strong.mauve} $s={4} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(159)} $dur={ORBIT_RINGS[4].dur}><OrbitDot $color={theme.colors.accent} $s={6} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(231)} $dur={ORBIT_RINGS[4].dur}><OrbitDot $color={theme.strong.olive} $s={4} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(303)} $dur={ORBIT_RINGS[4].dur}><OrbitDot $color={theme.strong.gold} $s={5} /></OrbitNodeWrap>
          </OrbitPath>

          {/* Ring 5 — outermost */}
          <OrbitPath $frac={ORBIT_RINGS[5].frac} $dur={ORBIT_RINGS[5].dur} $reverse>
            <OrbitNodeWrap style={orbitNodePos(0)} $dur={ORBIT_RINGS[5].dur} $reverse><OrbitDot $color={theme.colors.accent} $s={3} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(60)} $dur={ORBIT_RINGS[5].dur} $reverse><OrbitDot $color={theme.colors.accent} $s={4} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(120)} $dur={ORBIT_RINGS[5].dur} $reverse><OrbitDot $color={theme.strong.olive} $s={3} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(180)} $dur={ORBIT_RINGS[5].dur} $reverse><OrbitDot $color={theme.strong.gold} $s={4} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(240)} $dur={ORBIT_RINGS[5].dur} $reverse><OrbitDot $color={theme.strong.mauve} $s={3} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(300)} $dur={ORBIT_RINGS[5].dur} $reverse><OrbitDot $color={theme.colors.accent} $s={4} /></OrbitNodeWrap>
          </OrbitPath>
      </OrbitalHero>
    </Page>
  );
};

export default Login;
