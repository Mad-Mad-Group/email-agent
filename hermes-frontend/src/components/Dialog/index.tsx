import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { glassSurface, glassSurfaceLight } from '../../styles/glassSurface';

/* ══════════════════════════════════════
   Custom Dialog — replaces window.prompt / window.confirm
   Small, centered, LUNO-style
   ══════════════════════════════════════ */

type DialogType = 'confirm' | 'prompt';

interface DialogState {
  open: boolean;
  type: DialogType;
  message: string;
  danger?: boolean;
  defaultValue?: string;
  placeholder?: string;
  resolve: ((value: string | boolean | null) => void) | null;
}

interface DialogContextValue {
  showConfirm: (message: string, options?: { danger?: boolean }) => Promise<boolean>;
  showPrompt: (message: string, defaultValue?: string, placeholder?: string) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextValue>({
  showConfirm: () => Promise.resolve(false),
  showPrompt: () => Promise.resolve(null),
});

export const useDialog = () => useContext(DialogContext);

/* ── Animations ── */

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to   { opacity: 0; }
`;

const slideDown = keyframes`
  from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  to   { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
`;

/* ── Styled Components ── */

const Overlay = styled.div<{ $closing?: boolean }>`
  position: fixed;
  inset: 0;
  /* Stack above any embedding popup (AgentPanel pool popup uses
     9999/10000) so confirm dialogs and prompts are still reachable
     even when the trigger lives inside a nested popup. */
  z-index: 10500;
  background: rgba(0, 0, 0, 0.35);
  animation: ${({ $closing }) => $closing ? fadeOut : fadeIn} ${({ $closing }) => $closing ? '0.2s' : '0.15s'} ease-out forwards;
`;

const Panel = styled.div<{ $closing?: boolean }>`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10600;
  ${glassSurface};
  border-radius: 14px;
  width: 340px;
  max-width: 90vw;
  padding: 20px 22px 16px;
  animation: ${({ $closing }) => $closing ? slideDown : slideUp} 0.2s ease-out forwards;
`;

const Message = styled.p`
  margin: 0 0 14px;
  font-size: 0.875rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.textPrimary};
  word-break: break-word;
`;

const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  ${glassSurfaceLight};
  outline: none;
  margin-bottom: 14px;
  transition: border-color 0.15s;
  &:focus { border-color: ${({ theme }) => theme.colors.accent}; }
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const Btn = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  padding: 7px 18px;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 150ms var(--ease-out), transform 150ms var(--ease-out);
  border: 1px solid ${({ $primary, $danger, theme }) => $danger ? '#e53e3e' : $primary ? theme.colors.accent : theme.colors.border};
  background: ${({ $primary, $danger, theme }) => $danger ? '#e53e3e' : $primary ? theme.colors.accent : theme.colors.surface};
  color: ${({ $primary, $danger, theme }) => ($primary || $danger) ? '#fff' : theme.colors.textPrimary};
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      opacity: 0.88;
      transform: translateY(-1px);
    }
  }
`;

const DangerMessage = styled(Message)`
  em {
    font-style: normal;
    color: #e53e3e;
    font-weight: 600;
  }
`;

/* ── Provider ── */

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [state, setState] = useState<DialogState>({
    open: false,
    type: 'confirm',
    message: '',
    resolve: null,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (state.open && state.type === 'prompt') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [state.open, state.type]);

  const showConfirm = useCallback((message: string, options?: { danger?: boolean }): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, type: 'confirm', message, danger: options?.danger, resolve: resolve as any });
    });
  }, []);

  const showPrompt = useCallback((message: string, defaultValue?: string, placeholder?: string): Promise<string | null> => {
    return new Promise((resolve) => {
      setState({ open: true, type: 'prompt', message, defaultValue, placeholder, resolve: resolve as any });
    });
  }, []);

  const handleConfirm = () => {
    setClosing(true);
    setTimeout(() => {
      if (state.type === 'confirm') {
        state.resolve?.(true);
      } else {
        state.resolve?.(inputRef.current?.value ?? '');
      }
      setState((s) => ({ ...s, open: false, resolve: null }));
      setClosing(false);
    }, 200);
  };

  const handleCancel = () => {
    setClosing(true);
    setTimeout(() => {
      if (state.type === 'confirm') {
        state.resolve?.(false);
      } else {
        state.resolve?.(null);
      }
      setState((s) => ({ ...s, open: false, resolve: null }));
      setClosing(false);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <DialogContext.Provider value={{ showConfirm, showPrompt }}>
      {children}
      {state.open && (
        <>
          <Overlay $closing={closing} onClick={handleCancel} />
          <Panel $closing={closing} onKeyDown={handleKeyDown}>
            {state.danger ? (
              <DangerMessage dangerouslySetInnerHTML={{ __html: state.message.replace(/\n/g, '<br/>') }} />
            ) : (
              <Message>{state.message}</Message>
            )}
            {state.type === 'prompt' && (
              <Input
                ref={inputRef}
                defaultValue={state.defaultValue || ''}
                placeholder={state.placeholder}
              />
            )}
            <ButtonRow>
              <Btn onClick={handleCancel}>{t('dialog.cancel')}</Btn>
              <Btn $primary={!state.danger} $danger={state.danger} onClick={handleConfirm}>{t('dialog.confirm')}</Btn>
            </ButtonRow>
          </Panel>
        </>
      )}
    </DialogContext.Provider>
  );
};

export default DialogProvider;
