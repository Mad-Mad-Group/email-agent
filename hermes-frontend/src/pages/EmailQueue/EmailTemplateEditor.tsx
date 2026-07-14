import React, { useState, useRef, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { useDialog } from '../../components';

/* ══════════════════════════════════════
   Email Template Editor
   ══════════════════════════════════════ */

/* ── Types ── */

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  updatedAt: string;
}

/* ── Variables available for insertion ── */

const TEMPLATE_VARIABLES = [
  { key: '{{name}}', label: '收件人姓名', example: 'John Smith' },
  { key: '{{company}}', label: '公司名稱', example: 'Acme Corp' },
  { key: '{{title}}', label: '職稱', example: 'CTO' },
  { key: '{{industry}}', label: '行業', example: 'SaaS' },
  { key: '{{location}}', label: '地點', example: 'San Francisco' },
  { key: '{{sender_name}}', label: '寄件人姓名', example: 'Patricia' },
  { key: '{{sender_title}}', label: '寄件人職稱', example: 'Sales Manager' },
  { key: '{{product}}', label: '產品名稱', example: 'MADMAD CMS' },
  { key: '{{custom_1}}', label: '自訂欄位 1', example: '—' },
];

const CATEGORIES = ['Cold Outreach', 'Follow-up', 'Introduction', 'Partnership', 'Event', 'Re-engagement'];

/* ── Mock templates ── */

const INITIAL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Cold Outreach — SaaS',
    subject: 'Hi {{name}}, quick question about {{company}}',
    body: `<p>Hi {{name}},</p><p>I noticed {{company}} is growing fast in the {{industry}} space. We've helped similar companies streamline their outreach with {{product}}.</p><p>Would you be open to a quick 15-min call this week?</p><p>Best,<br/>{{sender_name}}<br/>{{sender_title}}</p>`,
    category: 'Cold Outreach',
    updatedAt: '2026-06-28T10:00:00Z',
  },
  {
    id: 'tpl-2',
    name: 'Follow-up — Demo Request',
    subject: 'Re: {{company}} demo follow-up',
    body: `<p>Hi {{name}},</p><p>Just following up on our conversation last week. I'd love to show you how {{product}} can help {{company}} automate lead generation.</p><p>Are you available Tuesday or Wednesday?</p><p>Cheers,<br/>{{sender_name}}</p>`,
    category: 'Follow-up',
    updatedAt: '2026-06-27T14:00:00Z',
  },
  {
    id: 'tpl-3',
    name: 'Partnership Proposal',
    subject: 'Partnership opportunity — {{company}} × {{product}}',
    body: `<p>Dear {{name}},</p><p>I'm reaching out because {{company}}'s work in {{industry}} aligns perfectly with what we're building at {{product}}.</p><p>We'd love to explore a partnership. Can we schedule a call?</p><p>Regards,<br/>{{sender_name}}<br/>{{sender_title}}</p>`,
    category: 'Partnership',
    updatedAt: '2026-06-25T09:00:00Z',
  },
  {
    id: 'tpl-4',
    name: 'Event Invitation',
    subject: '{{name}}, you\'re invited to our {{location}} event',
    body: `<p>Hi {{name}},</p><p>We're hosting an exclusive event in {{location}} next month and would love to have {{company}} represented.</p><p>Let me know if you're interested — I can send over the details.</p><p>Best,<br/>{{sender_name}}</p>`,
    category: 'Event',
    updatedAt: '2026-06-24T16:00:00Z',
  },
];

/* ── Icons ── */

const I = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ico = {
  plus: 'M8 3v10M3 8h10',
  copy: 'M5 3h7a1 1 0 011 1v7M3 6h7a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1z',
  trash: 'M3 4h10M6 4V3h4v1M5 4v8a1 1 0 001 1h4a1 1 0 001-1V4',
  bold: 'M4 2h5a3 3 0 010 6H4zM4 8h6a3 3 0 010 6H4z',
  italic: 'M7 2h5M4 14h5M10 2L6 14',
  underline: 'M4 14h8M4 2v5a4 4 0 008 0V2',
  link: 'M6.5 11.5l-1 1a2.12 2.12 0 01-3-3l2-2a2.12 2.12 0 013 0M9.5 4.5l1-1a2.12 2.12 0 013 3l-2 2a2.12 2.12 0 01-3 0',
  list: 'M5 4h9M5 8h9M5 12h9M2 4h0M2 8h0M2 12h0',
  variable: 'M3 4c0-1 1-2 2-2M3 12c0 1 1 2 2 2M13 4c0-1-1-2-2-2M13 12c0 1-1 2-2 2M7 7l2 2M9 7l-2 2',
  save: 'M3 3h8l2 2v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3zM6 3v3h4V3M6 10h4',
  eye: 'M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5zM8 10a2 2 0 100-4 2 2 0 000 4z',
  tag: 'M2 8.5V3a1 1 0 011-1h5.5l5.5 5.5-5 5L2 8.5zM5.5 5.5h0',
};

