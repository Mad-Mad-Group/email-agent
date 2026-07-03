"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
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
const mongodb_1 = require("mongodb");
const crypto_1 = require("crypto");
const child_process_1 = require("child_process");
const nodemailer = __importStar(require("nodemailer"));
const imapflow_1 = require("imapflow");
const mailparser_1 = require("mailparser");
const brand_1 = require("./brand");
/**
 * 叫 Hermes agent 做嘢（佢有 MiniMax + stealth browser + skills）。
 * --yolo = 非互動自動批准工具（開 browser 唔卡）。
 */
function callHermes(prompt, timeoutMs = 240000) {
    return (0, child_process_1.execFileSync)('hermes', ['-z', prompt, '--yolo'], {
        encoding: 'utf8',
        timeout: timeoutMs,
        maxBuffer: 16 * 1024 * 1024,
    });
}
/** 由 Hermes output 抽第一個 JSON object */
function extractJson(s) {
    const m = s.match(/\{[\s\S]*\}/);
    if (!m)
        throw new Error('Hermes 冇回 JSON: ' + s.slice(0, 200));
    return JSON.parse(m[0]);
}
/** 由 Hermes output 抽 JSON array（支援截斷修復） */
function extractJsonArray(s) {
    // 先試完整 match
    const m = s.match(/\[[\s\S]*\]/);
    if (m) {
        try {
            return JSON.parse(m[0]);
        }
        catch { /* 落去修復 */ }
    }
    // 搵開頭 [ 但冇結尾 ]（截斷）→ 修復
    const start = s.indexOf('[');
    if (start === -1)
        throw new Error('Hermes 冇回 JSON array: ' + s.slice(0, 300));
    let raw = s.slice(start);
    // 移除最後一個不完整嘅 object（搵最後一個 },）
    const lastComplete = raw.lastIndexOf('},');
    if (lastComplete > 0) {
        raw = raw.slice(0, lastComplete + 1) + ']';
    }
    else {
        const lastObj = raw.lastIndexOf('}');
        if (lastObj > 0)
            raw = raw.slice(0, lastObj + 1) + ']';
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        throw new Error('Hermes JSON 截斷修復失敗: ' + s.slice(0, 300));
    }
}
/**
 * 叫 Hermes 並攞 JSON。parse 唔到（佢「講」而唔係回 JSON）就再叫一次強硬版。
 */
function hermesJson(prompt, opts = {}) {
    const pick = (s) => opts.array ? extractJsonArray(s) : extractJson(s);
    try {
        return pick(callHermes(prompt, opts.timeout));
    }
    catch {
        const strict = prompt +
            `\n\nIMPORTANT: Your ENTIRE reply must be ONLY the raw JSON` +
            (opts.array ? ' array (start with [ end with ])' : ' object (start with { end with })') +
            `. No explanation, no markdown, no words before or after.`;
        return pick(callHermes(strict, opts.timeout));
    }
}
const API = process.env.API_URL || 'http://localhost:4000/api';
const MONGO = process.env.MONGODB_URI ||
    'mongodb://leadteam:leadteam2026@localhost:27017/lead_scraper';
const EMAIL = process.env.AGENT_EMAIL || 'admin@test.com';
const PASS = process.env.AGENT_PASS || '123456';
const AGENT_ID = process.env.AGENT_ID || 'WORKER-1';
const SKILL = process.env.AGENT_SKILL || ''; // 空 = 任何 skill
const POLL_MS = Number(process.env.POLL_MS || 2000);
const MAX_IDLE = Number(process.env.WORKER_MAX_IDLE || 0); // 0 = 永遠
let token = '';
const log = (...a) => console.log(`[agent ${AGENT_ID}]`, ...a);
const nowIso = () => new Date().toISOString();
/**
 * 將 lead 嘅真實公司資料組成一段 context，畀 LLM 參考。
 * 避免 AI 冇資料亂作公司背景。
 */
