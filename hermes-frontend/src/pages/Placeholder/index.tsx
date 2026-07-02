import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 12px;
`;

const Title = styled.h1`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin: 0;
`;

const Sub = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin: 0;
`;

const Placeholder: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const name = location.pathname.replace(/^\//, '').replace(/-/g, ' ');

  return (
    <Wrapper>
      <Title>{name || t('placeholder.page')}</Title>
      <Sub>{t('placeholder.underConstruction')}</Sub>
    </Wrapper>
  );
};

export default Placeholder;
