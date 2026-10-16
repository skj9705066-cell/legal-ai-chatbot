/**
 * 랜딩 일러스트 세트 (인라인 SVG, 외부 이미지 요청 없음).
 *
 * 스타일 규칙 — 모든 장면이 같은 언어를 쓴다:
 *  - 흰 종이/카드 + 아래쪽 두께(블루 100) + 바닥의 부드러운 그림자(radial) = 은은한 3D
 *  - 포인트 컬러는 블루(행동·강조)와 민트(확인됨) 두 가지만
 *  - 금액·보험사 로고·조회 결과처럼 보이는 요소, 의료 공포감을 주는 요소(주사·피 등)는 넣지 않는다
 * 장식이므로 모두 aria-hidden. viewBox 고정 비율이라 레이아웃 이동(CLS)이 없다.
 */

const C = {
  blue: "#0866F5",
  blue700: "#0550C4",
  blue400: "#4D93FF",
  blue300: "#8DB9FF",
  blue200: "#C2DAFE",
  blue100: "#DCEAFE",
  blue50: "#EEF5FF",
  navy: "#102B4E",
  navy700: "#1B3A63",
  navy300: "#CBD5E1",
  navy200: "#E2E8F0",
  navy100: "#EDF1F7",
  mint: "#16A085",
  mint100: "#D2F0E9",
  mint50: "#E9F7F3",
  deep: "#0B2445",
};

