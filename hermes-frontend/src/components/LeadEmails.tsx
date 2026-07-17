import React, { useState } from 'react';
import styled, { keyframes, css, useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useEmailQueue, useApproveEmail, useRejectEmail, useSendEmail } from '../api/hooks';
import { EmailItem } from '../api/emailQueue';
import { useDialog } from '../components';
import { ReplyBadge, DpSectionTitle } from './LeadDetailPanel';

/* ── Mock email data ── */

const MOCK_EMAILS: EmailItem[] = [
  // Dragon Logistics — sent
  { _id: 'em-1', lead_id: 'mock-4', company_name: 'Dragon Logistics', to_email: 'ops@dragonlog.com',
    subject: 'Partnership Opportunity — MADMAD x Dragon Logistics',
    body: '<p>Hi there,</p><p>We\'d love to explore a potential partnership. Our AI-driven email automation could significantly reduce your outreach costs.</p><p>Would you be available for a 15-min call next week?</p><p>Best,<br/>MADMAD Team</p>',
    status: 'sent', _type: undefined, created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    sent_at: new Date(Date.now() - 86400000 * 8).toISOString() } as any,
  // Dragon Logistics — followup, pending
  { _id: 'em-2', lead_id: 'mock-4', company_name: 'Dragon Logistics', to_email: 'ops@dragonlog.com',
    subject: 'Re: Partnership Opportunity — Follow-up',
    body: '<p>Hi again,</p><p>Just following up on our previous email. We have a few time slots available for a demo this week. Let me know what works!</p>',
    status: 'pending', _type: 'followup', created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    _summary: 'Follow-up on demo scheduling. Two time slots proposed for this week.' } as any,
  // ByteDance HK — draft pending review
  { _id: 'em-3', lead_id: 'mock-2', company_name: 'ByteDance HK', to_email: 'contact@bytedance.hk',
    subject: 'AI Email Automation for ByteDance HK',
    body: '<p>Dear ByteDance team,</p><p>We noticed your impressive growth in the HK market. Our platform could help streamline your B2B outreach with AI-powered email drafting and scheduling.</p><p>Would love to chat!</p>',
    status: 'pending', _type: undefined, created_at: new Date(Date.now() - 86400000).toISOString(),
    _reply_category: undefined },
  // Neon Digital — rejected
  { _id: 'em-4', lead_id: 'mock-5', company_name: 'Neon Digital', to_email: 'team@neondigital.co',
    subject: 'Digital Marketing Collaboration',
    body: '<p>Hi Neon Digital,</p><p>Love your portfolio! We think there\'s a great synergy between our platforms.</p>',
    status: 'rejected', _type: undefined, created_at: new Date(Date.now() - 86400000 * 9).toISOString(),
    error: { rejected_reason: 'Lead expressed no interest' } },
  // Zenith Labs — approved, ready to send
  { _id: 'em-5', lead_id: 'mock-6', company_name: 'Zenith Labs', to_email: 'hello@zenithlabs.ai',
    subject: 'Meeting Confirmation — AI Healthcare Integration',
    body: '<p>Hi Zenith Labs,</p><p>Thanks for your interest! I\'ve attached our product brief. Let\'s confirm a time for the call — how about Thursday 3pm HKT?</p>',
    status: 'approved', _type: 'reply', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
  // Quantum Finance — reply, pending
  { _id: 'em-6', lead_id: 'mock-8', company_name: 'Quantum Finance', to_email: 'cfo@quantumfin.hk',
    subject: 'Re: Pricing & Compliance — MADMAD Platform',
    body: '<p>Hi,</p><p>Thanks for your questions. Here\'s our pricing breakdown:</p><ul><li>Starter: $299/mo</li><li>Pro: $799/mo</li><li>Enterprise: Custom</li></ul><p>All plans include SOC2 compliance. Happy to discuss further.</p>',
    status: 'pending', _type: 'reply', created_at: new Date(Date.now() - 7200000).toISOString(),
    _summary: 'Detailed pricing info sent. Covers Starter/Pro/Enterprise tiers + SOC2 compliance.' } as any,
  // Acme Corp — sent first outreach
  { _id: 'em-7', lead_id: 'mock-1', company_name: 'Acme Corp', to_email: 'hello@acme.com',
    subject: 'Intro — MADMAD AI Email Agent',
    body: '<p>Hello Acme Corp,</p><p>We\'re reaching out because we believe our AI email agent could help your sales team. Would you be open to a quick intro call?</p>',
    status: 'sent', created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    sent_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  // Peak Ventures — reoutreach, pending
  { _id: 'em-8', lead_id: 'mock-10', company_name: 'Peak Ventures', to_email: 'invest@peakvc.com',
    subject: 'Re-introduction — MADMAD Series A Update',
    body: '<p>Hi Peak Ventures,</p><p>Since we last connected, we\'ve hit some exciting milestones. Would love to share our latest traction numbers.</p>',
    status: 'pending', _type: 'reoutreach', created_at: new Date(Date.now() - 3600000).toISOString() },
];

/* ── Helper functions ── */

const getEmailTypeLabel = (t: (k: string) => string, theme: any) => ({
  reply:      { text: t('leads.emailTypeReply'),      bg: theme.pastel.olive, fg: theme.colors.textPrimary },
  followup:   { text: t('leads.emailTypeFollowup'),   bg: theme.pastel.gold,  fg: theme.colors.textPrimary },
  reoutreach: { text: t('leads.emailTypeReoutreach'), bg: theme.pastel.mauve, fg: theme.colors.textPrimary },
} as Record<string, { text: string; bg: string; fg: string }>);

const getEmailStatusColor = (_theme: any): Record<string, { bg: string; fg: string }> => ({
  pending:  { bg: '#fff3e0', fg: '#e65100' },
  approved: { bg: '#e8f5e9', fg: '#2e7d32' },
  sent:     { bg: '#e3f2fd', fg: '#1565c0' },
  rejected: { bg: '#fce4ec', fg: '#c62828' },
  failed:   { bg: '#fff3e0', fg: '#e65100' },
});

/* ── Keyframes ── */

const glowPulseGreen = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(76,175,80,0.3); }
  50% { box-shadow: 0 0 16px rgba(76,175,80,0.5), 0 0 32px rgba(76,175,80,0.2); }
`;
const glowPulseGold = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(255,193,7,0.35); }
  50% { box-shadow: 0 0 16px rgba(255,193,7,0.55), 0 0 32px rgba(255,193,7,0.2); }
`;

/* ── Styled components ── */

const EmailCard = styled.div<{ $expanded?: boolean; $status?: string }>`
  border-radius: 10px;
  max-width: 100%;
  padding: 14px 18px;
  position: relative;
  overflow: hidden;
  transition: background 0.2s;
  /* pending */
  ${({ $status }) => $status === 'pending' && css`
    background: #fffef5;
    border: 1.5px solid #ffe082;
    box-shadow: 0 0 6px rgba(255,193,7,0.2);
    animation: ${glowPulseGold} 2s ease-in-out infinite;
  `}
  /* approved */
  ${({ $status }) => $status === 'approved' && css`
    background: #f8fcf8;
    border: 1.5px solid #a5d6a7;
    box-shadow: 0 0 6px rgba(76,175,80,0.2);
    animation: ${glowPulseGreen} 2s ease-in-out infinite;
  `}
  /* sent */
  ${({ $status }) => $status === 'sent' && css`
    background: #f9fcf9;
    border: 1px solid #e0efe0;
  `}
  /* rejected */
  ${({ $status }) => $status === 'rejected' && css`
    background: #fff5f5;
    border: 1px solid #f5c6c6;
    &::after {
      content: '✗';
      position: absolute;
      bottom: 6px;
      right: 12px;
      font-size: 4rem;
      font-weight: 800;
      color: rgba(211, 47, 47, 0.13);
      pointer-events: none;
      line-height: 1;
    }
  `}
  /* failed */
  ${({ $status }) => $status === 'failed' && css`
    background: #fffafa;
    border: 1px solid #f5d5d5;
  `}
  /* fallback */
  ${({ $status }) => !$status && css`
    background: #fafafa;
    border: 1px solid #eee;
  `}
`;
const EmailCardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`;
const EmailCardSubject = styled.span`
  font-weight: 600;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.textPrimary};
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const EmailCardDate = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textTertiary};
  white-space: nowrap;
