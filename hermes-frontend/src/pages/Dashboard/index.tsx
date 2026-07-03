import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useLeads, useEmailQueue } from '../../api/hooks';
import { Lead } from '../../api/leads';
import { EmailItem } from '../../api/emailQueue';
import client from '../../api/client';
import { media } from '../../styles/media';

/* ══════════════════════════════════════
   Lead Scraper CMS Dashboard
   ══════════════════════════════════════ */

/* ── Layout ── */

const Page = styled.div`display: flex; flex-direction: column; gap: 16px; padding-bottom: 24px; overflow: hidden;`;

const PageTitle = styled.h1`
  font-size: 1.25rem; font-weight: 700; margin: 0;
  color: ${({ theme }) => theme.colors.textPrimary};
`;
const PageSub = styled.p`
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary}; margin: 2px 0 0;
`;

const Row = styled.div<{ $cols?: string; $gap?: number }>`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols || 'repeat(4, 1fr)'};
  gap: ${({ $gap }) => $gap ?? 12}px;
  ${media.mobile} { grid-template-columns: 1fr; }
  ${media.tablet} { grid-template-columns: repeat(2, 1fr); }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 10px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  min-width: 0;
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 16px 20px 8px;
  font-size: 0.875rem; font-weight: 600;
  color: ${({ theme }) => theme.colors.textPrimary};
  display: flex; align-items: center; justify-content: space-between;
`;

const CardBody = styled.div`padding: 12px 20px 20px;`;

/* ── KPI Card ── */

const KpiCard = styled(Card)`padding: 18px 20px; min-width: 0;`;
const KpiRow = styled.div`display: flex; align-items: center; gap: 14px;`;
const KpiIcon = styled.div<{ $bg: string; $fg: string }>`
  width: 44px; height: 44px; border-radius: 12px;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
`;
const KpiLabel = styled.div`font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary}; margin-bottom: 2px;`;
const KpiValue = styled.div`font-size: 1.35rem; font-weight: 700; color: ${({ theme }) => theme.colors.textPrimary}; line-height: 1.2;`;
const KpiSub = styled.span`font-size: 0.6875rem; color: ${({ theme }) => theme.colors.textTertiary}; font-weight: 400; margin-left: 4px;`;

/* ── Action Item ── */

const ActionList = styled.div`display: flex; flex-direction: column; gap: 0;`;
const ActionItem = styled.div`
  display: flex; align-items: center; gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: none; }
`;
const ActionDot = styled.div<{ $color: string }>`
  width: 8px; height: 8px; border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;
const ActionText = styled.div`flex: 1; font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textPrimary};`;
const ActionCount = styled.span<{ $bg: string; $fg: string }>`
  padding: 2px 10px; border-radius: 10px; font-size: 0.75rem; font-weight: 600;
  background: ${({ $bg }) => $bg}; color: ${({ $fg }) => $fg};
`;

/* ── Funnel ── */

const FunnelList = styled.div`display: flex; flex-direction: column; gap: 8px;`;
const FunnelStep = styled.div`display: flex; align-items: center; gap: 10px;`;
const FunnelBar = styled.div<{ $pct: number; $color: string }>`
  height: 28px; border-radius: 6px;
  background: ${({ $color }) => $color};
  width: ${({ $pct }) => Math.max($pct, 3)}%;
  display: flex; align-items: center; justify-content: flex-end;
  padding: 0 10px;
  font-size: 0.75rem; font-weight: 600; color: #fff;
  min-width: 36px;
  transition: width 0.5s ease;
`;
const FunnelLabel = styled.span`font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary}; width: 70px; flex-shrink: 0;`;

/* ── Donut Chart ── */

const DonutWrap = styled.div`display: flex; align-items: center; gap: 24px; justify-content: center;`;
const LegendList = styled.div`display: flex; flex-direction: column; gap: 8px;`;
const LegendItem = styled.div`display: flex; align-items: center; gap: 8px; font-size: 0.8125rem;`;
const LegendDot = styled.div<{ $color: string }>`width: 10px; height: 10px; border-radius: 50%; background: ${({ $color }) => $color}; flex-shrink: 0;`;
const LegendVal = styled.span`font-weight: 600; margin-left: auto; min-width: 20px; text-align: right;`;

/* ── Activity Feed ── */

const FeedList = styled.div`display: flex; flex-direction: column; gap: 0;`;
const FeedItem = styled.div`
  display: flex; gap: 12px; padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: none; }