/** 공용 그라데이션·그림자 정의. 같은 페이지에 여러 번 그려져도 충돌하지 않게 id에 접두사를 붙인다. */
function Defs({ p }: { p: string }) {
  return (
    <defs>
      <radialGradient id={`${p}-shadow`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={C.navy} stopOpacity="0.18" />
        <stop offset="100%" stopColor={C.navy} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${p}-paper`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#F6F9FE" />
      </linearGradient>
      <linearGradient id={`${p}-blue`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={C.blue400} />
        <stop offset="100%" stopColor={C.blue} />
      </linearGradient>
      <linearGradient id={`${p}-mint`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#3CC6A6" />
        <stop offset="100%" stopColor={C.mint} />
      </linearGradient>
      <linearGradient id={`${p}-tile`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={C.blue50} />
        <stop offset="100%" stopColor="#F8FBFF" />
      </linearGradient>
    </defs>
  );
}

const Check = ({ x, y, s = 1, color = "#fff", w = 2.4 }: { x: number; y: number; s?: number; color?: string; w?: number }) => (
  <path
    d={`M${x - 4 * s} ${y}l${3 * s} ${3 * s} ${5.5 * s} -${6 * s}`}
    fill="none"
    stroke={color}
    strokeWidth={w}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

const Sparkle = ({ x, y, r = 5, color = C.blue300 }: { x: number; y: number; r?: number; color?: string }) => (
  <path
    d={`M${x} ${y - r}C${x + r * 0.15} ${y - r * 0.15} ${x + r * 0.15} ${y - r * 0.15} ${x + r} ${y}C${x + r * 0.15} ${y + r * 0.15} ${x + r * 0.15} ${y + r * 0.15} ${x} ${y + r}C${x - r * 0.15} ${y + r * 0.15} ${x - r * 0.15} ${y + r * 0.15} ${x - r} ${y}C${x - r * 0.15} ${y - r * 0.15} ${x - r * 0.15} ${y - r * 0.15} ${x} ${y - r}Z`}
    fill={color}
  />
);

const Line = ({ x, y, w, h = 4, c = C.navy200 }: { x: number; y: number; w: number; h?: number; c?: string }) => (
  <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={c} />
);

/** 병원 영수증 (원점 기준 70×104). 하단 지그재그 */
function Receipt({ p, cross = true }: { p: string; cross?: boolean }) {
  const zig = "V96l-7 6-7-6-7 6-7-6-7 6-7-6-7 6-7-6-7 6-7-6V8a8 8 0 0 1 8-8h54a8 8 0 0 1 8 8Z";
  return (
    <g>
      <path d={`M70 8${zig}`} transform="translate(3 5)" fill={C.blue100} />
      <path d={`M70 8${zig}`} fill={`url(#${p}-paper)`} stroke={C.navy200} />
      {cross && (
        <g>
          <rect x="9" y="10" width="18" height="18" rx="6" fill={C.blue50} />
          <path d="M18 14.5v9M13.5 19h9" stroke={C.blue} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      <Line x={32} y={13} w={28} c={C.navy300} />
      <Line x={32} y={21} w={18} />
      <Line x={10} y={40} w={30} />
      <Line x={48} y={40} w={12} c={C.navy300} />
      <Line x={10} y={51} w={24} />
      <Line x={48} y={51} w={12} c={C.navy300} />
      <Line x={10} y={62} w={28} />
      <Line x={48} y={62} w={12} c={C.navy300} />
      <path d="M10 75h50" stroke={C.navy200} strokeDasharray="3 3" />
      <Line x={10} y={82} w={20} h={5} c={C.navy300} />
      <Line x={42} y={81} w={18} h={7} c={C.blue} />
    </g>
  );
}

/** 보험증권 (원점 기준 80×104). 상단 블루 띠 + 접힌 모서리 + 직인 */
function Policy({ p, label = true }: { p: string; label?: boolean }) {
  return (
    <g>
      <path d="M0 10a10 10 0 0 1 10-10h50l20 20v74a10 10 0 0 1-10 10H10A10 10 0 0 1 0 94Z" transform="translate(3 5)" fill={C.blue100} />
      <path d="M0 10a10 10 0 0 1 10-10h50l20 20v74a10 10 0 0 1-10 10H10A10 10 0 0 1 0 94Z" fill={`url(#${p}-paper)`} stroke={C.navy200} />
      <path d="M0 10a10 10 0 0 1 10-10h50l10 10v12H0Z" fill={`url(#${p}-blue)`} />
      <path d="M60 0l20 20H66a6 6 0 0 1-6-6Z" fill={C.blue200} />
      {label ? (
        <text x="10" y="15.5" fontSize="9.5" fontWeight="800" fill="#fff" letterSpacing="-0.3">
          보험증권
        </text>
      ) : (
        <Line x={10} y={9} w={30} h={5} c="rgba(255,255,255,0.75)" />
      )}
      <Line x={10} y={34} w={44} c={C.navy300} />
      <Line x={10} y={45} w={58} />
      <Line x={10} y={55} w={52} />
      <Line x={10} y={65} w={40} />
      <circle cx="62" cy="84" r="10" fill={C.blue50} stroke={C.blue300} strokeWidth="1.5" />
      <circle cx="62" cy="84" r="5" fill="none" stroke={C.blue300} strokeWidth="1.5" />
      <Line x={10} y={82} w={26} h={5} c={C.navy300} />
    </g>
  );
}

/** 달력 (원점 기준 84×78). 표시된 날에 민트 체크 */
function Calendar({ p }: { p: string }) {
  const cells = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) {
      const hl = r === 1 && c === 2;
      cells.push(
        hl ? (
          <g key={`${r}${c}`}>
            <rect x={9 + c * 17.5} y={30 + r * 14} width={14} height={11} rx={3.5} fill={`url(#${p}-mint)`} />
            <Check x={9 + c * 17.5 + 6.5} y={35.5 + r * 14} s={0.62} w={1.8} />
          </g>
        ) : (
          <rect key={`${r}${c}`} x={9 + c * 17.5} y={30 + r * 14} width={14} height={11} rx={3.5} fill={C.navy100} />
        ),
      );
    }
  return (
    <g>
      <rect x="3" y="5" width="84" height="78" rx="12" fill={C.blue100} />
      <rect width="84" height="78" rx="12" fill={`url(#${p}-paper)`} stroke={C.navy200} />
      <path d="M0 12A12 12 0 0 1 12 0h60a12 12 0 0 1 12 12v8H0Z" fill={`url(#${p}-blue)`} />
      <rect x="20" y="-5" width="5" height="12" rx="2.5" fill={C.navy700} />
      <rect x="59" y="-5" width="5" height="12" rx="2.5" fill={C.navy700} />
      {cells}
    </g>
  );
}

/** 체크리스트 카드 (원점 기준 88×80). checked: 각 줄 체크 여부 */
function Checklist({ p, checked }: { p: string; checked: boolean[] }) {
  return (
    <g>
      <rect x="3" y="5" width="88" height="80" rx="13" fill={C.blue100} />
      <rect width="88" height="80" rx="13" fill="#fff" stroke={C.navy200} />
      {checked.map((on, i) => {
        const y = 14 + i * 22;
        return (
          <g key={i}>
            {on ? (
              <>
                <rect x="11" y={y} width="15" height="15" rx="5" fill={`url(#${p}-mint)`} />
                <Check x={18.5} y={y + 7.5} s={0.75} w={2} />
                <Line x={33} y={y + 5} w={i === 0 ? 42 : 36} h={5} />
              </>
            ) : (
              <>
                <rect x="11.75" y={y + 0.75} width="13.5" height="13.5" rx="4.5" fill="#fff" stroke={C.blue} strokeWidth="1.5" />
                <Line x={33} y={y + 5} w={40} h={5} c={C.blue200} />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** 클립보드형 의료 문서 (원점 기준 78×102). 심박선은 부드러운 블루 */
function MedicalDoc({ p }: { p: string }) {
  return (
    <g>
      <rect x="3" y="5" width="78" height="102" rx="12" fill={C.blue100} />
      <rect width="78" height="102" rx="12" fill={`url(#${p}-paper)`} stroke={C.navy200} />
      <rect x="24" y="-6" width="30" height="13" rx="5" fill={C.navy700} />
      <rect x="10" y="16" width="20" height="20" rx="7" fill={C.mint50} />
      <path d="M20 21v10M15 26h10" stroke={C.mint} strokeWidth="3" strokeLinecap="round" />
      <Line x={36} y={19} w={30} c={C.navy300} />
      <Line x={36} y={28} w={20} />
      <path d="M10 56h14l5-10 7 20 6-14 4 4h22" fill="none" stroke={C.blue400} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <Line x={10} y={76} w={52} />
      <Line x={10} y={86} w={38} />
    </g>
  );
}

/** 보장 방패 (원점 기준 64×76) */
function Shield({ p }: { p: string }) {
  const d = "M32 0l30 10v24c0 20-13 34-30 42C15 68 2 54 2 34V10Z";
  return (
    <g>
      <path d={d} transform="translate(2 4)" fill={C.blue700} />
      <path d={d} fill={`url(#${p}-blue)`} />
      <path d="M32 0v76C15 68 2 54 2 34V10Z" fill="#fff" opacity="0.14" />
      <Check x={33} y={37} s={2} w={5} />
    </g>
  );
}

/** 돋보기 (원점 기준 약 46×46) */
function Magnifier({ p }: { p: string }) {
  return (
    <g>
      <path d="M30 30l13 13" stroke={C.navy700} strokeWidth="8" strokeLinecap="round" />
      <circle cx="18" cy="18" r="17" fill={C.blue50} stroke={`url(#${p}-blue)`} strokeWidth="5" />
      <path d="M10 15a9 9 0 0 1 8-7" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  );
}

/** 되돌림 화살표 원 (원점 기준 40×40) */
function ReturnArrow({ p }: { p: string }) {
  return (
    <g>
      <circle cx="20" cy="22" r="20" fill={C.blue700} />
      <circle cx="20" cy="20" r="20" fill={`url(#${p}-blue)`} />
      <path d="M28 14a11 11 0 1 0 2 10" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M22.5 12.5h6.5V6" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function Floor({ p, cx, cy, rx, ry = 7 }: { p: string; cx: number; cy: number; rx: number; ry?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${p}-shadow)`} />;
}

/* ───────────────────────── 공감 카드 장면 (240×150) ───────────────────────── */

export type CaseArtKind = "receipt" | "policy" | "medical";

export function CaseArt({ kind, className }: { kind: CaseArtKind; className?: string }) {
  const p = `case-${kind}`;
  return (
    <svg viewBox="0 0 240 150" className={className} aria-hidden="true" focusable="false">
      <Defs p={p} />
      <rect width="240" height="150" fill={`url(#${p}-tile)`} />
      <circle cx="200" cy="26" r="46" fill="#fff" opacity="0.7" />
      <circle cx="34" cy="128" r="30" fill="#fff" opacity="0.55" />
      {kind === "receipt" && (
        <>
          <Floor p={p} cx={118} cy={136} rx={84} />
          <g transform="translate(54 18) rotate(-7 35 52)">
            <Receipt p={p} />
          </g>
          <g transform="translate(124 46) rotate(6 44 40)">
            <Checklist p={p} checked={[true, true, false]} />
          </g>
          <Sparkle x={196} y={36} r={6} />
          <Sparkle x={44} y={40} r={4} color={C.mint} />
        </>
      )}
      {kind === "policy" && (
        <>
          <Floor p={p} cx={118} cy={136} rx={84} />
          <g transform="translate(50 18) rotate(-8 40 52)">
            <Policy p={p} />
          </g>
          <g transform="translate(122 52) rotate(6 42 39)">
            <Calendar p={p} />
          </g>
          <Sparkle x={198} y={34} r={6} />
          <Sparkle x={38} y={44} r={4} color={C.mint} />
        </>
      )}
      {kind === "medical" && (
        <>
          <Floor p={p} cx={118} cy={136} rx={84} />
          <g transform="translate(58 22) rotate(-6 39 51)">
            <MedicalDoc p={p} />
          </g>
          <g transform="translate(134 50) rotate(5 32 38)">
            <Shield p={p} />
          </g>
          <Sparkle x={196} y={40} r={6} />
          <Sparkle x={42} y={42} r={4} color={C.mint} />
          <Sparkle x={210} y={112} r={3.5} color={C.blue400} />
        </>
      )}
    </svg>
  );
}

/* ───────────────────────── 점검 유형 아이콘 일러스트 (96×96) ───────────────────────── */

export type TypeArtKind = "unclaimed" | "hidden" | "refund";

export function TypeArt({ kind, className, idPrefix = "type" }: { kind: TypeArtKind; className?: string; idPrefix?: string }) {
  const p = `${idPrefix}-${kind}`;
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true" focusable="false">
      <Defs p={p} />
      <circle cx="48" cy="48" r="46" fill={`url(#${p}-tile)`} />
      <Floor p={p} cx={48} cy={84} rx={30} ry={5} />
      {kind === "unclaimed" && (
        <>
          <g transform="translate(22 14) scale(0.66) rotate(-6 35 52)">
            <Receipt p={p} />
          </g>
          <g transform="translate(56 52)">
            <circle cx="12" cy="13" r="12" fill="#0D7563" />
            <circle cx="12" cy="12" r="12" fill={`url(#${p}-mint)`} />
            <Check x={12.5} y={12} s={0.95} w={2.6} />
          </g>
        </>
      )}
      {kind === "hidden" && (
        <>
          <g transform="translate(18 14) scale(0.62) rotate(-6 40 52)">
            <Policy p={p} label={false} />
          </g>
          <g transform="translate(46 42) scale(0.8)">
            <Magnifier p={p} />
          </g>
          <Sparkle x={76} y={22} r={5} />
        </>
      )}
      {kind === "refund" && (
        <>
          <g transform="translate(20 14) scale(0.66) rotate(-6 35 52)">
            <Receipt p={p} cross={false} />
          </g>
          <g transform="translate(52 48) scale(0.8)">
            <ReturnArrow p={p} />
          </g>
        </>
      )}
    </svg>
  );
}

/* ───────────────────────── 히어로 장면 ───────────────────────── */

/** 3D 스마트폰 화면: 조회 결과가 아니라 '확인할 항목 체크리스트 + 상담 안내'를 보여준다 */
function PhoneScreen() {
  const p = "hero-phone";
  const rows = [
    { t: "병원비·수술비 청구", on: true },
    { t: "오래된 보험·만기", on: true },
    { t: "보험료 납입 내역", on: false },
  ];
  return (
    <svg viewBox="0 0 180 360" className="block h-auto w-full" aria-hidden="true" focusable="false">
      <Defs p={p} />
      <defs>
        <linearGradient id={`${p}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1E4373" />
          <stop offset="55%" stopColor={C.deep} />
          <stop offset="100%" stopColor="#071A33" />
        </linearGradient>
        <linearGradient id={`${p}-glass`} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="40%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* 측면 두께 */}
      <rect x="-5" y="4" width="182" height="354" rx="30" fill="#061629" />
      <rect x="0" y="0" width="180" height="360" rx="30" fill={`url(#${p}-body)`} />
      <rect x="0.75" y="0.75" width="178.5" height="358.5" rx="29.5" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="1.5" />
      <rect x="-3" y="86" width="3" height="26" rx="1.5" fill="#24497A" />
      <rect x="-3" y="120" width="3" height="40" rx="1.5" fill="#24497A" />
      {/* 화면 */}
      <rect x="8" y="8" width="164" height="344" rx="23" fill="#F3F7FC" />
      <rect x="66" y="15" width="48" height="14" rx="7" fill={C.deep} />
      <text x="22" y="26" fontSize="9" fontWeight="700" fill={C.navy}>
        9:41
      </text>
      {/* 앱 헤더 */}
      <rect x="18" y="44" width="20" height="20" rx="6" fill={`url(#${p}-blue)`} />
      <Check x={28.5} y={54} s={0.8} w={2.2} />
      <text x="44" y="58.5" fontSize="12.5" fontWeight="800" fill={C.navy} letterSpacing="-0.4">
        보험금 점검
      </text>
      {/* 체크리스트 카드 */}
      <rect x="16" y="76" width="148" height="96" rx="14" fill="#fff" />
      <text x="28" y="96" fontSize="9" fontWeight="800" fill={C.navy} letterSpacing="-0.3">
        내 보험 확인할 항목
      </text>
      {rows.map((r, i) => {
        const y = 108 + i * 20;
        return (
          <g key={r.t}>
            {r.on ? (
              <>
                <rect x="28" y={y} width="13" height="13" rx="4.5" fill={`url(#${p}-mint)`} />
                <Check x={34.5} y={y + 6.5} s={0.62} w={1.9} />
              </>
            ) : (
              <rect x="28.75" y={y + 0.75} width="11.5" height="11.5" rx="4" fill="#fff" stroke={C.blue} strokeWidth="1.5" />
            )}
            <text x="48" y={y + 10} fontSize="8.6" fontWeight="600" fill={r.on ? "#475569" : C.navy} letterSpacing="-0.3">
              {r.t}
            </text>
          </g>
        );
      })}
      {/* 상담 안내 카드 */}
      <rect x="16" y="182" width="148" height="62" rx="14" fill="#fff" />
      <circle cx="40" cy="213" r="13" fill={C.blue50} />
      <path d="M34 214v-2a6 6 0 0 1 12 0v2" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" />
      <rect x="32" y="212" width="4" height="6" rx="2" fill={C.blue} />
      <rect x="44" y="212" width="4" height="6" rx="2" fill={C.blue} />
      <text x="60" y="209" fontSize="8.6" fontWeight="800" fill={C.navy} letterSpacing="-0.3">
        상담사가 안내해요
      </text>
      <Line x={60} y={216} w={84} h={4.5} />
      <Line x={60} y={225} w={58} h={4.5} />
      {/* 진행 단계 */}
      <rect x="16" y="254" width="148" height="44" rx="14" fill="#fff" />
      <path d="M42 270h48M90 270h48" stroke={C.blue200} strokeWidth="2" />
      <path d="M42 270h48" stroke={C.blue} strokeWidth="2" />
      <circle cx="42" cy="270" r="6" fill={C.blue} />
      <circle cx="90" cy="270" r="6" fill="#fff" stroke={C.blue} strokeWidth="2" />
      <circle cx="138" cy="270" r="5" fill={C.navy200} />
      <text x="42" y="290" fontSize="7.4" fontWeight="700" fill={C.navy} textAnchor="middle">
        신청
      </text>
      <text x="90" y="290" fontSize="7.4" fontWeight="700" fill={C.navy} textAnchor="middle">
        상담 안내
      </text>
      <text x="138" y="290" fontSize="7.4" fontWeight="600" fill="#64748B" textAnchor="middle">
        보험사 확인
      </text>
      {/* CTA */}
      <rect x="16" y="308" width="148" height="30" rx="11" fill={`url(#${p}-blue)`} />
      <text x="90" y="327" fontSize="10" fontWeight="800" fill="#fff" textAnchor="middle" letterSpacing="-0.3">
        무료 점검 시작
      </text>
      <rect x="8" y="8" width="164" height="344" rx="23" fill={`url(#${p}-glass)`} opacity="0.35" />
    </svg>
  );
}

function FloatSvg({ children, viewBox }: { children: React.ReactNode; viewBox: string }) {
  return (
    <svg viewBox={viewBox} className="block h-auto w-full overflow-visible" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/**
 * 히어로 장면: 기울어진 3D 스마트폰 + 주변에 떠 있는 보험증권·병원 영수증·달력·체크 배지.
 * 비율 고정(400:280) 컨테이너 안에서 % 위치로 배치 → 화면 폭에 맞춰 그대로 축소된다.
 * 떠다니는 움직임은 아주 느리고 작으며, 움직임 줄이기 설정에서는 멈춘다.
 */
export function HeroScene({ className }: { className?: string }) {
  const p = "hero-float";
  return (
    <div aria-hidden="true" className={`relative aspect-[400/280] w-full select-none ${className ?? ""}`}>
      <div className="absolute left-1/2 top-1/2 h-[96%] w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(8,102,245,0.16),rgba(8,102,245,0))]" />
      <div className="absolute left-1/2 top-1/2 aspect-square w-[64%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-100" />
      {/* 바닥 그림자 */}
      <div className="absolute bottom-[1%] left-1/2 h-[7%] w-[44%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(16,43,78,0.28),rgba(16,43,78,0))]" />

      {/* 스마트폰 */}
      <div className="absolute left-1/2 top-[3%] w-[31%] -translate-x-1/2 [perspective:900px]">
        <div className="[transform:rotateY(-16deg)_rotateX(7deg)_rotateZ(3deg)] drop-shadow-[0_24px_28px_rgba(11,36,69,0.32)]">
          <PhoneScreen />
        </div>
      </div>

      {/* 보험증권 */}
      <div className="hero-float absolute left-[3%] top-[12%] w-[23%] [--r:-11deg]" style={{ animationDelay: "0s" }}>
        <FloatSvg viewBox="-4 -4 92 116">
          <Defs p={`${p}-a`} />
          <Policy p={`${p}-a`} />
        </FloatSvg>
      </div>
      {/* 병원 영수증 */}
      <div className="hero-float absolute right-[5%] top-[6%] w-[19%] [--r:10deg]" style={{ animationDelay: "-2.2s" }}>
        <FloatSvg viewBox="-4 -4 82 116">
          <Defs p={`${p}-b`} />
          <Receipt p={`${p}-b`} />
        </FloatSvg>
      </div>
      {/* 달력 */}
      <div className="hero-float absolute bottom-[10%] right-[4%] w-[21%] [--r:7deg]" style={{ animationDelay: "-3.6s" }}>
        <FloatSvg viewBox="-4 -8 96 96">
          <Defs p={`${p}-c`} />
          <Calendar p={`${p}-c`} />
        </FloatSvg>
      </div>
      {/* 체크 배지 */}
      <div className="hero-float absolute bottom-[13%] left-[12%] w-[13%] [--r:-6deg]" style={{ animationDelay: "-1.2s" }}>
        <FloatSvg viewBox="0 0 56 58">
          <Defs p={`${p}-d`} />
          <circle cx="28" cy="31" r="26" fill="#0D7563" />
          <circle cx="28" cy="28" r="26" fill={`url(#${p}-d-mint)`} />
          <circle cx="28" cy="28" r="26" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="3" />
          <Check x={29} y={28} s={2.1} w={5} />
        </FloatSvg>
      </div>
      {/* 반짝임 */}
      <div className="absolute left-[30%] top-[4%] w-[4%]">
        <FloatSvg viewBox="0 0 12 12">
          <Sparkle x={6} y={6} r={6} />
        </FloatSvg>
      </div>
      <div className="absolute right-[28%] bottom-[6%] w-[3%]">
        <FloatSvg viewBox="0 0 12 12">
          <Sparkle x={6} y={6} r={6} color={C.mint} />
        </FloatSvg>
      </div>
    </div>
  );
}

/* ───────────────────────── 절차 아이콘 (56×56) ───────────────────────── */

export type StepArtKind = "apply" | "guide" | "insurer";

export function StepArt({ kind, className, idPrefix = "step" }: { kind: StepArtKind; className?: string; idPrefix?: string }) {
  const p = `${idPrefix}-${kind}`;
  return (
    <svg viewBox="0 0 56 56" className={className} aria-hidden="true" focusable="false">
      <Defs p={p} />
      <rect x="2" y="4" width="52" height="52" rx="18" fill={C.blue100} />
      <rect x="2" y="0" width="52" height="52" rx="18" fill="#fff" stroke={C.navy200} />
      {kind === "apply" && (
        <>
          <rect x="17" y="11" width="22" height="30" rx="6" fill={`url(#${p}-blue)`} />
          <Line x={22} y={19} w={12} h={3.5} c="rgba(255,255,255,0.9)" />
          <Line x={22} y={26} w={9} h={3.5} c="rgba(255,255,255,0.6)" />
          <circle cx="37" cy="37" r="7" fill={`url(#${p}-mint)`} />
          <Check x={37.5} y={37} s={0.55} w={1.8} />
        </>
      )}
      {kind === "guide" && (
        <>
          <path d="M15 27v-3a13 13 0 0 1 26 0v3" fill="none" stroke={C.blue} strokeWidth="3.2" strokeLinecap="round" />
          <rect x="12" y="25" width="7" height="11" rx="3.5" fill={`url(#${p}-blue)`} />
          <rect x="37" y="25" width="7" height="11" rx="3.5" fill={`url(#${p}-blue)`} />
          <path d="M40.5 36c0 4-4 6-9 6" fill="none" stroke={C.blue400} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="30" cy="42" r="2.6" fill={C.blue} />
        </>
      )}
      {kind === "insurer" && (
        <>
          <path d="M28 10l16 8H12Z" fill={`url(#${p}-blue)`} />
          <rect x="14" y="20" width="4.5" height="14" rx="1.5" fill={C.blue300} />
          <rect x="22" y="20" width="4.5" height="14" rx="1.5" fill={C.blue300} />
          <rect x="30" y="20" width="4.5" height="14" rx="1.5" fill={C.blue300} />
          <rect x="11" y="35" width="28" height="5" rx="2" fill={C.blue} />
          <circle cx="40" cy="36" r="8" fill={`url(#${p}-mint)`} stroke="#fff" strokeWidth="2" />
          <Check x={40.5} y={36} s={0.62} w={2} />
        </>
      )}
    </svg>
  );
}