`;
const EmailCardBody = styled.div`
  padding: 4px 8px;
  font-family: 'Times New Roman', 'Noto Serif TC', 'Noto Serif SC', serif;
`;
const EmailBodyContent = styled.div`
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  font-size: 1rem;
  line-height: 1.7;
  color: #555;
  max-width: 100%;
  overflow-x: hidden;
`;
const EmailCardMeta = styled.div`
  margin-top: 10px;
  padding-top: 8px;
  border-top: 0.5px solid #e2e2e2;
  font-size: 0.8125rem;
  color: #888;
`;
const EmailSummary = styled.div`
  margin: 0;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  border: 0.5px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  align-items: flex-start;
  gap: 6px;
`;
const EmailSummaryLabel = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textPrimary};
  white-space: nowrap;
  flex-shrink: 0;
`;
const EmailCardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
`;
const EmailActionBtn = styled.button<{ $bg: string; $fg: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: 0.5px solid #e5737388;
  border-radius: 99px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #c62828;
  background: #fce4ec;
  cursor: pointer;
  transition: all 0.15s;
  &:hover:not(:disabled) { background: #f8bbd0; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const LeadSendBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 18px;
  border: none;
  border-radius: 99px;
  background: #43a047;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  &:hover:not(:disabled) { background: #388e3c; }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

/* ── Internal styled components used by LeadEmails ── */

const EmailTypeBadge = styled.span<{ $bg: string; $fg: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
  &:hover { filter: brightness(0.95); transform: scale(1.03); }
`;

