/**
 * Admin dashboard dummy data + types.
 * Keep DB-ready: each entity has plain shape, no closures over UI state.
 * When swapping to a real backend, replace the exported arrays with fetchers
 * returning the same shapes.
 */

/* ─── Dashboard ─────────────────────────────────────────── */

export interface DashboardStats {
  todayConsultations: number;
  consultationsChange: number;
  matchingsToday: number;
  matchingsChange: number;
  registeredLawyers: number;
  pendingLawyers: number;
  newUsers: number;
  newUsersChange: number;
  weekChart: { day: string; count: number }[];
}

export const DASHBOARD_STATS: DashboardStats = {
  todayConsultations: 128,
  consultationsChange: 12,
  matchingsToday: 34,
  matchingsChange: 8,
  registeredLawyers: 47,
  pendingLawyers: 5,
  newUsers: 89,
  newUsersChange: 15,
  weekChart: [
    { day: "월", count: 76 },
    { day: "화", count: 92 },
    { day: "수", count: 88 },
    { day: "목", count: 105 },
    { day: "금", count: 121 },
    { day: "토", count: 98 },
    { day: "일", count: 128 },
  ],
};

/* ─── Lawyers ───────────────────────────────────────────── */

export type LawyerStatus = "pending" | "approved" | "rejected";

export interface AdminLawyer {
  id: string;
  name: string;
  firm: string;
  specialties: string[];
  yearsExperience: number;
  appliedAt: string;
  status: LawyerStatus;
  rejectionReason?: string;
  licenseNumber: string;
  barAssociation: string;
  applicationNote: string;
}

export const ADMIN_LAWYERS: AdminLawyer[] = [
  {
    id: "alw_001",
    name: "김지훈",
    firm: "법무법인 율현",
    specialties: ["형사", "사기", "횡령"],
    yearsExperience: 14,
    appliedAt: "2026-05-20T09:12:00Z",
    status: "pending",
    licenseNumber: "변호사 제12345호",
    barAssociation: "서울지방변호사회",
    applicationNote: "서울지검 검사 출신, 재산범죄 14년 경력",
  },
  {
    id: "alw_002",
    name: "이서연",
    firm: "서연 가정법률사무소",
    specialties: ["이혼", "상속", "가족"],
    yearsExperience: 11,
    appliedAt: "2026-05-19T14:30:00Z",
    status: "approved",
    licenseNumber: "변호사 제23456호",
    barAssociation: "서울지방변호사회",
    applicationNote: "가사사건 전담, 조정 노하우 풍부",
  },
  {
    id: "alw_003",
    name: "박준성",
    firm: "법무법인 정도",
    specialties: ["부동산", "임대차", "재건축"],
    yearsExperience: 17,
    appliedAt: "2026-05-18T11:00:00Z",
    status: "approved",
    licenseNumber: "변호사 제34567호",
    barAssociation: "서울지방변호사회",
    applicationNote: "부동산 분쟁 전문 17년, 등기·세무 검토 포함",
  },
  {
    id: "alw_004",
    name: "최예진",
    firm: "예진 법률사무소",
    specialties: ["노동", "산재", "임금체불"],
    yearsExperience: 8,
    appliedAt: "2026-05-21T08:45:00Z",
    status: "pending",
    licenseNumber: "변호사 제45678호",
    barAssociation: "서울지방변호사회",
    applicationNote: "노무사 자격 보유, 노동위원회 다수 진행",
  },
  {
    id: "alw_005",
    name: "양민호",
    firm: "법무법인 한결",
    specialties: ["계약", "기업법무", "M&A"],
    yearsExperience: 21,
    appliedAt: "2026-05-15T16:20:00Z",
    status: "approved",
    licenseNumber: "변호사 제56789호",
    barAssociation: "서울지방변호사회",
    applicationNote: "기업 인수합병 자문 21년",
  },
  {
    id: "alw_006",
    name: "한지수",
    firm: "지수 법률사무소",
    specialties: ["형사", "성범죄", "음주운전"],
    yearsExperience: 6,
    appliedAt: "2026-05-21T13:10:00Z",
    status: "pending",
    licenseNumber: "변호사 제67890호",
    barAssociation: "경기북부지방변호사회",
    applicationNote: "교통·형사 사건 다수 처리",
  },
  {
    id: "alw_007",
    name: "조현우",
    firm: "법무법인 신뢰",
    specialties: ["손해배상", "교통사고", "의료"],
    yearsExperience: 9,
    appliedAt: "2026-05-17T10:00:00Z",
    status: "rejected",
    rejectionReason: "서류 미비 — 변호사 등록증 사본 미제출",
    licenseNumber: "변호사 제78901호",
    barAssociation: "서울지방변호사회",
    applicationNote: "교통사고 손해배상 전문",
  },
  {
    id: "alw_008",
    name: "정민서",
    firm: "민서 법률사무소",
    specialties: ["이혼", "양육권"],
    yearsExperience: 5,
    appliedAt: "2026-05-21T15:30:00Z",
    status: "pending",
    licenseNumber: "변호사 제89012호",
    barAssociation: "서울지방변호사회",
    applicationNote: "가사 전담 5년, 조정 위주 처리",
  },
  {
    id: "alw_009",
    name: "강도윤",
    firm: "법무법인 정직",
    specialties: ["부동산", "건설"],
    yearsExperience: 12,
    appliedAt: "2026-05-21T17:00:00Z",
    status: "pending",
    licenseNumber: "변호사 제90123호",
    barAssociation: "서울지방변호사회",
    applicationNote: "건설·하자 분쟁 전문",
  },
];

