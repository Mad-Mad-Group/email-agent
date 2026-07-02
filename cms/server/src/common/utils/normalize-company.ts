/**
 * 將公司名 normalize 做 dedupe key。
 *   - lower case
 *   - 去全形/半形空白、Tab、換行
 *   - 去標點 ()（）.,。、·* 暨常見 LLC suffix（有限公司、Limited、Ltd、Inc、Corporation、Corp、Company、Co.）
 *   - NFKC normalize（處理全形英文/數字）
 *
 * 用法：
 *   normalizeCompanyName('Kei To 基督教宣道會  有限公司') === '基督教宣道會keitto'
 */
const LEGAL_SUFFIXES = [
  // 港/台/中常見
  '有限公司',
  '股份有限公司',
  '股份有限公司',
  '集團',
  // English
  'limited',
  'ltd',
  'inc',
  'incorporated',
  'corporation',
  'corp',
  'company',
  'co',
  'llc',
  'llp',
  'plc',
];

export function normalizeCompanyName(raw: string | null | undefined): string {
  if (!raw) return '';
  // NFKC: 全形→半形,「ＡＢＣ」→「ABC」
  let s = raw.normalize('NFKC').toLowerCase();
  // 去所有空白同常見標點
  s = s.replace(/[\s\u3000]+/g, '');
  s = s.replace(/[\.,。、·:;:'"`~!@#$%^&*()（）()\[\]【】{}\-_+=<>?/\\|]/g, '');
  // 移除 legal suffix（最後先做，避免「有限公司」被拆散）
  for (const suf of LEGAL_SUFFIXES) {
    if (s.endsWith(suf)) {
      s = s.slice(0, -suf.length);
    }
  }
  return s.trim();
}

/**
 * 較寬鬆嘅 hash（32-bit FNV-1a）—— Mongo key 用足夠;
 * 撞 key 後再人手 compare normalized string 抗 false-positive。
 */
export function companyDedupeKey(raw: string | null | undefined): string {
  return normalizeCompanyName(raw);
}
