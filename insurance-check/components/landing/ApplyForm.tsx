"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Lock, PencilLine } from "lucide-react";
import type { PublicConfig } from "@/lib/config";
import { PREFERRED_TIMES, PREFERRED_TIME_LABEL, SERVICE_TYPES, type PreferredTime, type ServiceType } from "@/lib/types";
import { SERVICE_CONTENT } from "@/lib/content";
import { formatPhoneInput, LIMITS, validateLeadInput, type FieldErrors } from "@/lib/validation";
import { claimConsentRows, CLAIM_CONSENT_FOOTNOTE, marketingConsentRows } from "@/lib/consent-text";
import { getAttribution, saveReceipt, track, trackOnce } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { FieldError, Input, Label, Textarea } from "@/components/ui/field";
import { ConsentBox } from "@/components/apply/ConsentBox";
import { OfficialLink } from "@/components/site/OfficialLink";
import { SERVICE_ICON } from "./ServiceIcons";
import { useApply } from "./ApplyContext";

type Field = "serviceType" | "name" | "phone" | "preferredTime" | "memo" | "privacyConsent";

/** 한 화면에 한 가지 질문만. 각 단계는 자기 항목만 검증하고 넘어간다. */
const STEPS: { label: string; title: string; description?: string; fields: Field[] }[] = [
  { label: "점검 유형", title: "어떤 점검을 원하세요?", fields: ["serviceType"] },
  { label: "연락처", title: "연락받으실 분을 알려주세요", description: "희망하신 시간에 이 번호로 연락드려요.", fields: ["name", "phone"] },
  { label: "상담 시간", title: "언제 연락드리면 편하세요?", fields: ["preferredTime", "memo"] },
  { label: "동의·확인", title: "마지막으로 확인해 주세요", fields: ["privacyConsent"] },
];

const FIELD_DOM_ID: Record<Field, string> = {
  serviceType: "apply-type-unclaimed",
  name: "apply-name",
  phone: "apply-phone",
  preferredTime: `apply-time-${PREFERRED_TIMES[0]}`,
  memo: "apply-memo",
  privacyConsent: "apply-privacy",
};

const stepOf = (f: Field) => STEPS.findIndex((s) => s.fields.includes(f));

type Status = "idle" | "submitting" | "success";

