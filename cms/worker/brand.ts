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

export const BRAND_NAME = 'MAD MAD Group';
export const BRAND_NAME_ZH = '瘋狂集團'; // 對外中文署名（如要）

export const BRAND_TAGLINE = 'CODE YOUR STRATEGY · DESIGN YOUR MARKET';

export const BRAND_PILLARS = [
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

export const BRAND_SOLUTIONS = [
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
export const BRAND_CONTEXT_BLOCK = `
About ${BRAND_NAME} (${BRAND_TAGLINE}):
- A Hong Kong digital agency providing All-round, Brilliant, Customizing,
  Daringly Innovative and Integrative business solutions.
- Four pillars: STRATEGIZE (best approaches for success),
  DESIGN (pixel-perfect adaptation), CODE (fix-and-deliver engineering),
  MARKET (competitive edge in your market).
- Solutions: ${BRAND_SOLUTIONS.join(' / ')}.
- Proven track record: built Hong Kong International Airport's official mobile
  app "My HKG", partnered with Public Bank (Hong Kong), Midland Realty, God Taxi, etc.
`;

/**
 * 落 email body 嘅 signature block（署名區）。
 * 改 contact info 改呢度。
 */
export const BRAND_SIGNATURE = `
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
 * 正式英文 或 繁體中文書面語皆可（按 lead 揀）；若用中文必須書面語，避免粵語口語同 emoji。
 */
export const BRAND_TONE_GUIDE = `
Tone: warm, professional, action-oriented. Write in professional English OR
formal written 繁體中文 (標準書面語) — pick whichever best fits the lead
(English-medium / international leads → English is fine). If you write in Chinese
it MUST be 書面語, avoid Cantonese colloquialisms
(用「不 / 沒有 / 的 / 在 / 這 / 和」而非「唔 / 冇 / 嘅 / 喺 / 呢 / 同」).
Avoid emoji and overly casual markers in the body.
Avoid generic SaaS marketing speak.
Reference style: 之前 sample 寫過「【升級 eClass 契機】為潮公打造結合 AI 選科分析 +
跨境協作的校本延伸平台」、「為聖保羅男女中學舊生會注入 AI 驅動的數碼轉型方案」
— concrete, lead-specific, 不要 abstract。Subject line 用【】括 case-specific 主題。
`;