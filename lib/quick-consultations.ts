export interface QuickConsultation {
  slug: string;
  title: string;
  icon: string;
  prompt: string;
}

export const QUICK_CONSULTATIONS: QuickConsultation[] = [
  {
    slug: "criminal",
    title: "형사",
    icon: "⚖️",
    prompt:
      "형사 사건과 관련해 상담드리고 싶습니다. 사건 경위와 현재 진행 상황을 말씀드릴 테니, 적용 가능한 죄명·예상 처벌·대응 방안을 알려주세요.",
  },
  {
    slug: "divorce",
    title: "이혼",
    icon: "💔",
    prompt:
      "이혼을 고려하고 있습니다. 위자료·재산분할·양육권 등 어떤 점을 준비해야 하고, 어떤 증거가 필요한지 안내해주세요.",
  },
  {
    slug: "realestate",
    title: "부동산",
    icon: "🏠",
    prompt:
      "부동산 관련 분쟁이 있습니다. 임대차·매매·재건축 등 구체적인 상황을 설명드릴 테니 법적 쟁점과 대응 절차를 알려주세요.",
  },
  {
    slug: "labor",
    title: "노동",
    icon: "💼",
    prompt:
      "직장에서 발생한 문제(부당해고, 임금체불, 직장 내 괴롭힘 등)로 상담이 필요합니다. 권리구제 절차와 필요한 자료를 알려주세요.",
  },
  {
    slug: "contract",
    title: "계약",
    icon: "📄",
    prompt:
      "계약 분쟁에 대해 상담드리고 싶습니다. 계약 위반·해지·손해배상 청구 등 어떤 점을 검토해야 하는지 안내해주세요.",
  },
  {
    slug: "damages",
    title: "손해배상",
    icon: "💢",
    prompt:
      "손해배상 청구를 고려하고 있습니다. 청구 요건, 인정 가능한 손해의 범위, 위자료 산정 기준을 안내해주세요.",
  },
];

export function getQuickConsultation(
  slug: string,
): QuickConsultation | undefined {
  return QUICK_CONSULTATIONS.find((q) => q.slug === slug);
}
