import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes, css } from 'styled-components';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'clientradar_onboarding_completed';

/* ── Animations ── */

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const popIn = keyframes`
  from { opacity: 0; transform: scale(0.92) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 200, 255, 0.4); }
  50%      { box-shadow: 0 0 0 6px rgba(0, 200, 255, 0); }
`;

/* ── Types ── */

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface TourStep {
  titleKey: string;
  descKey: string;
  icon: string;
  /** data-tour attribute value to highlight. null = no spotlight (centered card) */
  target: string | null;
  /** preferred tooltip placement */
  placement: Placement;
}

/* ── Steps ── */

const STEPS: TourStep[] = [
  { titleKey: 'onboarding.welcome', descKey: 'onboarding.welcomeDesc', icon: '👋', target: null, placement: 'bottom' },
  { titleKey: 'onboarding.agents', descKey: 'onboarding.agentsDesc', icon: '🤖', target: 'status-panel', placement: 'right' },
  { titleKey: 'onboarding.noticeBoard', descKey: 'onboarding.noticeBoardDesc', icon: '📋', target: 'notice-board', placement: 'left' },
  { titleKey: 'onboarding.fountain', descKey: 'onboarding.fountainDesc', icon: '⛲', target: 'fountain', placement: 'top' },
  { titleKey: 'onboarding.farmer', descKey: 'onboarding.farmerDesc', icon: '🧑‍🌾', target: 'farmer', placement: 'top' },
  { titleKey: 'onboarding.done', descKey: 'onboarding.doneDesc', icon: '🎉', target: null, placement: 'bottom' },
];

const PAD = 10; // padding around highlighted element
const TOOLTIP_GAP = 14; // gap between highlight and tooltip

/* ── Styled Components ── */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 12000;
  animation: ${fadeIn} 0.25s ease;
  pointer-events: auto;
`;

/** Full-screen SVG mask: transparent rect with a cutout hole */
const MaskSvg = styled.svg`
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

/** Invisible click-blocker everywhere except the cutout */
const ClickBlocker = styled.div`
  position: fixed;
  inset: 0;
  z-index: 12001;
`;

/** Highlight ring around the target element */
const HighlightRing = styled.div`
  position: fixed;
  z-index: 12002;
  border: 2px solid rgba(0, 200, 255, 0.6);
  border-radius: 12px;
  pointer-events: none;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  animation: ${pulse} 2s ease-in-out infinite;
`;

/** Tooltip card */
const Tooltip = styled.div<{ $centered?: boolean }>`
  position: fixed;
  z-index: 12003;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 16px;
  padding: 24px 28px 20px;
  width: min(360px, 85vw);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  animation: ${popIn} 0.25s ease;
  pointer-events: auto;

  ${({ $centered }) => $centered && css`
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  `}
`;

const TooltipArrow = styled.div<{ $placement: Placement }>`
  position: absolute;
  width: 12px;
  height: 12px;
  background: ${({ theme }) => theme.colors.surface};
  transform: rotate(45deg);

  ${({ $placement }) => {
    switch ($placement) {
      case 'top':    return css`bottom: -6px; left: 50%; margin-left: -6px;`;
      case 'bottom': return css`top: -6px; left: 50%; margin-left: -6px;`;
      case 'left':   return css`right: -6px; top: 50%; margin-top: -6px;`;
      case 'right':  return css`left: -6px; top: 50%; margin-top: -6px;`;
    }
  }}
`;

const StepIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.accent}18;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  font-size: 24px;
`;

const Title = styled.h3`
  margin: 0 0 6px;
  font-size: 1.05rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Desc = styled.p`
  margin: 0 0 18px;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StepDots = styled.div`
  display: flex;
  gap: 5px;
`;

const Dot = styled.div<{ $active: boolean }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $active, theme }) => $active ? theme.colors.accent : theme.colors.border};
  transition: background 0.2s;
`;

const BtnGroup = styled.div`
  display: flex;
  gap: 6px;
`;

const Btn = styled.button<{ $primary?: boolean }>`
  padding: 7px 16px;
  border-radius: 8px;
  border: ${({ $primary, theme }) => $primary ? 'none' : `1px solid ${theme.colors.border}`};
  background: ${({ $primary, theme }) => $primary ? theme.colors.accent : 'transparent'};
  color: ${({ $primary, theme }) => $primary ? theme.colors.textInverted : theme.colors.textSecondary};
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover { opacity: 0.85; }
`;

/* ── Help Button ── */

