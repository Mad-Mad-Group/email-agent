import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Button, FormField } from '../../components';
import { useAuth } from '../../contexts/AuthContext';

const LoginContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.canvas};
`;

const LoginCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 12px;
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 8px;
  font-size: 32px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.blue};
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
  color: ${({ theme }) => theme.colors.blue};
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
  color: ${({ theme }) => theme.colors.blue};
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const ErrorMsg = styled.div`
  color: ${({ theme }) => theme.colors.red};
  font-size: 0.8125rem;
  text-align: center;
`;

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
      <LoginCard>
        <Logo>Hermes</Logo>
        <Title>{t('login.title')}</Title>
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
        <Footer>
          {t('login.noAccount')}{' '}
          <FooterLink to="/register">{t('login.register')}</FooterLink>
        </Footer>
      </LoginCard>
    </LoginContainer>
  );
};

export default Login;