`;
const FeedIcon = styled.div<{ $bg: string; $fg: string }>`
  width: 32px; height: 32px; border-radius: 8px;
  background: ${({ $bg }) => $bg}; color: ${({ $fg }) => $fg};
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; flex-shrink: 0;
`;
const FeedBody = styled.div`flex: 1; min-width: 0;`;
const FeedText = styled.div`font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textPrimary}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
const FeedTime = styled.div`font-size: 0.6875rem; color: ${({ theme }) => theme.colors.textTertiary}; margin-top: 2px;`;

/* ── Empty State ── */

const Empty = styled.div`
  text-align: center; padding: 32px 16px;
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary};
`;

/* ── Schedule ── */

const SchedHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 4px;
`;
const SchedToday = styled.span`
  font-size: 0.75rem; font-weight: 600; color: #fff;
  background: #2563eb; border-radius: 6px; padding: 2px 10px;
`;
const SchedLink = styled.a`
  font-size: 0.75rem; color: ${({ theme }) => theme.colors.blue};
  text-decoration: none; cursor: pointer;
  &:hover { text-decoration: underline; }
`;
const SchedList = styled.div`display: flex; flex-direction: column; gap: 0;`;
const SchedItem = styled.div<{ $isToday?: boolean }>`
  display: flex; align-items: center; gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: none; }
  ${({ $isToday }) => $isToday && 'background: #eff6ff; margin: 0 -20px; padding: 10px 20px; border-radius: 6px;'}
`;
const SchedTime = styled.div`
  font-size: 0.75rem; font-weight: 600; color: ${({ theme }) => theme.colors.textSecondary};
  width: 56px; flex-shrink: 0;
`;
const SchedDot = styled.div<{ $color: string }>`
  width: 8px; height: 8px; border-radius: 50%;
  background: ${({ $color }) => $color}; flex-shrink: 0;
`;
const SchedTitle = styled.div`
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textPrimary};
  flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;
const SchedDate = styled.div`
  font-size: 0.6875rem; color: ${({ theme }) => theme.colors.textTertiary};
  flex-shrink: 0;
`;

/* ══════════ Donut SVG ══════════ */

const DonutChart: React.FC<{ slices: { value: number; color: string }[]; size?: number }> = ({ slices, size = 130 }) => {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) return <svg width={size} height={size}><circle cx={size/2} cy={size/2} r={size/2-8} fill="none" stroke="#e5e7eb" strokeWidth="16" /></svg>;
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      {slices.filter(s => s.value > 0).map((sl, i) => {
        const pct = sl.value / total;
        const dash = `${pct * c} ${c}`;
        const el = (
          <circle
            key={i}
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke={sl.color} strokeWidth="16"
            strokeDasharray={dash} strokeDashoffset={-offset}
            strokeLinecap="butt"
          />
        );
        offset += pct * c;
        return el;
      })}
      <text
        x={size/2} y={size/2}
        textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontSize: '1.5rem', fontWeight: 700, fill: 'currentColor' }}
      >
        {total}
      </text>
    </svg>
  );
};

/* ══════════ Helpers ══════════ */

const isNewLead = (l: Lead) => l.status === 'new' || l.status === null || l.status === undefined;
const timeAgo = (dateStr?: string) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '剛剛';
  if (mins < 60) return `${mins} 分鐘前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小時前`;
  const days = Math.floor(hrs / 24);
  return `${days} 日前`;
};

/* ══════════ COMPONENT ══════════ */

interface UpcomingEvent {
  title: string;
  start: string;
  all_day?: boolean;
  color?: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  // Fetch all leads (high limit for stats)
  const { data: leadsData, isLoading: leadsLoading } = useLeads({ page: 1, limit: 100 });
  const { data: emailData, isLoading: emailsLoading } = useEmailQueue({ page: 1, limit: 100 });

  // Fetch calendar events for current + next month (auto-refresh every 60s)
  const [calEvents, setCalEvents] = useState<UpcomingEvent[]>([]);
  useEffect(() => {
    const fetchEvents = () => {
      const now = new Date();
      const m1 = now.getMonth() + 1;
      const y1 = now.getFullYear();
      const m2 = m1 === 12 ? 1 : m1 + 1;
      const y2 = m1 === 12 ? y1 + 1 : y1;
      Promise.all([
        client.get('/calendar', { params: { month: m1, year: y1 } }).catch(() => ({ data: [] })),
        client.get('/calendar', { params: { month: m2, year: y2 } }).catch(() => ({ data: [] })),
      ]).then(([r1, r2]) => {
        const parse = (r: any) => {
          const items = r.data?.data ?? r.data ?? [];
          return Array.isArray(items) ? items : [];
        };
        const all = [...parse(r1), ...parse(r2)] as UpcomingEvent[];
        // Filter to upcoming events — hide events whose start time has already passed
        const nowIso = new Date().toISOString();
        const upcoming = all
          .filter(e => e.start && (e.all_day ? e.start.slice(0, 10) >= nowIso.slice(0, 10) : e.start >= nowIso))
          .sort((a, b) => a.start.localeCompare(b.start))
          .slice(0, 8);
        setCalEvents(upcoming);
      });
    };
    fetchEvents();
    const timer = setInterval(fetchEvents, 60_000); // 每 60 秒刷新
    return () => clearInterval(timer);
  }, []);

