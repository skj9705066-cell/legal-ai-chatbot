/**
 * 방문 점검 랜딩 일러스트 (인라인 SVG — 외부 이미지 요청 0, 고정 비율로 레이아웃 흔들림 없음).
 * 규칙: 따뜻한 아이보리·세이지·딥그린·베이지골드만. 금액·보험사·카드사 로고·불안을 주는 요소(경고·병원 장면)는 그리지 않는다.
 * 장식이므로 모두 aria-hidden.
 */

const C = {
  forest: "#31594C",
  forestLight: "#5E8576",
  sage: "#E5EFE7",
  sageDeep: "#C4D8CE",
  gold: "#D5B58A",
  goldLight: "#EBDAC1",
  ivory: "#FAF8F4",
  paper: "#FFFFFF",
  charcoal: "#303B35",
  line: "#DDE2DC",
};

/** 히어로: 찻잔 옆 휴대폰 화면의 체크리스트(카드포인트·보험금 항목) + 돋보기 + 카드 */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 400" className={className} aria-hidden="true" focusable="false">
      {/* 바닥 원 */}
      <ellipse cx="240" cy="352" rx="200" ry="26" fill={C.sageDeep} opacity="0.55" />
      <circle cx="250" cy="190" r="168" fill={C.sage} />

      {/* 카드(뒤) */}
      <g className="hero-float" style={{ ["--r" as string]: "-10deg" }}>
        <rect x="70" y="150" width="150" height="96" rx="14" fill={C.forest} />
        <rect x="86" y="172" width="30" height="22" rx="5" fill={C.gold} />
        <rect x="86" y="214" width="96" height="9" rx="4.5" fill={C.forestLight} />
      </g>

      {/* 휴대폰 */}
      <g>
        <rect x="190" y="70" width="150" height="270" rx="26" fill={C.charcoal} />
        <rect x="200" y="84" width="130" height="242" rx="18" fill={C.ivory} />
        <rect x="245" y="92" width="40" height="6" rx="3" fill={C.line} />
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(212 ${120 + i * 62})`}>
            <rect width="106" height="48" rx="12" fill={C.paper} stroke={C.line} strokeWidth="1.5" />
            <circle cx="22" cy="24" r="11" fill={i === 2 ? C.paper : C.forest} stroke={C.forest} strokeWidth="2" />
            {i < 2 && <path d="m16.5 24 4 4 7-8" fill="none" stroke={C.paper} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
            <rect x="42" y="15" width="50" height="7" rx="3.5" fill={C.charcoal} opacity="0.75" />
            <rect x="42" y="28" width="36" height="6" rx="3" fill={C.line} />
          </g>
        ))}
      </g>

      {/* 돋보기 */}
      <g className="hero-float" style={{ ["--r" as string]: "8deg" }}>
        <circle cx="356" cy="250" r="40" fill={C.paper} fillOpacity="0.55" stroke={C.gold} strokeWidth="12" />
        <rect x="380" y="282" width="16" height="58" rx="8" fill={C.gold} transform="rotate(-40 388 311)" />
      </g>

      {/* 찻잔 */}
      <g>
        <path d="M84 290h78v14c0 22-17 38-39 38s-39-16-39-38v-14Z" fill={C.paper} stroke={C.line} strokeWidth="2" />
        <path d="M162 298c14 0 20 8 20 16s-8 16-20 15" fill="none" stroke={C.line} strokeWidth="6" strokeLinecap="round" />
        <path d="M106 276c0-8 8-8 8-16M124 276c0-8 8-8 8-16" fill="none" stroke={C.forestLight} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      </g>

      {/* 잎 장식 */}
      <path d="M408 120c-30 4-44 26-40 52 26-4 42-24 40-52Z" fill={C.forestLight} opacity="0.55" />
      <path d="M78 96c22 6 30 24 24 44-20-6-30-22-24-44Z" fill={C.gold} opacity="0.6" />
    </svg>
  );
}

/** 상담사 사진이 없을 때 쓰는 이니셜 아이콘 */
export function CounselorMark({ initial, className }: { initial: string; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true" focusable="false">
      <circle cx="60" cy="60" r="60" fill={C.sage} />
      <circle cx="60" cy="60" r="48" fill={C.forest} />
      <text x="60" y="61" textAnchor="middle" dominantBaseline="central" fontSize="44" fontWeight="800" fill={C.paper} fontFamily="Pretendard Variable, Pretendard, sans-serif">
        {initial}
      </text>
    </svg>
  );
}