export function ApplyForm({ config }: { config: PublicConfig }) {
  const router = useRouter();
  const { serviceType: ctxType, selectType, request } = useApply();
  const [step, setStep] = useState(0);
  const [serviceType, setServiceType] = useState<ServiceType | "">("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredTime, setPreferredTime] = useState<PreferredTime | "">("");
  const [memo, setMemo] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const mountedAt = useRef(0);
  const idemKey = useRef("");
  const cardRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepChanged = useRef(false);

  const disabled = !config.submissionEnabled;
  const busy = status !== "idle";
  const payload = { serviceType, name, phone, preferredTime, memo, privacyConsent, marketingConsent };

  useEffect(() => {
    mountedAt.current = Date.now();
    idemKey.current = crypto.randomUUID();
  }, []);

  // 랜딩의 유형 카드·탭에서 고른 값을 폼에 반영
  useEffect(() => {
    if (ctxType) setServiceType(ctxType);
  }, [ctxType]);

  // CTA로 들어온 경우: 유형이 정해졌으면 바로 연락처 단계로
  useEffect(() => {
    if (!request.n) return;
    let target = "heading";
    if (request.type) {
      setServiceType(request.type);
      setErrors((e) => ({ ...e, serviceType: undefined }));
      setStep((s) => (s === 0 ? 1 : s));
      target = "apply-name";
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => {
      const el = target === "heading" ? headingRef.current : document.getElementById(target);
      (el ?? headingRef.current)?.focus({ preventScroll: true });
    }, reduce ? 50 : 500);
    return () => window.clearTimeout(t);
  }, [request]);

  // 단계가 바뀌면 질문 제목으로 포커스 이동(스크린리더가 새 질문을 읽도록), 카드 상단이 가려졌으면 맞춰 스크롤
  useEffect(() => {
    if (!stepChanged.current) return;
    stepChanged.current = false;
    const card = cardRef.current;
    if (card && card.getBoundingClientRect().top < 64) card.scrollIntoView({ block: "start", behavior: "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const goTo = (i: number) => {
    stepChanged.current = true;
    setStep(i);
  };

  const clearError = (k: Field) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));

  function errorsFor(fields: Field[]): FieldErrors {
    const v = validateLeadInput(payload);
    if (v.ok) return {};
    return Object.fromEntries(fields.filter((f) => v.errors[f]).map((f) => [f, v.errors[f]]));
  }

  function next() {
    const errs = errorsFor(STEPS[step].fields);
    if (Object.keys(errs).length) {
      setErrors((e) => ({ ...e, ...errs }));
      const first = STEPS[step].fields.find((f) => errs[f]);
      if (first) document.getElementById(FIELD_DOM_ID[first])?.focus();
      return;
    }
    goTo(Math.min(step + 1, STEPS.length - 1));
  }

  async function submit() {
    const v = validateLeadInput(payload);
    if (!v.ok) {
      setErrors(v.errors);
      const first = (Object.keys(FIELD_DOM_ID) as Field[]).find((f) => v.errors[f]);
      if (first) {
        const s = stepOf(first);
        if (s !== step) goTo(s);
        else document.getElementById(FIELD_DOM_ID[first])?.focus();
      }
      return;
    }
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
          const first = (Object.keys(FIELD_DOM_ID) as Field[]).find((f) => data.fieldErrors[f]);
          if (first && stepOf(first) !== step) goTo(stepOf(first));
        }
        setServerError(data?.error ?? "신청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setStatus("idle");
        return;
      }
      setStatus("success");
      saveReceipt({ refNo: data.refNo, receiptToken: data.receiptToken, serviceType: v.value.serviceType, demo: !!data.demo, coverage: "offered" });
      // 광고 전환의 유일한 기준 이벤트. 개인정보 없이 점검 유형만 전달.
      track("form_submit_success", { serviceType: v.value.serviceType });
      router.push("/apply/complete");
    } catch {
      setServerError("네트워크 연결을 확인한 뒤 다시 시도해 주세요. 입력하신 내용은 그대로 남아 있어요.");
      setStatus("idle");
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || disabled) return;
    if (step < STEPS.length - 1) next();
    else void submit();
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <form
      ref={cardRef}
      noValidate
      onSubmit={onSubmit}
      onFocusCapture={() => trackOnce("form_start", { serviceType: serviceType || null })}
      aria-labelledby="apply-step-title"
      className="scroll-mt-24 rounded-[28px] bg-white p-6 shadow-lift ring-1 ring-navy-100 sm:p-9"
    >
      {config.mode === "demo" && (
        <p className="mb-6 flex items-center gap-2 rounded-xl bg-caution-50 px-3.5 py-2.5 text-[14px] font-medium text-caution">
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          데모 모드 · 실제 이름·연락처는 입력하지 마세요.
        </p>
      )}

      {/* 진행 단계 */}
      <div>
        <p className="flex items-baseline justify-between text-[14px] font-semibold">
          <span className="text-blue">
            {step + 1}단계 <span className="text-navy-500">/ {STEPS.length}</span>
          </span>
          <span className="text-navy-500">{current.label}</span>
        </p>
        <ol className="mt-3 grid grid-cols-4 gap-1.5" aria-label="신청 진행 단계">
          {STEPS.map((s, i) => (
            <li key={s.label} aria-current={i === step ? "step" : undefined}>
              <span className={cn("block h-1.5 rounded-full transition-colors duration-300", i <= step ? "bg-blue" : "bg-navy-100")} />
              <span className={cn("mt-2 hidden text-[14px] font-medium sm:block", i === step ? "text-navy" : "text-navy-500")}>
                {i < step && <Check className="mr-0.5 inline h-3.5 w-3.5 text-blue" aria-hidden="true" />}
                {s.label}
                <span className="sr-only">{i < step ? " (완료)" : i === step ? " (현재 단계)" : ""}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <h3
        id="apply-step-title"
        ref={headingRef}
        tabIndex={-1}
        className="mt-8 text-[24px] font-bold leading-snug tracking-[-0.025em] text-navy focus:outline-none sm:text-[26px]"
      >
        {current.title}
      </h3>
      {current.description && <p className="mt-2 text-[16px] text-navy-600">{current.description}</p>}

      {disabled && (
        <Alert tone="caution" className="mt-6" title="현재 신청 접수를 준비하고 있어요" role="status">
          운영 정보와 승인 절차가 끝나면 접수가 시작됩니다.{" "}
          {config.operator.contactPhone ? `문의: ${config.operator.contactPhone}. ` : ""}숨은보험금은 지금 바로{" "}
          <OfficialLink className="font-semibold text-blue underline underline-offset-2" />할 수 있어요.
        </Alert>
      )}

      <div aria-live="assertive">
        {serverError && <Alert tone="error" role="alert" className="mt-6" title={serverError} />}
      </div>

      <fieldset key={step} disabled={disabled || busy} className="step-in mt-7">
        <legend className="sr-only">{current.title}</legend>

        {step === 0 && (
          <div role="radiogroup" aria-labelledby="apply-step-title" aria-describedby={errors.serviceType ? "apply-type-error" : undefined} className="grid gap-3">
            {SERVICE_TYPES.map((t) => {
              const Icon = SERVICE_ICON[t];
              const checked = serviceType === t;
              return (
                <label
                  key={t}
                  className={cn(
                    "flex min-h-[76px] cursor-pointer items-center gap-4 rounded-2xl border-2 px-4 py-3.5 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-blue/20 sm:px-5",
                    checked ? "border-blue bg-blue-50/60" : errors.serviceType ? "border-danger" : "border-navy-100 hover:border-navy-200",
                  )}
                >
                  <input
                    id={`apply-type-${t}`}
                    type="radio"
                    name="serviceType"
                    value={t}
                    checked={checked}
                    onChange={() => {
                      setServiceType(t);
                      selectType(t);
                      clearError("serviceType");
                    }}
                    className="sr-only"
                  />
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", checked ? "bg-blue text-white" : "bg-navy-50 text-navy")}>
                    <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-[17px] font-semibold leading-snug text-ink">{SERVICE_CONTENT[t].cardTitle}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                      checked ? "border-blue bg-blue text-white" : "border-navy-200 text-transparent",
                    )}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </label>
              );
            })}
            <FieldError id="apply-type-error">{errors.serviceType}</FieldError>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="apply-name" required>
                이름
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
                placeholder="이름을 입력해 주세요"
              />
              <FieldError id="apply-name-error">{errors.name}</FieldError>
            </div>
            <div>
              <Label htmlFor="apply-phone" required>
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
                aria-describedby={errors.phone ? "apply-phone-error" : undefined}
                onChange={(e) => {
                  setPhone(formatPhoneInput(e.target.value));
                  clearError("phone");
                }}
                placeholder="010-0000-0000"
              />
              <FieldError id="apply-phone-error">{errors.phone}</FieldError>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div role="radiogroup" aria-label="상담 희망 시간" aria-describedby={errors.preferredTime ? "apply-time-error" : undefined}>
              <p className="mb-3 text-[16px] font-semibold text-navy">상담 희망 시간</p>
              <div className="grid grid-cols-2 gap-2.5">
                {PREFERRED_TIMES.map((t) => {
                  const checked = preferredTime === t;
                  const [main, sub] = PREFERRED_TIME_LABEL[t].split(" (");
                  return (
                    <label
                      key={t}
                      className={cn(
                        "flex min-h-[64px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 px-2 py-3 text-center transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-blue/20",
                        checked ? "border-blue bg-blue-50/60" : errors.preferredTime ? "border-danger" : "border-navy-100 hover:border-navy-200",
                      )}
                    >
                      <input
                        id={`apply-time-${t}`}
                        type="radio"
                        name="preferredTime"
                        value={t}
                        checked={checked}
                        onChange={() => {
                          setPreferredTime(t);
                          clearError("preferredTime");
                        }}
                        className="sr-only"
                      />
                      <span className={cn("text-[16px] font-semibold", checked ? "text-blue-700" : "text-ink")}>{main}</span>
                      {sub && <span className="mt-0.5 text-[14px] text-navy-500">{sub.replace(")", "")}</span>}
                    </label>
                  );
                })}
              </div>
              <FieldError id="apply-time-error">{errors.preferredTime}</FieldError>
            </div>
            <div>
              <Label htmlFor="apply-memo">문의 내용</Label>
              <Textarea
                id="apply-memo"
                name="memo"
                value={memo}
                maxLength={LIMITS.memoMax}
                invalid={!!errors.memo}
                aria-describedby={`apply-memo-help${errors.memo ? " apply-memo-error" : ""}`}
                onChange={(e) => {
                  setMemo(e.target.value);
                  clearError("memo");
                }}
                placeholder="예) 작년에 통원 치료를 받았는데 청구를 안 했어요"
              />
              <div className="mt-2 flex justify-between gap-3 text-[14px] text-navy-500">
                <p id="apply-memo-help">병명·병력, 주민등록번호 같은 민감한 정보는 적지 마세요.</p>
                <p aria-hidden="true" className="shrink-0 tabular-nums">
                  {memo.length}/{LIMITS.memoMax}
                </p>
              </div>
              <FieldError id="apply-memo-error">{errors.memo}</FieldError>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <dl className="divide-y divide-navy-100 rounded-2xl bg-navy-50 px-5">
              {[
                { label: "점검 유형", value: serviceType ? SERVICE_CONTENT[serviceType].cardTitle : "-", go: 0 },
                { label: "이름", value: name || "-", go: 1 },
                { label: "연락처", value: phone || "-", go: 1 },
                { label: "상담 시간", value: preferredTime ? PREFERRED_TIME_LABEL[preferredTime] : "-", go: 2 },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <dt className="text-[14px] text-navy-600">{r.label}</dt>
                    <dd className="mt-0.5 text-[17px] font-semibold text-ink">{r.value}</dd>
                  </div>
                  <button
                    type="button"
                    onClick={() => goTo(r.go)}
                    className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[15px] font-semibold text-blue-700 hover:bg-white"
                    aria-label={`${r.label} 수정`}
                  >
                    <PencilLine className="h-4 w-4" aria-hidden="true" />
                    수정
                  </button>
                </div>
              ))}
            </dl>

            <div className="space-y-3">
              <ConsentBox
                id="apply-privacy"
                required
                title="개인정보 수집·이용 동의"
                checked={privacyConsent}
                onChange={(v) => {
                  setPrivacyConsent(v);
                  clearError("privacyConsent");
                }}
                rows={claimConsentRows(config.operator)}
                footnote={CLAIM_CONSENT_FOOTNOTE}
                error={errors.privacyConsent}
              />
              <ConsentBox
                id="apply-marketing"
                required={false}
                title="광고성 정보 수신 동의 (문자)"
                checked={marketingConsent}
                onChange={setMarketingConsent}
                rows={marketingConsentRows(config.operator)}
              />
            </div>
            <p className="flex gap-2 text-[14px] leading-relaxed text-navy-500">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              보험 상품 권유를 위한 동의는 받지 않아요. 보장 분석 상담은 신청이 끝난 뒤 원하시는 경우에만 따로 동의받습니다.
            </p>
          </div>
        )}

        {/* 봇 차단용 숨김 필드: 사람에게는 보이지 않고 보조기기에서도 제외 */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="apply-website">웹사이트</label>
          <input id="apply-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>

        <div className="mt-9 flex gap-2.5">
          {step > 0 && (
            <Button type="button" variant="outline" size="lg" className="w-[30%] min-w-[96px] px-3" onClick={() => goTo(step - 1)}>
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              이전
            </Button>
          )}
          <Button type="submit" size="lg" className="flex-1" aria-disabled={busy || disabled}>
            {status === "submitting" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                신청하는 중…
              </>
            ) : status === "success" ? (
              "신청 완료 — 이동 중…"
            ) : isLast ? (
              "무료 점검 신청하기"
            ) : (
              <>
                다음
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
        <p className="sr-only" aria-live="polite">
          {status === "submitting" ? "신청을 전송하고 있습니다." : status === "success" ? "신청이 완료되었습니다." : ""}
        </p>
      </fieldset>
    </form>
  );
}
