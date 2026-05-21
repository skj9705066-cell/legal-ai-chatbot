import type { Lawyer, LawyerProposal } from "./types";

export const DEMO_LAWYERS: Lawyer[] = [
  {
    id: "lw_001",
    name: "김지훈",
    avatar: "👨‍⚖️",
    firm: "법무법인 율현",
    specialties: ["형사", "사기", "횡령"],
    yearsExperience: 14,
    rating: 4.9,
    reviewCount: 218,
    winRate: 87,
    similarCases: 142,
    bio: "서울지검 검사 출신. 재산범죄·기업범죄 사건을 14년간 다뤘으며, 수사기관의 시각을 정확히 분석해 방어 전략을 설계합니다.",
    reviews: [
      {
        author: "박**",
        rating: 5,
        text: "검찰 단계에서 무혐의 처분 받았습니다. 사건 전 과정을 꼼꼼하게 챙겨주셨어요.",
      },
      {
        author: "이**",
        rating: 5,
        text: "조사 전 충분히 시뮬레이션해주셔서 든든했습니다.",
      },
      {
        author: "최**",
        rating: 4,
        text: "결과 만족합니다. 다만 답변이 가끔 늦은 적이 있었어요.",
      },
    ],
  },
  {
    id: "lw_002",
    name: "이서연",
    avatar: "👩‍⚖️",
    firm: "서연 가정법률사무소",
    specialties: ["이혼", "상속", "가족"],
    yearsExperience: 11,
    rating: 4.8,
    reviewCount: 176,
    winRate: 82,
    similarCases: 98,
    bio: "가사사건 전담. 합의·조정 노하우가 풍부하며 의뢰인의 감정적 어려움까지 함께 고려합니다.",
    reviews: [
      {
        author: "김**",
        rating: 5,
        text: "조정에서 양육권을 지킬 수 있도록 도와주셨습니다.",
      },
      {
        author: "정**",
        rating: 5,
        text: "감정적으로 힘든 시기를 잘 이끌어주셨어요.",
      },
      {
        author: "한**",
        rating: 4,
        text: "재산분할 결과 만족스럽습니다.",
      },
    ],
  },
  {
    id: "lw_003",
    name: "박준성",
    avatar: "🧑‍⚖️",
    firm: "법무법인 정도",
    specialties: ["부동산", "임대차", "재건축"],
    yearsExperience: 17,
    rating: 4.7,
    reviewCount: 304,
    winRate: 79,
    similarCases: 213,
    bio: "부동산 분쟁만 17년. 임대차·매매·재건축·재개발 사건 다수 처리. 등기·세무 이슈도 함께 검토합니다.",
    reviews: [
      {
        author: "조**",
        rating: 5,
        text: "보증금 전액 회수했습니다. 감사합니다.",
      },
      {
        author: "윤**",
        rating: 4,
        text: "복잡한 사안인데 명료하게 정리해주셨어요.",
      },
    ],
  },
  {
    id: "lw_004",
    name: "최민아",
    avatar: "👩‍💼",
    firm: "노동권 법률센터",
    specialties: ["노동", "부당해고", "임금체불"],
    yearsExperience: 9,
    rating: 4.9,
    reviewCount: 142,
    winRate: 91,
    similarCases: 187,
    bio: "노동위원회 조사관 출신. 노동청·지방노동위원회 절차에 정통하며, 근로자 권리구제 사건을 다수 수행했습니다.",
    reviews: [
      {
        author: "오**",
        rating: 5,
        text: "부당해고 구제신청 인용 받았습니다.",
      },
      {
        author: "권**",
        rating: 5,
        text: "체불임금 전액 받아냈습니다. 정말 든든했어요.",
      },
      {
        author: "신**",
        rating: 5,
        text: "절차 안내가 매우 명확했습니다.",
      },
    ],
  },
  {
    id: "lw_005",
    name: "정태원",
    avatar: "🧑‍💼",
    firm: "법무법인 한결",
    specialties: ["계약", "손해배상", "상사"],
    yearsExperience: 20,
    rating: 4.6,
    reviewCount: 256,
    winRate: 84,
    similarCases: 165,
    bio: "대형 로펌 출신 20년 경력. 계약 분쟁·M&A·손해배상 자문 전문. 실용적인 해결책 제시에 강점.",
    reviews: [
      {
        author: "임**",
        rating: 5,
        text: "주주간 분쟁을 합리적으로 매듭지어 주셨습니다.",
      },
      {
        author: "강**",
        rating: 4,
        text: "전문성 최고입니다.",
      },
    ],
  },
];

const MESSAGE_TEMPLATES = [
  "유사 사건 다수 경험. 신속히 대응해 드리겠습니다.",
  "초기 상담에서 쟁점부터 정리해 드립니다.",
  "사안 검토 결과 충분히 다툴 만한 사건입니다.",
  "증거 보강 전략부터 함께 설계하겠습니다.",
  "지난주에도 동종 사건 승소 사례가 있었습니다.",
  "착수 즉시 내용증명부터 발송 가능합니다.",
  "변론 전략을 분명히 가지고 임하겠습니다.",
  "양측 합의 가능성도 함께 검토해드립니다.",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getLawyerById(id: string): Lawyer | null {
  return DEMO_LAWYERS.find((l) => l.id === id) ?? null;
}

export function generateProposals(opts: {
  count: number;
  feeMin: number;
  feeMax: number;
  preferredSpecialty?: string;
}): LawyerProposal[] {
  const { count, feeMin, feeMax, preferredSpecialty } = opts;

  const ranked = [...DEMO_LAWYERS].sort((a, b) => {
    const aHit = preferredSpecialty && a.specialties.includes(preferredSpecialty);
    const bHit = preferredSpecialty && b.specialties.includes(preferredSpecialty);
    if (aHit && !bHit) return -1;
    if (!aHit && bHit) return 1;
    return b.rating - a.rating;
  });

  const pool = shuffle(ranked).slice(0, count);

  return pool.map((lawyer, idx) => {
    const span = Math.max(feeMax - feeMin, 10_000);
    const skew = 0.25 + Math.random() * 0.7;
    const raw = feeMin + span * skew;
    const fee = Math.round(raw / 10_000) * 10_000;
    return {
      id: `prop_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      lawyerId: lawyer.id,
      fee,
      message: pickRandom(MESSAGE_TEMPLATES),
      arrivedAt: Date.now(),
    };
  });
}