/* ─── Consultations ─────────────────────────────────────── */

export interface AdminConsultationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AdminConsultation {
  id: string;
  userName: string;
  category: string;
  title: string;
  startedAt: string;
  messageCount: number;
  analyzed: boolean;
  matched: boolean;
  messages: AdminConsultationMessage[];
}

export const ADMIN_CONSULTATIONS: AdminConsultation[] = [
  {
    id: "ac_001",
    userName: "박**",
    category: "형사",
    title: "음주운전 1회차, 혈중알코올 0.08% 적발",
    startedAt: "2026-05-21T18:45:00Z",
    messageCount: 14,
    analyzed: true,
    matched: true,
    messages: [
      { role: "user", content: "어제 음주운전으로 적발됐어요. 혈중알코올 0.08% 나왔습니다." },
      { role: "assistant", content: "면허 정지 수치(0.03~0.08% 미만)와 면허 취소 수치(0.08% 이상)의 경계입니다. 자세한 적발 경위를 알려주세요." },
    ],
  },
  {
    id: "ac_002",
    userName: "김**",
    category: "부동산",
    title: "전세 계약 만료 후 보증금 반환 거부",
    startedAt: "2026-05-21T15:20:00Z",
    messageCount: 21,
    analyzed: true,
    matched: true,
    messages: [
      { role: "user", content: "전세 만료 두 달 지났는데 보증금을 안 돌려줘요." },
      { role: "assistant", content: "임차권 등기명령 신청과 보증금 반환 청구 소송을 병행할 수 있습니다." },
    ],
  },
  {
    id: "ac_003",
    userName: "이**",
    category: "이혼",
    title: "배우자 외도로 인한 이혼 재산분할 문제",
    startedAt: "2026-05-21T12:10:00Z",
    messageCount: 18,
    analyzed: true,
    matched: true,
    messages: [
      { role: "user", content: "배우자 외도 증거 확보했습니다. 이혼·재산분할 진행하려고요." },
      { role: "assistant", content: "유책배우자의 위자료 책임과 재산분할 비율에 대해 안내드립니다." },
    ],
  },
  {
    id: "ac_004",
    userName: "최**",
    category: "노동",
    title: "부당해고 통보, 근무기간 3년 정규직",
    startedAt: "2026-05-21T09:30:00Z",
    messageCount: 12,
    analyzed: true,
    matched: false,
    messages: [
      { role: "user", content: "이메일로 해고 통보를 받았습니다. 정규직 3년 근무했어요." },
      { role: "assistant", content: "근로기준법상 해고 사유의 정당성과 절차의 적법성을 검토해야 합니다." },
    ],
  },
  {
    id: "ac_005",
    userName: "정**",
    category: "계약",
    title: "프랜차이즈 계약 해지 위약금 분쟁",
    startedAt: "2026-05-21T16:50:00Z",
    messageCount: 9,
    analyzed: false,
    matched: false,
    messages: [
      { role: "user", content: "프랜차이즈 본사에서 계약 해지하라며 위약금 5천만 원을 요구합니다." },
    ],
  },
  {
    id: "ac_006",
    userName: "한**",
    category: "형사",
    title: "폭행 피해, 전치 3주 진단서 발급",
    startedAt: "2026-05-20T22:00:00Z",
    messageCount: 16,
    analyzed: true,
    matched: true,
    messages: [
      { role: "user", content: "지난 주 폭행 피해를 입었고 전치 3주 진단서 발급받았습니다." },
      { role: "assistant", content: "형사 고소와 별개로 민사상 손해배상 청구가 가능합니다." },
    ],
  },
];

/* ─── Matchings ─────────────────────────────────────────── */

export type MatchingStatus = "matching" | "complete" | "canceled";

export interface AdminMatching {
  id: string;
  caseTitle: string;
  category: string;
  userName: string;
  proposalCount: number;
  selectedLawyer?: string;
  status: MatchingStatus;
  createdAt: string;
}