const HelpBtn = styled.button`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.accent};
    color: ${({ theme }) => theme.colors.textInverted};
    border-color: transparent;
  }
`;

/* ── Helpers ── */

export const isOnboardingCompleted = () => {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
};

const markCompleted = () => {
  try { localStorage.setItem(STORAGE_KEY, 'true'); } catch { /* noop */ }
};

interface Rect { top: number; left: number; width: number; height: number; }

function getTargetRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
}

function calcTooltipPos(rect: Rect, placement: Placement, tipW: number, tipH: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = 0;
  let left = 0;

  switch (placement) {
    case 'top':
      top = rect.top - tipH - TOOLTIP_GAP;
      left = rect.left + rect.width / 2 - tipW / 2;
      break;
    case 'bottom':
      top = rect.top + rect.height + TOOLTIP_GAP;
      left = rect.left + rect.width / 2 - tipW / 2;
      break;
    case 'left':
      top = rect.top + rect.height / 2 - tipH / 2;
      left = rect.left - tipW - TOOLTIP_GAP;
      break;
    case 'right':
      top = rect.top + rect.height / 2 - tipH / 2;
      left = rect.left + rect.width + TOOLTIP_GAP;
      break;
  }

  // Clamp to viewport
  if (left < 8) left = 8;
  if (left + tipW > vw - 8) left = vw - tipW - 8;
  if (top < 8) top = 8;
  if (top + tipH > vh - 8) top = vh - tipH - 8;

  return { top, left };
}

/* ── Component ── */

interface Props {
  show: boolean;
  onClose: () => void;
}

const OnboardingTour: React.FC<Props> = ({ show, onClose }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  const current = STEPS[step];

  // Measure target element and compute tooltip position
  useEffect(() => {
    if (!show) return;
    const measure = () => {
      if (current.target) {
        const r = getTargetRect(current.target);
        setRect(r);
        if (r && tooltipRef.current) {
          const { offsetWidth: w, offsetHeight: h } = tooltipRef.current;
          setTooltipPos(calcTooltipPos(r, current.placement, w, h));
        }
      } else {
        setRect(null);
        setTooltipPos(null);
      }
    };

    // Measure after a short delay to let elements render
    const timer = setTimeout(measure, 80);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [show, step, current.target, current.placement]);

  const handleClose = useCallback(() => {
    markCompleted();
    setStep(0);
    onClose();
  }, [onClose]);

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleClose();
  };

  const handlePrev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  if (!show) return null;

  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const hasTarget = !!rect;

  return createPortal(
    <>
      <Overlay>
        {/* SVG mask overlay with cutout */}
        <MaskSvg xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id="tour-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {rect && (
                <rect
                  x={rect.left}
                  y={rect.top}
                  width={rect.width}
                  height={rect.height}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0" y="0" width="100%" height="100%"
            fill="rgba(0,0,0,0.55)"
            mask="url(#tour-mask)"
          />
        </MaskSvg>

        {/* Highlight ring */}
        {rect && (
          <HighlightRing
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }}
          />
        )}
      </Overlay>

      {/* Click blocker — clicking outside tooltip closes tour */}
      <ClickBlocker onClick={handleClose} />

      {/* Tooltip */}
      <Tooltip
        ref={tooltipRef}
        $centered={!hasTarget}
        style={hasTarget && tooltipPos ? { top: tooltipPos.top, left: tooltipPos.left } : undefined}
        onClick={e => e.stopPropagation()}
      >
        {hasTarget && <TooltipArrow $placement={current.placement} />}
        <StepIcon>{current.icon}</StepIcon>
        <Title>{t(current.titleKey)}</Title>
        <Desc>{t(current.descKey)}</Desc>
        <Footer>
          <StepDots>
            {STEPS.map((_, i) => (
              <Dot key={i} $active={i === step} />
            ))}
          </StepDots>
          <BtnGroup>
            {isFirst && <Btn onClick={handleClose}>{t('onboarding.skip')}</Btn>}
            {!isFirst && !isLast && <Btn onClick={handlePrev}>{t('onboarding.prev')}</Btn>}
            <Btn $primary onClick={handleNext}>
              {isLast ? t('onboarding.finish') : t('onboarding.next')}
            </Btn>
          </BtnGroup>
        </Footer>
      </Tooltip>
    </>,
    document.body,
  );
};

export const OnboardingHelpBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <HelpBtn onClick={onClick} title="Help">?</HelpBtn>
);

export default OnboardingTour;
