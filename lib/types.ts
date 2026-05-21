export type AttachmentMediaType =
  | "image/jpeg"
  | "image/png"
  | "application/pdf";

export interface Attachment {
  id: string;
  name: string;
  type: AttachmentMediaType;
  size: number;
  data?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

export type ConsultationStatus = "in_progress" | "completed";

export interface Consultation {
  id: string;
  title: string;
  category: string | null;
  messages: ChatMessage[];
  status: ConsultationStatus;
  starred: boolean;
  createdAt: number;
  updatedAt: number;
}

export type Urgency = "low" | "medium" | "high";

export interface CaseSummary {
  caseType: string;
  keyIssues: string[];
  relevantLaws: string[];
  urgency: Urgency;
  summary: string;
}

export interface LawyerReview {
  author: string;
  rating: number;
  text: string;
}

export interface Lawyer {
  id: string;
  name: string;
  avatar: string;
  firm: string;
  specialties: string[];
  yearsExperience: number;
  rating: number;
  reviewCount: number;
  winRate: number;
  similarCases: number;
  bio: string;
  reviews: LawyerReview[];
}

export interface LawyerProposal {
  id: string;
  lawyerId: string;
  fee: number;
  message: string;
  arrivedAt: number;
}

export type MatchingStatus =
  | "summary"
  | "matching"
  | "selected";

export type ConsultationMethod = "phone" | "video" | "inperson" | "chat";

export type AuthProvider = "email" | "kakao" | "google";

export type LawyerSpecialty =
  | "형사"
  | "민사"
  | "이혼"
  | "가족/이혼"
  | "부동산"
  | "노동"
  | "계약"
  | "상속"
  | "교통사고"
  | "의료"
  | "기업법무"
  | "가맹사업"
  | "지식재산"
  | "세무"
  | "행정"
  | "손해배상";

export type LawyerExperienceBucket =
  | "5년 미만"
  | "1~3년"
  | "3~5년"
  | "5~10년"
  | "10~20년"
  | "20년 이상";

export interface UserAccount {
  id: string;
  type: "user";
  name: string;
  email: string;
  phone?: string;
  password?: string;
  provider: AuthProvider;
  createdAt: number;
}

export interface LawyerAccount {
  id: string;
  type: "lawyer";
  name: string;
  email: string;
  phone: string;
  password?: string;
  provider: "email";
  barNumber: string;
  firm: string;
  specialties: LawyerSpecialty[];
  experienceBucket: LawyerExperienceBucket;
  avatar?: string;
  oneLiner: string;
  bio: string;
  consultationMethods: ConsultationMethod[];
  baseFeeManwon: number;
  approvalStatus: "pending" | "approved" | "rejected";
  createdAt: number;
}

export type Account = UserAccount | LawyerAccount;

export interface AuthSession {
  accountId: string;
  createdAt: number;
}

export interface MatchingSession {
  consultationId: string;
  caseSummary: CaseSummary | null;
  feeRange: { min: number; max: number };
  consultationMethod: ConsultationMethod;
  status: MatchingStatus;
  interestCount: number;
  proposals: LawyerProposal[];
  startedAt: number | null;
  selectedLawyerId: string | null;
  createdAt: number;
  updatedAt: number;
}
