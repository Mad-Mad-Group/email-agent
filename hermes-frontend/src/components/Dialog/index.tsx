import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from 'react-i18next';

/* ══════════════════════════════════════
   Custom Dialog — replaces window.prompt / window.confirm
   Small, centered, LUNO-style
   ══════════════════════════════════════ */

type DialogType = 'confirm' | 'prompt';

interface DialogState {
  open: boolean;
  type: DialogType;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  resolve: ((value: string | boolean | null) => void) | null;
}

interface DialogContextValue {
  showConfirm: (message: string) => Promise<boolean>;
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

/* ── Styled Components ── */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 9999;
  animation: ${fadeIn} 0.15s ease-out;
`;

const Panel = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10000;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  width: 340px;
  max-width: 90vw;
  padding: 20px 22px 16px;
  animation: ${slideUp} 0.2s ease-out;
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
  background: ${({ theme }) => theme.colors.canvas};
  outline: none;
  margin-bottom: 14px;
  transition: border-color 0.15s;
  &:focus { border-color: ${({ theme }) => theme.colors.blue}; }
  &::placeholder { color: ${({ theme }) => theme.colors.textTertiary}; }
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const Btn = styled.button<{ $primary?: boolean }>`
  padding: 7px 18px;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid ${({ $primary, theme }) => $primary ? theme.colors.blue : theme.colors.border};
  background: ${({ $primary, theme }) => $primary ? theme.colors.blue : theme.colors.surface};
  color: ${({ $primary, theme }) => $primary ? '#fff' : theme.colors.textPrimary};
  &:hover {
    opacity: 0.88;
    transform: translateY(-1px);
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

  useEffect(() => {
    if (state.open && state.type === 'prompt') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [state.open, state.type]);

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, type: 'confirm', message, resolve: resolve as any });
    });
  }, []);

  const showPrompt = useCallback((message: string, defaultValue?: string, placeholder?: string): Promise<string | null> => {
    return new Promise((resolve) => {
      setState({ open: true, type: 'prompt', message, defaultValue, placeholder, resolve: resolve as any });
    });
  }, []);

  const handleConfirm = () => {
    if (state.type === 'confirm') {
      state.resolve?.(true);
    } else {
      state.resolve?.(inputRef.current?.value ?? '');
    }
    setState((s) => ({ ...s, open: false, resolve: null }));
  };

  const handleCancel = () => {
    if (state.type === 'confirm') {
      state.resolve?.(false);
    } else {
      state.resolve?.(null);
    }
    setState((s) => ({ ...s, open: false, resolve: null }));
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
          <Overlay onClick={handleCancel} />
          <Panel onKeyDown={handleKeyDown}>
            <Message>{state.message}</Message>
            {state.type === 'prompt' && (
              <Input
                ref={inputRef}
                defaultValue={state.defaultValue || ''}
                placeholder={state.placeholder}
              />
            )}
            <ButtonRow>
              <Btn onClick={handleCancel}>{t('dialog.cancel')}</Btn>
              <Btn $primary onClick={handleConfirm}>{t('dialog.confirm')}</Btn>
            </ButtonRow>
          </Panel>
        </>
      )}
    </DialogContext.Provider>
  );
};

export default DialogProvider;
