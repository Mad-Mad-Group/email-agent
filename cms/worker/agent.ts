/**
 * Person C — AI Agent worker（執行側）
 *
 * 獨立 process。loop：登入 B 個 API → claim task → 按 skill 做 → 寫返 Mongo
 * → complete。同 NestJS API 分開行（enqueue 模式嘅「工人」）。
 *
 * ⚠️ 而家每個 handler 係【可清走嘅 demo 邏輯】(source/_agent_demo 標記)，
 *    真引擎要 port：S1/enrich → gmaps_browser.py + CUA；analyze/draft → MiniMax。
 *    換 handler 內部即可，loop / claim / complete 唔使動。
 *
 * 跑：npm run worker          （一直行）
 *     WORKER_MAX_IDLE=3 npm run worker   （連續 3 次冇 task 就停，測試用）
 */
import { MongoClient, ObjectId, Db } from 'mongodb';
import { randomBytes } from 'crypto';
import { execFile } from 'child_process';
import * as nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_SOLUTIONS,
  BRAND_CONTEXT_BLOCK,
  BRAND_SIGNATURE,
  BRAND_TONE_GUIDE,
} from './brand';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 叫 Hermes agent 做嘢（佢有 MiniMax + stealth browser + skills）。
 * --yolo = 非互動自動批准工具（開 browser 唔卡）。
 */
function callHermes(prompt: string, timeoutMs = 300_000): Promise<string> {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    execFile('hermes', ['-z', prompt, '--yolo', '--ignore-rules'], {
      encoding: 'utf8',
      timeout: timeoutMs,
      maxBuffer: 16 * 1024 * 1024,
    }, (err, stdout) => {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      if (err) {
        console.log(`[hermes] ✗ ${elapsed}s — error: ${err.message?.slice(0, 200)}`);
        reject(err);
      } else {
        console.log(`[hermes] ✓ ${elapsed}s — ${stdout.length} chars — preview: ${stdout.slice(0, 300).replace(/\n/g, '⏎')}`);
        resolve(stdout);
      }
    });
  });
}
/**
 * 修復 LLM 常見 JSON 問題：
 * - smart/curly quotes → straight quotes
 * - unescaped newlines/tabs inside strings
 * - trailing commas before } or ]
 * - control characters
 * - BOM
 */
function sanitizeLlmJson(raw: string): string {
  let s = raw;
  // BOM
  s = s.replace(/^﻿/, '');
  // smart quotes → straight
  s = s.replace(/[“”„‟″‶]/g, '"');
  s = s.replace(/[‘’‚‛′‵]/g, "'");
  // fix unescaped newlines/tabs inside JSON string values
  // strategy: walk char-by-char inside strings and escape raw control chars
  let result = '';
  let inStr = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escaped) { result += c; escaped = false; continue; }
    if (c === '\\') { result += c; escaped = true; continue; }
    if (c === '"') { result += c; inStr = !inStr; continue; }
    if (inStr) {
      if (c === '\n') { result += '\\n'; continue; }
      if (c === '\r') { result += '\\r'; continue; }
      if (c === '\t') { result += '\\t'; continue; }
      // other control chars (0x00-0x1F)
      const code = c.charCodeAt(0);
      if (code < 0x20) { result += '\\u' + code.toString(16).padStart(4, '0'); continue; }
    }
    result += c;
  }
  s = result;
  // trailing commas: ,} or ,]
  s = s.replace(/,\s*([\]}])/g, '$1');
  return s;
}

/** 由 Hermes output 抽第一個 JSON object（含容錯） */
function extractJson(s: string): any {
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Hermes 冇回 JSON: ' + s.slice(0, 200));
  // 先試原版
  try { return JSON.parse(m[0]); } catch { /* 落去修復 */ }
  // 修復後再試
  try { return JSON.parse(sanitizeLlmJson(m[0])); } catch { /* 落去 fallback */ }
  // 最後手段：搵最內層嘅 balanced {}
  const inner = s.match(/\{[^{}]*\}/);
  if (inner) {
    try { return JSON.parse(sanitizeLlmJson(inner[0])); } catch { /* 放棄 */ }
  }
  throw new Error('Hermes JSON parse 失敗 (已嘗試修復): ' + s.slice(0, 300));
}

/** 由 Hermes output 抽 JSON array（支援截斷修復 + 容錯） */
function extractJsonArray(s: string): any[] {
  // 先試完整 match
  const m = s.match(/\[[\s\S]*\]/);
  if (m) {
    try { return JSON.parse(m[0]); } catch { /* 試修復 */ }
    try { return JSON.parse(sanitizeLlmJson(m[0])); } catch { /* 落去截斷修復 */ }
  }
  // 搵開頭 [ 但冇結尾 ]（截斷）→ 修復
  const start = s.indexOf('[');
  if (start === -1) throw new Error('Hermes 冇回 JSON array: ' + s.slice(0, 300));
  let raw = s.slice(start);
  // 移除最後一個不完整嘅 object（搵最後一個 },）
  const lastComplete = raw.lastIndexOf('},');
  if (lastComplete > 0) {
    raw = raw.slice(0, lastComplete + 1) + ']';
  } else {
    const lastObj = raw.lastIndexOf('}');
    if (lastObj > 0) raw = raw.slice(0, lastObj + 1) + ']';
  }
  try { return JSON.parse(raw); } catch { /* 試修復 */ }
  try { return JSON.parse(sanitizeLlmJson(raw)); } catch { /* 放棄 */ }
  throw new Error('Hermes JSON array 截斷修復失敗: ' + s.slice(0, 300));
}
/**
 * 叫 Hermes 並攞 JSON。parse 唔到（佢「講」而唔係回 JSON）就再叫一次強硬版。
 */
async function hermesJson(
  prompt: string,
  opts: { array?: boolean; timeout?: number } = {},
): Promise<any> {
  const pick = (s: string) =>
    opts.array ? extractJsonArray(s) : extractJson(s);
  // 第一次就加 JSON 格式提示，大幅減少 parse 失敗需要 retry 嘅機會
  const jsonHint = opts.array
    ? `\n\nRespond with ONLY a raw JSON array (start with [ end with ]). No markdown, no explanation.`
    : `\n\nRespond with ONLY a raw JSON object (start with { end with }). No markdown, no explanation.`;
  try {
    return pick(await callHermes(prompt + jsonHint, opts.timeout));
  } catch {
    const strict =
      prompt +
      `\n\nIMPORTANT: Your ENTIRE reply must be ONLY the raw JSON` +
      (opts.array ? ' array (start with [ end with ])' : ' object (start with { end with })') +
      `. No explanation, no markdown, no words before or after.`;
    return pick(await callHermes(strict, opts.timeout));
  }
}

const API = process.env.API_URL || 'http://localhost:4000/api';
const MONGO =
  process.env.MONGODB_URI ||
  'mongodb://leadteam:leadteam2026@localhost:27017/lead_scraper';
const EMAIL = process.env.AGENT_EMAIL || 'admin@test.com';
const PASS = process.env.AGENT_PASS || '123456';
const AGENT_ID = process.env.AGENT_ID || 'WORKER-1';
const SKILL = process.env.AGENT_SKILL || ''; // 空 = 任何 skill
const SKILL_EXCLUDE = process.env.AGENT_SKILL_EXCLUDE || ''; // 逗號分隔，排除某啲 skill
const POLL_MS = Number(process.env.POLL_MS || 2000);
const MAX_IDLE = Number(process.env.WORKER_MAX_IDLE || 0); // 0 = 永遠
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || 1)); // 每個 worker 同時處理幾多個 task

let token = '';
const log = (...a: unknown[]) => console.log(`[agent ${AGENT_ID}]`, ...a);
const nowIso = () => new Date().toISOString();

/** POST /sse/notify → 通知 NestJS SSE bus，前端即時收到 */
async function sseNotify(type: string, data: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${API}/sse/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type, data }),
    });
  } catch { /* SSE 通知失敗唔影響主流程 */ }
}

/** 寫入通知記錄到 MongoDB */
async function notify(
  db: Db,
  title: string,
  opts: { message?: string; type?: 'lead' | 'email' | 'campaign' | 'task' | 'system'; ref_id?: string; user_id?: string } = {},
) {
  try {
    await db.collection('notifications').insertOne({
      title,
      message: opts.message,
      type: opts.type ?? 'system',
      ref_id: opts.ref_id,
      user_id: opts.user_id,
      read: false,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    });
  } catch (e) {
    log('⚠ notify 寫入失敗:', e);
  }
}

/**
 * 將 lead 嘅真實公司資料組成一段 context，畀 LLM 參考。
 * 避免 AI 冇資料亂作公司背景。
 */
function buildLeadContext(lead: any): string {
  const parts: string[] = [];
  if (lead.company_name) parts.push(`公司名稱：${lead.company_name}`);
  if (lead.industry_tags?.length) parts.push(`行業：${lead.industry_tags.join('、')}`);
  if (lead.website) parts.push(`官網：${lead.website}`);
  if (lead.website_description) parts.push(`公司簡介：${lead.website_description}`);
  if (lead._scraped_services?.length)
    parts.push(`對方服務/產品：${lead._scraped_services.join('、')}`);
  if (lead._scraped_text) {
    const excerpt = lead._scraped_text.slice(0, 2000);
    parts.push(`官網內容節錄：\n${excerpt}`);
  }
  if (lead.address) parts.push(`地址：${lead.address}`);
  return parts.length
    ? `\n【對方公司資料 — 只可引用以下事實，唔好自行虛構】\n${parts.join('\n')}\n`
    : '';
}