/* ══════════════════════════════════════
   Styled Components
   ══════════════════════════════════════ */

const EditorLayout = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr 320px;
  min-height: 600px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.card}px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  overflow: hidden;
`;

/* ── Left: Template List ── */

const TemplateListPane = styled.div`
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
`;

const ListHeader = styled.div`
  padding: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const ListTitle = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const ListActions = styled.div`
  display: flex;
  gap: 4px;
`;

const SmallBtn = styled.button<{ $danger?: boolean }>`
  background: none;
  border: none;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  color: ${({ theme, $danger }) => $danger ? '#dc2626' : theme.colors.textSecondary};
  display: flex;
  align-items: center;
  transition: background 0.15s, color 0.15s, transform 0.1s;
  &:hover {
    background: ${({ $danger }) => $danger ? 'rgba(239,68,68,0.1)' : '#f4f5f7'};
    color: ${({ theme, $danger }) => $danger ? '#b91c1c' : theme.colors.textPrimary};
    transform: translateY(-1px);
  }
`;

const TemplateItems = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
`;

const TemplateItem = styled.div<{ $active: boolean }>`
  padding: 10px 12px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.15s;
  ${({ $active, theme }) =>
    $active
      ? css`
          background: #f0f7ff;
          border-left-color: #0ea5e9;
          box-shadow: inset 0 0 0 1px #cffafe;
        `
      : css`
          &:hover {
            background: #f4f5f7;
            border-left-color: #cbd5e1;
          }
        `}
`;

const TemplateName = styled.div`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TemplateCategory = styled.span`
  display: inline-block;
  font-size: 0.6875rem;
  padding: 1px 6px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.canvas};
  color: ${({ theme }) => theme.colors.textSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const TemplateDate = styled.span`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-left: 6px;
`;

/* ── Center: Editor ── */

const EditorPane = styled.div`
  display: flex;
  flex-direction: column;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
`;

const EditorToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-wrap: wrap;
`;

const ToolBtn = styled.button<{ $active?: boolean }>`
  background: ${({ $active, theme }) => $active ? theme.colors.canvas : 'none'};
  border: none;
  padding: 5px 7px;
  border-radius: 4px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: center;
  &:hover {
    background: ${({ theme }) => theme.colors.canvas};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

const ToolDivider = styled.div`
  width: 1px;
  height: 18px;
  background: ${({ theme }) => theme.colors.border};
  margin: 0 4px;
`;

const SubjectRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const SubjectLabel = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  white-space: nowrap;
`;

const SubjectInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: transparent;
  &::placeholder {
    color: ${({ theme }) => theme.colors.textTertiary};
  }
`;

const NameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const NameInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: transparent;
  &::placeholder {
    color: ${({ theme }) => theme.colors.textTertiary};
  }
`;

const CategorySelect = styled.select`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.surface};
  outline: none;
  cursor: pointer;
  &:focus {
    border-color: #0ea5e9;
  }
`;

const BodyArea = styled.div`
  flex: 1;
  padding: 14px;
  overflow-y: auto;
`;

const RichEditor = styled.div`
  min-height: 300px;
  font-size: 0.875rem;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.textPrimary};
  outline: none;
  cursor: text;

  p { margin: 0 0 8px; }

  .variable-tag {
    display: inline-block;
    background: rgba(37, 99, 235, 0.12);
    color: #0ea5e9;
    border: 1px solid rgba(37, 99, 235, 0.3);
    border-radius: 3px;
    padding: 0 4px;
    font-size: 0.8125rem;
    font-family: 'SF Mono', 'Fira Code', monospace;
    cursor: default;
    user-select: all;
  }
`;

const EditorFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
`;

const SaveBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 6px;
  border: none;
  background: #0ea5e9;
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  &:hover { background: #0369a1; }
`;

/* ── Right: Preview + Variables ── */

const PreviewPane = styled.div`
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.canvas};
`;