  const allLeads: Lead[] = leadsData?.data || [];
  const allEmails: EmailItem[] = emailData?.data || [];

  // ── KPI stats ──
  const stats = useMemo(() => {
    const total = allLeads.length;
    const contacted = allLeads.filter(l => l.status === 'contacted').length;
    const replied = allLeads.filter(l => l._replied).length;
    const replyRate = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;

    const pendingDrafts = allEmails.filter(e => e.status === 'pending').length;
    const sentEmails = allEmails.filter(e => e.status === 'sent').length;

    // 本週已發送
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const sentThisWeek = allEmails.filter(e => e.status === 'sent' && e.sent_at && e.sent_at >= weekAgo).length;

    return { total, contacted, replied, replyRate, pendingDrafts, sentEmails, sentThisWeek };
  }, [allLeads, allEmails]);

  // ── Action items ──
  const actions = useMemo(() => {
    const pendingDrafts = allEmails.filter(e => e.status === 'pending').length;
    const newReplies = allLeads.filter(l => l._replied && l._reply_category && l._reply_category !== 'auto_reply' && l._reply_category !== 'not_interested').length;
    const pendingMeetings = allLeads.filter(l => l._pending_meeting).length;
    const noReplyNoFollowup = allLeads.filter(l => l.status === 'contacted' && !l._replied && !l._followup_count).length;
    return { pendingDrafts, newReplies, pendingMeetings, noReplyNoFollowup };
  }, [allLeads, allEmails]);

  // ── Funnel ──
  const funnel = useMemo(() => {
    const total = allLeads.length;
    const contacted = allLeads.filter(l => l.status === 'contacted').length;
    const replied = allLeads.filter(l => l._replied).length;
    const meetings = allLeads.filter(l => l._reply_category === 'meeting').length;
    return { total, contacted, replied, meetings };
  }, [allLeads]);

  // ── Reply category distribution ──
  const replyCats = useMemo(() => {
    const cats = { interested: 0, meeting: 0, question: 0, not_interested: 0, auto_reply: 0 };
    allLeads.forEach(l => {
      if (l._replied && l._reply_category) {
        const key = l._reply_category as keyof typeof cats;
        if (key in cats) cats[key]++;
      }
    });
    return cats;
  }, [allLeads]);