async function login(): Promise<void> {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  const j: any = await r.json();
  token = j?.data?.access_token;
  if (!token) throw new Error('登入失敗');
  log('已登入');
}

async function api(path: string, method = 'GET', body?: unknown): Promise<any> {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 401) {
    await login();
    return api(path, method, body);
  }
  return r.json();
}

const claim = () =>
  api('/tasks/claim', 'POST', {
    agent_id: AGENT_ID,
    ...(SKILL ? { skill_id: SKILL } : {}),
    ...(SKILL_EXCLUDE ? { exclude_skills: SKILL_EXCLUDE } : {}),
  }).then((j) => j?.data ?? null);
const complete = (id: string, result: unknown) =>
  api(`/tasks/${id}/complete`, 'POST', { result });
async function failTask(id: string, error: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await api(`/tasks/${id}/fail`, 'POST', { error });
    } catch (e: any) {
      log(`⚠ failTask attempt ${i + 1}/${retries} failed:`, e?.message ?? e);
      if (i < retries - 1) await sleep(2000 * (i + 1)); // 2s, 4s delay
    }
  }
  throw new Error(`failTask 重試 ${retries} 次仍然失敗`);
}

// ───────── handlers（demo 引擎，逐個換真）─────────
async function handle(task: any, db: Db): Promise<unknown> {
  const p = task.params || {};
  const skill = task.skill_id;
  if (p.mode === 'reply_check') return doReplyCheck(p, db);
  if (p.mode === 'followup') return doFollowupDraft(p, db);
  if (p.mode === 'reoutreach') return doReoutreachDraft(p, db);
  if (p.mode === 'check_followups') return doCheckFollowups(p, db);
  if (skill === 'S1') return doSearch(p, db);
  if (skill === 'S2' && (p.mode === 'enrich' || p.pipeline_stage === 'enrich')) return doEnrich(p, db);
  if (skill === 'S2') return doAnalyze(p, db);
  if (skill === 'S3') return doDraft(p, db);
  if (skill === 'S4') return doSend(p, db);
  return { note: `no handler for ${skill}` };
}

/** 簡單分類回覆（keyword heuristic，參考舊 reply_analyzer；快、唔使 LLM）*/
function classifyReply(subject: string, body: string): string {
  const t = `${subject} ${body}`.toLowerCase();
  if (/(out of office|auto-?reply|automatic reply|放假|自動回覆|不在)/.test(t)) return 'auto_reply';
  if (/(not interested|no thank|unsubscribe|remove me|唔需要|唔感興趣|冇興趣|拒絕)/.test(t)) return 'not_interested';
  if (/(meeting|zoom|call|schedule|available|開會|會議|時間|傾下|約|見面)/.test(t)) return 'meeting';
  if (/(interested|tell me more|sounds good|有興趣|想了解|報價|quote|詳情)/.test(t)) return 'interested';
  return 'question';
}

/**
 * 預設會議時間：下星期一 10:00（本地時間）
 */
function getDefaultMeetingTime(): Date {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  d.setHours(10, 0, 0, 0);
  return d;
}

/**
 * 用 Hermes(LLM) 分析一封回覆：分類 + 真摘要 + 語氣 + 下一步建議。
 * Hermes 掛咗 / parse 唔到 → fallback keyword（classifyReply），確保唔會漏。
 */
async function analyzeReply(
  subject: string,
  body: string,
  lead: any,
): Promise<{
  category: string;
  summary: string;
  sentiment: string;
  next_step: string;
  proposed_time: string;
  via: string;
}> {
  const allowed = ['interested', 'not_interested', 'meeting', 'auto_reply', 'question'];
  const clip = (body || '').slice(0, 4000); // 保護 prompt 長度
  const prompt = `你係 B2B 業務助手。下面係潛在客戶「${lead.company_name || lead.email}」對我哋 outreach email 嘅回覆。
淨係根據回覆內容分析，唔好靠估、唔好自己編料。

回覆主題：${subject}
回覆內容：
${clip}

回一個 JSON object（ENTIRE reply 只可以係呢個 object）：
{
  "category": "interested | not_interested | meeting | auto_reply | question",
  "summary": "一兩句繁體中文：對方實際講咩、乜嘢語氣",
  "sentiment": "positive | neutral | negative",
  "next_step": "一句：建議我哋下一步（例如 約時間 / 報價 / 跟進 / 放棄）",
  "proposed_time": "ISO 8601 格式（如 2026-07-10T14:30:00+08:00）；冇提及具體時間就填空字串 \"\""
}
category 定義：interested=明確有興趣並有實質內容（想了解某方面／提出需求／想要資料或報價）；meeting=想開會或約時間；not_interested=明確拒絕或退訂；auto_reply=自動回覆／放假／測試訊息無實質內容；question=未明確表態或有疑問（包括只係一句「有興趣」但冇任何具體內容、或其他唔清楚嘅回覆）。內容唔清楚或未明確表態就填 "question"。
proposed_time：如果對方提到了具體日期/時間（如「下週三下午兩點」「7月10號 2:30pm」），轉成 ISO 8601；冇提就留空。`;
  try {
    const c = await hermesJson(prompt, { timeout: 300_000 });
    return {
      category: allowed.includes(c.category) ? c.category : classifyReply(subject, body),
      summary: String(c.summary || subject).slice(0, 300),
      sentiment: ['positive', 'neutral', 'negative'].includes(c.sentiment)
        ? c.sentiment
        : 'neutral',
      next_step: String(c.next_step || '').slice(0, 200),
      proposed_time: String(c.proposed_time || ''),
      via: 'hermes',
    };
  } catch {
    // Hermes 唔得 → keyword fallback，唔會漏咗封回覆
    return {
      category: classifyReply(subject, body),
      summary: subject.slice(0, 120),
      sentiment: 'neutral',
      next_step: '',
      proposed_time: '',
      via: 'keyword-fallback',
    };
  }
}

/**
 * 收到回覆後，自動生成「回應對方回覆」嘅草稿（唔同 doFollowupDraft：嗰個係追唔覆嘅人，
 * 呢個係回應覆咗嘅人）。按回覆分類 + 內容叫 Hermes 寫返一封 email，
 * 入 email_queue 做 pending（人喺 Email Queue tick 完先真發）。
 * 只對「有得傾」嘅分類回覆；auto_reply / not_interested 唔生成。
 */
