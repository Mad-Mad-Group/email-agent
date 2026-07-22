import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { glassSurface } from '../../styles/glassSurface';
import { Button, FormField } from '../../components';
import { useAuth } from '../../contexts/AuthContext';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'zh-TW', label: '繁' },
  { code: 'zh-CN', label: '简' },
];

const LoginContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.canvas};
`;

const LoginCard = styled.div`
  ${glassSurface};
  border-radius: 12px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
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
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ForgotLink = styled(Link)`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.accent};
  text-decoration: none;
  text-align: right;
  display: block;
  margin-top: -8px;

  &:hover {
    text-decoration: underline;
  }
`;

const Footer = styled.div`
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
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
  color: ${({ theme }) => theme.strong.mauve};
  font-size: 0.8125rem;
  text-align: center;
`;

const LangBar = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 4px;
`;

const LangBtn = styled.button<{ $active?: boolean }>`
  padding: 4px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  background: ${({ $active, theme }) => $active ? theme.colors.accent : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.textInverted : theme.colors.textSecondary};
  transition: all 0.15s;
  &:hover { opacity: 0.8; }
`;

const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.email = 'login.emailRequired';
    if (!password) errs.password = 'login.passwordRequired';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    try {
      await login({ email, password });
      navigate('/cms-agents');
    } catch (err: any) {
      setError(err.response?.data?.message || t('login.loginFailed'));
    }
  };

  return (
    <LoginContainer>
      <LangBar>
        {LANGUAGES.map((lang) => (
          <LangBtn key={lang.code} $active={i18n.language === lang.code} onClick={() => i18n.changeLanguage(lang.code)}>
            {lang.label}
          </LangBtn>
        ))}
      </LangBar>
      <LoginCard>
        <Logo>ClientRadar AI</Logo>
        <Title>{t('login.title')}</Title>
        <Form onSubmit={handleSubmit}>
          <FormField
            label={t('common.email')}
            type="text"
            value={email}
            onChange={setEmail}
            placeholder={t('login.emailPlaceholder')}
            error={fieldErrors.email ? t(fieldErrors.email) : undefined}
          />
          <FormField
            label={t('login.password')}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={t('login.passwordPlaceholder')}
            error={fieldErrors.password ? t(fieldErrors.password) : undefined}
          />
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