  // ── Recent activity (merge recent emails + replies, sort by date) ──
  const recentActivity = useMemo(() => {
    const items: { type: 'sent' | 'reply' | 'draft'; text: string; time: string; date: string }[] = [];

    // Recent sent emails
    allEmails
      .filter(e => e.status === 'sent' && e.sent_at)
      .sort((a, b) => (b.sent_at || '').localeCompare(a.sent_at || ''))
      .slice(0, 5)
      .forEach(e => items.push({
        type: 'sent',
        text: `已發送至 ${e.company_name || e.to_email}${e._type === 'followup' ? '（跟進）' : e._type === 'reply' ? '（回覆）' : ''}`,
        time: timeAgo(e.sent_at),
        date: e.sent_at || '',
      }));

    // Recent replies
    allLeads
      .filter(l => l._replied && l._reply_at)
      .sort((a, b) => (b._reply_at || '').localeCompare(a._reply_at || ''))
      .slice(0, 5)
      .forEach(l => {
        const catLabel: Record<string, string> = {
          interested: '有興趣', meeting: '約會議', question: '問問題',
          not_interested: '冇興趣', auto_reply: '自動回覆',
        };
        items.push({
          type: 'reply',
          text: `${l.company_name} 回覆 — ${catLabel[l._reply_category || ''] || l._reply_category || ''}`,
          time: timeAgo(l._reply_at),
          date: l._reply_at || '',
        });
      });

    // Recent pending drafts
    allEmails
      .filter(e => e.status === 'pending')
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 3)
      .forEach(e => items.push({
        type: 'draft',
        text: `新草稿：${e.company_name || e.to_email}${e._type === 'followup' ? '（跟進）' : e._type === 'reply' ? '（回覆）' : '（Outreach）'}`,
        time: timeAgo(e.created_at),
        date: e.created_at || '',
      }));

    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  }, [allLeads, allEmails]);

  const loading = leadsLoading || emailsLoading;

  if (loading) {
    return <Page><Empty>載入中…</Empty></Page>;
  }

  const funnelMax = Math.max(funnel.total, 1);

  return (
    <Page>
      {/* Header */}
      <div>
        <PageTitle>Dashboard</PageTitle>
        <PageSub>Lead Scraper CMS 總覽</PageSub>
      </div>

      {/* KPI Row */}
      <Row $cols="repeat(4, 1fr)" $gap={12}>
        <KpiCard>
          <KpiRow>
            <KpiIcon $bg="#dbeafe" $fg="#2563eb">📋</KpiIcon>
            <div>
              <KpiLabel>總 Leads</KpiLabel>
              <KpiValue>{stats.total}</KpiValue>
            </div>
          </KpiRow>
        </KpiCard>
        <KpiCard>
          <KpiRow>
            <KpiIcon $bg="#fef3c7" $fg="#d97706">📧</KpiIcon>
            <div>
              <KpiLabel>待審草稿</KpiLabel>
              <KpiValue>{stats.pendingDrafts}</KpiValue>
            </div>
          </KpiRow>
        </KpiCard>
        <KpiCard>
          <KpiRow>
            <KpiIcon $bg="#dcfce7" $fg="#16a34a">📊</KpiIcon>
            <div>
              <KpiLabel>回覆率</KpiLabel>
              <KpiValue>{stats.replyRate}%<KpiSub>({stats.replied}/{stats.contacted})</KpiSub></KpiValue>
            </div>
          </KpiRow>
        </KpiCard>
        <KpiCard>
          <KpiRow>
            <KpiIcon $bg="#f3e8ff" $fg="#8b5cf6">🚀</KpiIcon>
            <div>
              <KpiLabel>本週已發送</KpiLabel>
              <KpiValue>{stats.sentThisWeek}<KpiSub>/ {stats.sentEmails} 總計</KpiSub></KpiValue>
            </div>
          </KpiRow>
        </KpiCard>
      </Row>

      {/* Action Items + Funnel */}
      <Row $cols="1fr 1fr" $gap={16}>
        {/* 待處理事項 */}
        <Card>
          <CardHeader>待處理事項</CardHeader>
          <CardBody>
            <ActionList>
              <ActionItem>
                <ActionDot $color="#d97706" />
                <ActionText>Email 草稿等緊批准</ActionText>
                <ActionCount $bg="#fef3c7" $fg="#b45309">{actions.pendingDrafts}</ActionCount>
              </ActionItem>
              <ActionItem>
                <ActionDot $color="#16a34a" />
                <ActionText>新回覆需要處理</ActionText>
                <ActionCount $bg="#dcfce7" $fg="#16a34a">{actions.newReplies}</ActionCount>
              </ActionItem>
              <ActionItem>
                <ActionDot $color="#8b5cf6" />
                <ActionText>待約時間（有興趣但未約）</ActionText>
                <ActionCount $bg="#f3e8ff" $fg="#8b5cf6">{actions.pendingMeetings}</ActionCount>
              </ActionItem>
              <ActionItem>
                <ActionDot $color="#dc2626" />
                <ActionText>已聯絡但未跟進</ActionText>
                <ActionCount $bg="#fee2e2" $fg="#dc2626">{actions.noReplyNoFollowup}</ActionCount>
              </ActionItem>
            </ActionList>
          </CardBody>
        </Card>

        {/* 轉化漏斗 */}
        <Card>
          <CardHeader>轉化漏斗</CardHeader>
          <CardBody>
            <FunnelList>
              <FunnelStep>
                <FunnelLabel>新線索</FunnelLabel>
                <FunnelBar $pct={(funnel.total / funnelMax) * 100} $color="#2563eb">{funnel.total}</FunnelBar>
              </FunnelStep>
              <FunnelStep>
                <FunnelLabel>已聯絡</FunnelLabel>
                <FunnelBar $pct={(funnel.contacted / funnelMax) * 100} $color="#d97706">{funnel.contacted}</FunnelBar>
              </FunnelStep>
              <FunnelStep>
                <FunnelLabel>已回覆</FunnelLabel>
                <FunnelBar $pct={(funnel.replied / funnelMax) * 100} $color="#16a34a">{funnel.replied}</FunnelBar>
              </FunnelStep>
              <FunnelStep>
                <FunnelLabel>約會議</FunnelLabel>
                <FunnelBar $pct={(funnel.meetings / funnelMax) * 100} $color="#8b5cf6">{funnel.meetings}</FunnelBar>
              </FunnelStep>
            </FunnelList>
          </CardBody>
        </Card>
      </Row>

      {/* Reply Distribution + Schedule + Recent Activity */}
      <Row $cols="1fr 1fr 1fr" $gap={16}>
        {/* 回覆分類分佈 */}
        <Card>
          <CardHeader>回覆分類分佈</CardHeader>
          <CardBody>
            {stats.replied === 0 ? (
              <Empty>暫時冇回覆數據</Empty>
            ) : (
              <DonutWrap>
                <DonutChart slices={[
                  { value: replyCats.interested, color: '#16a34a' },
                  { value: replyCats.meeting, color: '#8b5cf6' },
                  { value: replyCats.question, color: '#2563eb' },
                  { value: replyCats.not_interested, color: '#dc2626' },
                  { value: replyCats.auto_reply, color: '#94a3b8' },
                ]} />
                <LegendList>
                  <LegendItem><LegendDot $color="#16a34a" /> 有興趣 <LegendVal>{replyCats.interested}</LegendVal></LegendItem>
                  <LegendItem><LegendDot $color="#8b5cf6" /> 約會議 <LegendVal>{replyCats.meeting}</LegendVal></LegendItem>
                  <LegendItem><LegendDot $color="#2563eb" /> 問問題 <LegendVal>{replyCats.question}</LegendVal></LegendItem>
                  <LegendItem><LegendDot $color="#dc2626" /> 冇興趣 <LegendVal>{replyCats.not_interested}</LegendVal></LegendItem>
                  <LegendItem><LegendDot $color="#94a3b8" /> 自動回覆 <LegendVal>{replyCats.auto_reply}</LegendVal></LegendItem>
                </LegendList>
              </DonutWrap>
            )}
          </CardBody>
        </Card>

        {/* 即將到來嘅日程 */}
        <Card>
          <CardHeader>
            <span>即將日程</span>
            <SchedLink onClick={() => navigate('/app-calendar')}>查看完整日曆 →</SchedLink>
          </CardHeader>
          <CardBody>
            {calEvents.length === 0 ? (
              <Empty>暫時冇即將到來嘅日程</Empty>
            ) : (
              <SchedList>
                {(() => {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const todayCount = calEvents.filter(e => e.start.slice(0, 10) === todayStr).length;
                  return todayCount > 0 ? (
                    <div style={{ marginBottom: 8 }}>
                      <SchedToday>今日 {todayCount} 個日程</SchedToday>
                    </div>
                  ) : null;
                })()}
                {calEvents.map((ev, i) => {
                  const d = new Date(ev.start);
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const isToday = ev.start.slice(0, 10) === todayStr;
                  const h = d.getHours();
                  const m = d.getMinutes();
                  const timeStr = ev.all_day ? '全日' : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                  const dateStr = isToday ? '今日' : `${d.getMonth() + 1}/${d.getDate()}`;
                  return (
                    <SchedItem key={i} $isToday={isToday}>
                      <SchedTime>{timeStr}</SchedTime>
                      <SchedDot $color={ev.color || '#2563eb'} />
                      <SchedTitle>{ev.title}</SchedTitle>
                      <SchedDate>{dateStr}</SchedDate>
                    </SchedItem>
                  );
                })}
              </SchedList>
            )}
          </CardBody>
        </Card>

        {/* 最近活動 */}
        <Card>
          <CardHeader>最近活動</CardHeader>
          <CardBody>
            {recentActivity.length === 0 ? (
              <Empty>暫時冇活動記錄</Empty>
            ) : (
              <FeedList>
                {recentActivity.map((item, i) => (
                  <FeedItem key={i}>
                    <FeedIcon
                      $bg={item.type === 'sent' ? '#dbeafe' : item.type === 'reply' ? '#dcfce7' : '#fef3c7'}
                      $fg={item.type === 'sent' ? '#2563eb' : item.type === 'reply' ? '#16a34a' : '#d97706'}
                    >
                      {item.type === 'sent' ? '📤' : item.type === 'reply' ? '📩' : '📝'}
                    </FeedIcon>
                    <FeedBody>
                      <FeedText>{item.text}</FeedText>
                      <FeedTime>{item.time}</FeedTime>
                    </FeedBody>
                  </FeedItem>
                ))}
              </FeedList>
            )}
          </CardBody>
        </Card>
      </Row>
    </Page>
  );
};

export default Dashboard;