function buildLeadContext(lead) {
    const parts = [];
    if (lead.company_name)
        parts.push(`公司名稱：${lead.company_name}`);
    if (lead.industry_tags?.length)
        parts.push(`行業：${lead.industry_tags.join('、')}`);
    if (lead.website)
        parts.push(`官網：${lead.website}`);
    if (lead.website_description)
        parts.push(`公司簡介：${lead.website_description}`);
    if (lead._scraped_services?.length)
        parts.push(`對方服務/產品：${lead._scraped_services.join('、')}`);
    if (lead._scraped_text) {
        const excerpt = lead._scraped_text.slice(0, 2000);
        parts.push(`官網內容節錄：\n${excerpt}`);
    }
    if (lead.address)
        parts.push(`地址：${lead.address}`);
    return parts.length
        ? `\n【對方公司資料 — 只可引用以下事實，唔好自行虛構】\n${parts.join('\n')}\n`
        : '';
}
async function login() {
    const r = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASS }),
    });
    const j = await r.json();
    token = j?.data?.access_token;
    if (!token)
        throw new Error('登入失敗');
    log('已登入');
}
async function api(path, method = 'GET', body) {
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
const claim = () => api('/tasks/claim', 'POST', {
    agent_id: AGENT_ID,
    ...(SKILL ? { skill_id: SKILL } : {}),
}).then((j) => j?.data ?? null);
const complete = (id, result) => api(`/tasks/${id}/complete`, 'POST', { result });
const failTask = (id, error) => api(`/tasks/${id}/fail`, 'POST', { error });
// ───────── handlers（demo 引擎，逐個換真）─────────
async function handle(task, db) {
    const p = task.params || {};
    const skill = task.skill_id;
    if (p.mode === 'reply_check')
        return doReplyCheck(p, db);
    if (p.mode === 'followup')
        return doFollowupDraft(p, db);
    if (p.mode === 'reoutreach')
        return doReoutreachDraft(p, db);
    if (p.mode === 'check_followups')
        return doCheckFollowups(p, db);
    if (skill === 'S1')
        return doSearch(p, db);
    if (skill === 'S2' && (p.mode === 'enrich' || p.pipeline_stage === 'enrich'))
        return doEnrich(p, db);
    if (skill === 'S2')
        return doAnalyze(p, db);
    if (skill === 'S3')
        return doDraft(p, db);
    if (skill === 'S4')
        return doSend(p, db);
    return { note: `no handler for ${skill}` };
}
/** 簡單分類回覆（keyword heuristic，參考舊 reply_analyzer；快、唔使 LLM）*/
function classifyReply(subject, body) {
    const t = `${subject} ${body}`.toLowerCase();
    if (/(out of office|auto-?reply|automatic reply|放假|自動回覆|不在)/.test(t))
        return 'auto_reply';
    if (/(not interested|no thank|unsubscribe|remove me|唔需要|唔感興趣|冇興趣|拒絕)/.test(t))
        return 'not_interested';
    if (/(meeting|zoom|call|schedule|available|開會|會議|時間|傾下|約|見面)/.test(t))
        return 'meeting';
    if (/(interested|tell me more|sounds good|有興趣|想了解|報價|quote|詳情)/.test(t))
        return 'interested';
    return 'question';
}
/**
 * 用 Hermes(LLM) 分析一封回覆：分類 + 真摘要 + 語氣 + 下一步建議。
 * Hermes 掛咗 / parse 唔到 → fallback keyword（classifyReply），確保唔會漏。
 */
function analyzeReply(subject, body, lead) {
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
  "next_step": "一句：建議我哋下一步（例如 約時間 / 報價 / 跟進 / 放棄）"
}
category 定義：interested=有興趣想了解；meeting=想開會/約時間；not_interested=明確拒絕或退訂；auto_reply=自動回覆/放假；question=其他或有疑問。內容唔清楚就填 "question"。`;
    try {
        const c = hermesJson(prompt, { timeout: 120000 });
        return {
            category: allowed.includes(c.category) ? c.category : classifyReply(subject, body),
            summary: String(c.summary || subject).slice(0, 300),
            sentiment: ['positive', 'neutral', 'negative'].includes(c.sentiment)
                ? c.sentiment
                : 'neutral',
            next_step: String(c.next_step || '').slice(0, 200),
            via: 'hermes',
        };
    }
    catch {
        // Hermes 唔得 → keyword fallback，唔會漏咗封回覆
        return {
            category: classifyReply(subject, body),
            summary: subject.slice(0, 120),
            sentiment: 'neutral',
            next_step: '',
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
async function maybeDraftReply(lead, analysis, replyText, db) {
    if (!REPLY_DRAFT_CATS.includes(analysis.category))
        return false;
    // 攞返原本封 outreach 個 subject 做 "Re:"，令回覆睇落同一 thread
    const orig = await db
        .collection('email_queue')
        .find({ lead_id: lead.lead_id })
        .sort({ created_at: -1 })
        .limit(1)
        .toArray();
    const origSubject = orig[0]?.subject || '';
    // 按回覆分類用唔同寫法指引
    let categoryGuide = '';
    if (analysis.category === 'meeting') {
        categoryGuide = `寫法：確認 / 敲定會議時間，簡述議程，可提線上連結或到訪安排。`;
    }
    else if (analysis.category === 'interested') {
        categoryGuide = `寫法：對方而家係「有興趣、想了解多啲」呢個階段，重點係解答同提供資訊，唔好跳步逼約時間。
先多謝對方嘅興趣、簡短回應佢感興趣嘅點，然後主動補充 1-2 個最相關嘅重點或案例，並邀請對方講多啲需求或想了解邊方面。
⚠️ 唔好喺呢階段主動提議具體會議時段或要求對方畀時間。如要行動呼籲，最多輕輕講「如想深入了解，我哋可以安排一個簡短通話，或者先 send 份資料俾你」，唔好指定時間、唔好施壓。`;
    }
    else if (analysis.category === 'question') {
        categoryGuide = `寫法：直接、誠實答返對方嘅問題（見下方原文）。唔確定就照講唔確定，唔好亂作。答完之後自然地提議約個 call 傾多啲。

對方原文（節錄）：
${(replyText || '').slice(0, 2000)}`;
    }
    const leadCtx = buildLeadContext(lead);
    const prompt = `你係 ${brand_1.BRAND_NAME} 嘅業務。潛在客戶「${lead.company_name || lead.email}」啱啱回覆咗我哋嘅 outreach email。
請寫一封得體、簡短的跟進回覆。語言用正式英文或繁體中文書面語皆可，按對方情況揀（英文中學／國際機構用英文亦可）；但若用中文則必須書面語，不可粵語口語（用不/沒有/的/在/這，不用唔/冇/嘅/喺/呢）；正文避免 emoji。只根據下面資料，不要作事實、不要過度承諾。

${brand_1.BRAND_CONTEXT_BLOCK}
${leadCtx}
對方回覆分類：${analysis.category}
對方回覆摘要：${analysis.summary}
建議下一步（只作參考，唔好硬跟）：${analysis.next_step}

⚠️ 最重要原則 —— 配合對方所處階段，唔好跳步：對方去到邊一步，你就配合嗰一步；唔好因為「建議下一步」寫咗約時間，就喺對方仲未想見面時要求佢畀時間。

${categoryGuide}

結尾用返簽名：
${brand_1.BRAND_SIGNATURE}

只回一個 JSON object（ENTIRE reply 只可以係佢）：{"subject":"","body":""}`;
    try {
        const c = hermesJson(prompt, { timeout: 120000 });
        if (!c.body)
            return false;
        const subject = c.subject ||
            (origSubject
                ? /^re:/i.test(origSubject)
                    ? origSubject
                    : `Re: ${origSubject}`
                : '跟進');
        await db.collection('email_queue').insertOne({
            email_id: (0, crypto_1.randomBytes)(4).toString('hex'),
            lead_id: lead.lead_id,
            company_name: lead.company_name,
            to_email: lead.email,
            subject,
            body: c.body,
            status: 'pending',
            _via: 'hermes',
            _type: 'reply',
            _reply_category: analysis.category,
            created_at: nowIso(),
        });
        const leadUpdate = { _reply_drafted: true };
        // interested 但冇明確時間 → 標記待約時間
        if (analysis.category === 'interested') {
            leadUpdate._pending_meeting = true;
        }
        await db
            .collection('leads')
            .updateOne({ _id: lead._id }, { $set: leadUpdate });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * 定時回覆檢查（inbound 閉環）：直接連 IMAP 讀 inbox → 對返已聯絡 lead
 * → 分類 → 寫返 lead 的 _reply_* 欄。
 * ⚠️ 用返 SMTP 同一組 creds（Gmail App Password 同時支援 SMTP 發 + IMAP 讀）。
 *    未配 SMTP_USER/PASS → graceful 回 0，唔 crash。
 */
async function doReplyCheck(_p, db) {
    const leads = await db
        .collection('leads')
        .find({ status: 'contacted', email: { $nin: ['', null] }, _replied: { $ne: true } })
        .limit(100)
        .toArray();
    if (!leads.length)
        return { checked: 0, note: '冇待查回覆嘅 lead' };
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) {
        return { checked: leads.length, note: 'IMAP 未配（要 SMTP_USER/SMTP_PASS）' };
    }
    const byEmail = new Map(leads.map((l) => [String(l.email).toLowerCase(), l]));
    log(`[ReplyCheck] 待查 leads: ${leads.length}, emails: [${[...byEmail.keys()].join(', ')}]`);
    const client = new imapflow_1.ImapFlow({
        host: process.env.IMAP_HOST || 'imap.gmail.com',
        port: Number(process.env.IMAP_PORT || 993),
        secure: true,
        auth: { user, pass },
        logger: false,
    });
    const matched = [];
    let scanned = 0;
    try {
        await client.connect();
        const lock = await client.getMailboxLock('INBOX');
        try {
            const since = new Date(Date.now() - 14 * 864e5); // 近 14 日
            for await (const msg of client.fetch({ since }, { source: true })) {
                scanned++;
                const parsed = await (0, mailparser_1.simpleParser)(msg.source);
                const from = (parsed.from?.value?.[0]?.address || '').toLowerCase();
                const subject = parsed.subject || '';
                log(`[ReplyCheck] #${scanned} from=${from} subject="${subject.slice(0, 80)}"`);
                // 測試(SEND_OVERRIDE)模式：回覆 subject 仲帶住「[TEST→realcompany@x.com]」標記
                // → 由 subject 解返真 lead（因為回覆嘅寄件人係測試地址，對唔返 lead.email）。
                // 正式模式：直接用寄件人地址 = lead.email 對返。
                const tag = subject.match(/\[TEST→([^\]\s]+)\]/i);
                let lead = tag ? byEmail.get(tag[1].toLowerCase()) : undefined;
                if (!lead)
                    lead = byEmail.get(from);
                // Fallback：測試模式下 from === SMTP_USER，用 subject 去 email_queue 反查 lead
                if (!lead && from === (user || '').toLowerCase()) {
                    const cleanSubject = subject.replace(/^\s*(re|回覆|回复)\s*[:：]\s*/i, '').trim();
                    if (cleanSubject) {
                        const eq = await db.collection('email_queue').findOne({ subject: cleanSubject, status: 'sent' }, { projection: { lead_id: 1 } });
                        if (eq?.lead_id) {
                            // lead_id 可能係 string，用 lead_id 欄位去 leads 搵
                            const foundLead = leads.find((l) => l.lead_id === eq.lead_id || String(l._id) === String(eq.lead_id));
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
                const isReply = !!tag ||
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
        }
        finally {
            lock.release();
        }
        await client.logout();
    }
    catch (e) {
        return { checked: leads.length, replies: 0, note: 'IMAP 讀取失敗：' + (e?.message ?? e) };
    }
    finally {
        // 確保任何情況都收返個 connection（logout 過 / 未連上都無所謂）
        try {
            await client.close();
        }
        catch {
            /* ignore */
        }
    }
    // IMAP 已閂，先至逐封叫 Hermes 分析（LLM 慢，唔應該連住 inbox 一路等）。
    let updated = 0;
    let replyDrafts = 0;
    const via = {};
    for (const m of matched) {
        const a = analyzeReply(m.subject, m.text, m.lead);
        via[a.via] = (via[a.via] || 0) + 1;
        await db.collection('leads').updateOne({ _id: m.lead._id }, {
            $set: {
                _replied: true,
                _reply_category: a.category,
                _reply_summary: a.summary,
                _reply_sentiment: a.sentiment,
                _reply_next_step: a.next_step,
                _reply_via: a.via,
                _reply_at: nowIso(),
            },
        });
        // meeting 回覆 → 自動建行事曆事件（預設下星期一 10:00）
        if (a.category === 'meeting') {
            const nextMon = new Date();
            nextMon.setDate(nextMon.getDate() + ((8 - nextMon.getDay()) % 7 || 7));
            nextMon.setHours(10, 0, 0, 0);
            const endTime = new Date(nextMon.getTime() + 60 * 60 * 1000); // 1 小時
            await db.collection('calendar_events').insertOne({
                event_id: (0, crypto_1.randomBytes)(8).toString('hex'),
                title: `會議：${m.lead.company_name || m.lead.email}`,
                description: a.summary,
                start: nextMon,
                end: endTime,
                all_day: false,
                type: 'meeting',
                lead_id: m.lead.lead_id,
                company_name: m.lead.company_name,
                color: '#567ebb',
                created_at: nowIso(),
            });
            // 有明確時間 → 清除待約時間標記
            await db.collection('leads').updateOne({ _id: m.lead._id }, { $set: { _pending_meeting: false } });
            log(`  → 已建立會議事件：${m.lead.company_name}`);
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
            }
            catch (e) {
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
        }
        catch { /* SSE 通知失敗唔影響主流程 */ }
        updated++;
        // 自動：一收到回覆即刻叫 Hermes 按內容生成「回應草稿」→ 入 Email Queue（等人 tick 完先發）
        if (await maybeDraftReply(m.lead, a, m.text, db))
            replyDrafts++;
    }
    return { checked: leads.length, scanned, replies: updated, reply_drafts: replyDrafts, via };
}
/** S1 搜尋 → 叫 Hermes 開 stealth browser 搵 Google Maps，回真公司 */
async function doSearch(p, db) {
    const n = Math.min(Number(p.target_count) || 3, 10);
    // ⚠️ curl 式 web search 會俾 captcha 擋（Google/Bing/DDG）→ 一定要用 Hermes 個 stealth
    // browser（Browserbase/Camofox，繞 captcha）。搵唔到就回 []，唔好作、唔好回文字。
    const prompt = `Find up to ${n} real "${p.keyword}" businesses in ${p.location}.

HOW TO SEARCH (important):
- You have a STEALTH browser that bypasses captchas — USE IT (open Google/Bing/Maps search results or a business directory and read the listings).
- Do NOT rely on plain curl/HTTP requests to search engines; they get captcha-blocked from this environment and WILL fail.
- Keep it quick: read search-result listings rather than heavily driving map UIs.

For each business: name, address, phone, website. Use "" for unknown fields.
Do NOT fabricate or guess — only real, verifiable businesses you actually found.
If after genuinely searching you find none, reply with an empty array: []

Reply with ONLY a raw JSON array — start with [ end with ]. No commentary.
[{"name":"","address":"","phone":"","website":""}]`;
    const arr = hermesJson(prompt, { array: true, timeout: 420000 });
    const ids = [];
    for (const r of arr.slice(0, n)) {
        if (!r?.name)
            continue;
        const res = await db.collection('leads').insertOne({
            lead_id: (0, crypto_1.randomBytes)(8).toString('hex'),
            company_name: r.name,
            address: r.address,
            phone: r.phone,
            website: r.website,
            source: 'google_maps',
            _via: 'hermes',
            search_query: `${p.keyword} ${p.location}`,
            status: null,
            _status: 'unverified',
            _imported_at: nowIso(),
        });
        ids.push(res.insertedId.toString());
    }
    return { created_leads: ids.length, lead_object_ids: ids };
}
/**
 * 從 URL 抽 domain（e.g. "https://www.example.com/about" → "example.com"）
 */
