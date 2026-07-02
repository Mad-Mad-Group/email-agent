import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { media } from '../../styles/media';

/* ══════════════════════════════════════
   LUNO Crypto Dashboard — 1:1 replica
   ══════════════════════════════════════ */

/* ── Layout primitives ── */

const Page = styled.div`display: flex; flex-direction: column; gap: 16px;`;

const Breadcrumb = styled.ol`
  list-style: none; margin: 0; padding: 0; display: flex; gap: 8px;
  font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary};
  li + li::before { content: '/'; margin-right: 8px; }
  a { color: ${({ theme }) => theme.colors.textSecondary}; text-decoration: none; }
`;

const PageTitle = styled.h1`
  font-size: 1.15rem; font-weight: 600; margin: 4px 0 0;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const PageSub = styled.small`
  color: ${({ theme }) => theme.colors.textTertiary}; font-size: 0.8125rem;
`;

const ToolbarRow = styled.div`
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
`;

const Row = styled.div<{ $cols?: string; $gap?: number }>`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols || 'repeat(4, 1fr)'};
  gap: ${({ $gap }) => $gap ?? 8}px;
  ${media.mobile} {
    grid-template-columns: 1fr;
  }
  ${media.tablet} {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 8px;
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const CardBody = styled.div`padding: 16px;`;

/* ── KPI Card ── */

const KPIWrap = styled(Card)`padding: 16px;`;
const KPIInner = styled.div`display: flex; align-items: center; gap: 12px;`;
const KPIIcon = styled.div`
  width: 42px; height: 42px; border-radius: 50%;
  background: ${({ theme }) => theme.colors.surfaceMuted};
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; color: ${({ theme }) => theme.colors.textSecondary};
`;
const KPILabel = styled.div`font-size: 0.6875rem; text-transform: uppercase; color: ${({ theme }) => theme.colors.textTertiary};`;
const KPIValue = styled.span`font-size: 1rem; font-weight: 700; color: ${({ theme }) => theme.colors.textPrimary};`;
const KPIChange = styled.small<{ $danger?: boolean }>`
  margin-left: 6px; font-size: 0.75rem;
  color: ${({ $danger, theme }) => $danger ? theme.colors.red : theme.colors.green};
`;

/* ── Crypto Card ── */

const CryptoCard = styled(Card)`overflow: hidden;`;
const CryptoBody = styled.div`display: flex; align-items: center; gap: 12px; padding: 12px 16px;`;
const CryptoAvatar = styled.div<{ $bg: string }>`
  width: 36px; height: 36px; border-radius: 50%;
  background: ${({ $bg }) => $bg}; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.6rem;
`;
const CryptoName = styled.span`font-size: 0.6875rem; text-transform: uppercase; color: ${({ theme }) => theme.colors.textTertiary};`;
const CryptoPrice = styled.span`font-size: 0.9375rem; font-weight: 700;`;
const CryptoPriceRow = styled.div`display: flex; justify-content: space-between; align-items: center;`;
const CryptoSparkline = styled.div<{ $color: string }>`
  height: 50px; background: linear-gradient(180deg, ${({ $color }) => $color}22 0%, ${({ $color }) => $color}05 100%);
  position: relative;
`;
const SparkSvg = styled.svg`width: 100%; height: 50px; display: block;`;

/* ── Tooltip (shared) ── */

const Tooltip = styled.div<{ $x: number; $y: number; $color: string }>`
  position: absolute;
  left: ${({ $x }) => $x}px;
  top: ${({ $y }) => $y}px;
  transform: translate(-50%, -100%);
  background: ${({ $color }) => $color};
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 10;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 100%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: ${({ $color }) => $color};
  }
`;

/* ── Live Coins Carousel ── */

const CoinsScroll = styled.div`
  display: flex; gap: 8px; overflow-x: auto; padding: 4px 0;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb { background: ${({ theme }) => theme.colors.border}; border-radius: 2px; }
`;
const CoinChip = styled(Card)`
  min-width: 200px; flex-shrink: 0; padding: 12px 16px;
  display: flex; align-items: center; gap: 10px;
  ${media.mobile} {
    min-width: 160px;
  }
`;
const CoinInfo = styled.div`flex: 1;`;
const CoinName = styled.span`font-size: 0.8125rem; font-weight: 700;`;
const CoinPrice = styled.span`font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary};`;
const CoinMini = styled.svg`width: 60px; height: 28px;`;

/* ── Quick Exchange ── */

const ExchangeCard = styled(Card)``;
const ExchangeTitle = styled.h2`font-size: 1rem; font-weight: 600; margin: 0 0 8px;`;
const ExchangeDesc = styled.p`font-size: 0.8125rem; color: ${({ theme }) => theme.colors.textTertiary}; margin: 0 0 16px;`;
const FormRow = styled.div`display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;`;
const FormGroup = styled.div`flex: 1; min-width: 120px;`;
const FormLabel = styled.label`font-size: 0.6875rem; color: ${({ theme }) => theme.colors.textTertiary}; display: block; margin-bottom: 4px;`;
const FormSelect = styled.select`
  width: 100%; padding: 8px 10px; border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.8125rem; background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};
`;
const FormInput = styled.input`
  width: 100%; padding: 8px 10px; border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.8125rem; background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};
`;
const ExchangeBtn = styled.button`
  padding: 8px 20px; border-radius: 6px; border: none;
  background: var(--primary, #e54f31); color: #fff;
  font-size: 0.8125rem; font-weight: 600; cursor: pointer;
  &:hover { opacity: 0.9; }
`;

/* ── BTC Chart ── */

const ChartCard = styled(Card)``;
const ChartHeader = styled.div`
  display: flex; justify-content: space-between; align-items: flex-start; padding: 16px 16px 0;
  ${media.mobile} {
    flex-direction: column;
    gap: 8px;
  }
`;
const ChartInfo = styled.div``;
const ChartLabel = styled.div`font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary}; text-transform: uppercase;`;
const ChartPriceVal = styled.div`font-size: 1.5rem; font-weight: 700; color: ${({ theme }) => theme.colors.textPrimary};`;
const ChartChange = styled.span<{ $up?: boolean }>`
  font-size: 0.75rem; color: ${({ $up, theme }) => $up ? theme.colors.green : theme.colors.red};
`;
const ChartTabs = styled.div`display: flex; gap: 4px;`;
const ChartTab = styled.button<{ $active?: boolean }>`
  padding: 4px 10px; border-radius: 4px; border: none; font-size: 0.75rem; cursor: pointer;
  background: ${({ $active, theme }) => $active ? 'var(--primary, #e54f31)' : theme.colors.surfaceMuted};
  color: ${({ $active }) => $active ? '#fff' : 'inherit'};
`;
const ChartArea = styled.div`
  padding: 0 16px 16px; height: 250px; position: relative;
  ${media.mobile} {
    height: 180px;
  }
`;

/* ── Table ── */

const TableWrap = styled(Card)`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;
const TableTitle = styled.h2`font-size: 1rem; font-weight: 600; margin: 0; padding: 16px 16px 12px;`;
const StyledTable = styled.table`
  width: 100%; border-collapse: collapse; font-size: 0.8125rem;
  min-width: 700px;
  th { text-align: left; padding: 8px 16px; font-weight: 600; font-size: 0.75rem;
    text-transform: uppercase; color: ${({ theme }) => theme.colors.textTertiary};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.colors.surfaceMuted};
  }
  td { padding: 10px 16px; border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.textPrimary};
  }
  tr:last-child td { border-bottom: none; }
  ${media.mobile} {
    min-width: 500px;
    font-size: 0.75rem;
    th { padding: 6px 10px; font-size: 0.625rem; }
    td { padding: 8px 10px; }
  }