const ReplyPopup = styled.div<{ $open: boolean }>`
  max-height: ${({ $open }) => $open ? '300px' : '0'};
  opacity: ${({ $open }) => $open ? 1 : 0};
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.2s ease, margin 0.2s ease, padding 0.2s ease;
  background: #fafafa;
  border-radius: 8px;
  margin-top: ${({ $open }) => $open ? '8px' : '0'};
  padding: ${({ $open }) => $open ? '10px 14px' : '0 14px'};
  border: ${({ $open }) => $open ? '0.5px solid #e0e0e0' : 'none'};
  font-size: 0.8125rem;
  line-height: 1.6;
  color: #555;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Times New Roman', 'Noto Serif TC', 'Noto Serif SC', serif;
`;

const EmailTimeline = styled.div`
  position: relative;
  padding-left: 20px;
  &::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #e0e0e0;
  }
`;
const EmailTimelineNode = styled.div`
  position: relative;
  margin-bottom: 18px;
`;
const EmailTimelineDot = styled.div<{ $color?: string }>`
  position: absolute;
  left: -20px;
  top: 8px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color || '#bdbdbd'};
  border: 2px solid #fff;
  z-index: 1;
`;
const EmailTimelineTime = styled.div`
  font-size: 0.75rem;
  color: #999;
  margin-bottom: 4px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;
const EmailStatusPill = styled.span<{ $bg: string; $fg: string }>`
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 99px;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;
const EmailRecipient = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;
const AgentAvatar = styled.div`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #d4a6c8;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;
const EmailGreeting = styled.div`
  font-size: 1rem;
  color: #333;
  margin-bottom: 12px;