function extractDomain(url) {
    try {
        const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        return host.replace(/^www\./, '');
    }
    catch {
        return '';
    }
}
/**
 * 從 HTML 移除 script/style/nav 等無用標籤，返回可讀純文字（截斷至 maxLen）
 */
function htmlToText(html, maxLen = 3000) {
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
function extractMetaDescription(html) {
    const m = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
        || html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    return m ? m[1].trim() : '';
}
/**
 * 第一層：用 Node fetch 直接爬官網 HTML。
 * 抽 email、phone、公司簡介、服務/產品。
 */
async function scrapeWebsite(url) {
    const emails = [];
    const phones = [];
    const pageTexts = [];
    let description = '';
    const services = [];
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
    for (const page of pagesToTry) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(page.url, {
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
                redirect: 'follow',
            });
            clearTimeout(timeout);
            if (!res.ok)
                continue;
            const html = await res.text();
            const text = htmlToText(html);
            pageTexts.push(`[${page.type}] ${text}`);
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
                if (digits.length >= 8 && digits.length <= 15)
                    phones.push(ph.trim());
            }
            // ── 抽公司簡介（首頁 / about 頁嘅 meta description 或首段文字） ──
            if (!description && (page.type === 'home' || page.type === 'about')) {
                const meta = extractMetaDescription(html);
                if (meta) {
                    description = meta;
                }
                else if (text.length > 50) {
                    // 用首 300 字做簡介
                    description = text.slice(0, 300).trim();
                }
            }
            // ── 抽服務/產品（services / products 頁面嘅列表項） ──
            if (page.type === 'services') {
                // 嘗試抽 <li> 內容或 <h2>/<h3> 標題作為服務名
                const headings = html.match(/<(?:h[23]|li)[^>]*>([^<]{3,80})<\/(?:h[23]|li)>/gi) || [];
                for (const h of headings.slice(0, 15)) {
                    const clean = h.replace(/<[^>]+>/g, '').trim();
                    if (clean.length >= 3 && clean.length <= 80)
                        services.push(clean);
                }
            }
        }
        catch { /* 忽略 fetch 失敗嘅頁面 */ }
    }
    return {
        emails: [...new Set(emails)],
        phones: [...new Set(phones)],
        description,
        services: [...new Set(services)].slice(0, 10),
        pageTexts,
    };
}
/** S2 enrich → 三層策略：爬蟲 → Hermes browser → domain fallback */
async function doEnrich(p, db) {
    const _id = new mongodb_1.ObjectId(p.lead_object_id);
    const lead = await db.collection('leads').findOne({ _id });
    if (!lead)
        throw new Error('lead 唔存在');
    let foundEmail = '';
    let foundPhone = '';
    let foundAddress = '';
    let via = '';
    let scraped = null;
    // ── 第一層：Node fetch 爬蟲（快、靜默） ──
    if (lead.website) {
        log(`enrich 第一層：爬 ${lead.website}`);
        scraped = await scrapeWebsite(lead.website.startsWith('http') ? lead.website : `https://${lead.website}`);
        if (scraped.emails.length > 0)
            foundEmail = scraped.emails[0];
        if (scraped.phones.length > 0 && !lead.phone)
            foundPhone = scraped.phones[0];
        if (foundEmail)
            via = 'scraper';
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
            const c = hermesJson(prompt, { timeout: 300000 });
            if (c.email && !foundEmail) {
                foundEmail = c.email;
                via = 'hermes';
            }
            if (c.phone && !foundPhone)
                foundPhone = c.phone;
            if (c.address)
                foundAddress = c.address;
        }
        catch (e) {
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
    const set = { _website_researched: true, _enrich_via: via };
    if (foundEmail)
        set.email = foundEmail;
    if (foundPhone)
        set.phone = foundPhone;
    if (foundAddress && !lead.address)
        set.address = foundAddress;
    // 寫入爬蟲抽到嘅公司簡介 + 服務（供後續 S2 analyze 用）
    if (scraped) {
        if (scraped.description)
            set.website_description = scraped.description;
        if (scraped.services.length > 0)
            set._scraped_services = scraped.services;
        if (scraped.emails.length > 1)
            set.extra_emails = scraped.emails.slice(1, 5);
        if (scraped.phones.length > 1)
            set.extra_phones = scraped.phones.slice(1, 5);
        // 儲存頁面文字摘要（截斷至 5000 字）供 AI 分析
        if (scraped.pageTexts.length > 0) {
            set._scraped_text = scraped.pageTexts.join('\n\n').slice(0, 5000);
        }
    }
    await db.collection('leads').updateOne({ _id }, { $set: set });
    return {
        enriched: true,
        via,
        found: { email: foundEmail, phone: foundPhone, address: foundAddress },
        scraped_desc: !!scraped?.description,
        scraped_services: scraped?.services.length ?? 0,
    };
}
/** S2 分析 → 有爬蟲資料就直接 LLM 分析，冇就叫 Hermes 開瀏覽器 → 回寫 _collab_* + analyses */
async function doAnalyze(p, db) {
    const _id = new mongodb_1.ObjectId(p.lead_object_id);
    const lead = await db.collection('leads').findOne({ _id });
    if (!lead)
        throw new Error('lead 唔存在');
    let out;
    let via;
    if (lead._scraped_text) {
        // 已有爬蟲資料 → 直接用 LLM 分析，唔使開瀏覽器
        via = 'hermes-llm';
        const desc = lead.website_description || '';
        const svcs = (lead._scraped_services || []).join(', ');
        const text = (lead._scraped_text || '').slice(0, 4000);
        const prompt = `You are a B2B research assistant representing ${brand_1.BRAND_NAME} (${brand_1.BRAND_TAGLINE}),
a Hong Kong digital agency.
${brand_1.BRAND_CONTEXT_BLOCK}

Company to research: ${lead.company_name}
Website: ${lead.website || 'N/A'}
Company description: ${desc}
Their services: ${svcs}
Website content (scraped):
${text}

Based on the above information, propose a SPECIFIC collaboration angle —
i.e. WHICH of ${brand_1.BRAND_NAME}'s services (STRATEGIZE / DESIGN / CODE / MARKET, or any
of: ${brand_1.BRAND_SOLUTIONS.join(' / ')}) maps best to this lead's pain points, and why.
${brand_1.BRAND_TONE_GUIDE}
Output ONLY one JSON object, no other text:
{"primary":"主要合作方向","pitch":"一句 pitch (港式繁中 + EN mix OK)","reason":"理由","services":["服務1","服務2"]}`;
        out = callHermes(prompt);
    }
    else {
        // 冇爬蟲資料 → 用 Hermes 瀏覽器去睇官網
        via = 'hermes-browser';
        const site = lead.website
            ? `Use your browser to visit the company website: ${lead.website}`
            : `Use your browser to search the web for this company and find its website`;
        const prompt = `You are a B2B research assistant representing ${brand_1.BRAND_NAME} (${brand_1.BRAND_TAGLINE}),
a Hong Kong digital agency.
${brand_1.BRAND_CONTEXT_BLOCK}

Company to research: ${lead.company_name}
${site}
Use your stealth browser normally to avoid bot detection. Read what the company does,
then propose a SPECIFIC collaboration angle — i.e. WHICH of ${brand_1.BRAND_NAME}'s services
(STRATEGIZE / DESIGN / CODE / MARKET, or any of: ${brand_1.BRAND_SOLUTIONS.join(' / ')})
maps best to this lead's pain points, and why.
${brand_1.BRAND_TONE_GUIDE}
Output ONLY one JSON object, no other text:
{"primary":"主要合作方向","pitch":"一句 pitch (港式繁中 + EN mix OK)","reason":"理由","services":["服務1","服務2"]}`;
        out = callHermes(prompt);
    }
    const c = extractJson(out);
    await db.collection('leads').updateOne({ _id }, {
        $set: {
            _has_analysis: true,
            _collab_primary: c.primary,
            _collab_pitch: c.pitch,
            _collab_reason: c.reason,
            _collab_services: c.services,
            _collab_generated_at: nowIso(),
            _analyzed_at: nowIso(),
        },
    });
    await db.collection('analyses').insertOne({
        lead_id: lead.lead_id,
        analysis_type: 'full',
        ai_summary: c.pitch,
        _via: via,
        _analyzed_at: nowIso(),
    });
    return { analyzed: true, via, primary: c.primary };
}
/** S3 草稿 → 叫 Hermes(LLM) 寫 outreach email → email_draft + email_queue */
async function doDraft(p, db) {
    const _id = new mongodb_1.ObjectId(p.lead_object_id);
    const lead = await db.collection('leads').findOne({ _id });
    if (!lead)
        throw new Error('lead 唔存在');
    const leadCtx = buildLeadContext(lead);
    const prompt = `Write a short, warm B2B outreach email in professional English OR formal written 繁體中文 書面語 (pick whichever best fits the lead — English-medium / international leads → English is fine; but if you write in Chinese it MUST be 書面語, NOT Cantonese colloquial: 用不/沒有/的/在/這，不用唔/冇/嘅/喺/呢; avoid emoji in the body) from ${brand_1.BRAND_NAME} (${brand_1.BRAND_TAGLINE})
— a Hong Kong digital agency — to the company「${lead.company_name}」.

${brand_1.BRAND_CONTEXT_BLOCK}
${leadCtx}
Collaboration angle: ${lead._collab_primary || ''} — ${lead._collab_pitch || ''}.
${brand_1.BRAND_TONE_GUIDE}

重要：只可以引用上面提供嘅公司資料。如果資料唔夠，寧願寫得籠統啲，都唔好虛構對方嘅業務細節。

Output ONLY JSON with subject + body. Body MUST end with this signature block:

${brand_1.BRAND_SIGNATURE}

{"subject":"","body":""}`;
    const c = hermesJson(prompt);
    await db.collection('leads').updateOne({ _id }, { $set: { email_draft: c.body, _has_email_draft: true } });
    // 測試模式：強制寄去自己嘅 email；正式上線改返 lead.email
    const testRecipient = process.env.TEST_RECIPIENT_EMAIL || '';
    await db.collection('email_queue').insertOne({
        email_id: (0, crypto_1.randomBytes)(4).toString('hex'),
        lead_id: lead.lead_id,
        company_name: lead.company_name,
        to_email: testRecipient || lead.email,
        subject: c.subject,
        body: c.body,
        status: 'pending',
        _via: 'hermes',
        created_at: nowIso(),
    });
    return { drafted: true, via: 'hermes', subject: c.subject };
}
/** 檢查邊啲 contacted leads 超過 5 日冇回覆，逐個派 followup draft task */
async function doCheckFollowups(_p, db) {
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
        }
        catch (e) {
            log(`  → followup 派 task 失敗：${lead.company_name} — ${e?.message ?? e}`);
        }
    }
    return { checked: leads.length, dispatched };
}
/** Follow-up draft — 冇回覆超過 N 日，寫一封跟進 email（語氣唔同） */
async function doFollowupDraft(p, db) {
    const _id = new mongodb_1.ObjectId(p.lead_object_id);
    const lead = await db.collection('leads').findOne({ _id });
    if (!lead)
        throw new Error('lead 唔存在');
    const count = (lead._followup_count || 0) + 1;
    const leadCtx = buildLeadContext(lead);
    const prompt = `Write a SHORT follow-up email (#${count}) in professional English OR formal written 繁體中文 書面語 (pick whichever best fits the lead — English-medium / international leads → English is fine; but if you write in Chinese it MUST be 書面語, NOT Cantonese colloquial: 用不/沒有/的/在/這，不用唔/冇/嘅/喺/呢; avoid emoji in the body) from ${brand_1.BRAND_NAME} (${brand_1.BRAND_TAGLINE})
to「${lead.company_name}」. We previously reached out but got no reply.

${brand_1.BRAND_CONTEXT_BLOCK}
${leadCtx}
Previous pitch angle: ${lead._collab_primary || ''} — ${lead._collab_pitch || ''}.
${brand_1.BRAND_TONE_GUIDE}

重要：只可以引用上面提供嘅公司資料，唔好虛構對方嘅業務細節。

This is follow-up #${count}. Keep it SHORTER and more casual than the first email.
${count === 1 ? 'Gently check if they saw the previous email. Offer a quick 15-min call.' : 'Final follow-up — very brief, friendly, no pressure. Mention you won\'t follow up again.'}

Output ONLY JSON with subject + body. Body MUST end with this signature block:

${brand_1.BRAND_SIGNATURE}

{"subject":"","body":""}`;
    const c = hermesJson(prompt);
    const testRecipient = process.env.TEST_RECIPIENT_EMAIL || '';
    await db.collection('email_queue').insertOne({
        email_id: (0, crypto_1.randomBytes)(4).toString('hex'),
        lead_id: lead.lead_id,
        company_name: lead.company_name,
        to_email: testRecipient || lead.email,
        subject: c.subject,
        body: c.body,
        status: 'pending',
        _via: 'hermes',
        _type: 'followup',
        _followup_number: count,
        created_at: nowIso(),
    });
    await db.collection('leads').updateOne({ _id }, { $set: { _followup_count: count, _last_followup_at: nowIso() } });
    log(`  → followup #${count} drafted for ${lead.company_name}`);
    return { drafted: true, type: 'followup', count, subject: c.subject };
}
/** Re-outreach draft — 對方回覆冇興趣，換角度再寫一封 */
async function doReoutreachDraft(p, db) {
    const _id = new mongodb_1.ObjectId(p.lead_object_id);
    const lead = await db.collection('leads').findOne({ _id });
    if (!lead)
        throw new Error('lead 唔存在');
    const leadCtx = buildLeadContext(lead);
    const prompt = `Write a B2B outreach email in professional English OR formal written 繁體中文 書面語 (pick whichever best fits the lead — English-medium / international leads → English is fine; but if you write in Chinese it MUST be 書面語, NOT Cantonese colloquial: 用不/沒有/的/在/這，不用唔/冇/嘅/喺/呢; avoid emoji in the body) from ${brand_1.BRAND_NAME} (${brand_1.BRAND_TAGLINE})
to「${lead.company_name}」. They previously replied saying they're NOT interested.

${brand_1.BRAND_CONTEXT_BLOCK}
${leadCtx}
Previous angle was: ${lead._collab_primary || ''} — ${lead._collab_pitch || ''}
Their reply summary: ${lead._reply_summary || 'declined / not interested'}

Now try a COMPLETELY DIFFERENT angle and value proposition.
Focus on a different service area or pain point they might have.
Be respectful of their previous decline — acknowledge it briefly.
${brand_1.BRAND_TONE_GUIDE}

重要：只可以引用上面提供嘅公司資料，唔好虛構對方嘅業務細節。

Output ONLY JSON with subject + body. Body MUST end with this signature block:

${brand_1.BRAND_SIGNATURE}

{"subject":"","body":""}`;
    const c = hermesJson(prompt);
    const testRecipient = process.env.TEST_RECIPIENT_EMAIL || '';
    await db.collection('email_queue').insertOne({
        email_id: (0, crypto_1.randomBytes)(4).toString('hex'),
        lead_id: lead.lead_id,
        company_name: lead.company_name,
        to_email: testRecipient || lead.email,
        subject: c.subject,
        body: c.body,
        status: 'pending',
        _via: 'hermes',
        _type: 'reoutreach',
        created_at: nowIso(),
    });
    await db.collection('leads').updateOne({ _id }, { $set: { _reoutreach_done: true, _reoutreach_at: nowIso() } });
    log(`  → reoutreach drafted for ${lead.company_name}`);
    return { drafted: true, type: 'reoutreach', subject: c.subject };
}
/**
 * S4 發送 —— ⚠️ 預設【唔真發 email】（發冷 email 俾真公司係不可逆）。
 * 預設只標 email_queue = approved（等人手 / 開關確認）。
 * set ENABLE_REAL_SEND=true 先會叫 Hermes 真發 + 標 contacted。
 */