`;
const StatusPill = styled.span<{ $type: 'accept' | 'cancel' }>`
  display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 0.6875rem; font-weight: 600;
  background: ${({ $type, theme }) => $type === 'accept' ? theme.colors.green + '22' : theme.colors.red + '22'};
  color: ${({ $type, theme }) => $type === 'accept' ? theme.colors.green : theme.colors.red};
`;

/* ── Market Cap ── */

const MCRow = styled.div`
  display: flex; align-items: center; gap: 10px; padding: 8px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: none; }
`;
const MCRank = styled.span`font-size: 0.75rem; color: ${({ theme }) => theme.colors.textTertiary}; width: 20px;`;
const MCIcon = styled.div<{ $bg: string }>`
  width: 28px; height: 28px; border-radius: 50%; background: ${({ $bg }) => $bg};
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 0.55rem; font-weight: 700;
`;
const MCInfo = styled.div`flex: 1;`;
const MCName = styled.div`font-size: 0.8125rem; font-weight: 600;`;
const MCSymbol = styled.span`font-size: 0.6875rem; color: ${({ theme }) => theme.colors.textTertiary}; margin-left: 4px;`;
const MCPrice = styled.div`text-align: right; font-size: 0.8125rem; font-weight: 600;`;
const MCChangeTxt = styled.div<{ $up: boolean }>`
  text-align: right; font-size: 0.6875rem;
  color: ${({ $up, theme }) => $up ? theme.colors.green : theme.colors.red};