const PreviewTabs = styled.div`
  display: flex;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const PreviewTab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 10px 12px;
  border: none;
  background: ${({ $active, theme }) => $active ? theme.colors.surface : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.textPrimary : theme.colors.textSecondary};
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid ${({ $active }) => $active ? '#0ea5e9' : 'transparent'};
  &:hover { background: ${({ theme }) => theme.colors.surface}; }
`;

const PreviewContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 14px;
`;

const PreviewEmail = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
`;

const PreviewSubject = styled.div`
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const PreviewBody = styled.div`
  font-size: 0.875rem;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.textPrimary};
  p { margin: 0 0 8px; }
`;

/* ── Variable Panel ── */

const VariablePanel = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
`;

const VarSectionTitle = styled.div`
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textTertiary};
  margin-bottom: 8px;
`;

const VarItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;
  margin-bottom: 6px;
  text-align: left;
  transition: all 0.15s;
  &:hover {
    border-color: #0ea5e9;
    background: rgba(37, 99, 235, 0.04);
  }
`;

const VarKey = styled.span`
  font-size: 0.75rem;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: #0ea5e9;
  white-space: nowrap;
`;

const VarLabel = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  flex: 1;
`;

const VarExample = styled.span`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  font-style: italic;
`;

/* ══════════════════════════════════════
   Component
   ══════════════════════════════════════ */

