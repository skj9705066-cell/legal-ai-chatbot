"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Info, Loader2, Lock, Phone } from "lucide-react";
import type { PublicConfig, SubmissionStatus } from "@/lib/config";
import {
  INTERESTS,
  INTEREST_LABEL,
  PREFERRED_TIMES,
  PREFERRED_TIME_LABEL,
  REGIONS,
  REGION_LABEL,
  TRIAL_LABEL,
  serviceTypeFor,
  trialMode,
  type Interest,
  type PreferredTime,
  type Region,
} from "@/lib/types";
import { APPLY } from "@/lib/content";
import { formatPhoneInput, LIMITS, requiresThirdPartyConsent, validateLeadInput, type FieldErrors } from "@/lib/validation";
import { claimConsentRows, CLAIM_CONSENT_FOOTNOTE, marketingConsentRows, thirdPartyConsentRows } from "@/lib/consent-text";
import { getAttribution, saveReceipt, track, trackOnce } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { FieldError, Input, Label } from "@/components/ui/field";
import { ConsentBox } from "@/components/apply/ConsentBox";
import { OfficialLink } from "@/components/site/OfficialLink";
import { interestType, useApply } from "./ApplyContext";

type Field = "name" | "phone" | "region" | "preferredTime" | "interests" | "privacyConsent" | "thirdPartyConsent";

/** 오류가 나면 이 순서대로 첫 칸으로 포커스를 옮긴다(화면 위→아래 순서와 같다) */
const FIELD_DOM_ID: Record<Field, string> = {
  name: "apply-name",
  phone: "apply-phone",
  region: "apply-region-seoul",
  preferredTime: "apply-time-weekday_morning",
  interests: "apply-interest-card_points",
  privacyConsent: "apply-privacy",
  thirdPartyConsent: "apply-third-party",
};

type Status = "idle" | "submitting" | "success";

/**
 * 7. 간단한 방문 상담 신청서 — 한 화면, 위에서 아래로: 성함 → 휴대전화 → 지역 → 연락 희망 시간 → 관심 서비스 → 동의 → 신청.
 * 고르기 항목은 모두 크게 누르는 버튼(라디오·체크박스)이라 작은 글씨 목록을 펼칠 필요가 없다.
 * 보험 상담(보장분석)은 여기서 받지 않고, 신청 완료 후 원하시는 분께만 별도 동의를 받는다.
 *
 * 접수 잠금 원칙: 잠금은 실제 전송만 막는다. 입력·선택·동의·신청 버튼 같은 화면 조작에는 절대 연결하지 않는다.
 */