`;

/* ══════════ DATA ══════════ */

const KPI_DATA = [
  { icon: '$', label: "Today's Profit", value: '$8,925', change: '-3%', danger: true },
  { icon: '\u{1F3E6}', label: 'Balance', value: '$2,98,00', change: '', danger: false },
  { icon: '\u{1F4B0}', label: 'Expenses', value: '$52,908', change: '-6%', danger: true },
  { icon: '\u{1F4B3}', label: 'Transaction', value: '$1,24,580', change: '-10%', danger: true },
];

const CRYPTO_CARDS = [
  // BTC: steady climb with one mild dip mid-way
  { symbol: 'BTC', name: 'Bitcoin', price: '$25,450', change: '+ 1.25', up: true, color: '#c19862',
    spark: '0,30 40,28 80,25 120,22 160,24 200,20 240,17 280,13 320,10 360,8 380,7' },
  // XRP: flat start, then gradual rise in second half
  { symbol: 'XRP', name: 'Ripple', price: '$25,450', change: '+ 0.25', up: true, color: '#6aa8bf',
    spark: '0,22 50,21 100,22 150,20 190,18 230,15 270,12 310,10 350,9 380,8' },
  // NEO: dip then strong recovery
  { symbol: 'NEO', name: 'Neo', price: '$25,450', change: '+ 0.50', up: true, color: '#567ebb',
    spark: '0,14 50,18 100,24 150,28 190,26 230,20 270,15 310,10 350,7 380,5' },
  // ETH: slow decline with brief stabilisation
  { symbol: 'ETH', name: 'Ethereum', price: '$25,450', change: '- 0.73', up: false, color: '#8b92b3',
    spark: '0,8 50,10 100,13 150,15 200,18 240,21 280,24 320,27 360,29 380,30' },
];

const LIVE_COINS = [
  { symbol: 'NEO', name: 'Neo', price: '$25,450', bg: '#567ebb' },
  { symbol: 'ETH', name: 'Ethereum', price: '$25,450', bg: '#8b92b3' },
  { symbol: 'XLM', name: 'Stellar', price: '$25,450', bg: '#6ab8c7' },
  { symbol: 'QTUM', name: 'Qtum', price: '$25,450', bg: '#6a9dbf' },
  { symbol: 'LTC', name: 'Litecoin', price: '$25,450', bg: '#b5b2b2' },
  { symbol: 'BTG', name: 'Bitcoin Gold', price: '$25,450', bg: '#c19862' },
  { symbol: 'DASH', name: 'Dash', price: '$25,450', bg: '#6a8faa' },
  { symbol: 'EOS', name: 'EOS', price: '$25,450', bg: '#5e5a6b' },
  { symbol: 'ADA', name: 'Cardano', price: '$25,450', bg: '#5c6ba3' },
  { symbol: 'XMR', name: 'Monero', price: '$25,450', bg: '#cc8855' },
  { symbol: 'USDT', name: 'Tether', price: '$25,450', bg: '#5a9e85' },
  { symbol: 'ZEC', name: 'Zcash', price: '$25,450', bg: '#ccaa6a' },
];

const TRANSACTIONS = [
  { date: '28-July-2018 06:49:51', type: 'Buy', amount: '0.45879', remaining: '0.45879', price: '11901.85', usd: '$ 3165.44', fee: '0.013', status: 'accept' as const },
  { date: '28-July-2018 06:50:50', type: 'Sell', amount: '1.38647', remaining: '0.38647', price: '11905.09', usd: '$ 2496.36', fee: '0.017', status: 'accept' as const },
  { date: '28-July-2018 06:51:51', type: 'Buy', amount: '0.58647', remaining: '0.58647', price: '11900.12', usd: '$ 1597.78', fee: '0.023', status: 'accept' as const },
  { date: '28-July-2018 06:51:51', type: 'Buy', amount: '0.89877', remaining: '0.89877', price: '11899.28', usd: '$ 25830.6', fee: '0.011', status: 'accept' as const },
  { date: '28-July-2018 06:51:51', type: 'Sell', amount: '0.45712', remaining: '0.45712', price: '11908.19', usd: '$ 2586.34', fee: '0.024', status: 'cancel' as const },
  { date: '28-July-2018 06:51:51', type: 'Buy', amount: '0.58647', remaining: '0.58647', price: '11900.12', usd: '$ 1597.78', fee: '0.023', status: 'accept' as const },
];

const MARKET_CAP = [
  { rank: 1, symbol: 'BTC', name: 'Bitcoin', price: '$11,590.90', change: '+5.24%', up: true, bg: '#c19862' },
  { rank: 2, symbol: 'ETH', name: 'Ethereum', price: '$1,485.40', change: '+8.12%', up: true, bg: '#8b92b3' },
  { rank: 3, symbol: 'XRP', name: 'Ripple', price: '$0.8525', change: '-2.03%', up: false, bg: '#6aa8bf' },
  { rank: 4, symbol: 'BCH', name: 'Bitcoin Cash', price: '$540.80', change: '+3.18%', up: true, bg: '#8daa6e' },
  { rank: 5, symbol: 'ADA', name: 'Cardano', price: '$0.3254', change: '-1.45%', up: false, bg: '#5c6ba3' },
  { rank: 6, symbol: 'LTC', name: 'Litecoin', price: '$165.50', change: '+4.87%', up: true, bg: '#b5b2b2' },
  { rank: 7, symbol: 'NEO', name: 'Neo', price: '$125.30', change: '+2.55%', up: true, bg: '#567ebb' },
  { rank: 8, symbol: 'XLM', name: 'Stellar', price: '$0.4120', change: '-0.95%', up: false, bg: '#6ab8c7' },
];

/* ── Smooth cubic bezier path from points (Catmull-Rom → Bezier) ── */

const smoothPath = (pts: { x: number; y: number }[], tension = 0.3): string => {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;

  const d: string[] = [`M${pts[0].x},${pts[0].y}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
  }
  return d.join(' ');
};

