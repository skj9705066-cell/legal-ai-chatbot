"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type {
  ConsultationMethod,
  LawyerExperienceBucket,
  LawyerSpecialty,
} from "@/lib/types";

const SPECIALTY_OPTIONS: LawyerSpecialty[] = [
  "형사",
  "민사",
  "가맹사업",
  "노동",
  "가족/이혼",
  "부동산",
  "행정",
  "기업법무",
];
const EXPERIENCE_OPTIONS: LawyerExperienceBucket[] = [
  "1~3년",
  "3~5년",
  "5~10년",
  "10~20년",
  "20년 이상",
];
const METHOD_OPTIONS: {
  value: ConsultationMethod;
  label: string;
  icon: string;
}[] = [
  { value: "phone", label: "전화", icon: "📞" },
  { value: "video", label: "화상", icon: "📹" },
  { value: "inperson", label: "대면", icon: "🤝" },
  { value: "chat", label: "채팅", icon: "💬" },
];

const BENEFITS = [
  {
    n: "01",
    title: "AI가 사건을 정리해서 전달",
    desc: "쟁점·관련 법령·긴급도를 한눈에. 초기 검토 시간을 줄입니다.",
  },
  {
    n: "02",
    title: "원하는 사건만 선택",
    desc: "전문 분야·지역·상담비 조건에 맞는 사건만 알림으로 받습니다.",
  },
  {
    n: "03",
    title: "마케팅 비용 절감",
    desc: "광고비 0원. 검증된 의뢰인과 직접 연결되어 수임 효율이 높아집니다.",
  },
];

const TRUST_NUMBERS = [
  { value: "1,200+", label: "등록 파트너" },
  { value: "8,400+", label: "누적 매칭" },
  { value: "4분", label: "평균 매칭" },
];

type Stage = "hero" | 1 | 2 | 3 | "done";

