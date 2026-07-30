import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, FormField } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import {
  AuthShell,
  Brand,
  HeroTitle,
  HeroSub,
  FormCard,
  FormTitle,
  Form,
  FieldPair,
  FooterRow,
  FooterLink,
  ErrorMsg,
} from '../../components/AuthShell';

/**
 * Register — same shell as Login (radar hero, layered backdrop, terminal mark).
 * It used to be a plain centred card, which made the two pages look like they
 * came from different products.
 */
const Register: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register: registerUser, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyDesc, setCompanyDesc] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'register.nameRequired';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.email = 'register.emailRequired';
    if (!companyName.trim()) errs.companyName = 'register.companyNameRequired';
    // companyDesc is optional
    if (!password || password.length < 8) errs.password = 'register.passwordRequired';
    if (!confirmPassword || confirmPassword.length < 8) errs.confirmPassword = 'register.confirmRequired';
    if (password && confirmPassword && password !== confirmPassword) {
      errs.confirmPassword = 'register.passwordMismatch';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    try {
      await registerUser({
        name, email, password,
        company_name: companyName,
        company_description: companyDesc,
      });
      navigate('/cms-search');
    } catch (err: any) {
      setError(err.response?.data?.message || t('register.registrationFailed'));
    }
  };

  return (
    <AuthShell compact>
      <Brand>ClientRadar AI</Brand>
      <HeroTitle>{t('register.title')}</HeroTitle>
      <HeroSub>{t('login.heroSub')}</HeroSub>

      <FormCard $wide>
        <FormTitle>{t('register.registerButton')}</FormTitle>
        <Form onSubmit={handleSubmit}>
          {/* Paired so six fields don't turn into one very long column */}
          <FieldPair>
            <FormField
              label={t('register.fullName')}
              type="text"
              value={name}
              onChange={setName}
              placeholder={t('register.namePlaceholder')}
              error={fieldErrors.name ? t(fieldErrors.name) : undefined}
            />
            <FormField
              label={t('common.email')}
              type="text"
              value={email}
              onChange={setEmail}
              placeholder={t('register.emailPlaceholder')}
              error={fieldErrors.email ? t(fieldErrors.email) : undefined}
            />
          </FieldPair>

          <FieldPair>
            <FormField
              label={t('register.password')}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={t('register.passwordPlaceholder')}
              error={fieldErrors.password ? t(fieldErrors.password) : undefined}
            />
            <FormField
              label={t('register.confirmPassword')}
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder={t('register.confirmPlaceholder')}
              error={fieldErrors.confirmPassword ? t(fieldErrors.confirmPassword) : undefined}
            />
          </FieldPair>

          <FormField
            label={t('register.companyName')}
            type="text"
            value={companyName}
            onChange={setCompanyName}
            placeholder={t('register.companyNamePlaceholder')}
            error={fieldErrors.companyName ? t(fieldErrors.companyName) : undefined}
          />
          <FormField
            label={t('register.companyDescription')}
            type="textarea"
            value={companyDesc}
            onChange={setCompanyDesc}
            placeholder={t('register.companyDescriptionPlaceholder')}
            rows={2}
            error={fieldErrors.companyDesc ? t(fieldErrors.companyDesc) : undefined}
          />

          {error && <ErrorMsg>{error}</ErrorMsg>}
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? t('auth.loadingBtn') : t('register.registerButton')}
          </Button>
        </Form>
        <FooterRow>
          {t('register.hasAccount')}{' '}
          <FooterLink to="/login">{t('register.login')}</FooterLink>
        </FooterRow>
      </FormCard>
    </AuthShell>
  );
};

export default Register;