const makeSparkPath = (points: string, w: number, h: number) => {
  const pairs = points.split(' ').map(p => {
    const [x, y] = p.split(',').map(Number);
    return { x: (x / 380) * w, y: (y / 35) * h };
  });
  return smoothPath(pairs);
};

// Simple smooth mini sparklines — gentle trend with minimal noise
const makeMiniSpark = (seed: number) => {
  const patterns: number[][] = [
    [18, 16, 13, 10, 8, 7],      // up
    [10, 12, 16, 14, 11, 8],     // dip then up
    [8, 10, 14, 18, 20, 22],     // down
    [14, 12, 10, 12, 15, 18],    // V shape
    [12, 14, 13, 10, 8, 6],      // up
    [8, 9, 12, 16, 19, 22],      // down
    [20, 18, 14, 10, 8, 6],      // strong up
    [10, 8, 10, 14, 18, 20],     // dip then down
    [16, 14, 12, 10, 9, 8],      // gentle up
    [8, 10, 14, 12, 9, 6],       // wavy up
    [14, 16, 18, 16, 12, 8],     // peak then up
    [10, 12, 14, 16, 18, 20],    // steady down
  ];
  const p = patterns[seed % patterns.length];
  const pts = p.map((y, i) => ({ x: (i / (p.length - 1)) * 60, y }));
  return smoothPath(pts);
};