const EmailTemplateEditor: React.FC = () => {
  const { showPrompt } = useDialog();
  const [templates, setTemplates] = useState<EmailTemplate[]>(INITIAL_TEMPLATES);
  const [activeId, setActiveId] = useState<string>(INITIAL_TEMPLATES[0].id);
  const [rightTab, setRightTab] = useState<'preview' | 'variables'>('preview');
  const [saved, setSaved] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const active = templates.find((t) => t.id === activeId) || templates[0];

  /* ── Template CRUD ── */

  const updateTemplate = useCallback(
    (patch: Partial<EmailTemplate>) => {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
        )
      );
      setSaved(false);
    },
    [activeId]
  );

  const addTemplate = () => {
    const id = `tpl-${Date.now()}`;
    const newTpl: EmailTemplate = {
      id,
      name: 'New Template',
      subject: '',
      body: '<p>Hi {{name}},</p><p></p><p>Best,<br/>{{sender_name}}</p>',
      category: 'Cold Outreach',
      updatedAt: new Date().toISOString(),
    };
    setTemplates((prev) => [newTpl, ...prev]);
    setActiveId(id);
  };

  const duplicateTemplate = () => {
    const id = `tpl-${Date.now()}`;
    const dup: EmailTemplate = {
      ...active,
      id,
      name: `${active.name} (Copy)`,
      updatedAt: new Date().toISOString(),
    };
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === activeId);
      const next = [...prev];
      next.splice(idx + 1, 0, dup);
      return next;
    });
    setActiveId(id);
  };

  const deleteTemplate = () => {
    if (templates.length <= 1) return;
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== activeId);
      setActiveId(next[0].id);
      return next;
    });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  /* ── Rich text commands ── */

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    // sync back
    if (editorRef.current) {
      updateTemplate({ body: editorRef.current.innerHTML });
    }
  };

  const insertVariable = (varKey: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const span = `<span class="variable-tag" contenteditable="false">${varKey}</span>&nbsp;`;
    document.execCommand('insertHTML', false, span);
    updateTemplate({ body: el.innerHTML });
  };

  /* ── Preview: replace variables with example data ── */

  const resolveVariables = (text: string): string => {
    let resolved = text;
    for (const v of TEMPLATE_VARIABLES) {
      resolved = resolved.replace(new RegExp(v.key.replace(/[{}]/g, '\\$&'), 'g'), `<strong>${v.example}</strong>`);
    }
    // also handle any in span tags
    resolved = resolved.replace(/<span class="variable-tag"[^>]*>(.*?)<\/span>/g, (_, key) => {
      const v = TEMPLATE_VARIABLES.find((vv) => vv.key === key);
      return v ? `<strong>${v.example}</strong>` : key;
    });
    return resolved;
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  /* ── Handle editor input ── */

  const handleEditorInput = () => {
    if (editorRef.current) {
      updateTemplate({ body: editorRef.current.innerHTML });
    }
  };

  return (
    <EditorLayout>
      {/* ── Left: Template List ── */}
      <TemplateListPane>
        <ListHeader>
          <ListTitle>樣板 ({templates.length})</ListTitle>
          <ListActions>
            <SmallBtn title="新增樣板" onClick={addTemplate}>
              <I d={ico.plus} size={14} />
            </SmallBtn>
            <SmallBtn title="複製樣板" onClick={duplicateTemplate}>
              <I d={ico.copy} size={14} />
            </SmallBtn>
            <SmallBtn $danger title="刪除樣板" onClick={deleteTemplate}>
              <I d={ico.trash} size={14} />
            </SmallBtn>
          </ListActions>
        </ListHeader>
        <TemplateItems>
          {templates.map((tpl) => (
            <TemplateItem key={tpl.id} $active={tpl.id === activeId} onClick={() => setActiveId(tpl.id)}>
              <TemplateName>{tpl.name}</TemplateName>
              <div>
                <TemplateCategory>{tpl.category}</TemplateCategory>
                <TemplateDate>{formatDate(tpl.updatedAt)}</TemplateDate>
              </div>
            </TemplateItem>
          ))}
        </TemplateItems>
      </TemplateListPane>

      {/* ── Center: Editor ── */}
      <EditorPane>
        <NameRow>
          <SubjectLabel>名稱</SubjectLabel>
          <NameInput
            value={active.name}
            onChange={(e) => updateTemplate({ name: e.target.value })}
            placeholder="Template name..."
          />
          <CategorySelect
            value={active.category}
            onChange={(e) => updateTemplate({ category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </CategorySelect>
        </NameRow>

        <SubjectRow>
          <SubjectLabel>主旨</SubjectLabel>
          <SubjectInput
            value={active.subject}
            onChange={(e) => updateTemplate({ subject: e.target.value })}
            placeholder="Email subject line..."
          />
        </SubjectRow>

        <EditorToolbar>
          <ToolBtn onClick={() => execCmd('bold')} title="Bold">
            <I d={ico.bold} size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => execCmd('italic')} title="Italic">
            <I d={ico.italic} size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => execCmd('underline')} title="Underline">
            <I d={ico.underline} size={14} />
          </ToolBtn>
          <ToolDivider />
          <ToolBtn
            onClick={async () => {
              const url = await showPrompt('Enter URL:', '', 'https://');
              if (url) execCmd('createLink', url);
            }}
            title="Insert Link"
          >
            <I d={ico.link} size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => execCmd('insertUnorderedList')} title="Bullet List">
            <I d={ico.list} size={14} />
          </ToolBtn>
          <ToolDivider />
          {TEMPLATE_VARIABLES.slice(0, 4).map((v) => (
            <ToolBtn
              key={v.key}
              onClick={() => insertVariable(v.key)}
              title={`插入 ${v.label}`}
              style={{ fontSize: '0.6875rem', padding: '3px 6px' }}
            >
              {v.key}
            </ToolBtn>
          ))}
        </EditorToolbar>

        <BodyArea>
          <RichEditor
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: active.body }}
            onInput={handleEditorInput}
            onBlur={handleEditorInput}
            key={active.id}
          />
        </BodyArea>

        <EditorFooter>
          <span>{saved ? '✓ 已儲存' : '未儲存的變更'}</span>
          <SaveBtn onClick={handleSave}>
            <I d={ico.save} size={14} />
            儲存樣板
          </SaveBtn>
        </EditorFooter>
      </EditorPane>

      {/* ── Right: Preview / Variables ── */}
      <PreviewPane>
        <PreviewTabs>
          <PreviewTab $active={rightTab === 'preview'} onClick={() => setRightTab('preview')}>
            即時預覽
          </PreviewTab>
          <PreviewTab $active={rightTab === 'variables'} onClick={() => setRightTab('variables')}>
            變量面板
          </PreviewTab>
        </PreviewTabs>

        {rightTab === 'preview' ? (
          <PreviewContent>
            <PreviewEmail>
              <PreviewSubject dangerouslySetInnerHTML={{ __html: resolveVariables(active.subject) }} />
              <PreviewBody dangerouslySetInnerHTML={{ __html: resolveVariables(active.body) }} />
            </PreviewEmail>
          </PreviewContent>
        ) : (
          <VariablePanel>
            <VarSectionTitle>點擊插入變量到編輯器</VarSectionTitle>
            {TEMPLATE_VARIABLES.map((v) => (
              <VarItem key={v.key} onClick={() => insertVariable(v.key)}>
                <VarKey>{v.key}</VarKey>
                <VarLabel>{v.label}</VarLabel>
                <VarExample>{v.example}</VarExample>
              </VarItem>
            ))}
          </VariablePanel>
        )}
      </PreviewPane>
    </EditorLayout>
  );
};

export default EmailTemplateEditor;
