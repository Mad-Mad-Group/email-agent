"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCompanyName = normalizeCompanyName;
exports.companyDedupeKey = companyDedupeKey;
const LEGAL_SUFFIXES = [
    '有限公司',
    '股份有限公司',
    '股份有限公司',
    '集團',
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
function normalizeCompanyName(raw) {
    if (!raw)
        return '';
    let s = raw.normalize('NFKC').toLowerCase();
    s = s.replace(/[\s\u3000]+/g, '');
    s = s.replace(/[\.,。、·:;:'"`~!@#$%^&*()（）()\[\]【】{}\-_+=<>?/\\|]/g, '');
    for (const suf of LEGAL_SUFFIXES) {
        if (s.endsWith(suf)) {
            s = s.slice(0, -suf.length);
        }
    }
    return s.trim();
}
function companyDedupeKey(raw) {
    return normalizeCompanyName(raw);
}
//# sourceMappingURL=normalize-company.js.map