// BTC chart — slow descent, flat accumulation, then strong rally
const BTC_CHART_POINTS = [
  0,160,   40,165,  80,170,  120,168,  160,172,  200,165,
  240,155,  280,145,  310,140,  340,142,  370,138,
  400,130,  430,115,  460,95,   490,75,   520,60,
  550,50,   580,42,   600,38
];

const btcPath = () => {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < BTC_CHART_POINTS.length; i += 2) {
    pts.push({ x: BTC_CHART_POINTS[i], y: BTC_CHART_POINTS[i + 1] });
  }
  return smoothPath(pts);
};

/* ══════════ INTERACTIVE CHART HELPERS ══════════ */

/**
 * Binary-search a SVG <path> for the point whose x ≈ targetX.
 * Returns the (x, y) in viewBox coordinates.
 */
const findPointOnPathAtX = (
  pathEl: SVGPathElement,
  targetX: number,
  vbWidth: number,
): { x: number; y: number } | null => {
  const totalLen = pathEl.getTotalLength();
  // Clamp targetX
  const startPt = pathEl.getPointAtLength(0);
  const endPt = pathEl.getPointAtLength(totalLen);
  if (targetX <= startPt.x) return { x: startPt.x, y: startPt.y };
  if (targetX >= endPt.x) return { x: endPt.x, y: endPt.y };

  // Binary search
  let lo = 0;
  let hi = totalLen;
  for (let iter = 0; iter < 25; iter++) {
    const mid = (lo + hi) / 2;
    const pt = pathEl.getPointAtLength(mid);
    if (pt.x < targetX) lo = mid;
    else hi = mid;
  }
  const pt = pathEl.getPointAtLength((lo + hi) / 2);
  return { x: pt.x, y: pt.y };
};

/* Crypto card sparkline with hover — pixel-smooth along curve */
const InteractiveSparkline: React.FC<{ spark: string; color: string; price: string }> = ({ spark, color, price }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [hover, setHover] = useState<{ svgX: number; svgY: number; px: number; py: number; val: string } | null>(null);

  const onMove = useCallback((e: React.MouseEvent) => {
    const wrap = wrapRef.current;
    const pathEl = pathRef.current;
    if (!wrap || !pathEl) return;
    const rect = wrap.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    // Convert mouse-x to viewBox-x (viewBox = 0 0 380 35)
    const svgTargetX = (mx / rect.width) * 380;
    const pt = findPointOnPathAtX(pathEl, svgTargetX, 380);
    if (!pt) return;

    const px = (pt.x / 380) * rect.width;
    const py = (pt.y / 35) * 50; // 50px is the container height
    const base = parseFloat(price.replace(/[$,]/g, ''));
    const delta = (17.5 - pt.y) * 20;
    const val = `$${(base + delta).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    setHover({ svgX: pt.x, svgY: pt.y, px, py, val });
  }, [price]);

  return (
    <CryptoSparkline $color={color} ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ cursor: 'crosshair' }}>
      <SparkSvg viewBox="0 0 380 35" preserveAspectRatio="none">
        <path d={makeSparkPath(spark, 380, 35)} fill="none" stroke={color} strokeWidth="2" ref={pathRef} />
        <path d={`${makeSparkPath(spark, 380, 35)} L380,35 L0,35 Z`} fill={color} opacity="0.15" />
        {hover && (
          <>
            <line x1={hover.svgX} y1="0" x2={hover.svgX} y2="35" stroke={color} strokeWidth="0.5" strokeDasharray="2,2" opacity="0.6" />
            <circle cx={hover.svgX} cy={hover.svgY} r="3" fill="#fff" stroke={color} strokeWidth="1.5" />
          </>
        )}
      </SparkSvg>
      {hover && <Tooltip $x={hover.px} $y={hover.py - 6} $color={color}>{hover.val}</Tooltip>}
    </CryptoSparkline>
  );
};

/* Mini coin sparkline with hover — pixel-smooth */
const InteractiveMiniSpark: React.FC<{ seed: number; color: string; price: string }> = ({ seed, color, price }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [hover, setHover] = useState<{ svgX: number; svgY: number; px: number; val: string } | null>(null);

  // Must match makeMiniSpark logic exactly
  const patterns: number[][] = [
    [18, 16, 13, 10, 8, 7],
    [10, 12, 16, 14, 11, 8],
    [8, 10, 14, 18, 20, 22],
    [14, 12, 10, 12, 15, 18],
    [12, 14, 13, 10, 8, 6],
    [8, 9, 12, 16, 19, 22],
    [20, 18, 14, 10, 8, 6],
    [10, 8, 10, 14, 18, 20],
    [16, 14, 12, 10, 9, 8],
    [8, 10, 14, 12, 9, 6],
    [14, 16, 18, 16, 12, 8],
    [10, 12, 14, 16, 18, 20],
  ];
  const p = patterns[seed % patterns.length];
  const pts = p.map((y, i) => ({ x: (i / (p.length - 1)) * 60, y }));
  const path = smoothPath(pts);

  const onMove = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    const pathEl = pathRef.current;
    if (!svg || !pathEl) return;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const svgTargetX = (mx / rect.width) * 60; // viewBox = 0 0 60 28
    const pt = findPointOnPathAtX(pathEl, svgTargetX, 60);
    if (!pt) return;

    const px = (pt.x / 60) * rect.width;
    const base = parseFloat(price.replace(/[$,]/g, ''));
    const delta = (14 - pt.y) * 15;
    const val = `$${(base + delta).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    setHover({ svgX: pt.x, svgY: pt.y, px, val });
  }, [price]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <CoinMini ref={svgRef} viewBox="0 0 60 28" preserveAspectRatio="none" onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ cursor: 'crosshair' }}>
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" ref={pathRef} />
        {hover && <circle cx={hover.svgX} cy={hover.svgY} r="2.5" fill="#fff" stroke={color} strokeWidth="1.5" />}
      </CoinMini>
      {hover && (
        <div style={{
          position: 'absolute', left: hover.px, top: -4,
          transform: 'translate(-50%, -100%)',
          background: color, color: '#fff', fontSize: '0.625rem', fontWeight: 600,
          padding: '2px 6px', borderRadius: 3, pointerEvents: 'none', whiteSpace: 'nowrap',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)', zIndex: 10,
        }}>{hover.val}</div>
      )}
    </div>
  );
};