export default function LawyerRegisterPage() {
  const router = useRouter();
  const { registerLawyer } = useAuth();

  const [stage, setStage] = useState<Stage>("hero");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const [barNumber, setBarNumber] = useState("");
  const [firm, setFirm] = useState("");
  const [specialties, setSpecialties] = useState<LawyerSpecialty[]>([]);
  const [experienceBucket, setExperienceBucket] =
    useState<LawyerExperienceBucket | "">("");

  const [avatar, setAvatar] = useState<string | null>(null);
  const [oneLiner, setOneLiner] = useState("");
  const [bio, setBio] = useState("");
  const [methods, setMethods] = useState<ConsultationMethod[]>(["video"]);
  const [feeManwon, setFeeManwon] = useState("30");

  function goNext() {
    setError(null);
    if (stage === 1) {
      if (!name.trim() || !email.trim() || !password || !phone.trim()) {
        setError("모든 필수 항목을 입력해주세요.");
        return;
      }
      if (password.length < 6) {
        setError("비밀번호는 6자 이상이어야 합니다.");
        return;
      }
      setStage(2);
      return;
    }
    if (stage === 2) {
      if (!barNumber.trim() || !firm.trim() || specialties.length === 0) {
        setError("자격 정보를 모두 입력해주세요.");
        return;
      }
      if (!experienceBucket) {
        setError("경력을 선택해주세요.");
        return;
      }
      setStage(3);
      return;
    }
  }

  function goPrev() {
    setError(null);
    if (stage === 2) setStage(1);
    else if (stage === 3) setStage(2);
  }

  function toggleSpecialty(s: LawyerSpecialty) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }
  function toggleMethod(m: ConsultationMethod) {
    setMethods((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }
  function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("프로필 사진은 2MB 이하만 업로드 가능합니다.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);
  }

  async function submit() {
    setError(null);
    if (!oneLiner.trim() || !bio.trim() || methods.length === 0) {
      setError("프로필 항목을 모두 작성해주세요.");
      return;
    }
    const fee = Number(feeManwon);
    if (!Number.isFinite(fee) || fee < 1) {
      setError("기본 상담비를 올바르게 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await registerLawyer({
        name,
        email,
        password,
        phone,
        barNumber,
        firm,
        specialties,
        experienceBucket: experienceBucket as LawyerExperienceBucket,
        avatar: avatar ?? undefined,
        oneLiner,
        bio,
        consultationMethods: methods,
        baseFeeManwon: fee,
      });
      setStage("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "가입 중 오류가 발생했습니다.",
      );
      setSubmitting(false);
    }
  }

  if (stage === "hero") return <HeroScreen onStart={() => setStage(1)} />;
  if (stage === "done") return <DoneScreen onHome={() => router.push("/")} />;

  const stepNum = stage as 1 | 2 | 3;

  return (
    <main className="min-h-screen bg-surface-subtle page-enter flex flex-col">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-surface-line pt-safe-top">
        <div className="max-w-2xl mx-auto h-14 px-6 lg:px-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[18px] font-bold tracking-luxe text-navy-900"
          >
            법률<span className="text-gold">AI</span>
            <span className="hidden sm:inline text-caption text-gold-700">
              PARTNER
            </span>
          </Link>
          <Link
            href="/login"
            className="text-[13px] font-medium text-text-muted hover:text-navy-900 tracking-luxe transition-colors duration-500 ease-luxe"
          >
            로그인
          </Link>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 lg:px-8 py-10 lg:py-16">
        <ProgressBar step={stepNum} />

        <div className="mt-10 bg-white rounded-3xl shadow-card p-7 lg:p-10 space-y-7">
          {stepNum === 1 && (
            <StepOne
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              phone={phone}
              setPhone={setPhone}
            />
          )}
          {stepNum === 2 && (
            <StepTwo
              barNumber={barNumber}
              setBarNumber={setBarNumber}
              firm={firm}
              setFirm={setFirm}
              specialties={specialties}
              toggleSpecialty={toggleSpecialty}
              experienceBucket={experienceBucket}
              setExperienceBucket={setExperienceBucket}
            />
          )}
          {stepNum === 3 && (
            <StepThree
              avatar={avatar}
              onAvatar={handleAvatar}
              oneLiner={oneLiner}
              setOneLiner={setOneLiner}
              bio={bio}
              setBio={setBio}
              methods={methods}
              toggleMethod={toggleMethod}
              feeManwon={feeManwon}
              setFeeManwon={setFeeManwon}
            />
          )}

          {error && (
            <div className="text-[13px] text-danger bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            {stepNum > 1 && (
              <button
                onClick={goPrev}
                className="flex-1 h-12 rounded-2xl btn-ghost text-[15px] tracking-luxe"
              >
                이전
              </button>
            )}
            {stepNum < 3 ? (
              <button
                onClick={goNext}
                className="flex-[1.5] h-12 rounded-2xl btn-navy text-[15px] tracking-luxe"
              >
                다음
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-[1.5] h-12 rounded-2xl btn-primary text-[15px] tracking-luxe disabled:opacity-50"
              >
                {submitting ? "처리 중..." : "등록 신청하기"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function HeroScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="min-h-screen page-enter bg-navy-mesh text-white">
      <header className="sticky top-0 z-30 pt-safe-top">
        <div className="max-w-5xl mx-auto h-14 px-6 lg:px-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[18px] font-bold tracking-luxe text-white"
          >
            법률<span className="text-gold">AI</span>
            <span className="hidden sm:inline text-caption text-gold">
              PARTNER
            </span>
          </Link>
          <Link
            href="/login"
            className="text-[13px] font-medium text-white/70 hover:text-white tracking-luxe transition-colors duration-500 ease-luxe"
          >
            로그인
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 lg:px-8 pt-12 lg:pt-24 pb-20 lg:pb-32">
        <div className="text-center lg:max-w-3xl lg:mx-auto">
          <p className="text-caption text-gold mb-6 lg:mb-10">
            FOR LAWYERS · 파트너 등록
          </p>

          <h1 className="text-display text-white">
            로셀<br className="lg:hidden" />
            <span className="lg:ml-3 text-gold-grad">파트너 변호사</span>
          </h1>
          <p className="mt-7 lg:mt-9 text-body text-white/75 max-w-xl lg:mx-auto">
            AI가 분석한 사건을 받아보세요.
          </p>

          <button
            onClick={onStart}
            className="mt-10 lg:mt-14 btn-gold h-14 px-10 lg:h-16 lg:px-14 rounded-2xl text-[15px] lg:text-[16px] tracking-luxe inline-flex items-center gap-2"
          >
            파트너 등록 시작하기
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M5 12h14M13 5l7 7-7 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <p className="mt-4 text-[13px] text-white/55 tracking-luxe">
            등록 신청 1분 · 심사 1~2영업일
          </p>
        </div>

        <div className="mt-20 lg:mt-32 grid sm:grid-cols-3 gap-5 lg:gap-7">
          {BENEFITS.map((b) => (
            <div
              key={b.n}
              className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-7 lg:p-9 hover:bg-white/10 transition-colors duration-500 ease-luxe"
            >
              <span className="text-stat text-gold-grad" style={{ fontSize: 40 }}>
                {b.n}
              </span>
              <h3 className="text-h3 text-white mt-6">{b.title}</h3>
              <p className="text-[14px] text-white/65 leading-[1.8] mt-3 font-medium">
                {b.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 lg:mt-24 pt-10 lg:pt-14 border-t border-white/10 grid grid-cols-3 gap-4 lg:gap-12">
          {TRUST_NUMBERS.map((n) => (
            <div key={n.label} className="text-center">
              <div className="text-stat text-gold-grad">{n.value}</div>
              <div className="text-[12px] font-semibold tracking-luxe text-white/55 mt-3 lg:mt-4">
                {n.label}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 lg:mt-24 text-center">
          <button
            onClick={onStart}
            className="h-12 px-7 rounded-full border border-white/15 hover:border-white/30 hover:bg-white/5 text-white font-semibold text-[14px] tracking-luxe transition-all duration-500 ease-luxe"
          >
            지금 파트너 등록하기 →
          </button>
        </div>
      </div>
    </main>
  );
}

function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["기본 정보", "자격 인증", "프로필 완성"];
  return (
    <div>
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-navy-900 font-semibold tracking-luxe">
          STEP {step}{" "}
          <span className="text-text-muted font-medium"> / 3</span>
        </span>
        <span className="text-text-muted font-medium tracking-luxe">
          {labels[step - 1]}
        </span>
      </div>
      <div className="mt-3 h-1 bg-surface-line overflow-hidden rounded-full">
        <div
          className="h-full bg-gold transition-all duration-700 ease-luxe"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>
    </div>
  );
}

function StepOne(props: {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle
        title="기본 정보"
        subtitle="등록 신청을 위한 기본 정보를 입력해주세요."
      />
      <Float
        id="lname"
        label="이름"
        value={props.name}
        onChange={props.setName}
      />
      <Float
        id="lemail"
        label="이메일"
        type="email"
        value={props.email}
        onChange={props.setEmail}
      />
      <Float
        id="lpw"
        label="비밀번호 (6자 이상)"
        type="password"
        value={props.password}
        onChange={props.setPassword}
      />
      <Float
        id="lphone"
        label="휴대폰 번호"
        value={props.phone}
        onChange={props.setPhone}
      />
    </div>
  );
}

function StepTwo(props: {
  barNumber: string;
  setBarNumber: (v: string) => void;
  firm: string;
  setFirm: (v: string) => void;
  specialties: LawyerSpecialty[];
  toggleSpecialty: (s: LawyerSpecialty) => void;
  experienceBucket: LawyerExperienceBucket | "";
  setExperienceBucket: (v: LawyerExperienceBucket | "") => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle
        title="자격 인증"
        subtitle="변호사 등록 정보를 입력해주세요. 심사 시 확인 절차를 거칩니다."
      />
      <Float
        id="bar"
        label="변호사 등록번호"
        value={props.barNumber}
        onChange={props.setBarNumber}
      />
      <Float
        id="firm"
        label="소속 (법무법인 / 사무소)"
        value={props.firm}
        onChange={props.setFirm}
      />

      <div>
        <Label>전문 분야 (복수 선택)</Label>
        <div className="flex flex-wrap gap-2">
          {SPECIALTY_OPTIONS.map((s) => {
            const active = props.specialties.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => props.toggleSpecialty(s)}
                className={`px-5 h-11 rounded-full text-[14px] font-medium tracking-luxe transition-all duration-500 ease-luxe ${
                  active
                    ? "bg-navy-900 text-white"
                    : "bg-white border border-surface-line text-navy-700 hover:border-navy-900"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="field-float">
        <select
          id="exp"
          value={props.experienceBucket}
          onChange={(e) =>
            props.setExperienceBucket(
              e.target.value as LawyerExperienceBucket | "",
            )
          }
          className={props.experienceBucket ? "has-value" : ""}
        >
          <option value=""> </option>
          {EXPERIENCE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <label htmlFor="exp">경력</label>
      </div>
    </div>
  );
}

function StepThree(props: {
  avatar: string | null;
  onAvatar: (e: React.ChangeEvent<HTMLInputElement>) => void;
  oneLiner: string;
  setOneLiner: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  methods: ConsultationMethod[];
  toggleMethod: (m: ConsultationMethod) => void;
  feeManwon: string;
  setFeeManwon: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle
        title="프로필 완성"
        subtitle="의뢰인에게 노출될 프로필을 작성합니다."
      />

      <div>
        <Label>프로필 사진</Label>
        <div className="flex items-center gap-5">
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold-100 via-surface-subtle to-navy-50" />
            <div className="absolute inset-1 rounded-full bg-white flex items-center justify-center overflow-hidden">
              {props.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={props.avatar}
                  alt="프로필"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl text-text-subtle">✦</span>
              )}
            </div>
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={props.onAvatar}
              className="hidden"
            />
            <span className="inline-block h-10 px-4 leading-[40px] text-[13px] font-medium tracking-luxe rounded-full btn-ghost">
              사진 업로드
            </span>
            <p className="text-[12px] text-text-muted font-medium mt-2">
              JPG, PNG · 2MB 이하
            </p>
          </label>
        </div>
      </div>

      <Float
        id="oneliner"
        label="한줄 소개"
        value={props.oneLiner}
        onChange={props.setOneLiner}
      />

      <div className="field-float">
        <textarea
          id="bio"
          value={props.bio}
          onChange={(e) => props.setBio(e.target.value)}
          rows={5}
          placeholder=" "
          style={{ paddingTop: 22, lineHeight: 1.8, resize: "none" }}
        />
        <label htmlFor="bio">상세 소개</label>
      </div>

      <div>
        <Label>희망 상담 방식 (복수 선택)</Label>
        <div className="grid grid-cols-4 gap-2.5">
          {METHOD_OPTIONS.map((opt) => {
            const active = props.methods.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => props.toggleMethod(opt.value)}
                className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl text-[13px] font-semibold transition-all duration-500 ease-luxe ${
                  active
                    ? "bg-navy-900 text-white"
                    : "bg-surface-subtle text-navy-700 hover:bg-surface-soft"
                }`}
              >
                <span className="text-xl">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>기본 상담비</Label>
        <div className="relative">
          <input
            type="number"
            min={1}
            value={props.feeManwon}
            onChange={(e) => props.setFeeManwon(e.target.value)}
            placeholder="30"
            className="surface-input--soft w-full h-14 pl-4 pr-16 rounded-2xl text-[16px] font-semibold text-navy-900"
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[14px] font-medium text-text-muted tracking-luxe">
            만원
          </span>
        </div>
        <p className="text-[12px] text-text-muted font-medium mt-2 leading-[1.7]">
          1시간 기준 기본 상담비입니다. 사건별로 조정 가능합니다.
        </p>
      </div>
    </div>
  );
}

function DoneScreen({ onHome }: { onHome: () => void }) {
  return (
    <main className="min-h-screen bg-surface-subtle page-enter flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center bg-white rounded-3xl shadow-card p-10">
        <div className="relative w-20 h-20 mx-auto mb-7">
          <span className="absolute inset-0 rounded-full cta-pulse" />
          <span className="absolute inset-0 rounded-full bg-cta-600 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
            >
              <path
                d="M5 13l4 4L19 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>

        <h1 className="text-h2">등록 신청이 완료되었습니다</h1>
        <p className="text-body-muted leading-[1.8] mt-4">
          심사 후{" "}
          <span className="text-navy-900 font-semibold">1~2영업일</span> 내
          승인 안내를 드립니다.
          <br />
          승인 후 사건 알림을 받으실 수 있습니다.
        </p>

        <div className="mt-7 bg-surface-subtle rounded-2xl p-5 text-left text-[13px] text-navy-700 space-y-2.5 font-medium">
          <div className="flex items-start gap-2.5">
            <span className="shrink-0 text-gold text-caption">01</span>
            <span>가입하신 이메일로 승인 결과가 발송됩니다.</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="shrink-0 text-gold text-caption">02</span>
            <span>
              승인 후 변호사 대시보드에서 신규 사건을 확인하실 수 있습니다.
            </span>
          </div>
        </div>

        <button
          onClick={onHome}
          className="mt-8 inline-block w-full h-12 rounded-2xl btn-navy text-[15px] tracking-luxe"
        >
          홈으로 돌아가기
        </button>
      </div>
    </main>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h2 className="text-h2">{title}</h2>
      {subtitle && (
        <p className="text-body-muted leading-[1.8] mt-2">{subtitle}</p>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-caption text-text-muted mb-3">
      {typeof children === "string" ? children.toUpperCase() : children}
    </div>
  );
}

function Float({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="field-float">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" "
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}