async function doSend(p, db) {
    const _id = new mongodb_1.ObjectId(p.lead_object_id);
    const lead = await db.collection('leads').findOne({ _id });
    if (!lead)
        throw new Error('lead 唔存在');
    const eq = await db
        .collection('email_queue')
        .findOne({ lead_id: lead.lead_id, status: 'pending' }, { sort: { created_at: -1 } });
    if (!eq)
        return { sent: false, note: '冇待發 email' };
    // 未開真發 → 只標 approved，唔寄
    if (process.env.ENABLE_REAL_SEND !== 'true') {
        await db
            .collection('email_queue')
            .updateMany({ lead_id: lead.lead_id, status: 'pending' }, { $set: { status: 'approved' } });
        return { sent: false, note: 'real send 停用（ENABLE_REAL_SEND=true 先發）' };
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
    if (!to)
        return { sent: false, note: '冇收件人（lead 冇 email，又冇 SEND_OVERRIDE）' };
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
    }
    catch (e) {
        // check 成功先標 sent（修「假 sent」bug）
        await db
            .collection('email_queue')
            .updateOne({ _id: eq._id }, { $set: { status: 'failed', error: { send_error: e?.message ?? String(e) } } });
        return { sent: false, error: e?.message ?? String(e) };
    }
    await db
        .collection('email_queue')
        .updateOne({ _id: eq._id }, { $set: { status: 'sent', sent_at: nowIso() } });
    await db
        .collection('leads')
        .updateOne({ _id }, { $set: { status: 'contacted', _email_sent: true, _last_sent_at: nowIso() } });
    return { sent: true, to };
}
// ───────── main loop ─────────
/** 登入重試（B API 一時連唔到都唔好死，backoff 重試）*/
async function loginWithRetry() {
    for (let attempt = 1;; attempt++) {
        try {
            await login();
            return;
        }
        catch (e) {
            const wait = Math.min(30000, 2000 * attempt);
            log(`登入失敗（第 ${attempt} 次）：${e?.message ?? e} —— ${wait / 1000}s 後重試`);
            await sleep(wait);
        }
    }
}
async function main() {
    log(`啟動 → API=${API} skill=${SKILL || 'any'}`);
    await loginWithRetry();
    const client = new mongodb_1.MongoClient(MONGO);
    await client.connect();
    const db = client.db();
    let idle = 0;
    let running = true;
    process.on('SIGINT', () => {
        log('收到 SIGINT，停緊…');
        running = false;
    });
    while (running) {
        let task = null;
        try {
            task = await claim();
        }
        catch (e) {
            log('claim error:', e?.message ?? e);
            await sleep(POLL_MS);
            continue;
        }
        if (!task) {
            idle++;
            if (MAX_IDLE && idle >= MAX_IDLE) {
                log(`連續 ${idle} 次冇 task，停止`);
                break;
            }
            await sleep(POLL_MS);
            continue;
        }
        idle = 0;
        log(`接到 ${task.task_id} (${task.skill_id}) ${task.title ?? ''}`);
        try {
            const result = await handle(task, db);
            await complete(task.task_id, result);
            log(`✓ 完成 ${task.task_id}`, JSON.stringify(result));
        }
        catch (e) {
            log(`✗ ${task.task_id} 失敗:`, e?.message ?? e);
            // ⚠️ failTask 失敗唔可以 propagate 出去，否則會 process.exit(1)。
            // 內部再 try/catch，將 "fail 失敗" 變 warn log，繼續 loop
            // (DB 入面個 task 仲 stay 在 running，stale-minutes cron 之後會 requeue)。
            try {
                await failTask(task.task_id, e?.message ?? String(e));
            }
            catch (e2) {
                log(`⚠ failTask 都失敗咗 (${task.task_id}) — task 留喺 running，等 reap-stalled-tasks cron requeue:`, e2?.message ?? e2);
            }
        }
    }
    await client.close();
    log('已停止');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 安全網：唔好俾未捕捉嘅錯誤即刻殺 process（log 完繼續）
process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
process.on('uncaughtException', (e) => console.error('[uncaughtException]', e));
main().catch((e) => {
    console.error('main crashed:', e);
    process.exit(1); // 交俾 pm2（已設 restart-delay）重啟
});