/* BTC large chart with hover — pixel-smooth along curve */
const InteractiveBtcChart: React.FC = () => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [hover, setHover] = useState<{ px: number; py: number; svgX: number; svgY: number; val: string } | null>(null);

  const onMove = useCallback((e: React.MouseEvent) => {
    const wrap = wrapRef.current;
    const pathEl = pathRef.current;
    if (!wrap || !pathEl) return;
    const rect = wrap.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const svgTargetX = (mx / rect.width) * 600; // viewBox = 0 0 600 200
    const pt = findPointOnPathAtX(pathEl, svgTargetX, 600);
    if (!pt) return;

    const px = (pt.x / 600) * rect.width;
    const py = (pt.y / 200) * rect.height;
    const priceVal = 11200 + ((200 - pt.y) / 200) * 800;
    const val = `$${priceVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    setHover({ px, py, svgX: pt.x, svgY: pt.y, val });
  }, []);

  return (
    <ChartArea ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ cursor: 'crosshair' }}>
      <svg width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="btcGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c19862" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#c19862" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {[0, 50, 100, 150, 200].map(y => (
          <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
        ))}
        <path d={`${btcPath()} L600,200 L0,200 Z`} fill="url(#btcGrad)" />
        <path d={btcPath()} fill="none" stroke="#c19862" strokeWidth="2" ref={pathRef} />
        {hover && (
          <>
            <line x1={hover.svgX} y1="0" x2={hover.svgX} y2="200" stroke="#c19862" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.5" />
            <line x1="0" y1={hover.svgY} x2="600" y2={hover.svgY} stroke="#aaa" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.4" />
            <circle cx={hover.svgX} cy={hover.svgY} r="4" fill="#fff" stroke="#c19862" strokeWidth="2" />
          </>
        )}
      </svg>
      {hover && <Tooltip $x={hover.px} $y={hover.py - 8} $color="#c19862">{hover.val}</Tooltip>}
    </ChartArea>
  );
};

/* ══════════ COMPONENT ══════════ */

const Dashboard: React.FC = () => {
  const { t } = useTranslation();

  const kpiData = [
    { icon: '$', label: t('dashboard.todaysProfit'), value: '$8,925', change: '-3%', danger: true },
    { icon: '\u{1F3E6}', label: t('dashboard.balance'), value: '$2,98,00', change: '', danger: false },
    { icon: '\u{1F4B0}', label: t('dashboard.expenses'), value: '$52,908', change: '-6%', danger: true },
    { icon: '\u{1F4B3}', label: t('dashboard.transaction'), value: '$1,24,580', change: '-10%', danger: true },
  ];

  return (
    <Page>
      {/* Breadcrumb + Title */}
      <div>
        <Breadcrumb>
          <li><a href="#">{t('common.home')}</a></li>
          <li>{t('dashboard.title')}</li>
        </Breadcrumb>
        <ToolbarRow>
          <div>
            <PageTitle>{t('dashboard.welcomeBack', { name: 'Allie' })}</PageTitle>
            <PageSub>{t('dashboard.newMessages', { msgCount: 12, notifCount: 7 })}</PageSub>
          </div>
        </ToolbarRow>
      </div>

      {/* KPI Row */}
      <Row $cols="repeat(4, 1fr)" $gap={8}>
        {kpiData.map(kpi => (
          <KPIWrap key={kpi.label}>
            <KPIInner>
              <KPIIcon>{kpi.icon}</KPIIcon>
              <div>
                <KPILabel>{kpi.label}</KPILabel>
                <div>
                  <KPIValue>{kpi.value}</KPIValue>
                  {kpi.change && <KPIChange $danger={kpi.danger}>{kpi.change}</KPIChange>}
                </div>
              </div>
            </KPIInner>
          </KPIWrap>
        ))}
      </Row>

      {/* Crypto Cards with Sparklines */}
      <Row $cols="repeat(4, 1fr)" $gap={8}>
        {CRYPTO_CARDS.map(c => (
          <CryptoCard key={c.symbol}>
            <CryptoBody>
              <CryptoAvatar $bg={c.color}>{c.symbol}</CryptoAvatar>
              <div style={{ flex: 1 }}>
                <CryptoName>{c.name}</CryptoName>
                <CryptoPriceRow>
                  <CryptoPrice>{c.price}</CryptoPrice>
                  <KPIChange $danger={!c.up}>{c.change}</KPIChange>
                </CryptoPriceRow>
              </div>
            </CryptoBody>
            <InteractiveSparkline spark={c.spark} color={c.color} price={c.price} />
          </CryptoCard>
        ))}
      </Row>

      {/* Live Coins Carousel */}
      <CoinsScroll>
        {LIVE_COINS.map((coin, idx) => (
          <CoinChip key={coin.symbol}>
            <CryptoAvatar $bg={coin.bg}>{coin.symbol}</CryptoAvatar>
            <CoinInfo>
              <CoinName>{coin.name}</CoinName>
              <br />
              <CoinPrice>{coin.price}</CoinPrice>
            </CoinInfo>
            <InteractiveMiniSpark seed={idx} color={coin.bg} price={coin.price} />
          </CoinChip>
        ))}
      </CoinsScroll>

      {/* Quick Exchange + BTC Chart */}
      <Row $cols="1fr 2fr" $gap={16}>
        <ExchangeCard>
          <CardBody>
            <ExchangeTitle>{t('dashboard.quickExchange')}</ExchangeTitle>
            <ExchangeDesc>{t('dashboard.quickExchangeDesc')}</ExchangeDesc>
            <FormRow>
              <FormGroup>
                <FormLabel>{t('dashboard.selectCurrency')}</FormLabel>
                <FormSelect defaultValue="Bitcoin">
                  <option>Bitcoin</option>
                  <option>Ethereum</option>
                  <option>Ripple</option>
                  <option>Cardano</option>
                  <option>Stellar</option>
                </FormSelect>
              </FormGroup>
              <FormGroup>
                <FormLabel>{t('dashboard.paymentMethod')}</FormLabel>
                <FormSelect defaultValue={t('dashboard.directBankPayment')}>
                  <option>{t('dashboard.directBankPayment')}</option>
                  <option>{t('dashboard.creditCard')}</option>
                  <option>PayPal</option>
                </FormSelect>
              </FormGroup>
            </FormRow>
            <FormRow>
              <FormGroup>
                <FormLabel>{t('dashboard.enterYourAmount')}</FormLabel>
                <FormInput type="text" placeholder="0.0214 BTC" />
              </FormGroup>
              <FormGroup>
                <FormLabel>{t('dashboard.usdAmount')}</FormLabel>
                <FormInput type="text" placeholder="245.24" readOnly />
              </FormGroup>
            </FormRow>
            <div style={{ display: 'flex', gap: 8 }}>
              <ExchangeBtn>{t('dashboard.buyCoin')}</ExchangeBtn>
              <ExchangeBtn style={{ background: '#6c757d' }}>{t('dashboard.sellCoin')}</ExchangeBtn>
            </div>
          </CardBody>
        </ExchangeCard>

        <ChartCard>
          <ChartHeader>
            <ChartInfo>
              <ChartLabel>BTC / BITCOIN</ChartLabel>
              <ChartPriceVal>$11,590.90 <ChartChange $up>+5.24%</ChartChange></ChartPriceVal>
            </ChartInfo>
            <ChartTabs>
              <ChartTab>1D</ChartTab>
              <ChartTab>5D</ChartTab>
              <ChartTab $active>1M</ChartTab>
              <ChartTab>1Y</ChartTab>
              <ChartTab>5Y</ChartTab>
            </ChartTabs>
          </ChartHeader>
          <InteractiveBtcChart />
        </ChartCard>
      </Row>

      {/* Market Cap + Recent Transactions */}
      <Row $cols="1fr 2fr" $gap={16}>
        <Card>
          <CardBody style={{ padding: '16px 0' }}>
            <div style={{ padding: '0 16px 12px', fontWeight: 600, fontSize: '1rem' }}>{t('dashboard.marketCap')}</div>
            {MARKET_CAP.map(coin => (
              <MCRow key={coin.symbol}>
                <MCRank>{coin.rank}</MCRank>
                <MCIcon $bg={coin.bg}>{coin.symbol}</MCIcon>
                <MCInfo>
                  <MCName>{coin.name}<MCSymbol>{coin.symbol}</MCSymbol></MCName>
                </MCInfo>
                <div>
                  <MCPrice>{coin.price}</MCPrice>
                  <MCChangeTxt $up={coin.up}>{coin.change}</MCChangeTxt>
                </div>
              </MCRow>
            ))}
          </CardBody>
        </Card>

        <TableWrap>
          <TableTitle>{t('dashboard.recentTransaction')}</TableTitle>
          <StyledTable>
            <thead>
              <tr>
                <th>{t('dashboard.date')}</th>
                <th>{t('dashboard.type')}</th>
                <th>{t('dashboard.amountBtc')}</th>
                <th>{t('dashboard.btcRemaining')}</th>
                <th>{t('dashboard.price')}</th>
                <th>{t('dashboard.usd')}</th>
                <th>{t('dashboard.fee')}</th>
                <th>{t('dashboard.status')}</th>
              </tr>
            </thead>
            <tbody>
              {TRANSACTIONS.map((tx, i) => (
                <tr key={i}>
                  <td>{tx.date}</td>
                  <td style={{ color: tx.type === 'Buy' ? '#567ebb' : '#c47474', fontWeight: 600 }}>{tx.type === 'Buy' ? t('dashboard.buy') : t('dashboard.sell')}</td>
                  <td>{tx.amount}</td>
                  <td>{tx.remaining}</td>
                  <td>{tx.price}</td>
                  <td>{tx.usd}</td>
                  <td>{tx.fee}</td>
                  <td><StatusPill $type={tx.status}>{tx.status === 'accept' ? t('dashboard.accept') : t('dashboard.cancelStatus')}</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </StyledTable>
        </TableWrap>
      </Row>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', fontSize: '0.75rem', color: '#94a3b8' }}>
        <span>{t('footer.copyright', { year: 2023 })}</span>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>{t('footer.portfolio')}</a>
          <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>{t('footer.licenses')}</a>
          <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>{t('footer.support')}</a>
          <a href="#" style={{ color: '#94a3b8', textDecoration: 'none' }}>{t('footer.faqs')}</a>
        </div>
      </div>
    </Page>
  );
};

export default Dashboard;