const REPLY_DRAFT_CATS = ['meeting', 'interested', 'question'];
async function maybeDraftReply(
  lead: any,
  analysis: { category: string; summary: string; next_step: string },
  replyText: string,
  db: Db,
): Promise<boolean> {
  if (!REPLY_DRAFT_CATS.includes(analysis.category)) return false;
  // 攞返原本封 outreach 個 subject 做 "Re:"，令回覆睇落同一 thread
  const orig = await db
    .collection('email_queue')
    .find({ lead_id: lead.lead_id })
    .sort({ created_at: -1 })
    .limit(1)
    .toArray();
  const origSubject: string = orig[0]?.subject || '';

  // 按回覆分類用唔同寫法指引
  let categoryGuide = '';
  if (analysis.category === 'meeting') {
    categoryGuide = `寫法：確認 / 敲定會議時間，簡述議程，可提線上連結或到訪安排。`;
  } else if (analysis.category === 'interested') {
    categoryGuide = `寫法：對方而家係「有興趣、想了解多啲」呢個階段，重點係解答同提供資訊，唔好跳步逼約時間。
先多謝對方嘅興趣、簡短回應佢感興趣嘅點，然後主動補充 1-2 個最相關嘅重點或案例，並邀請對方講多啲需求或想了解邊方面。
⚠️ 唔好喺呢階段主動提議具體會議時段或要求對方畀時間。如要行動呼籲，最多輕輕講「如想深入了解，我哋可以安排一個簡短通話，或者先 send 份資料俾你」，唔好指定時間、唔好施壓。`;
  } else if (analysis.category === 'question') {
    categoryGuide = `寫法：對方回覆未算明確表態（可能只係一句「有興趣」、或提出疑問）。
- 若有具體問題：直接、誠實答返（見下方原文）；唔確定就照講唔確定，唔好亂作。
- 若只係含糊表示有興趣、冇講需求：多謝對方，簡短補充 1-2 個最相關嘅重點或方向，並邀請對方講多啲關注邊方面。
⚠️ 呢個階段唔好要求對方畀具體會議時間；最多輕輕提可安排簡短通話或先 send 資料，唔好指定時間、唔好施壓。

對方原文（節錄）：
${(replyText || '').slice(0, 2000)}`;
  }

  const leadCtx = buildLeadContext(lead);
  const prompt = `你係 ${BRAND_NAME} 嘅業務。潛在客戶「${lead.company_name || lead.email}」啱啱回覆咗我哋嘅 outreach email。
請寫一封得體、簡短的跟進回覆。語言用正式英文或繁體中文書面語皆可，按對方情況揀（英文中學／國際機構用英文亦可）；但若用中文則必須書面語，不可粵語口語（用不/沒有/的/在/這，不用唔/冇/嘅/喺/呢）；正文避免 emoji。只根據下面資料，不要作事實、不要過度承諾。

${BRAND_CONTEXT_BLOCK}
${leadCtx}
對方回覆分類：${analysis.category}
對方回覆摘要：${analysis.summary}
建議下一步（只作參考，唔好硬跟）：${analysis.next_step}

⚠️ 最重要原則 —— 配合對方所處階段，唔好跳步：對方去到邊一步，你就配合嗰一步；唔好因為「建議下一步」寫咗約時間，就喺對方仲未想見面時要求佢畀時間。

${categoryGuide}

結尾用返簽名：
${BRAND_SIGNATURE}

只回一個 JSON object（ENTIRE reply 只可以係佢）：{"subject":"","body":"","summary":"一句繁中摘要：呢封 email 嘅重點（20字內）"}`;
  try {
    const c = await hermesJson(prompt, { timeout: 300_000 });
    if (!c.body) return false;
    const subject =
      c.subject ||
      (origSubject
        ? /^re:/i.test(origSubject)
          ? origSubject
          : `Re: ${origSubject}`
        : '跟進');
    await db.collection('email_queue').insertOne({
      email_id: randomBytes(4).toString('hex'),
      lead_id: lead.lead_id,
      user_id: lead.user_id || undefined,
      company_name: lead.company_name,
      to_email: lead.email,
      subject,
      body: c.body,
      _summary: c.summary || '',
      status: 'pending',
      _via: 'hermes',
      _type: 'reply',
      _reply_category: analysis.category,
      created_at: nowIso(),
    });
    const leadUpdate: any = { _reply_drafted: true };
    // 唔再自動標「待約時間」：對方冇明確要求約，就唔應該當佢待約時間（避免跳步）。
    await db
      .collection('leads')
      .updateOne({ _id: lead._id }, { $set: leadUpdate });
    await sseNotify('email_update', { id: lead.lead_id, action: 'created', status: 'pending' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 定時回覆檢查（inbound 閉環）：直接連 IMAP 讀 inbox → 對返已聯絡 lead
 * → 分類 → 寫返 lead 的 _reply_* 欄。
 * ⚠️ 用返 SMTP 同一組 creds（Gmail App Password 同時支援 SMTP 發 + IMAP 讀）。
 *    未配 SMTP_USER/PASS → graceful 回 0，唔 crash。
 */
async function doReplyCheck(_p: any, db: Db) {
  const leads = await db
    .collection('leads')
    .find({ status: 'contacted', email: { $nin: ['', null] }, _replied: { $ne: true } })
    .limit(100)
    .toArray();
  if (!leads.length) return { checked: 0, note: '冇待查回覆嘅 lead' };

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    return { checked: leads.length, note: 'IMAP 未配（要 SMTP_USER/SMTP_PASS）' };
  }

  const byEmail = new Map(leads.map((l) => [String(l.email).toLowerCase(), l]));
  log(`[ReplyCheck] 待查 leads: ${leads.length}, emails: [${[...byEmail.keys()].join(', ')}]`);
  const client = new ImapFlow({
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: Number(process.env.IMAP_PORT || 993),
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  const matched: Array<{ lead: any; subject: string; text: string }> = [];
  let scanned = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since = new Date(Date.now() - 14 * 864e5); // 近 14 日
      for await (const msg of client.fetch({ since }, { source: true })) {
        scanned++;
        const parsed = await simpleParser(msg.source as Buffer);
        const from = (parsed.from?.value?.[0]?.address || '').toLowerCase();
        const subject = parsed.subject || '';
        log(`[ReplyCheck] #${scanned} from=${from} subject="${subject.slice(0, 80)}"`);
        // 測試(SEND_OVERRIDE)模式：回覆 subject 仲帶住「[TEST→realcompany@x.com]」標記
        // → 由 subject 解返真 lead（因為回覆嘅寄件人係測試地址，對唔返 lead.email）。
        // 正式模式：直接用寄件人地址 = lead.email 對返。
        const tag = subject.match(/\[TEST→([^\]\s]+)\]/i);
        let lead = tag ? byEmail.get(tag[1].toLowerCase()) : undefined;
        if (!lead) lead = byEmail.get(from);
        // Fallback：測試模式下 from === SMTP_USER，用 subject 去 email_queue 反查 lead
        if (!lead && from === (user || '').toLowerCase()) {
          const cleanSubject = subject.replace(/^\s*(re|回覆|回复)\s*[:：]\s*/i, '').trim();
          if (cleanSubject) {
            const eq = await db.collection('email_queue').findOne(
              { subject: cleanSubject, status: 'sent' },
              { projection: { lead_id: 1 } },
            );
            if (eq?.lead_id) {
              // lead_id 可能係 string，用 lead_id 欄位去 leads 搵
              const foundLead = leads.find(
                (l) => l.lead_id === eq.lead_id || String(l._id) === String(eq.lead_id),
              );
              if (foundLead) {
                lead = foundLead;
                log(`[ReplyCheck]   → fallback: 由 email_queue subject 反查到 lead=${foundLead.company_name || foundLead.email}`);
              }
            }
          }
        }
        if (!lead) {
          log(`[ReplyCheck]   → skip: 對唔上任何 lead (tag=${tag?.[1] || 'none'})`);
          continue;
        }
        // 只當「似回覆」先計，避免誤中 newsletter / 無關信：
        // 有測試標記、或 In-Reply-To/References header、或 subject 有 Re:/回覆。
        const refs = parsed.references;
        const isReply =
          !!tag ||
          !!parsed.inReplyTo ||
          (Array.isArray(refs) ? refs.length > 0 : !!refs) ||
          /^\s*(re|回覆|回复)\s*[:：]/i.test(subject);
        if (!isReply) {
          log(`[ReplyCheck]   → skip: lead matched 但唔似回覆`);
          continue;
        }
        log(`[ReplyCheck]   → ✓ matched lead=${lead.company_name || lead.email}`);
        matched.push({ lead, subject, text: parsed.text || '' });
        byEmail.delete(String(lead.email).toLowerCase()); // 一個 lead 只收一次
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (e: any) {
    return { checked: leads.length, replies: 0, note: 'IMAP 讀取失敗：' + (e?.message ?? e) };
  } finally {
    // 確保任何情況都收返個 connection（logout 過 / 未連上都無所謂）
    try {
      await client.close();
    } catch {
      /* ignore */
    }
  }

  // IMAP 已閂，先至逐封叫 Hermes 分析（LLM 慢，唔應該連住 inbox 一路等）。
  let updated = 0;
  let replyDrafts = 0;
  const via: Record<string, number> = {};
  for (const m of matched) {
    const a = await analyzeReply(m.subject, m.text, m.lead);
    via[a.via] = (via[a.via] || 0) + 1;
    await db.collection('leads').updateOne(
      { _id: m.lead._id },
      {
        $set: {
          _replied: true,
          _reply_category: a.category,
          _reply_summary: a.summary,
          _reply_sentiment: a.sentiment,
          _reply_next_step: a.next_step,
          _reply_via: a.via,
          _reply_at: nowIso(),
        },
      },
    );

    // ── Verified Email Pool：自動驗證邏輯 ──
    // 排除 auto_reply，只計人工回覆
    if (a.category !== 'auto_reply' && m.lead.email) {
      try {
        // 計算呢個 email 嘅總回覆次數（包括今次）
        const replyCount = await db.collection('leads').countDocuments({
          email: m.lead.email,
          _replied: true,
          _reply_category: { $ne: 'auto_reply' },
        });

        let shouldVerify = false;
        let method: 'auto_reply_count' | 'ai_check' = 'auto_reply_count';

        if (replyCount >= 2) {
          // ≥2 次人工回覆 → 自動 verify
          shouldVerify = true;
          method = 'auto_reply_count';
        } else if (replyCount === 1) {
          // 第 1 次回覆 → AI 判斷係咪人工寫嘅
          const aiPrompt = `判斷以下 email 回覆係人工寫嘅定係自動回覆（auto-reply / out-of-office / 系統通知）。

主題：${m.subject}
內容：${(m.text || '').slice(0, 2000)}

回一個 JSON：{"is_human": true/false, "reason": "一句解釋"}`;
          try {
            const aiResult = await hermesJson(aiPrompt, { timeout: 120_000 });
            if (aiResult.is_human === true) {
              shouldVerify = true;
              method = 'ai_check';
              log(`  → AI 判斷為人工回覆：${aiResult.reason}`);
            } else {
              log(`  → AI 判斷為自動回覆：${aiResult.reason}`);
            }
          } catch {
            log(`  → AI 判斷失敗，跳過 verify`);
          }
        }

        if (shouldVerify) {
          try {
            await api('/verified-emails', 'POST', {
              email: m.lead.email,
              company_name: m.lead.company_name || '',
              source_lead_id: String(m.lead._id),
            });
            // 用內部 API 改成 autoVerify（帶 method）
            await db.collection('verified_emails').updateOne(
              { email: m.lead.email, company_name: m.lead.company_name || '' },
              {
                $set: {
                  verification_method: method,
                  reply_count: replyCount,
                  source_user_id: m.lead.user_id || '',
                  source_lead_id: String(m.lead._id),
                  domain: (m.lead.email as string).split('@')[1] || '',
                  status: 'active',
                },
                $setOnInsert: {
                  match_count: 0,
                  created_at: new Date(),
                },
              },
              { upsert: true },
            );
            log(`  → ✓ Verified email: ${m.lead.email} (${method}, replies=${replyCount})`);
          } catch (e: any) {
            log(`  → verified email 寫入失敗：${e?.message ?? e}`);
          }
        }
      } catch (e: any) {
        log(`  → verified email check 失敗：${e?.message ?? e}`);
      }
    }

    // meeting 回覆 → 自動建行事曆事件（用回覆中提及的時間，否則預設下星期一 10:00）
    if (a.category === 'meeting') {
      let meetingStart: Date;
      if (a.proposed_time) {
        const parsed = new Date(a.proposed_time);
        meetingStart = isNaN(parsed.getTime()) ? getDefaultMeetingTime() : parsed;
      } else {
        meetingStart = getDefaultMeetingTime();
      }
      const endTime = new Date(meetingStart.getTime() + 60 * 60 * 1000); // 1 小時
      await db.collection('calendar_events').insertOne({
        event_id: randomBytes(8).toString('hex'),
        title: `會議：${m.lead.company_name || m.lead.email}`,
        description: a.summary,
        start: meetingStart,
        end: endTime,
        all_day: false,
        type: 'meeting',
        lead_id: m.lead.lead_id,
        company_name: m.lead.company_name,
        color: '#567ebb',
        created_at: nowIso(),
      });
      // 有明確時間 → 清除待約時間標記
      await db.collection('leads').updateOne(
        { _id: m.lead._id },
        { $set: { _pending_meeting: false } },
      );
      log(`  → 已建立會議事件：${m.lead.company_name} @ ${meetingStart.toISOString()}`);
    }

    // not_interested → 自動派 reoutreach draft（換策略再嘗試，最多 1 次）
    if (a.category === 'not_interested' && !m.lead._reoutreach_done) {
      try {
        await api('/tasks', 'POST', {
          skill_id: 'S3',
          title: `Re-outreach：${m.lead.company_name}`,
          params: { mode: 'reoutreach', lead_object_id: String(m.lead._id) },
        });
        log(`  → 已派 reoutreach task：${m.lead.company_name}`);
      } catch (e: any) {
        log(`  → reoutreach 派 task 失敗：${e?.message ?? e}`);
      }
    }

    // 通知 NestJS SSE（經 API）
    try {
      await api('/sse/notify', 'POST', {
        type: 'lead_update',
        data: {
          id: m.lead._id.toString(),
          action: 'replied',
          status: a.category,
          company_name: m.lead.company_name,
          summary: a.summary,
        },
      });
    } catch { /* SSE 通知失敗唔影響主流程 */ }

    updated++;
    // 自動：一收到回覆即刻叫 Hermes 按內容生成「回應草稿」→ 入 Email Queue（等人 tick 完先發）
    if (await maybeDraftReply(m.lead, a, m.text, db)) replyDrafts++;
  }
  return { checked: leads.length, scanned, replies: updated, reply_drafts: replyDrafts, via };
}

/** S1 搜尋 → 叫 Hermes 開 stealth browser 搵 Google Maps，回真公司 */
async function doSearch(p: any, db: Db) {
  const target = Math.min(Number(p.target_count) || 3, 10);
  const MAX_ROUNDS = 1;
  const ids: string[] = [];
  let totalSkipped = 0;
  const excludeNames: string[] = []; // 避免 hermes 重複返回同樣結果

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const still_need = target - ids.length;
    if (still_need <= 0) break;

    log(`  [search] 第 ${round}/${MAX_ROUNDS} 輪，仲需要 ${still_need} 個新 lead`);

    // ⚠️ curl 式 web search 會俾 captcha 擋（Google/Bing/DDG）→ 一定要用 Hermes 個 stealth
    // browser（Browserbase/Camofox，繞 captcha）。搵唔到就回 []，唔好作、唔好回文字。
    const excludeClause = excludeNames.length > 0
      ? `\nEXCLUDE these businesses (already found): ${excludeNames.join(', ')}\n`
      : '';

    const isOldWebsiteMode = p.mode === 'old_website';

    const prompt = isOldWebsiteMode
      ? `IMPORTANT: Do NOT use your built-in browser. Use Computer Use (CUA) to control the local desktop Chrome browser instead.

TYPING RULE: Never type Chinese characters directly — the input method will mangle them. Instead, navigate to URLs directly in the address bar. For Google searches, go to: https://www.google.com/search?q=${encodeURIComponent(p.keyword + ' ' + p.location + ' inurl:.htm')}

Find up to ${still_need} "${p.keyword}" businesses in ${p.location} with OUTDATED websites.
${excludeClause}
STEPS:
1. Use Computer Use to open Chrome. Navigate directly to this URL in the address bar:
   https://www.google.com/search?q=${encodeURIComponent(p.keyword + ' ' + p.location + ' inurl:.htm')}
   If no good results, navigate to:
   https://www.google.com/search?q=${encodeURIComponent(p.keyword + ' ' + p.location + ' "© 200" OR "© 199"')}
   If still not enough:
   https://www.google.com/search?q=${encodeURIComponent(p.keyword + ' ' + p.location + ' site:.com.hk')}
2. Click on each result and visually check the website. ONLY keep it if it looks built before 2015 — signs: table layout, Flash, clip art, no mobile support, .htm URLs, old copyright. If it has responsive design, modern CSS, WhatsApp widget, or modern CMS — SKIP it.
3. Get: name, website, email (check contact page). Use "" if not found.
4. Stop after checking 10 websites total. If none qualify, return []. An empty result is fine.

Reply with ONLY a JSON array:
[{"name":"Co","website":"https://example.com","email":"a@b.com","reason":"table layout, copyright 2005"}]`
      : `You are a business research assistant. Your job is to find real businesses using your browser.

TASK: Find up to ${still_need} real "${p.keyword}" businesses in ${p.location}.
${excludeClause}
INSTRUCTIONS:
1. Open your browser and go to Google Maps or Google Search. You have a stealth browser that handles captchas automatically — it is safe and expected to use it.
2. Search for "${p.keyword} ${p.location}" and read the results.
3. For each business get: name, website, and EMAIL address. EMAIL is the priority — if it is not shown in the listing, open the business's own website / contact page to find it. Phone and address are NOT needed, skip them.
4. Use "" for any field you cannot find. Only include businesses that actually appeared in your search results.
5. If you find no results, return an empty array: []

RESPONSE FORMAT — reply with ONLY a raw JSON array, no other text:
[{"name":"Example School","website":"https://example.com","email":"info@example.com"}]`;

    let arr: any[];
    const searchT0 = Date.now();
    try {
      arr = await hermesJson(prompt, { array: true, timeout: isOldWebsiteMode ? 600_000 : 300_000 });
    } catch (e: any) {
      const searchElapsed = ((Date.now() - searchT0) / 1000).toFixed(1);
      log(`  [search] 第 ${round} 輪 hermes 失敗 (${searchElapsed}s): ${e?.message ?? e}`);
      break;
    }
    const searchElapsed = ((Date.now() - searchT0) / 1000).toFixed(1);
    log(`  [search] hermes 回應 (${searchElapsed}s)：${arr.length} 筆結果 → ${JSON.stringify(arr).slice(0, 300)}`);

    let newThisRound = 0;
    for (const r of arr.slice(0, still_need)) {
      if (!r?.name) continue;

      // 記住呢個名，下輪排除
      excludeNames.push(r.name);

      // DB 去重：同 website 或同 company_name 已存在就 skip
      const dupFilter: any[] = [{ company_name: r.name }];
      if (r.website) dupFilter.push({ website: r.website });
      const dup = await db.collection('leads').findOne({ $or: dupFilter, _deleted_at: null });
      if (dup) { totalSkipped++; continue; }

      const res = await db.collection('leads').insertOne({
        lead_id: randomBytes(8).toString('hex'),
        company_name: r.name,
        email: r.email || '', // 主力攞 email（outreach 用）
        website: r.website,
        address: r.address || '', // 電話唔再要；address 有就存，冇就留空
        source: isOldWebsiteMode ? 'google_dork' : 'google_maps',
        _via: 'hermes',
        _search_mode: p.mode || 'normal',
        search_query: `${p.keyword} ${p.location}`,
        status: null,
        _status: 'unverified',
        _imported_at: nowIso(),
        user_id: p.user_id || undefined,
      });
      ids.push(res.insertedId.toString());
      await sseNotify('lead_update', { id: res.insertedId.toString(), action: 'created' });

      // ── Verified Email Pool：匹配共用池 ──
      if (r.name) {
        try {
          const verifiedEmails = await db.collection('verified_emails').find({
            company_name: new RegExp(`^${r.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
            status: 'active',
          }).toArray();
          if (verifiedEmails.length > 0) {
            const ve = verifiedEmails[0];
            await db.collection('leads').updateOne(
              { _id: res.insertedId },
              {
                $set: {
                  _verified_email: ve.email,
                  _verified_email_source: 'pool',
                  _verified_email_method: ve.verification_method,
                  _verified_email_reply_count: ve.reply_count,
                },
              },
            );
            // 更新 match_count
            await db.collection('verified_emails').updateOne(
              { _id: ve._id },
              { $inc: { match_count: 1 } },
            );
            log(`  → ✓ Pool match: ${r.name} → ${ve.email} (${ve.verification_method})`);
          }
        } catch { /* pool 查詢失敗唔影響主流程 */ }
      }

      newThisRound++;
    }

    const foundThisRound = newThisRound + totalSkipped; // hermes 返回咗幾多個（唔理重複）
    log(`  [search] 第 ${round} 輪完成：新增 ${newThisRound}，跳過重複 ${totalSkipped}，累計 ${ids.length}/${target}`);

    // hermes 完全搵唔到任何結果 → 冇得再搵了
    if (arr.length === 0) {
      log(`  [search] hermes 搵唔到任何結果，停止搜尋`);
      break;
    }
  }

  if (ids.length > 0) {
    await notify(db, `搜尋完成：搵到 ${ids.length} 個新 lead`, {
      message: `關鍵字「${p.keyword}」在「${p.location}」搵到 ${ids.length} 個新結果，跳過 ${totalSkipped} 個重複`,
      type: 'lead',
      user_id: p.user_id,
    });
    await sseNotify('notification', { title: `搜尋完成：搵到 ${ids.length} 個新 lead`, type: 'lead' });
  }

  return { created_leads: ids.length, lead_object_ids: ids, skipped: totalSkipped };
}

/**
 * 從 URL 抽 domain（e.g. "https://www.example.com/about" → "example.com"）
 */
function extractDomain(url: string): string {
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return host.replace(/^www\./, '');
  } catch { return ''; }
}

/** 爬蟲結果 */
interface ScrapeResult {
  emails: string[];
  phones: string[];
  description: string;   // 公司簡介
  services: string[];     // 服務/產品列表
  pageTexts: string[];    // 各頁面嘅純文字（供 AI 分析用）
  rawHtmlHome: string;    // 首頁 raw HTML（供 tech score 用）
}

/**
 * 從 HTML 移除 script/style/nav 等無用標籤，返回可讀純文字（截斷至 maxLen）
 */
function htmlToText(html: string, maxLen = 3000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/**
 * 從 HTML 抽 meta description
 */
function extractMetaDescription(html: string): string {
  const m = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
    || html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  return m ? m[1].trim() : '';
}

/**
 * 第一層：用 Node fetch 直接爬官網 HTML。
 * 抽 email、phone、公司簡介、服務/產品。
 */
async function scrapeWebsite(url: string): Promise<ScrapeResult> {
  const emails: string[] = [];
  const phones: string[] = [];
  const pageTexts: string[] = [];
  let description = '';
  const services: string[] = [];

  let rawHtmlHome = '';
  const base = url.replace(/\/+$/, '');
  const pagesToTry = [
    { url: base, type: 'home' },
    { url: base + '/about', type: 'about' },
    { url: base + '/about-us', type: 'about' },
    { url: base + '/services', type: 'services' },
    { url: base + '/products', type: 'services' },
    { url: base + '/what-we-do', type: 'services' },
    { url: base + '/contact', type: 'contact' },
    { url: base + '/contact-us', type: 'contact' },
  ];

  // ── 並行抓取所有頁面 ──
  const fetchResults = await Promise.allSettled(
    pagesToTry.map(async (page) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        const res = await fetch(page.url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
          redirect: 'follow',
        });
        clearTimeout(timeout);
        if (!res.ok) return null;
        return { html: await res.text(), type: page.type };
      } catch {
        clearTimeout(timeout);
        return null;
      }
    }),
  );

  for (const r of fetchResults) {
    if (r.status !== 'fulfilled' || !r.value) continue;
    const { html, type } = r.value;
    try {
      if (type === 'home') rawHtmlHome = html;
      const text = htmlToText(html);
      pageTexts.push(`[${type}] ${text}`);

      // ── 抽 email ──
      const mailtoMatches = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi) || [];
      for (const m of mailtoMatches) {
        emails.push(m.replace(/^mailto:/i, '').toLowerCase());
      }
      const emailPattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
      const pageEmails = html.match(emailPattern) || [];
      for (const e of pageEmails) {
        const lower = e.toLowerCase();
        if (!lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.svg') &&
            !lower.endsWith('.gif') && !lower.endsWith('.webp') && !lower.endsWith('.woff') &&
            !lower.includes('example.com') && !lower.includes('sentry.io') &&
            !lower.includes('webpack') && !lower.includes('schema.org')) {
          emails.push(lower);
        }
      }

      // ── 抽電話 ──
      const phonePattern = /(?:\+?\d{1,4}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}/g;
      const pagePhones = html.match(phonePattern) || [];
      for (const ph of pagePhones) {
        const digits = ph.replace(/\D/g, '');
        if (digits.length >= 8 && digits.length <= 15) phones.push(ph.trim());
      }

      // ── 抽公司簡介（首頁 / about 頁嘅 meta description 或首段文字） ──
      if (!description && (type === 'home' || type === 'about')) {
        const meta = extractMetaDescription(html);
        if (meta) {
          description = meta;
        } else if (text.length > 50) {
          description = text.slice(0, 300).trim();
        }
      }

      // ── 抽服務/產品（services / products 頁面嘅列表項） ──
      if (type === 'services') {
        const headings = html.match(/<(?:h[23]|li)[^>]*>([^<]{3,80})<\/(?:h[23]|li)>/gi) || [];
        for (const h of headings.slice(0, 15)) {
          const clean = h.replace(/<[^>]+>/g, '').trim();
          if (clean.length >= 3 && clean.length <= 80) services.push(clean);
        }
      }
    } catch { /* 忽略處理失敗嘅頁面 */ }
  }

  return {
    emails: [...new Set(emails)],
    phones: [...new Set(phones)],
    description,
    services: [...new Set(services)].slice(0, 10),
    pageTexts,
    rawHtmlHome,
  };
}

/**
 * 網站技術評分 — 分析 HTML 判斷網站有幾舊。
 * 回傳 0-100（越高越舊），同一個 details 物件列出偵測到嘅指標。
 */
function scoreTech(html: string): { score: number; details: Record<string, boolean> } {
  if (!html) return { score: 0, details: {} };
  const h = html.slice(0, 200_000); // 限制分析量
  const lower = h.toLowerCase();

  const checks: [string, boolean, number][] = [
    // [指標名, 是否命中, 分數]
    // ── HTML 舊標籤 ──
    ['table_layout',    (lower.match(/<table/g) || []).length >= 3, 15],
    ['font_tag',        /<font[\s>]/i.test(h), 12],
    ['center_tag',      /<center[\s>]/i.test(h), 8],
    ['marquee_tag',     /<marquee[\s>]/i.test(h), 10],
    ['frameset',        /<frameset[\s>]/i.test(h), 15],
    ['iframe_layout',   (lower.match(/<iframe/g) || []).length >= 2, 8],

    // ── DOCTYPE / HTML 版本 ──
    ['no_doctype',      !/<!doctype/i.test(h.slice(0, 500)), 10],
    ['html4_xhtml',     /<!doctype[^>]*(html\s*4|xhtml)/i.test(h.slice(0, 500)), 10],

    // ── 缺少 responsive ──
    ['no_viewport',     !/<meta[^>]*viewport/i.test(h), 15],
    ['fixed_width',     /width\s*:\s*(960|1024|800|1000|1280)px/i.test(h), 8],

    // ── 舊技術 ──
    ['flash_object',    /<(?:object|embed)[^>]*(?:\.swf|flash)/i.test(h), 15],
    ['old_generator',   /<meta[^>]*generator[^>]*(?:frontpage|dreamweaver|wordpress\s*[1-3]\.|joomla\s*1\.|drupal\s*[5-6])/i.test(h), 12],
    ['no_https',        false, 0], // 由外部判斷

    // ── JavaScript ──
    ['old_jquery',      /jquery[.\-]?1\./i.test(h), 6],
    ['document_write',  /document\.write\s*\(/i.test(h), 5],
    ['no_modern_js',    !/react|vue|angular|next|nuxt|svelte|webpack|vite/i.test(h), 3],

    // ── CSS ──
    ['inline_styles',   (lower.match(/style\s*=/g) || []).length >= 15, 5],
    ['no_modern_css',   !/flexbox|flex:|grid-template|@media/i.test(h), 5],

    // ── 圖片格式 ──
    ['gif_nav',         (lower.match(/\.gif["'>\s]/g) || []).length >= 5, 6],
    ['image_map',       /<map[\s>]/i.test(h), 8],

    // ── 其他 ──
    ['visitor_counter', /counter|hit.*count|訪客|visitor.*count/i.test(h), 8],
    ['last_modified',   /<meta[^>]*last-modified[^>]*200[0-9]/i.test(h), 5],
    ['copyright_old',   /©\s*(?:19[89]\d|200[0-9])\b/.test(h) && !/©\s*202[3-9]/.test(h), 8],
  ];

  const details: Record<string, boolean> = {};
  let raw = 0;
  for (const [name, hit, pts] of checks) {
    details[name] = hit;
    if (hit) raw += pts;
  }

  // cap at 100
  const score = Math.min(100, raw);
  return { score, details };
}

/** S2 enrich → 三層策略：爬蟲 → Hermes browser → domain fallback */
async function doEnrich(p: any, db: Db) {
  const _id = new ObjectId(p.lead_object_id);
  const lead = await db.collection('leads').findOne({ _id });
  if (!lead) throw new Error('lead 唔存在');

  let foundEmail = '';
  let foundPhone = '';
  let foundAddress = '';
  let via = '';

  let scraped: ScrapeResult | null = null;

  // ── 第一層：Node fetch 爬蟲（快、靜默） ──
  if (lead.website) {
    log(`enrich 第一層：爬 ${lead.website}`);
    scraped = await scrapeWebsite(
      lead.website.startsWith('http') ? lead.website : `https://${lead.website}`
    );
    if (scraped.emails.length > 0) foundEmail = scraped.emails[0];
    if (scraped.phones.length > 0 && !lead.phone) foundPhone = scraped.phones[0];
    if (foundEmail) via = 'scraper';
    log(`  爬蟲結果: emails=${scraped.emails.length}, phones=${scraped.phones.length}, desc=${scraped.description.length > 0}, services=${scraped.services.length}`);
  }

  // ── 第二層：Hermes stealth browser（如果爬蟲搵唔到 email） ──
  if (!foundEmail) {
    log('enrich 第二層：叫 Hermes browser');
    const target = lead.website
      ? `Use your stealth browser to visit ${lead.website}`
      : `Use your stealth browser to search the web for "${lead.company_name}" and find its site`;
    const prompt = `${target} (company: ${lead.company_name}).
You MUST find the company's contact email. Try these steps in order:
1. Check the page source for mailto: links
2. Visit /contact, /contact-us, /about, /about-us pages
3. Look in the page footer
4. Check for email addresses in any visible text
5. If there's a contact form, look for a displayed email near it
Also find phone and address if visible.
Output ONLY JSON, empty string if not found:
{"email":"","phone":"","address":""}`;
    try {
      const c = await hermesJson(prompt, { timeout: 300_000 });
      if (c.email && !foundEmail) { foundEmail = c.email; via = 'hermes'; }
      if (c.phone && !foundPhone) foundPhone = c.phone;
      if (c.address) foundAddress = c.address;
    } catch (e: any) {
      log('  Hermes enrich 失敗:', e?.message);
    }
  }

  // ── 第三層：Domain fallback（用常見 prefix 推測 email） ──
  if (!foundEmail && lead.website) {
    const domain = extractDomain(lead.website);
    if (domain) {
      // 試常見 email prefix
      const guesses = [`info@${domain}`, `contact@${domain}`, `hello@${domain}`, `enquiry@${domain}`];
      foundEmail = guesses[0]; // 用 info@ 做 fallback
      via = 'domain_guess';
      log(`  第三層 fallback: ${foundEmail}`);
    }
  }

  const set: any = { _website_researched: true, _enrich_via: via };
  if (foundEmail) set.email = foundEmail;
  if (foundPhone) set.phone = foundPhone;
  if (foundAddress && !lead.address) set.address = foundAddress;

  // 寫入爬蟲抽到嘅公司簡介 + 服務（供後續 S2 analyze 用）
  if (scraped) {
    if (scraped.description) set.website_description = scraped.description;
    if (scraped.services.length > 0) set._scraped_services = scraped.services;
    if (scraped.emails.length > 1) set.extra_emails = scraped.emails.slice(1, 5);
    if (scraped.phones.length > 1) set.extra_phones = scraped.phones.slice(1, 5);
    // 儲存頁面文字摘要（截斷至 5000 字）供 AI 分析
    if (scraped.pageTexts.length > 0) {
      set._scraped_text = scraped.pageTexts.join('\n\n').slice(0, 5000);
    }
  }

  // ── 網站技術評分 ──
  if (scraped?.rawHtmlHome) {
    // 額外判斷 HTTPS
    const isHttp = lead.website && /^http:\/\//i.test(lead.website);
    const tech = scoreTech(scraped.rawHtmlHome);
    if (isHttp) { tech.details.no_https = true; tech.score = Math.min(100, tech.score + 10); }
    set._tech_score = tech.score;
    set._tech_details = tech.details;
    const oldFlags: string[] = Object.entries(tech.details)
      .filter(([, v]) => v)
      .map(([k]) => k);
    log(`  技術評分: ${tech.score}/100 — ${oldFlags.join(', ') || '(現代網站)'}`);
  }

  await db.collection('leads').updateOne({ _id }, { $set: set });
  await sseNotify('lead_update', { id: _id.toString(), action: 'updated', status: 'enriched' });
  return {
    enriched: true,
    via,
    found: { email: foundEmail, phone: foundPhone, address: foundAddress },
    scraped_desc: !!scraped?.description,
    scraped_services: scraped?.services.length ?? 0,
    tech_score: set._tech_score ?? null,
  };
}

/** S2 分析 → 有爬蟲資料就直接 LLM 分析，冇就叫 Hermes 開瀏覽器 → 回寫 _collab_* + analyses */
async function doAnalyze(p: any, db: Db) {
  const _id = new ObjectId(p.lead_object_id);
  const lead = await db.collection('leads').findOne({ _id });
  if (!lead) throw new Error('lead 唔存在');

  let out: string;
  let via: string;

  if (lead._scraped_text) {
    // 已有爬蟲資料 → 直接用 LLM 分析，唔使開瀏覽器
    via = 'hermes-llm';
    const desc = lead.website_description || '';
    const svcs = (lead._scraped_services || []).join(', ');
    // 爬蟲內容量做參數：太多資料令 LLM 逾時嘅話，縮短再試
    const buildPrompt = (chars: number) => `You are a B2B research assistant representing ${BRAND_NAME} (${BRAND_TAGLINE}),
a Hong Kong digital agency.
${BRAND_CONTEXT_BLOCK}

Company to research: ${lead.company_name}
Website: ${lead.website || 'N/A'}
Company description: ${desc}
Their services: ${svcs}
Website content (scraped):
${(lead._scraped_text || '').slice(0, chars)}

Based on the above information, propose a SPECIFIC collaboration angle —
i.e. WHICH of ${BRAND_NAME}'s services (STRATEGIZE / DESIGN / CODE / MARKET, or any
of: ${BRAND_SOLUTIONS.join(' / ')}) maps best to this lead's pain points, and why.
${BRAND_TONE_GUIDE}
Output ONLY one JSON object, no other text:
{"primary":"主要合作方向","pitch":"一句 pitch (港式繁中 + EN mix OK)","reason":"理由","services":["服務1","服務2"]}`;
    try {
      out = await callHermes(buildPrompt(4000), 300_000);
    } catch {
      // 「太多資料」逾時 → 大幅縮短爬蟲內容再試一次
      log(`[analyze] ${lead.company_name} 分析逾時，縮短資料後重試`);
      out = await callHermes(buildPrompt(1200), 300_000);
    }
  } else {
    // 冇爬蟲資料 → 用 Hermes 瀏覽器去睇官網
    via = 'hermes-browser';
    const site = lead.website
      ? `Use your browser to visit the company website: ${lead.website}`
      : `Use your browser to search the web for this company and find its website`;
    const prompt = `You are a B2B research assistant representing ${BRAND_NAME} (${BRAND_TAGLINE}),
a Hong Kong digital agency.
${BRAND_CONTEXT_BLOCK}

Company to research: ${lead.company_name}
${site}
Use your stealth browser normally to avoid bot detection. Read what the company does,
then propose a SPECIFIC collaboration angle — i.e. WHICH of ${BRAND_NAME}'s services
(STRATEGIZE / DESIGN / CODE / MARKET, or any of: ${BRAND_SOLUTIONS.join(' / ')})
maps best to this lead's pain points, and why.
${BRAND_TONE_GUIDE}
Output ONLY one JSON object, no other text:
{"primary":"主要合作方向","pitch":"一句 pitch (港式繁中 + EN mix OK)","reason":"理由","services":["服務1","服務2"]}`;
    out = await callHermes(prompt, 360_000); // browser 導航較慢，畀多啲時間
  }

  const c = extractJson(out);

  await db.collection('leads').updateOne(
    { _id },
    {
      $set: {
        _has_analysis: true,
        _collab_primary: c.primary,
        _collab_pitch: c.pitch,
        _collab_reason: c.reason,
        _collab_services: c.services,
        _collab_generated_at: nowIso(),
        _analyzed_at: nowIso(),
      },
    },
  );
  await db.collection('analyses').insertOne({
    lead_id: lead.lead_id,
    analysis_type: 'full',
    ai_summary: c.pitch,
    _via: via,
    _analyzed_at: nowIso(),
  });
  await sseNotify('lead_update', { id: _id.toString(), action: 'updated', status: 'analyzed' });
  return { analyzed: true, via, primary: c.primary };
}

/** S3 草稿 → 叫 Hermes(LLM) 寫 outreach email → email_draft + email_queue */
async function doDraft(p: any, db: Db) {
  const _id = new ObjectId(p.lead_object_id);
  const lead = await db.collection('leads').findOne({ _id });
  if (!lead) throw new Error('lead 唔存在');
  const leadCtx = buildLeadContext(lead);
  const prompt = `Write a short, warm B2B outreach email in professional English OR formal written 繁體中文 書面語 (pick whichever best fits the lead — English-medium / international leads → English is fine; but if you write in Chinese it MUST be 書面語, NOT Cantonese colloquial: 用不/沒有/的/在/這，不用唔/冇/嘅/喺/呢; avoid emoji in the body) from ${BRAND_NAME} (${BRAND_TAGLINE})
— a Hong Kong digital agency — to the company「${lead.company_name}」.

${BRAND_CONTEXT_BLOCK}
${leadCtx}
Collaboration angle: ${lead._collab_primary || ''} — ${lead._collab_pitch || ''}.
${BRAND_TONE_GUIDE}

重要：只可以引用上面提供嘅公司資料。如果資料唔夠，寧願寫得籠統啲，都唔好虛構對方嘅業務細節。

Output ONLY JSON with subject, body, and summary. Body MUST end with this signature block:

${BRAND_SIGNATURE}

{"subject":"","body":"","summary":"一句繁中摘要：呢封 email 嘅重點（20字內）"}`;
  const c = await hermesJson(prompt);
  await db.collection('leads').updateOne(
    { _id },
    { $set: { email_draft: c.body, _has_email_draft: true } },
  );
  // 測試模式：強制寄去自己嘅 email；正式上線改返 lead.email
  const testRecipient = process.env.TEST_RECIPIENT_EMAIL || '';
  await db.collection('email_queue').insertOne({
    email_id: randomBytes(4).toString('hex'),
    lead_id: lead.lead_id,
    user_id: lead.user_id || undefined,
    company_name: lead.company_name,
    to_email: testRecipient || lead.email,
    subject: c.subject,
    body: c.body,
    _summary: c.summary || '',
    status: 'pending',
    _via: 'hermes',
    created_at: nowIso(),
  });
  await notify(db, `新草稿：${lead.company_name}`, {
    message: `主題：${c.subject}`,
    type: 'email',
    ref_id: lead.lead_id,
    user_id: lead.user_id,
  });
  await sseNotify('email_update', { id: lead.lead_id, action: 'created', status: 'pending' });
  await sseNotify('notification', { title: `新草稿：${lead.company_name}`, type: 'email' });
  return { drafted: true, via: 'hermes', subject: c.subject };
}

/** 檢查邊啲 contacted leads 超過 5 日冇回覆，逐個派 followup draft task */
async function doCheckFollowups(_p: any, db: Db) {
  const FOLLOWUP_DAYS = 5;
  const MAX_FOLLOWUPS = 2;
  const cutoff = new Date(Date.now() - FOLLOWUP_DAYS * 864e5).toISOString();

  // 搵 contacted + 未回覆 + followup 次數未夠 + 最後發送/跟進已超過 N 日
  const leads = await db
    .collection('leads')
    .find({
      status: 'contacted',
      _replied: { $ne: true },
      $or: [
        { _followup_count: { $exists: false } },
        { _followup_count: { $lt: MAX_FOLLOWUPS } },
      ],
      // 上次發送或跟進時間要早過 cutoff
      $and: [
        {
          $or: [
            { _last_followup_at: { $exists: false }, _last_sent_at: { $lte: cutoff } },
            { _last_followup_at: { $lte: cutoff } },
            // fallback：兩個都冇就用 updatedAt
            { _last_sent_at: { $exists: false }, _last_followup_at: { $exists: false } },
          ],
        },
      ],
    })
    .limit(20)
    .toArray();

  let dispatched = 0;
  for (const lead of leads) {
    // 額外安全檢查：確保距離上次動作至少 FOLLOWUP_DAYS
    const lastAction = lead._last_followup_at || lead._last_sent_at;
    if (lastAction && new Date(lastAction).getTime() > Date.now() - FOLLOWUP_DAYS * 864e5) {
      continue;
    }
    try {
      await api('/tasks', 'POST', {
        skill_id: 'S3',
        title: `Follow-up #${(lead._followup_count || 0) + 1}：${lead.company_name}`,
        params: { mode: 'followup', lead_object_id: String(lead._id) },
      });
      dispatched++;
      log(`  → 派 followup task：${lead.company_name} (#${(lead._followup_count || 0) + 1})`);
    } catch (e: any) {
      log(`  → followup 派 task 失敗：${lead.company_name} — ${e?.message ?? e}`);
    }
  }
  return { checked: leads.length, dispatched };
}

/** Follow-up draft — 冇回覆超過 N 日，寫一封跟進 email（語氣唔同） */
async function doFollowupDraft(p: any, db: Db) {
  const _id = new ObjectId(p.lead_object_id);
  const lead = await db.collection('leads').findOne({ _id });
  if (!lead) throw new Error('lead 唔存在');
  const count = (lead._followup_count || 0) + 1;
  const leadCtx = buildLeadContext(lead);
  const prompt = `Write a SHORT follow-up email (#${count}) in professional English OR formal written 繁體中文 書面語 (pick whichever best fits the lead — English-medium / international leads → English is fine; but if you write in Chinese it MUST be 書面語, NOT Cantonese colloquial: 用不/沒有/的/在/這，不用唔/冇/嘅/喺/呢; avoid emoji in the body) from ${BRAND_NAME} (${BRAND_TAGLINE})
to「${lead.company_name}」. We previously reached out but got no reply.

${BRAND_CONTEXT_BLOCK}
${leadCtx}
Previous pitch angle: ${lead._collab_primary || ''} — ${lead._collab_pitch || ''}.
${BRAND_TONE_GUIDE}

重要：只可以引用上面提供嘅公司資料，唔好虛構對方嘅業務細節。

This is follow-up #${count}. Keep it SHORTER and more casual than the first email.
${count === 1 ? 'Gently check if they saw the previous email. Offer a quick 15-min call.' : 'Final follow-up — very brief, friendly, no pressure. Mention you won\'t follow up again.'}

Output ONLY JSON with subject, body, and summary. Body MUST end with this signature block:

${BRAND_SIGNATURE}

{"subject":"","body":"","summary":"一句繁中摘要：呢封 email 嘅重點（20字內）"}`;
  const c = await hermesJson(prompt);
  const testRecipient = process.env.TEST_RECIPIENT_EMAIL || '';
  await db.collection('email_queue').insertOne({
    email_id: randomBytes(4).toString('hex'),
    lead_id: lead.lead_id,
    user_id: lead.user_id || undefined,
    company_name: lead.company_name,
    to_email: testRecipient || lead.email,
    subject: c.subject,
    body: c.body,
    _summary: c.summary || '',
    status: 'pending',
    _via: 'hermes',
    _type: 'followup',
    _followup_number: count,
    created_at: nowIso(),
  });
  await db.collection('leads').updateOne(
    { _id },
    { $set: { _followup_count: count, _last_followup_at: nowIso() } },
  );
  await sseNotify('email_update', { id: lead.lead_id, action: 'created', status: 'pending' });
  await sseNotify('notification', { title: `Follow-up #${count}：${lead.company_name}`, type: 'email' });
  log(`  → followup #${count} drafted for ${lead.company_name}`);
  return { drafted: true, type: 'followup', count, subject: c.subject };
}

/** Re-outreach draft — 對方回覆冇興趣，換角度再寫一封 */
async function doReoutreachDraft(p: any, db: Db) {
  const _id = new ObjectId(p.lead_object_id);
  const lead = await db.collection('leads').findOne({ _id });
  if (!lead) throw new Error('lead 唔存在');
  const leadCtx = buildLeadContext(lead);
  const prompt = `Write a B2B outreach email in professional English OR formal written 繁體中文 書面語 (pick whichever best fits the lead — English-medium / international leads → English is fine; but if you write in Chinese it MUST be 書面語, NOT Cantonese colloquial: 用不/沒有/的/在/這，不用唔/冇/嘅/喺/呢; avoid emoji in the body) from ${BRAND_NAME} (${BRAND_TAGLINE})
to「${lead.company_name}」. They previously replied saying they're NOT interested.

${BRAND_CONTEXT_BLOCK}
${leadCtx}
Previous angle was: ${lead._collab_primary || ''} — ${lead._collab_pitch || ''}
Their reply summary: ${lead._reply_summary || 'declined / not interested'}

Now try a COMPLETELY DIFFERENT angle and value proposition.
Focus on a different service area or pain point they might have.
Be respectful of their previous decline — acknowledge it briefly.
${BRAND_TONE_GUIDE}

重要：只可以引用上面提供嘅公司資料，唔好虛構對方嘅業務細節。

Output ONLY JSON with subject, body, and summary. Body MUST end with this signature block:

${BRAND_SIGNATURE}

{"subject":"","body":"","summary":"一句繁中摘要：呢封 email 嘅重點（20字內）"}`;
  const c = await hermesJson(prompt);
  const testRecipient = process.env.TEST_RECIPIENT_EMAIL || '';
  await db.collection('email_queue').insertOne({
    email_id: randomBytes(4).toString('hex'),
    lead_id: lead.lead_id,
    user_id: lead.user_id || undefined,
    company_name: lead.company_name,
    to_email: testRecipient || lead.email,
    subject: c.subject,
    body: c.body,
    _summary: c.summary || '',
    status: 'pending',
    _via: 'hermes',
    _type: 'reoutreach',
    created_at: nowIso(),
  });
  await db.collection('leads').updateOne(
    { _id },
    { $set: { _reoutreach_done: true, _reoutreach_at: nowIso() } },
  );
  await sseNotify('email_update', { id: lead.lead_id, action: 'created', status: 'pending' });
  await sseNotify('notification', { title: `Re-outreach：${lead.company_name}`, type: 'email' });
  log(`  → reoutreach drafted for ${lead.company_name}`);
  return { drafted: true, type: 'reoutreach', subject: c.subject };
}

/**
 * S4 發送 —— ⚠️ 預設【唔真發 email】（發冷 email 俾真公司係不可逆）。
 * 預設只標 email_queue = approved（等人手 / 開關確認）。
 * set ENABLE_REAL_SEND=true 先會叫 Hermes 真發 + 標 contacted。
 */
async function doSend(p: any, db: Db) {
  const _id = new ObjectId(p.lead_object_id);
  const lead = await db.collection('leads').findOne({ _id });
  if (!lead) throw new Error('lead 唔存在');
  const eq = await db
    .collection('email_queue')
    .findOne(
      { lead_id: lead.lead_id, status: 'pending' },
      { sort: { created_at: -1 } }, // 有多封草稿時攞最新嗰封
    );
  if (!eq) return { sent: false, note: '冇待發 email' };

  // 未開真發 → 保持 pending，等人手 approve；但標 _email_sent 防 gap-filler 重複派
  if (process.env.ENABLE_REAL_SEND !== 'true') {
    await db.collection('leads').updateOne({ _id }, { $set: { _email_sent: true } });
    return { sent: false, note: 'real send 停用（ENABLE_REAL_SEND=true 先發），email 保持 pending 等人手審批' };
  }

  // 真發：經 SMTP（nodemailer），一律寄去 TEST_RECIPIENT
  if (!process.env.SMTP_HOST) {
    return { sent: false, note: 'SMTP 未配（.env 填 SMTP_HOST/USER/PASS）' };
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  // 收件人：SEND_OVERRIDE 有設（測試安全）→ 一律寄去嗰度；冇設 → lead.email（真發）。
  // creds（SMTP_USER/PASS）同收件人全部由跑 worker 嗰位喺 .env 設，唔 hardcode 落 code。
  const override = process.env.SEND_OVERRIDE || process.env.TEST_RECIPIENT_EMAIL;
  const to = override || lead.email;
  if (!to) return { sent: false, note: '冇收件人（lead 冇 email，又冇 SEND_OVERRIDE）' };
  // frontend 係用 pre-wrap + dangerouslySetInnerHTML render body（tag 當 HTML、換行照留）。
  // 寄件要對齊：html 用同一個 pre-wrap 包住原 body（render 結果同 frontend 一模一樣），
  // text 出一份 strip tag 但保留換行嘅純文字做 fallback（唔用 htmlToText，佢會併走換行）。
  const bodyRaw = eq.body ?? '';
  const bodyText = bodyRaw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const bodyHtml = `<div style="white-space:pre-wrap;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;font-size:14px;color:#1a1a1a">${bodyRaw}</div>`;
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: override
        ? `[TEST→${lead.email || '?'}] ${eq.subject ?? ''}` // 測試模式標明原收件人
        : eq.subject ?? '',
      text: bodyText,
      html: bodyHtml,
    });
  } catch (e: any) {
    // check 成功先標 sent（修「假 sent」bug）
    await db
      .collection('email_queue')
      .updateOne(
        { _id: eq._id },
        { $set: { status: 'failed', error: { send_error: e?.message ?? String(e) } } },
      );
    return { sent: false, error: e?.message ?? String(e) };
  }
  await db
    .collection('email_queue')
    .updateOne({ _id: eq._id }, { $set: { status: 'sent', sent_at: nowIso() } });
  await db
    .collection('leads')
    .updateOne({ _id }, { $set: { status: 'contacted', _email_sent: true, _last_sent_at: nowIso() } });
  await notify(db, `郵件已發送：${lead.company_name}`, {
    message: `已發送至 ${to}`,
    type: 'email',
    ref_id: lead.lead_id,
    user_id: lead.user_id,
  });
  await sseNotify('email_update', { id: eq._id.toString(), action: 'status_changed', status: 'sent' });
  await sseNotify('lead_update', { id: _id.toString(), action: 'status_changed', status: 'contacted' });
  await sseNotify('notification', { title: `郵件已發送：${lead.company_name}`, type: 'email' });
  return { sent: true, to };
}

// ───────── main loop ─────────
/** 登入重試（B API 一時連唔到都唔好死，backoff 重試）*/
async function loginWithRetry(): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      await login();
      return;
    } catch (e: any) {
      const wait = Math.min(30_000, 2_000 * attempt);
      log(`登入失敗（第 ${attempt} 次）：${e?.message ?? e} —— ${wait / 1000}s 後重試`);
      await sleep(wait);
    }
  }
}

async function handleTask(task: any, db: any): Promise<void> {
  const p = task.params || {};
  log(`══ 收到任務 ══`);
  log(`  task_id:  ${task.task_id}`);
  log(`  skill:    ${task.skill_id}`);
  log(`  title:    ${task.title ?? '—'}`);
  log(`  user_id:  ${p.user_id ?? '—'}`);
  log(`  lead_id:  ${p.lead_object_id ?? '—'}`);
  log(`  mode:     ${p.mode ?? p.pipeline_stage ?? '—'}`);
  log(`  params:   ${JSON.stringify(p)}`);
  try {
    const result = await handle(task, db);
    await complete(task.task_id, result);
    await sseNotify('task_update', { id: task.task_id, action: 'completed' });
    log(`✓ 完成 ${task.task_id}`, JSON.stringify(result));
  } catch (e: any) {
    log(`✗ ${task.task_id} 失敗:`, e?.message ?? e);
    try {
      await failTask(task.task_id, e?.message ?? String(e));
      await notify(db, `任務失敗：${task.title || task.task_id}`, {
        message: e?.message ?? String(e),
        type: 'task',
        ref_id: task.task_id,
        user_id: task.params?.user_id,
      });
      await sseNotify('task_update', { id: task.task_id, action: 'failed' });
      await sseNotify('notification', { title: `任務失敗：${task.title || task.task_id}`, type: 'task' });
    } catch (e2: any) {
      log(`⚠ failTask 都失敗咗 (${task.task_id}) — task 留喺 running，等 reap-stalled-tasks cron requeue:`, e2?.message ?? e2);
    }
  }
}

async function main() {
  log(`啟動 → API=${API} skill=${SKILL || 'any'} exclude=${SKILL_EXCLUDE || 'none'} concurrency=${CONCURRENCY}`);
  await loginWithRetry();
  const client = new MongoClient(MONGO);
  await client.connect();
  const db = client.db();

  let idle = 0;
  let running = true;
  let inFlight = 0; // 正在處理嘅 task 數量
  process.on('SIGINT', () => {
    log('收到 SIGINT，停緊…');
    running = false;
  });

  while (running) {
    // 已滿載，等一個 slot 空出
    if (inFlight >= CONCURRENCY) {
      await sleep(POLL_MS);
      continue;
    }

    let task: any = null;
    try {
      task = await claim();
    } catch (e: any) {
      log('claim error:', e?.message ?? e);
      await sleep(POLL_MS);
      continue;
    }
    if (!task) {
      idle++;
      if (MAX_IDLE && idle >= MAX_IDLE && inFlight === 0) {
        log(`連續 ${idle} 次冇 task，停止`);
        break;
      }
      await sleep(POLL_MS);
      continue;
    }
    idle = 0;
    inFlight++;
    // 唔 await — fire and forget，令 loop 可以立即 claim 下一個
    handleTask(task, db).finally(() => { inFlight--; });
  }

  // 等所有進行中嘅 task 完成
  while (inFlight > 0) {
    log(`等待 ${inFlight} 個進行中嘅 task 完成…`);
    await sleep(1000);
  }

  await client.close();
  log('已停止');
}
// sleep 已搬到頂部

// 安全網：唔好俾未捕捉嘅錯誤即刻殺 process（log 完繼續）
process.on('unhandledRejection', (e) =>
  console.error('[unhandledRejection]', e),
);
process.on('uncaughtException', (e) => console.error('[uncaughtException]', e));

main().catch((e) => {
  console.error('main crashed:', e);
  process.exit(1); // 交俾 pm2（已設 restart-delay）重啟
});
