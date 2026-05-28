interface Props {
  size?: "sm" | "md" | "lg";
  expression?: "smile" | "thinking" | "complete";
  className?: string;
  ariaLabel?: string;
}

const SIZE_PX = { sm: 40, md: 80, lg: 200 };

export default function RobotMascot({
  size = "md",
  expression = "smile",
  className,
  ariaLabel = "로셀 AI 변호사",
}: Props) {
  const w = SIZE_PX[size];
  const h = Math.round(w * 1.2);

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 100 120"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      {/* Arms (behind body) */}
      <rect x="20" y="72" width="10" height="22" rx="5" fill="#4338CA" />
      <rect x="70" y="72" width="10" height="22" rx="5" fill="#4338CA" />

      {/* Body */}
      <rect x="32" y="70" width="36" height="32" rx="8" fill="#4338CA" />

      {/* White tie/collar */}
      <path d="M 50 70 L 46 78 L 50 84 L 54 78 Z" fill="#ffffff" />

      {/* AI badge */}
      <rect x="42" y="86" width="16" height="11" rx="2.5" fill="#5B52E0" />
      <text
        x="50"
        y="94.5"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="7"
        fontWeight="800"
        fontFamily="-apple-system, BlinkMacSystemFont, system-ui, sans-serif"
        letterSpacing="0.5"
      >
        AI
      </text>

      {/* Legs */}
      <rect x="38" y="102" width="10" height="12" rx="3" fill="#4338CA" />
      <rect x="52" y="102" width="10" height="12" rx="3" fill="#4338CA" />

      {/* Scales of justice — held by right arm */}
      <g
        stroke="#B89B6A"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      >
        <line x1="86" y1="60" x2="86" y2="94" />
        <circle cx="86" cy="60" r="2" fill="#5B52E0" />
        <line x1="76" y1="64" x2="96" y2="64" />
        <line x1="76" y1="64" x2="76" y2="70" />
        <line x1="96" y1="64" x2="96" y2="70" />
        <ellipse cx="76" cy="72" rx="4" ry="1.5" />
        <ellipse cx="96" cy="72" rx="4" ry="1.5" />
      </g>

      {/* Head outer (indigo) */}
      <circle cx="50" cy="44" r="27" fill="#4338CA" />
      {/* Head inner (lighter indigo face) */}
      <circle cx="50" cy="45" r="23" fill="#5B52E0" />

      {/* Judge cap (mortarboard) — board */}
      <polygon points="22,18 78,18 74,28 26,28" fill="#1E1B4B" />
      {/* Cap top button */}
      <ellipse cx="50" cy="17" rx="4" ry="2" fill="#1E1B4B" />

      {/* Tassel */}
      <line
        x1="74"
        y1="24"
        x2="82"
        y2="38"
        stroke="#B89B6A"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="82" cy="40" r="2.4" fill="#B89B6A" />

      {/* Expression: eyes + mouth */}
      {expression === "smile" && (
        <g>
          <ellipse cx="41" cy="45" rx="4" ry="5" fill="#ffffff" />
          <ellipse cx="59" cy="45" rx="4" ry="5" fill="#ffffff" />
          <circle cx="42" cy="46" r="2" fill="#1E1B4B" />
          <circle cx="60" cy="46" r="2" fill="#1E1B4B" />
          <circle cx="42.8" cy="44.7" r="0.7" fill="#ffffff" />
          <circle cx="60.8" cy="44.7" r="0.7" fill="#ffffff" />
          <path
            d="M 44 57 Q 50 62 56 57"
            stroke="#1E1B4B"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      )}

      {expression === "thinking" && (
        <g>
          <line
            x1="37"
            y1="45"
            x2="45"
            y2="45"
            stroke="#ffffff"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <line
            x1="55"
            y1="45"
            x2="63"
            y2="45"
            stroke="#ffffff"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <g fill="#ffffff">
            <circle cx="46" cy="57" r="1.2">
              <animate
                attributeName="opacity"
                values="0.3;1;0.3"
                dur="1.4s"
                repeatCount="indefinite"
              />
            </circle>
            <circle cx="50" cy="57" r="1.2">
              <animate
                attributeName="opacity"
                values="0.3;1;0.3"
                dur="1.4s"
                begin="0.2s"
                repeatCount="indefinite"
              />
            </circle>
            <circle cx="54" cy="57" r="1.2">
              <animate
                attributeName="opacity"
                values="0.3;1;0.3"
                dur="1.4s"
                begin="0.4s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        </g>
      )}

      {expression === "complete" && (
        <g>
          <path
            d="M 36 47 Q 41 41 46 47"
            stroke="#ffffff"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 54 47 Q 59 41 64 47"
            stroke="#ffffff"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 43 55 Q 50 64 57 55"
            stroke="#ffffff"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {/* Check mark badge over AI badge */}
          <circle cx="66" cy="91" r="5.5" fill="#00C853" />
          <path
            d="M 63.2 91 L 65.5 93.3 L 69 89.8"
            stroke="#ffffff"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
}
