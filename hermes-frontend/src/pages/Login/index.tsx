import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { media } from '../../styles/media';
import { Button } from '../../components';
import { useAuth } from '../../contexts/AuthContext';

/* ── Orbital Animation ── */

const orbitSpin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const LoginContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: radial-gradient(ellipse at center, #2a2440 0%, #1a1333 35%, #0d0b1a 70%, #080612 100%);
  position: relative;
  overflow: hidden;
`;

const OrbitalHero = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(90vmin, 900px);
  height: min(90vmin, 900px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 0;
  pointer-events: none;

  &::before {
    content: '';
    position: absolute;
    width: 70%;
    height: 70%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.18) 0%,
      rgba(200, 190, 255, 0.10) 20%,
      rgba(160, 140, 255, 0.05) 40%,
      transparent 70%
    );
    filter: blur(40px);
    pointer-events: none;
  }
`;

const OrbitPath = styled.div<{ $frac: number; $dur: number; $reverse?: boolean }>`
  position: absolute;
  width: ${({ $frac }) => $frac * 100}%;
  height: ${({ $frac }) => $frac * 100}%;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  animation: ${orbitSpin} ${({ $dur }) => $dur}s linear infinite;
  ${({ $reverse }) => $reverse && 'animation-direction: reverse;'}
`;

const OrbitNodeWrap = styled.div<{ $dur: number; $reverse?: boolean }>`
  position: absolute;
  transform: translate(-50%, -50%);
  animation: ${orbitSpin} ${({ $dur }) => $dur}s linear infinite;
  animation-direction: ${({ $reverse }) => $reverse ? 'normal' : 'reverse'};
`;

const OrbitDot = styled.div<{ $color: string; $s: number }>`
  width: ${({ $s }) => $s}px;
  height: ${({ $s }) => $s}px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 ${({ $s }) => $s * 2}px ${({ $color }) => $color}55;
`;

const ORBIT_RINGS = [
  { frac: 0.20, dur: 25, reverse: false },
  { frac: 0.34, dur: 35, reverse: true },
  { frac: 0.50, dur: 50, reverse: false },
  { frac: 0.67, dur: 70, reverse: true },
  { frac: 0.83, dur: 90, reverse: false },
  { frac: 0.97, dur: 120, reverse: true },
];

const orbitNodePos = (angle: number) => ({
  top: `${50 - 50 * Math.cos(angle * Math.PI / 180)}%`,
  left: `${50 + 50 * Math.sin(angle * Math.PI / 180)}%`,
});

const DOT_PALETTE = ['#7c5cfc', '#5cb8fc', '#fc5c8a', '#fcb85c', '#5cfcb8', '#c45cfc'];

/* ── Login Card ── */

const LoginCard = styled.div`
  position: relative;
  z-index: 1;
  border-radius: 16px;
  padding: 48px 40px;
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);

  ${media.mobile} {
    padding: 36px 28px;
    margin: 0 16px;
  }
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 8px;
  font-size: 32px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.accent};
`;

const Title = styled.h1`
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 32px;
  color: rgba(255, 255, 255, 0.9);
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

/* ── Underline Input ── */

const FieldWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
`;

const UnderlineInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  font-family: ${({ theme }) => theme.fonts.primary};
  font-size: 0.9375rem;
  padding: 10px 2px;
  border: none;
  border-bottom: 1.5px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  outline: none;
  transition: border-color 0.2s ease;

  &:focus {
    border-bottom-color: ${({ theme }) => theme.colors.accent};
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const ForgotLink = styled(Link)`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.accent};
  text-decoration: none;
  text-align: right;
  display: block;
  margin-top: -12px;

  &:hover {
    text-decoration: underline;
  }
`;

const Footer = styled.div`
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
`;

const FooterLink = styled(Link)`
  color: ${({ theme }) => theme.colors.accent};
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const ErrorMsg = styled.div`
  color: ${({ theme }) => theme.strong?.mauve || '#e05c5c'};
  font-size: 0.8125rem;
  text-align: center;
`;

/* ── Component ── */

const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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
    <LoginContainer>
      {/* Orbital animation background */}
      <OrbitalHero>
        {ORBIT_RINGS.map((ring, i) => (
          <OrbitPath key={i} $frac={ring.frac} $dur={ring.dur} $reverse={ring.reverse}>
            {[0, 120, 240].map((angle, j) => (
              <OrbitNodeWrap
                key={j}
                $dur={ring.dur}
                $reverse={ring.reverse}
                style={orbitNodePos(angle + i * 15)}
              >
                <OrbitDot
                  $color={DOT_PALETTE[(i + j) % DOT_PALETTE.length]}
                  $s={j === 0 ? 8 : j === 1 ? 6 : 4}
                />
              </OrbitNodeWrap>
            ))}
          </OrbitPath>
        ))}
      </OrbitalHero>

      <LoginCard>
        <Logo>ClientRadar AI</Logo>
        <Title>{t('login.title')}</Title>
        <Form onSubmit={handleSubmit}>
          <FieldWrap>
            <FieldLabel>{t('common.email')}</FieldLabel>
            <UnderlineInput
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.emailPlaceholder')}
            />
          </FieldWrap>
          <FieldWrap>
            <FieldLabel>{t('login.password')}</FieldLabel>
            <UnderlineInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
            />
          </FieldWrap>
          <ForgotLink to="/forgot-password">
            {t('login.forgotPassword')}
          </ForgotLink>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? t('auth.loadingBtn') : t('login.loginButton')}
          </Button>
        </Form>
        <Footer>
          {t('login.noAccount')}{' '}
          <FooterLink to="/register">{t('login.register')}</FooterLink>
        </Footer>
      </LoginCard>
    </LoginContainer>
  );
};

export default Login;
