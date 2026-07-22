import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import styled, { keyframes, useTheme } from 'styled-components';
import { Button, FormField } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import { media } from '../../styles/media';
import SpriteAvatar from '../../components/SpriteAvatar';
import { AGENTS, FARMER } from '../../config/agents';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'zh-TW', label: '繁' },
  { code: 'zh-CN', label: '简' },
];

const SLOGANS = [
  'login.slogan1',
  'login.slogan2',
  'login.slogan3',
  'login.slogan4',
  'login.slogan5',
];

/* ── Layout ── */

const PageWrap = styled.div`
  position: relative;
  display: flex;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.canvas};
  overflow: hidden;

  ${media.mobile} {
    flex-direction: column;
  }
`;

/* ── Left panel ── */

const LeftPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 60px 48px 60px 64px;
  z-index: 2;
  max-width: 520px;

  ${media.tablet} { padding: 48px 32px; max-width: 440px; }
  ${media.mobile} {
    max-width: 100%;
    padding: 100px 24px 32px;
    align-items: center;
    text-align: center;
  }
`;

const Brand = styled.div`
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.1rem;
  letter-spacing: 1.5px;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-bottom: 24px;
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const HeroTitle = styled.h1`
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 12px;
  background: ${({ theme }) => theme.gradients.brand};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${fadeIn} 0.6s ease-out both;
`;

const HeroSub = styled.p`
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0 0 36px;
  max-width: 380px;
  line-height: 1.6;
  animation: ${fadeIn} 0.6s 0.15s ease-out both;
`;

const FormWrap = styled.div`
  width: 100%;
  max-width: 360px;
  animation: ${fadeIn} 0.6s 0.3s ease-out both;

  ${media.mobile} { max-width: 100%; }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const BtnRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 4px;
`;

const PrimaryBtn = styled.button`
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  background: ${({ theme }) => theme.colors.accent};
  color: ${({ theme }) => theme.colors.textInverted};
  transition: opacity 0.15s;
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SecondaryBtn = styled(Link)`
  flex: 1;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};
  text-align: center;
  text-decoration: none;
  transition: background 0.15s;
  &:hover { background: ${({ theme }) => theme.colors.surfaceMuted}; }
`;

const ForgotLink = styled(Link)`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.accent};
  text-decoration: none;
  text-align: right;
  display: block;
  margin-top: -8px;
  &:hover { text-decoration: underline; }
`;

const ErrorMsg = styled.div`
  color: ${({ theme }) => theme.strong.mauve};
  font-size: 0.8125rem;
  text-align: center;
`;

/* ── Right panel — orbital animation ── */

const RightPanel = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-height: 500px;

  ${media.mobile} {
    min-height: 300px;
    flex: none;
  }
`;

const orbitSpin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const OrbitalHero = styled.div`
  position: relative;
  width: min(60vmin, 600px);
  height: min(60vmin, 600px);
  display: flex;
  align-items: center;
  justify-content: center;

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
      transparent 70%
    );
    filter: blur(30px);
  }

  ${media.mobile} {
    width: min(70vmin, 320px);
    height: min(70vmin, 320px);
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
  animation-direction: ${({ $reverse }) => $reverse ? 'normal' : 'reverse'};
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
  ${media.mobile} { width: 34px; height: 34px; }
`;

const OrbitDot = styled.div<{ $color: string; $s: number }>`
  width: ${({ $s }) => $s}px;
  height: ${({ $s }) => $s}px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 ${({ $s }) => $s * 2}px ${({ $color }) => $color}55;
`;

const CenterLogo = styled.div`
  position: relative;
  z-index: 2;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 2px;
  color: ${({ theme }) => theme.colors.accent};
  background: ${({ theme }) => theme.colors.surface};
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${({ theme }) => theme.shadows.card}, 0 0 40px ${({ theme }) => theme.colors.accent}22;
  border: 2px solid ${({ theme }) => theme.colors.border};
`;

const ORBIT_RINGS = [
  { frac: 0.22, dur: 25, reverse: false },
  { frac: 0.38, dur: 35, reverse: true },
  { frac: 0.55, dur: 50, reverse: false },
  { frac: 0.72, dur: 70, reverse: true },
  { frac: 0.88, dur: 90, reverse: false },
  { frac: 0.98, dur: 120, reverse: true },
];

const orbitNodePos = (angle: number) => ({
  top: `${50 - 50 * Math.cos(angle * Math.PI / 180)}%`,
  left: `${50 + 50 * Math.sin(angle * Math.PI / 180)}%`,
});

/* ── Lang pill ── */

