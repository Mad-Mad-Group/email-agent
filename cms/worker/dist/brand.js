"use strict";
/**
 * MAD MAD Group — 公司 brand context
 *
 * Single source of truth for outbound email / analysis prompts.
 * 改公司資料淨係改呢個 file → re-run `npm run build` 喺 worker/。
 *
 * 內容摘自 https://www.madmadgroup.com/
 *   - Tagline: "CODE YOUR STRATEGY / DESIGN YOUR MARKET"
 *   - 4 pillars: STRATEGIZE / DESIGN / CODE / MARKET
 *   - Solutions (10 個)
 *   - Brand voice: "All-round, Brilliant, Customizing, Daringly Innovative and Integrative"
 *   - Portfolio proof: My HKG (HKIA) / Public Bank / Midland Realty / God Taxi
 *   - Contact: info@madmadgroup.com / (852) 3998 3180
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BRAND_TONE_GUIDE = exports.BRAND_SIGNATURE = exports.BRAND_CONTEXT_BLOCK = exports.BRAND_SOLUTIONS = exports.BRAND_PILLARS = exports.BRAND_TAGLINE = exports.BRAND_NAME_ZH = exports.BRAND_NAME = void 0;
exports.BRAND_NAME = 'MAD MAD Group';
exports.BRAND_NAME_ZH = '瘋狂集團'; // 對外中文署名（如要）
exports.BRAND_TAGLINE = 'CODE YOUR STRATEGY · DESIGN YOUR MARKET';
exports.BRAND_PILLARS = [
    {
        name: 'STRATEGIZE',
        desc: 'Sit back and relax, we manage the rest!',
    },
    {
        name: 'DESIGN',
        desc: 'Pixel perfect? We are ready!',
    },
    {
        name: 'CODE',
        desc: 'Coding genius: we fix everything!',
    },
    {
        name: 'MARKET',
        desc: 'World-wide, Well-known.',
    },
];
exports.BRAND_SOLUTIONS = [
    'Website Development',
    'Mobile Application on Multiple Platforms',
    'Game',
    'Augmented Reality (AR) Technology',
    'Smart Glass',
    'Social Platform',
    'e-Commerce',
    '2D & 3D Animation',
    'e-Learning Platform',
    'O2O',
];
/**
 * 注入落 LLM prompt 嘅 brand context block。
 * S2 analyze / S3 draft 都會用呢段。
 */
exports.BRAND_CONTEXT_BLOCK = `
About ${exports.BRAND_NAME} (${exports.BRAND_TAGLINE}):
- A Hong Kong digital agency providing All-round, Brilliant, Customizing,
  Daringly Innovative and Integrative business solutions.
- Four pillars: STRATEGIZE (best approaches for success),
  DESIGN (pixel-perfect adaptation), CODE (fix-and-deliver engineering),
  MARKET (competitive edge in your market).
- Solutions: ${exports.BRAND_SOLUTIONS.join(' / ')}.
- Proven track record: built Hong Kong International Airport's official mobile
  app "My HKG", partnered with Public Bank (Hong Kong), Midland Realty, God Taxi, etc.
`;
/**
 * 落 email body 嘅 signature block（署名區）。
 * 改 contact info 改呢度。
 */
exports.BRAND_SIGNATURE = `
--
MAD MAD Group
Code Your Strategy · Design Your Market
🌐 https://www.madmadgroup.com
📧 info@madmadgroup.com
📞 (852) 3998 3180
Unit G, 17/F, Reason Group Tower, 403-413 Castle Peak Road, Kwai Chung, NT, HK
`;
/**
 * Tone-of-voice anchor (給 LLM 跟嘅寫作風格)。
 * 唔好長氣，要 brand-consistent：warm-but-professional, action-oriented,
 * 港式英文夾雜繁體中文 OK (matches 之前嘅 sample email)。
 */
exports.BRAND_TONE_GUIDE = `
Tone: warm, professional, action-oriented. Mix English/繁體中文 (港式風格) is OK
if the lead's context suggests it. Avoid generic SaaS marketing speak.
Reference style: 之前 sample 寫過「【升級 eClass 契機】為潮公打造結合 AI 選科分析 +
跨境協作的校本延伸平台」、「為聖保羅男女中學舊生會注入 AI 驅動嘅數碼轉型方案」
— concrete, lead-specific, 唔好 abstract。Subject line 用【】括 case-specific 主題。
`;