export function ApplyForm({ config }: { config: PublicConfig }) {
  const router = useRouter();
  const { request } = useApply();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState<Region | "">("");
  const [preferredTime, setPreferredTime] = useState<PreferredTime | "">("");
  const [interests, setInterests] = useState<Interest[]>([]);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [thirdPartyConsent, setThirdPartyConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [lockedNotice, setLockedNotice] = useState(false);
  // 서버에 다시 물은 실제 접수 가능 여부(DB 자동 점검 포함). 페이지 HTML은 최대 5분 캐시라 이 값을 우선한다
  const [live, setLive] = useState<SubmissionStatus | null>(null);
  const mountedAt = useRef(0);
  const idemKey = useRef("");
  // 전송 중 잠금(ref) — 연타 시 요청이 여러 번 나가지 않게 즉시 막는다
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const disabled = live ? !live.submissionEnabled : !config.submissionEnabled;
  const diagnostics: SubmissionStatus["diagnostics"] =
    live?.diagnostics ?? (!live && config.lockedBy?.length ? { lockedBy: config.lockedBy, dbFailures: [], deployment: null } : null);
  const busy = status !== "idle";
  const needThirdParty = requiresThirdPartyConsent(config.operator.thirdPartyProvision);
  const payload = { name, phone, region, preferredTime, interests, privacyConsent, marketingConsent, thirdPartyConsent };
  const validate = () => validateLeadInput(payload, { requireThirdParty: needThirdParty });
  const eventType = () => (interests.length ? serviceTypeFor(interests) : null);

  useEffect(() => {
    mountedAt.current = Date.now();
    idemKey.current = crypto.randomUUID();
  }, []);

  useEffect(() => {
    if (config.mode === "demo") return;
    let alive = true;
    fetch("/api/status", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<SubmissionStatus>) : null))
      .then((d) => {
        if (alive && d && typeof d.submissionEnabled === "boolean") setLive(d);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [config.mode]);

  // 신청서가 화면에 보임 — 세션당 한 번, 개인정보 없음
  useEffect(() => {
    const el = formRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackOnce("form_view");
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 안내 카드·CTA로 들어온 경우: 누른 항목을 관심 서비스에 미리 체크하고 성함 칸으로 포커스
  useEffect(() => {
    if (!request.n) return;
    if (request.interest) {
      const i = request.interest;
      setInterests((prev) => (prev.includes(i) ? prev : [...prev.filter((x) => x !== "not_sure"), i]));
      setErrors((e) => ({ ...e, interests: undefined }));
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => document.getElementById("apply-name")?.focus({ preventScroll: true }), reduce ? 50 : 600);
    return () => window.clearTimeout(t);
  }, [request]);

  const clearError = (k: Field) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));

  function toggleInterest(i: Interest, on: boolean) {
    setInterests((prev) => {
      if (!on) return prev.filter((x) => x !== i);
      // '잘 모르겠어요'와 구체 항목은 함께 고르지 않는다(고른 쪽을 따른다)
      if (i === "not_sure") return ["not_sure"];
      return [...prev.filter((x) => x !== "not_sure" && x !== i), i];
    });
    if (on) track("check_type_select", { serviceType: interestType(i) });
    clearError("interests");
  }

  function focusFirst(errs: FieldErrors) {
    const first = (Object.keys(FIELD_DOM_ID) as Field[]).find((f) => errs[f]);
    if (first) document.getElementById(FIELD_DOM_ID[first])?.focus();
  }

  async function submit() {
    if (!disabled) track("form_submit_attempt", { serviceType: eventType() });
    const v = validate();
    if (!v.ok) {
      setErrors(v.errors);
      focusFirst(v.errors);
      return;
    }
    if (disabled) {
      setLockedNotice(true);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setServerError(null);
    setStatus("submitting");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          website,
          elapsedMs: Date.now() - mountedAt.current,
          idempotencyKey: idemKey.current,
          attribution: getAttribution(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        if (data?.fieldErrors) {
          setErrors(data.fieldErrors);
          focusFirst(data.fieldErrors);
        }
        setServerError(data?.error ?? "신청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.");
        setStatus("idle");
        inFlight.current = false;
        track("lead_submit_error", { serviceType: v.value.serviceType });
        return;
      }
      setStatus("success");
      saveReceipt({ refNo: data.refNo, receiptToken: data.receiptToken, serviceType: v.value.serviceType, trial: data.trial ?? null, coverage: "offered" });
      // 광고 전환의 유일한 기준 이벤트. 개인정보 없이 대표 유형만 전달.
      track("lead_submit_success", { serviceType: v.value.serviceType });
      router.push("/apply/complete");
    } catch {
      setServerError("인터넷 연결을 확인한 뒤 다시 눌러 주세요. 입력하신 내용은 그대로 남아 있어요.");
      setStatus("idle");
      inFlight.current = false;
      track("lead_submit_error", { serviceType: v.value.serviceType });
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    void submit();
  }

  const trial = trialMode(config.mode);
  const phoneNo = config.operator.contactPhone;

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={onSubmit}
      onFocusCapture={() => trackOnce("form_start", { serviceType: eventType() })}
      aria-labelledby="apply-form-title"
      className="rounded-[28px] bg-white p-5 shadow-lift ring-1 ring-navy-100 sm:p-9"
    >
      <h3 id="apply-form-title" className="text-[24px] font-extrabold tracking-[-0.02em] text-charcoal sm:text-[28px]">
        신청서 작성
      </h3>
      <p className="mt-1.5 text-[17px] text-navy-600">모든 칸을 채우는 데 1분이면 충분해요.</p>

      {trial && (
        <p className="mt-5 flex items-center gap-2 rounded-xl bg-caution-50 px-4 py-3 text-[16px] font-semibold text-caution">
          <Lock className="h-5 w-5 shrink-0" aria-hidden="true" />
          {TRIAL_LABEL[trial]} 모드 · 실제 성함·연락처는 입력하지 마세요.
        </p>
      )}

      {disabled && (
        <Alert tone="caution" className="mt-5 text-[16px]" title="현재 신청 접수를 준비하고 있어요" role="status">
          접수가 시작되면 이 화면에서 바로 신청하실 수 있어요. {phoneNo ? `궁금하신 점은 ${phoneNo}로 전화 주세요. ` : ""}숨은보험금은 지금 바로{" "}
          <OfficialLink className="font-semibold text-forest-700 underline underline-offset-2" />할 수 있어요.
        </Alert>
      )}
      {disabled && diagnostics && <LockDiagnostics mode={config.mode} diagnostics={diagnostics} testId="lock-diagnostics" />}

      <div aria-live="assertive">{serverError && <Alert tone="error" role="alert" className="mt-5 text-[16px]" title={serverError} />}</div>

      {/* 전송 중(busy)에만 잠근다. 접수 잠김(disabled)은 여기에 연결하지 않는다 */}
      <fieldset disabled={busy} className="mt-7 space-y-8">
        <legend className="sr-only">무료 방문 점검 신청 정보</legend>

        <div data-testid="apply-contact-fields" className="space-y-6">
          <div>
            <Label htmlFor="apply-name" required className="text-[19px]">
              성함
            </Label>
            <Input
              id="apply-name"
              name="name"
              autoComplete="name"
              value={name}
              maxLength={LIMITS.nameMax}
              invalid={!!errors.name}
              aria-required="true"
              aria-describedby={errors.name ? "apply-name-error" : undefined}
              onChange={(e) => {
                setName(e.target.value);
                clearError("name");
              }}
              placeholder="예: 홍길순"
              className="h-16 text-[19px]"
            />
            <FieldError id="apply-name-error">{errors.name}</FieldError>
          </div>
          <div>
            <Label htmlFor="apply-phone" required className="text-[19px]">
              휴대전화번호
            </Label>
            <Input
              id="apply-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              invalid={!!errors.phone}
              aria-required="true"
              aria-describedby={errors.phone ? "apply-phone-error" : "apply-phone-help"}
              onChange={(e) => {
                setPhone(formatPhoneInput(e.target.value));
                clearError("phone");
              }}
              placeholder="010-0000-0000"
              className="h-16 text-[19px]"
            />
            {errors.phone ? <FieldError id="apply-phone-error">{errors.phone}</FieldError> : <p id="apply-phone-help" className="mt-2 text-[15px] text-navy-600">숫자만 누르시면 자동으로 나눠져요.</p>}
          </div>
        </div>

        <ChoiceGroup
          name="region"
          legend="사시는 지역"
          error={errors.region}
          cols={2}
          options={REGIONS.map((r) => ({ value: r, label: REGION_LABEL[r] }))}
          value={region}
          onChange={(v) => {
            setRegion(v as Region);
            clearError("region");
          }}
          idPrefix="apply-region"
          hint={region === "other" ? "서울·경기·인천 밖은 방문 대신 전화로 친절히 안내해 드려요." : "서울·경기·인천은 직접 찾아뵈어요."}
        />

        <ChoiceGroup
          name="preferredTime"
          legend="연락받기 편한 시간"
          error={errors.preferredTime}
          cols={2}
          options={PREFERRED_TIMES.map((t) => {
            // "오전 (9시~12시)" → 큰 글씨 "오전" + 작은 글씨 "9시~12시" (좁은 화면에서 어색하게 줄바꿈되지 않게)
            const [main, sub] = PREFERRED_TIME_LABEL[t].split(" (");
            return { value: t, label: main, sub: sub?.replace(")", "") };
          })}
          value={preferredTime}
          onChange={(v) => {
            setPreferredTime(v as PreferredTime);
            clearError("preferredTime");
          }}
          idPrefix="apply-time"
        />

        <fieldset aria-describedby={errors.interests ? "apply-interests-error" : undefined} data-testid="apply-interests">
          <legend className="mb-1 text-[19px] font-semibold text-navy">
            궁금하신 내용 <span className="text-[16px] font-medium text-navy-600">(여러 개 고르셔도 돼요)</span>
          </legend>
          <div className="mt-2 grid gap-3">
            {INTERESTS.map((i) => {
              const checked = interests.includes(i);
              return (
                <label
                  key={i}
                  className={cn(
                    "flex min-h-[64px] cursor-pointer items-center gap-4 rounded-2xl border-2 bg-white px-4 py-3 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-forest/25 sm:px-5",
                    checked ? "border-forest bg-forest-50" : errors.interests ? "border-danger" : "border-navy-200 hover:border-navy-300",
                  )}
                >
                  <input
                    id={`apply-interest-${i}`}
                    type="checkbox"
                    name="interests"
                    value={i}
                    checked={checked}
                    onChange={(e) => toggleInterest(i, e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2", checked ? "border-forest bg-forest text-white" : "border-navy-300 text-transparent")}
                  >
                    <Check className="h-5 w-5" strokeWidth={3} />
                  </span>
                  <span className="flex-1 text-[18px] font-semibold leading-snug text-charcoal">{INTEREST_LABEL[i]}</span>
                </label>
              );
            })}
          </div>
          <FieldError id="apply-interests-error">{errors.interests}</FieldError>
        </fieldset>

        <div className="space-y-3" data-testid="apply-consents">
          <ConsentBox
            id="apply-privacy"
            required
            title="개인정보 수집·이용 동의"
            checked={privacyConsent}
            onChange={(v) => {
              setPrivacyConsent(v);
              clearError("privacyConsent");
            }}
            rows={claimConsentRows(config.operator, config.mode)}
            footnote={CLAIM_CONSENT_FOOTNOTE}
            error={errors.privacyConsent}
          />
          {needThirdParty && (
            <ConsentBox
              id="apply-third-party"
              required
              title="개인정보 제3자 제공 동의"
              checked={thirdPartyConsent}
              onChange={(v) => {
                setThirdPartyConsent(v);
                clearError("thirdPartyConsent");
              }}
              rows={thirdPartyConsentRows(config.operator, config.mode)}
              error={errors.thirdPartyConsent}
            />
          )}
          <ConsentBox
            id="apply-marketing"
            required={false}
            title="광고성 정보 수신 동의 (문자)"
            checked={marketingConsent}
            onChange={setMarketingConsent}
            rows={marketingConsentRows(config.operator, config.mode)}
          />
        </div>

        <p className="flex gap-2.5 rounded-2xl bg-sage px-4 py-4 text-[16.5px] leading-relaxed text-charcoal" data-testid="apply-insurance-note">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-forest" aria-hidden="true" />
          {APPLY.insuranceNote}
        </p>

        {/* 봇 차단용 숨김 필드: 사람에게는 보이지 않고 보조기기에서도 제외 */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="apply-website">웹사이트</label>
          <input id="apply-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>

        {disabled && lockedNotice && (
          <div data-testid="apply-locked-notice">
            <Alert tone="caution" role="alert" className="text-[16px]" title="지금은 신청을 접수할 수 없어요">
              입력하신 정보는 전송되지 않았어요. 접수가 시작되면 다시 신청해 주세요.
            </Alert>
            {diagnostics && <LockDiagnostics mode={config.mode} diagnostics={diagnostics} testId="lock-diagnostics-notice" />}
          </div>
        )}

        <div className="space-y-3">
          <Button type="submit" size="xl" className="h-[68px] w-full text-[21px]" aria-disabled={busy}>
            {status === "submitting" ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                신청하는 중…
              </>
            ) : status === "success" ? (
              "신청 완료 — 이동 중…"
            ) : (
              <>
                {APPLY.submit}
                <ArrowRight className="h-6 w-6" aria-hidden="true" />
              </>
            )}
          </Button>
          {phoneNo && (
            <p className="text-center text-[16px] text-navy-600">
              <Phone className="mr-1 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
              전화가 편하시면{" "}
              <a href={`tel:${phoneNo.replace(/[^\d+]/g, "")}`} onClick={() => track("call_click")} className="font-bold text-forest-700 underline underline-offset-4">
                {phoneNo}
              </a>
            </p>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {status === "submitting" ? "신청을 전송하고 있습니다." : status === "success" ? "신청이 완료되었습니다." : ""}
        </p>
      </fieldset>
    </form>
  );
}

/** 큰 버튼형 단일 선택(라디오). 화살표 키로도 움직일 수 있는 네이티브 라디오를 그대로 쓴다 */
function ChoiceGroup({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  cols,
  idPrefix,
  hint,
}: {
  name: string;
  legend: string;
  options: { value: string; label: string; sub?: string }[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
  cols: 2;
  idPrefix: string;
  hint?: string;
}) {
  const errId = `${idPrefix}-error`;
  const hintId = `${idPrefix}-hint`;
  return (
    <fieldset aria-describedby={[error ? errId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined} data-testid={idPrefix}>
      <legend className="mb-1 text-[19px] font-semibold text-navy">{legend}</legend>
      <div className={cn("mt-2 grid gap-3", cols === 2 && "grid-cols-2")}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                "flex min-h-[60px] cursor-pointer items-center justify-center rounded-2xl border-2 px-3 py-2 text-center text-[18px] font-semibold leading-snug transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-forest/25",
                checked ? "border-forest bg-forest text-white" : error ? "border-danger bg-white text-charcoal" : "border-navy-200 bg-white text-charcoal hover:border-navy-300",
              )}
            >
              <input id={`${idPrefix}-${o.value}`} type="radio" name={name} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="sr-only" />
              {checked && <Check className="mr-1.5 h-5 w-5 shrink-0" strokeWidth={3} aria-hidden="true" />}
              <span>
                {o.label}
                {o.sub && <span className={cn("block text-[15px] font-medium", checked ? "text-white/90" : "text-navy-600")}>{o.sub}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {hint && (
        <p id={hintId} className="mt-2 text-[15.5px] text-navy-600" aria-live="polite">
          {hint}
        </p>
      )}
      <FieldError id={errId}>{error}</FieldError>
    </fieldset>
  );
}

/**
 * Preview·로컬 전용 접수 잠김 진단(운영 배포에서는 서버가 diagnostics를 null로 보낸다).
 * 변수 이름·점검 항목만 보여 주고 값은 보여 주지 않는다.
 */
function LockDiagnostics({ mode, diagnostics, testId }: { mode: PublicConfig["mode"]; diagnostics: NonNullable<SubmissionStatus["diagnostics"]>; testId: string }) {
  const { lockedBy, dbFailures, deployment } = diagnostics;
  return (
    <div className="mt-3 space-y-1.5 rounded-xl bg-navy-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-navy-600" data-testid={testId}>
      <p className="font-semibold text-navy">[테스트 환경 진단 · {mode}]</p>
      {lockedBy.length > 0 && (
        <p>
          미완료 설정: <code className="break-all">{lockedBy.join(", ")}</code>
          <br />
          Vercel → Settings → Environment Variables에서 <b>Preview</b>에 추가한 뒤 새로 배포하세요.
        </p>
      )}
      {dbFailures.length > 0 && (
        <div>
          DB 자동 점검 미통과:
          <ul className="list-disc pl-5">
            {dbFailures.map((f) => (
              <li key={f} className="break-all">
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
      {deployment && (
        <p className="break-all">
          지금 보는 배포: {deployment.branch ?? "-"} @ {deployment.commit ?? "-"} ({deployment.url ?? "로컬"})
          <br />
          배포 주소는 만들어질 때의 환경변수를 계속 씁니다. 설정을 바꿨다면 Vercel → Deployments 맨 위의 <b>새 배포</b>를 열어 확인하세요.
        </p>
      )}
    </div>
  );
}