`;
const EmailHighlight = styled.div`
  font-size: 1rem;
  color: #1a1a1a;
  background: linear-gradient(90deg, #e8f5e920, #e8f5e960, #e8f5e920);
  padding: 6px 10px;
  border-left: 3px solid #4caf50;
  border-radius: 0 6px 6px 0;
  margin: 8px 0;
  font-weight: 500;
`;
const EmailCta = styled.div`
  font-size: 1rem;
  color: #1565c0;
  font-weight: 500;
  margin: 8px 0;
`;
const EmailSignature = styled.div`
  font-size: 0.875rem;
  color: #888;
  margin-top: 12px;
  white-space: pre-wrap;
`;
const EmailBodyLine = styled.div`
  font-size: 1rem;
  line-height: 1.7;
  color: #555;
  margin: 4px 0;
`;
const EmailListItem = styled.div`
  font-size: 1rem;
  line-height: 1.6;
  color: #444;
  padding: 3px 0 3px 16px;
  position: relative;
  &::before {
    content: '•';
    position: absolute;
    left: 0;
    color: #4caf50;
    font-weight: 700;
  }
`;
const EmailPS = styled.div`
  font-size: 0.9375rem;
  color: #1a1a1a;
  font-style: italic;
  margin-top: 12px;
  padding: 6px 10px;
  background: #fff8e1;
  border-left: 3px solid #ffc107;
  border-radius: 0 6px 6px 0;
`;

/* ── renderEmailBody helper ── */

const renderEmailBody = (text: string) => {
  const rawLines = text.split('\n');
  const lines: string[] = [];
  for (const raw of rawLines) {
    if (raw.length > 60 && /[.。!！]/.test(raw)) {
      const sentences = raw.match(/[^.。!！]+[.。!！]?\s*/g) || [raw];
      lines.push(...sentences);
    } else {
      lines.push(raw);
    }
  }

  type SegType = 'greeting' | 'body' | 'highlight' | 'cta' | 'signature' | 'list' | 'ps';
  const segments: { type: SegType; text: string }[] = [];
  let i = 0;

  const greetingRe = /^(Hi|Hello|Dear|Hey|Good\s*(morning|afternoon|evening)|Greetings|您好|嗨|親愛的|尊敬的|亲爱的|尊敬的)\b/i;
  while (i < lines.length && (greetingRe.test(lines[i].trim()) || lines[i].trim() === '')) {
    if (lines[i].trim()) segments.push({ type: 'greeting', text: lines[i].trim() });
    i++;
  }

  const signatureRe = /^(Thanks|Thank\s*you|Best|Regards|Cheers|Sincerely|Best\s*regards|Kind\s*regards|Warm\s*regards|All\s*the\s*best|Yours|謝謝|此致|順祝|敬上|祝好),?\s*$/i;

  const highlightRe = new RegExp([
    '\\d+%',
    '\\d+x\\b',
    '[$¥€£]\\s*[\\d,.]+',
    '[\\d,.]+\\s*[万億萬亿]',
    '\\d+\\s*(months?|weeks?|days?|years?|個月|周|天|年|小時|hours?)',
    '\\d+\\s*(leads?|clients?|users?|customers?|companies|位|家|個|人|筆)',
    '\\d{3,}',
    '(increase|boost|grow|reduce|save|improve|achieve|generate|deliver|result)',
    '(提升|增長|增长|降低|提高|節省|节省|帶來|带来|達到|达到|實現|实现|產生|产生)',
    '(ROI|KPI|conversion|revenue|profit|cost|efficiency)',
    '(case\\s*study|成功案例|客戶案例|客户案例)',
    '(compared\\s*to|vs\\.?|versus|相比|對比|对比|優於|优于)',
  ].join('|'), 'i');

  const ctaRe = new RegExp([
    '\\b(free|demo|call|meet|schedule|book|sign\\s*up|get\\s*started|reach\\s*out)',
    '\\b(let\\s*me\\s*know|interested|learn\\s*more|try|contact|discuss|chat|talk)',
    '\\b(available|open\\s*to|would\\s*love|happy\\s*to|look\\s*forward)',
    '\\b(click|visit|check\\s*out|explore|discover|see\\s*how|find\\s*out)',
    '(歡迎|欢迎|免費|免费|預約|预约|了解更多|聯繫|联系|立即|馬上|马上)',
    '(期待|希望|方便|有空|抽空|商討|商讨|安排|洽談|洽谈|體驗|体验)',
  ].join('|'), 'i');

  const listRe = /^[-•·★✓✔→▸]\s+|^\d+[.)]\s+|^[a-zA-Z][.)]\s+/;

  const psRe = /^(P\.?S\.?|附[：:]|备注[：:]|備註[：:]|Note[：:]|注[：:])/i;

  for (; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (psRe.test(trimmed)) {
      segments.push({ type: 'ps', text: trimmed });
      continue;
    }

    if (signatureRe.test(trimmed)) {
      segments.push({ type: 'signature', text: lines.slice(i).filter(l => l.trim()).join('\n') });
      break;
    }

    if (listRe.test(trimmed)) {
      segments.push({ type: 'list', text: trimmed.replace(/^[-•·★✓✔→▸]\s+|^\d+[.)]\s+|^[a-zA-Z][.)]\s+/, '') });
      continue;
    }

    if (highlightRe.test(trimmed)) {
      segments.push({ type: 'highlight', text: trimmed });
      continue;
    }

    if (trimmed.endsWith('?') || trimmed.endsWith('？') || ctaRe.test(trimmed)) {
      segments.push({ type: 'cta', text: trimmed });
      continue;
    }

    segments.push({ type: 'body', text: trimmed });
  }

  return segments;
};

/* ── LeadEmails component ── */

const LeadEmails: React.FC<{ companyName: string; leadId?: string }> = ({ companyName, leadId }) => {
  const { t } = useTranslation();
  const { showPrompt } = useDialog();
  const leTheme = useTheme() as any;
  const { data } = useEmailQueue({ search: companyName });
  const approve = useApproveEmail();
  const reject = useRejectEmail();
  const send = useSendEmail();

  const apiEmails = (data?.data as EmailItem[]) || [];
  const pool = [...MOCK_EMAILS, ...apiEmails];
  const emails = pool
    .filter((e) => (e.lead_id === leadId) || (e.company_name || '') === companyName)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);

  if (!emails.length) return null;

  const busy = approve.isPending || reject.isPending || send.isPending;

  const handleApproveAndSend = (d: EmailItem) => {
    if (d.status === 'approved') {
      send.mutate(d._id, {
        onSuccess: () => console.info('郵件已發送'),
        onError: () => console.error('發送失敗'),
      });
    } else {
      approve.mutate(d._id, {
        onSuccess: () => {
          console.info('已批准，正在發送…');
          send.mutate(d._id, {
            onSuccess: () => console.info('郵件已發送'),
            onError: () => console.error('發送失敗'),
          });
        },
        onError: () => console.error('批准失敗'),
      });
    }
  };

  const handleReject = async (id: string) => {
    const reason = (await showPrompt(t('leads.rejectReason'))) || undefined;
    reject.mutate({ id, reason }, {
      onSuccess: () => console.info('已拒絕'),
      onError: () => console.error('拒絕失敗'),
    });
  };

  const dotColorMap: Record<string, string> = {
    pending: '#ffc107', approved: '#66bb6a', sent: '#4caf50', rejected: '#bdbdbd', failed: '#ef5350',
  };

  return (
    <>
      <DpSectionTitle><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 3.5h14v9H1v-9zm0 0l7 4.5 7-4.5" stroke="#D689BF" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>{t('leads.emailRecords')} ({emails.length})</DpSectionTitle>
      <EmailTimeline>
        {emails.map((d) => {
          const typeTag = d._type ? getEmailTypeLabel(t, leTheme)[d._type] : null;
          const emailStatusColors = getEmailStatusColor(leTheme);
          const statusColor = emailStatusColors[d.status || 'pending'] || emailStatusColors.pending;

          return (
            <EmailTimelineNode key={d._id}>
              <EmailTimelineDot $color={dotColorMap[d.status || 'pending']} />
              <EmailTimelineTime>
                {d.created_at ? new Date(d.created_at).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : ''}
              </EmailTimelineTime>
              <EmailCard $status={d.status}>
                {/* Top row: recipient left, actions right */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <EmailRecipient style={{ marginBottom: 0 }}>
                    <AgentAvatar>{(d.to_email || '?').charAt(0).toUpperCase()}</AgentAvatar>
                    To: {d.to_email || '—'}
                  </EmailRecipient>
                  {typeTag && (
                    <EmailTypeBadge
                      $bg={typeTag.bg}
                      $fg={typeTag.fg}
                      style={{ marginLeft: 8 }}
                      onClick={(e) => { e.stopPropagation(); setReplyOpenId(replyOpenId === d._id ? null : d._id); }}
                    >
                      {typeTag.text} {replyOpenId === d._id ? '▾' : '▸'}
                    </EmailTypeBadge>
                  )}
                  <div style={{ flex: 1 }} />
                  {d.status === 'pending' && (
                    <>
                      <EmailActionBtn $bg="#fce4ec" $fg="#c62828" disabled={busy} onClick={() => handleReject(d._id)}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 4L4 10M4 4l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        {t('leads.reject')}
                      </EmailActionBtn>
                      <LeadSendBtn disabled={busy} onClick={() => handleApproveAndSend(d)}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2l-4 12-3-5-5-3 12-4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {busy ? t('leads.processing') : t('leads.approveAndSend')}
                      </LeadSendBtn>
                    </>
                  )}
                  {d.status === 'approved' && (
                    <LeadSendBtn disabled={busy} onClick={() => send.mutate(d._id)}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 2L7 9M14 2l-4 12-3-5-5-3 12-4z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {busy ? t('leads.processing') : t('leads.send')}
                    </LeadSendBtn>
                  )}
                  {d.status === 'rejected' && (
                    <span style={{ fontSize: '0.75rem', color: leTheme.strong.mauve }}>{'✗'} {t('leads.rejected')}</span>
                  )}
                </div>

                {typeTag && (
                  <ReplyPopup $open={replyOpenId === d._id}>
                    {(d as any)._reply_body || (d as any)._reply_text || (d as any).reply_body || t('leads.noReplyContent', '暫無回覆內容')}
                  </ReplyPopup>
                )}

                <EmailCardBody>
                  {(() => {
                    const bodyText = (d.body || '—').replace(/<[^>]*>/g, '');
                    const segments = renderEmailBody(bodyText);
                    return (
                      <div>
                        {segments.map((seg, idx) => {
                          switch (seg.type) {
                            case 'greeting': return <EmailGreeting key={idx}>{seg.text}</EmailGreeting>;
                            case 'highlight': return <EmailHighlight key={idx}>{seg.text}</EmailHighlight>;
                            case 'cta': return <EmailCta key={idx}>{seg.text}</EmailCta>;
                            case 'signature': return <EmailSignature key={idx}>{seg.text}</EmailSignature>;
                            case 'list': return <EmailListItem key={idx}>{seg.text}</EmailListItem>;
                            case 'ps': return <EmailPS key={idx}>{seg.text}</EmailPS>;
                            default: return <EmailBodyLine key={idx}>{seg.text}</EmailBodyLine>;
                          }
                        })}
                      </div>
                    );
                  })()}
                </EmailCardBody>

                {/* Status pill */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <EmailStatusPill $bg={statusColor.bg} $fg={statusColor.fg}>{d.status || 'pending'}</EmailStatusPill>
                </div>
              </EmailCard>
            </EmailTimelineNode>
          );
        })}
      </EmailTimeline>
    </>
  );
};

export default LeadEmails;