export const ADMIN_MATCHINGS: AdminMatching[] = [
  {
    id: "am_001",
    caseTitle: "음주운전 1회차, 혈중알코올 0.08% 적발",
    category: "형사",
    userName: "박**",
    proposalCount: 7,
    selectedLawyer: "김○○ 변호사",
    status: "complete",
    createdAt: "2026-05-21T19:00:00Z",
  },
  {
    id: "am_002",
    caseTitle: "전세 계약 만료 후 보증금 반환 거부",
    category: "부동산",
    userName: "김**",
    proposalCount: 12,
    selectedLawyer: "박○○ 변호사",
    status: "complete",
    createdAt: "2026-05-21T15:40:00Z",
  },
  {
    id: "am_003",
    caseTitle: "배우자 외도로 인한 이혼 재산분할 문제",
    category: "이혼",
    userName: "이**",
    proposalCount: 9,
    selectedLawyer: "이○○ 변호사",
    status: "complete",
    createdAt: "2026-05-21T13:00:00Z",
  },
  {
    id: "am_004",
    caseTitle: "부당해고 통보, 근무기간 3년 정규직",
    category: "노동",
    userName: "최**",
    proposalCount: 11,
    status: "matching",
    createdAt: "2026-05-21T10:00:00Z",
  },
  {
    id: "am_005",
    caseTitle: "프랜차이즈 계약 해지 위약금 분쟁",
    category: "계약",
    userName: "정**",
    proposalCount: 6,
    status: "matching",
    createdAt: "2026-05-21T17:10:00Z",
  },
  {
    id: "am_006",
    caseTitle: "교통사고 합의금 협상 거절당함",
    category: "손해배상",
    userName: "장**",
    proposalCount: 4,
    status: "canceled",
    createdAt: "2026-05-20T14:00:00Z",
  },
];

/* ─── Members ───────────────────────────────────────────── */

export type MemberStatus = "active" | "suspended" | "withdrawn";

export interface AdminMember {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  consultationCount: number;
  matchingCount: number;
  status: MemberStatus;
}

export const ADMIN_MEMBERS: AdminMember[] = [
  {
    id: "am_001",
    name: "박서연",
    email: "park.seoy***@gmail.com",
    joinedAt: "2026-05-21T18:00:00Z",
    consultationCount: 1,
    matchingCount: 1,
    status: "active",
  },
  {
    id: "am_002",
    name: "김지호",
    email: "ji.kim***@naver.com",
    joinedAt: "2026-05-21T14:30:00Z",
    consultationCount: 2,
    matchingCount: 1,
    status: "active",
  },
  {
    id: "am_003",
    name: "이수민",
    email: "sumin.lee***@kakao.com",
    joinedAt: "2026-05-21T11:00:00Z",
    consultationCount: 1,
    matchingCount: 1,
    status: "active",
  },
  {
    id: "am_004",
    name: "최도윤",
    email: "doyoun.choi***@gmail.com",
    joinedAt: "2026-05-21T09:15:00Z",
    consultationCount: 1,
    matchingCount: 0,
    status: "active",
  },
  {
    id: "am_005",
    name: "정한울",
    email: "hanul***@naver.com",
    joinedAt: "2026-05-20T20:00:00Z",
    consultationCount: 3,
    matchingCount: 2,
    status: "suspended",
  },
  {
    id: "am_006",
    name: "한지원",
    email: "jiwon.han***@gmail.com",
    joinedAt: "2026-05-20T15:00:00Z",
    consultationCount: 1,
    matchingCount: 1,
    status: "active",
  },
  {
    id: "am_007",
    name: "장민재",
    email: "minjae***@gmail.com",
    joinedAt: "2026-05-19T22:00:00Z",
    consultationCount: 0,
    matchingCount: 0,
    status: "withdrawn",
  },
  {
    id: "am_008",
    name: "조유나",
    email: "yuna.cho***@kakao.com",
    joinedAt: "2026-05-19T13:00:00Z",
    consultationCount: 2,
    matchingCount: 1,
    status: "active",
  },
];

/* ─── Settings (default) ────────────────────────────────── */

export interface AdminSettings {
  siteName: string;
  systemPrompt: string;
  matchingFeeRate: number;
  emailNotifications: boolean;
}

export const DEFAULT_SETTINGS: AdminSettings = {
  siteName: "로셀",
  systemPrompt:
    "당신은 한국 법률 전문 AI 상담사입니다. 사용자의 법률 문제를 분석하여 적용 가능한 법령, 관련 판례, 핵심 쟁점을 안내합니다. 부정확한 정보를 제공하지 않으며, 필요한 경우 web_search 도구로 최신 법령·판례를 확인합니다.",
  matchingFeeRate: 8,
  emailNotifications: true,
};

/* ─── Utils ─────────────────────────────────────────────── */

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}.${dd}`;
}