const LangBar = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  padding: 3px;
`;

const LangBtn = styled.button<{ $active?: boolean }>`
  position: relative;
  z-index: 1;
  padding: 4px 12px;
  border: none;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: ${({ $active, theme }) => $active ? theme.colors.textInverted : theme.colors.textSecondary};
  transition: color 0.25s;
  &:hover { opacity: 0.8; }
`;

const LangSlider = styled.div<{ $idx: number; $count: number }>`
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: ${({ $idx, $count }) => `calc(3px + ${$idx} * (100% - 6px) / ${$count})`};
  width: ${({ $count }) => `calc((100% - 6px) / ${$count})`};
  background: ${({ theme }) => theme.colors.accent};
  border-radius: 16px;
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

/* ── Component ── */

const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const sloganKey = useMemo(() => SLOGANS[Math.floor(Math.random() * SLOGANS.length)], []);

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
    <PageWrap>
      <LangBar>
        <LangSlider $idx={LANGUAGES.findIndex(l => l.code === i18n.language)} $count={LANGUAGES.length} />
        {LANGUAGES.map((lang) => (
          <LangBtn key={lang.code} $active={i18n.language === lang.code} onClick={() => i18n.changeLanguage(lang.code)}>
            {lang.label}
          </LangBtn>
        ))}
      </LangBar>

      <LeftPanel>
        <Brand>CLIENT RADAR AI</Brand>
        <HeroTitle>{t(sloganKey)}</HeroTitle>
        <HeroSub>{t('login.heroSub')}</HeroSub>

        <FormWrap>
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
            <BtnRow>
              <PrimaryBtn type="submit" disabled={loading}>
                {loading ? t('auth.loadingBtn') : t('login.loginButton')}
              </PrimaryBtn>
              <SecondaryBtn to="/register">
                {t('login.register')}
              </SecondaryBtn>
            </BtnRow>
          </Form>
        </FormWrap>
      </LeftPanel>

      <RightPanel>
        <OrbitalHero>
          <CenterLogo>CR</CenterLogo>
          {/* Ring 0 — Agent avatars */}
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
          {/* Ring 1 — More agents */}
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
          {/* Ring 2 — Colored dots */}
          <OrbitPath $frac={ORBIT_RINGS[2].frac} $dur={ORBIT_RINGS[2].dur}>
            <OrbitNodeWrap style={orbitNodePos(0)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.colors.accent} $s={10} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(72)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.colors.accent} $s={7} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(144)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.strong.olive} $s={9} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(216)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.strong.gold} $s={6} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(288)} $dur={ORBIT_RINGS[2].dur}><OrbitDot $color={theme.colors.accent} $s={8} /></OrbitNodeWrap>
          </OrbitPath>
          {/* Ring 3 */}
          <OrbitPath $frac={ORBIT_RINGS[3].frac} $dur={ORBIT_RINGS[3].dur} $reverse>
            <OrbitNodeWrap style={orbitNodePos(20)} $dur={ORBIT_RINGS[3].dur} $reverse><OrbitDot $color={theme.colors.accent} $s={8} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(110)} $dur={ORBIT_RINGS[3].dur} $reverse><OrbitDot $color={theme.strong.olive} $s={6} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(200)} $dur={ORBIT_RINGS[3].dur} $reverse><OrbitDot $color={theme.strong.gold} $s={7} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(290)} $dur={ORBIT_RINGS[3].dur} $reverse><OrbitDot $color={theme.colors.accent} $s={5} /></OrbitNodeWrap>
          </OrbitPath>
          {/* Ring 4 */}
          <OrbitPath $frac={ORBIT_RINGS[4].frac} $dur={ORBIT_RINGS[4].dur}>
            <OrbitNodeWrap style={orbitNodePos(15)} $dur={ORBIT_RINGS[4].dur}><OrbitDot $color={theme.colors.accent} $s={5} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(87)} $dur={ORBIT_RINGS[4].dur}><OrbitDot $color={theme.strong.gold} $s={4} /></OrbitNodeWrap>
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
            <OrbitNodeWrap style={orbitNodePos(240)} $dur={ORBIT_RINGS[5].dur} $reverse><OrbitDot $color={theme.colors.accent} $s={3} /></OrbitNodeWrap>
            <OrbitNodeWrap style={orbitNodePos(300)} $dur={ORBIT_RINGS[5].dur} $reverse><OrbitDot $color={theme.colors.accent} $s={4} /></OrbitNodeWrap>
          </OrbitPath>
        </OrbitalHero>
      </RightPanel>
    </PageWrap>
  );
};

export default Login;
