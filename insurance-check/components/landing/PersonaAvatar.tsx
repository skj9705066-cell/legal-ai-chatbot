/**
 * 연령대만 구분하는 추상 인물 일러스트(얼굴·이름 없음). 실제 고객 사진처럼 보이지 않게 의도적으로 단순화했다.
 */
export type PersonaKind = "worker" | "senior" | "family" | "multi";

const BG: Record<PersonaKind, [string, string]> = {
  worker: ["#DCEAFE", "#B9D4FF"],
  senior: ["#DDF3EE", "#B7E4D8"],
  family: ["#EEF5FF", "#D5E3F7"],
  multi: ["#E8EEF8", "#C9D6EA"],
};

function Figure({
  hair,
  hairColor,
  shirt,
  skin = "#F4D2B8",
  glasses,
  tie,
  x = 48,
  scale = 1,
}: {
  hair: "short" | "receding" | "bob";
  hairColor: string;
  shirt: string;
  skin?: string;
  glasses?: boolean;
  tie?: boolean;
  x?: number;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x - 48 * scale} ${96 - 96 * scale}) scale(${scale})`}>
      {/* 어깨 */}
      <path d="M16 100c0-20 14-31 32-31s32 11 32 31z" fill={shirt} />
      {tie && (
        <>
          <path d="M41 69l7 9 7-9z" fill="#fff" />
          <path d="M46.5 75h3l1.5 3-3 15-3-15z" fill="#0866F5" />
        </>
      )}
      {/* 목·얼굴 */}
      <rect x="43" y="56" width="10" height="13" rx="4" fill={skin} opacity="0.85" />
      <ellipse cx="48" cy="44" rx="13.5" ry="15.5" fill={skin} />
      {/* 머리 */}
      {hair === "short" && <path d="M34.5 43c-1.5-14 5.5-21 14-21 9 0 15 6.5 13 21-1.5-6.5-6-10.5-13.5-10.5S36.5 36 34.5 43z" fill={hairColor} />}
      {hair === "receding" && <path d="M34.5 45c-1-9 2-15 6-17.5 1.5 3 4 4 7.5 4s6-1 7.5-4c4 2.5 7 8.5 6 17.5-1-4-2.5-7-4.5-8.5-2 1-5 1.5-9 1.5s-7-.5-9-1.5c-2 1.5-3.5 4.5-4.5 8.5z" fill={hairColor} />}
      {hair === "bob" && <path d="M33 56c-3-19 3-34 15-34s18 15 15 34c-2-6-3-14-5.5-20-5 3-12 4-19 2-2.5 5-3.5 12-5.5 18z" fill={hairColor} />}
      {glasses && (
        <g fill="none" stroke="#475569" strokeWidth="1.6">
          <circle cx="42.5" cy="46" r="4.2" />
          <circle cx="53.5" cy="46" r="4.2" />
          <path d="M46.7 46h2.6" />
        </g>
      )}
    </g>
  );
}

export function PersonaAvatar({ kind, className }: { kind: PersonaKind; className?: string }) {
  const [a, b] = BG[kind];
  const id = `persona-${kind}`;
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="48" cy="48" r="48" />
        </clipPath>
      </defs>
      <circle cx="48" cy="48" r="48" fill={`url(#${id}-bg)`} />
      <g clipPath={`url(#${id}-clip)`}>
        {kind === "worker" && <Figure hair="short" hairColor="#1E2B3C" shirt="#102B4E" tie />}
        {kind === "senior" && <Figure hair="receding" hairColor="#CBD5E1" shirt="#16A085" skin="#EFCDB4" glasses />}
        {kind === "family" && (
          <>
            {/* 뒤: 부모님(회색 머리) / 앞: 자녀 */}
            <Figure hair="receding" hairColor="#D5DCE6" shirt="#8DB9FF" skin="#EBC8AE" x={64} scale={0.78} />
            <Figure hair="bob" hairColor="#3A2E2A" shirt="#0866F5" x={40} scale={0.92} />
          </>
        )}
        {kind === "multi" && (
          <>
            <Figure hair="bob" hairColor="#2B2F3A" shirt="#475569" />
            {/* 여러 장의 증권 */}
            <g transform="translate(62 58) rotate(8)">
              <rect width="20" height="26" rx="3" fill="#fff" opacity="0.7" />
            </g>
            <g transform="translate(58 61) rotate(-4)">
              <rect width="20" height="26" rx="3" fill="#fff" />
              <rect x="4" y="6" width="12" height="2.4" rx="1.2" fill="#8DB9FF" />
              <rect x="4" y="11" width="9" height="2.4" rx="1.2" fill="#CBD5E1" />
              <rect x="4" y="16" width="11" height="2.4" rx="1.2" fill="#CBD5E1" />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}
