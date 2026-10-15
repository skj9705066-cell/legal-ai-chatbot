"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import type { PublicConfig } from "@/lib/config";
import { PREFERRED_TIMES, PREFERRED_TIME_LABEL, SERVICE_TYPES, type PreferredTime, type ServiceType } from "@/lib/types";
import { SERVICE_CONTENT } from "@/lib/content";
import { formatPhoneInput, LIMITS, validateLeadInput, type FieldErrors } from "@/lib/validation";
import { claimConsentRows, CLAIM_CONSENT_FOOTNOTE, marketingConsentRows } from "@/lib/consent-text";
import { getAttribution, saveReceipt, track, trackOnce } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/field";
import { ConsentBox } from "@/components/apply/ConsentBox";
import { OfficialLink } from "@/components/site/OfficialLink";
import { SERVICE_ICON } from "./ServiceIcons";
import { useApply } from "./ApplyContext";

const FIELD_ORDER = ["serviceType", "name", "phone", "preferredTime", "memo", "privacyConsent"] as const;
const FIELD_DOM_ID: Record<(typeof FIELD_ORDER)[number], string> = {
  serviceType: "apply-type-unclaimed",
  name: "apply-name",
  phone: "apply-phone",
  preferredTime: "apply-time",
  memo: "apply-memo",
  privacyConsent: "apply-privacy",
};

type Status = "idle" | "submitting" | "success";

export function ApplyForm({ config }: { config: PublicConfig }) {
  const router = useRouter();
  const { serviceType: ctxType, selectType } = useApply();
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
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mountedAt.current = Date.now();
    idemKey.current = crypto.randomUUID();
  }, []);

  // 랜딩의 유형 카드·탭에서 고른 값을 폼에 반영
  useEffect(() => {
    if (ctxType) setServiceType(ctxType);
  }, [ctxType]);

  const disabled = !config.submissionEnabled;
  const busy = status !== "idle";

  const clearError = (k: string) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || disabled) return;
    setServerError(null);

    const payload = { serviceType, name, phone, preferredTime, memo, privacyConsent, marketingConsent };
    const v = validateLeadInput(payload);
    if (!v.ok) {
      setErrors(v.errors);
      const first = FIELD_ORDER.find((k) => v.errors[k]);
      if (first) document.getElementById(FIELD_DOM_ID[first])?.focus();
      return;
    }

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
          const first = FIELD_ORDER.find((k) => data.fieldErrors[k]);
          if (first) document.getElementById(FIELD_DOM_ID[first])?.focus();
        }
        setServerError(data?.error ?? "신청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setStatus("idle");
        requestAnimationFrame(() => summaryRef.current?.focus());
        return;
      }
      setStatus("success");
      saveReceipt({
        refNo: data.refNo,
        receiptToken: data.receiptToken,
        serviceType: v.value.serviceType,
        demo: !!data.demo,
        coverage: "offered",
      });
      // 광고 전환의 유일한 기준 이벤트. 개인정보 없이 점검 유형만 전달.
      track("form_submit_success", { serviceType: v.value.serviceType });
      router.push("/apply/complete");
    } catch {
      setServerError("네트워크 연결을 확인한 뒤 다시 시도해 주세요. 입력하신 내용은 그대로 남아 있습니다.");
      setStatus("idle");
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      onFocusCapture={() => trackOnce("form_start", { serviceType: serviceType || null })}
      aria-labelledby="apply-form-title"
      className="rounded-3xl border border-navy-200/80 bg-white p-5 shadow-lift sm:p-8"
    >
      <h3 id="apply-form-title" className="text-[20px] font-extrabold text-navy sm:text-[22px]">
        보험금 점검 상담 신청
      </h3>
      <p className="mt-1.5 text-[14px] text-navy-500">
        <span className="text-blue" aria-hidden="true">
          *
        </span>{" "}
        표시는 필수 항목입니다.
      </p>

      {config.mode === "demo" && (
        <Alert tone="caution" className="mt-5" title="데모 모드">
          입력한 내용은 시연용 서버 메모리에만 잠시 보관되며 실제 상담 연락이 가지 않습니다. 실제 이름·연락처를 입력하지 마세요.
        </Alert>
      )}
      {disabled && (
        <Alert tone="caution" className="mt-5" title="현재 신청 접수 준비 중입니다" role="status">
          운영 정보와 승인 절차가 완료된 뒤 접수가 시작됩니다.{" "}
          {config.operator.contactPhone ? `문의: ${config.operator.contactPhone}. ` : ""}숨은보험금은 지금 바로{" "}
          <OfficialLink className="font-semibold text-blue underline underline-offset-2" />할 수 있습니다.
        </Alert>
      )}

      <div ref={summaryRef} tabIndex={-1} aria-live="assertive" className="focus:outline-none">
        {(serverError || errorCount > 0) && (
          <Alert tone="error" role="alert" className="mt-5" title={serverError ?? `입력 내용을 확인해 주세요 (${errorCount}개 항목)`}>
            {serverError && errorCount > 0 ? `${errorCount}개 항목을 확인해 주세요.` : null}
          </Alert>
        )}
      </div>

      <fieldset disabled={disabled || busy} className="mt-6 space-y-6">
        <fieldset aria-describedby={errors.serviceType ? "apply-type-error" : undefined}>
          <legend className="mb-2 text-[15px] font-semibold text-navy">
            점검 유형
            <span className="ml-1 text-blue" aria-hidden="true">
              *
            </span>
          </legend>
          <div className="grid gap-2">
            {SERVICE_TYPES.map((t) => {
              const Icon = SERVICE_ICON[t];
              const checked = serviceType === t;
              return (
                <label
                  key={t}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue",
                    checked ? "border-blue bg-blue-50" : errors.serviceType ? "border-danger" : "border-navy-200 hover:border-navy-300",
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
                    className="h-4 w-4 shrink-0 accent-blue"
                    data-autofocus={t === "unclaimed" ? "" : undefined}
                  />
                  <Icon className={cn("h-5 w-5 shrink-0", checked ? "text-blue" : "text-navy-400")} aria-hidden="true" />
                  <span className="text-[15px] font-semibold text-navy">{SERVICE_CONTENT[t].title}</span>
                </label>
              );
            })}
          </div>
          <FieldError id="apply-type-error">{errors.serviceType}</FieldError>
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
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
              placeholder="홍길동"
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

        <div>
          <Label htmlFor="apply-time" required>
            상담 희망 시간
          </Label>
          <Select
            id="apply-time"
            name="preferredTime"
            value={preferredTime}
            invalid={!!errors.preferredTime}
            aria-required="true"
            aria-describedby={errors.preferredTime ? "apply-time-error" : undefined}
            onChange={(e) => {
              setPreferredTime(e.target.value as PreferredTime);
              clearError("preferredTime");
            }}
          >
            <option value="" disabled>
              선택해 주세요
            </option>
            {PREFERRED_TIMES.map((t) => (
              <option key={t} value={t}>
                {PREFERRED_TIME_LABEL[t]}
              </option>
            ))}
          </Select>
          <FieldError id="apply-time-error">{errors.preferredTime}</FieldError>
        </div>

        <div>
          <Label htmlFor="apply-memo">상담 메모</Label>
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
          <div className="mt-1.5 flex justify-between gap-3 text-[12.5px] text-navy-500">
            <p id="apply-memo-help">병명·병력, 주민등록번호 등 민감한 정보는 적지 마세요.</p>
            <p aria-hidden="true" className="shrink-0 tabular-nums">
              {memo.length}/{LIMITS.memoMax}
            </p>
          </div>
          <FieldError id="apply-memo-error">{errors.memo}</FieldError>
        </div>

        {/* 봇 차단용 숨김 필드: 사람에게는 보이지 않고 보조기기에서도 제외 */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="apply-website">웹사이트</label>
          <input id="apply-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>

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
          <p className="flex gap-2 text-[12.5px] leading-relaxed text-navy-500">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            보험 상품 권유를 위한 동의는 받지 않습니다. 보장 분석 상담은 신청 완료 후 원하시는 경우에만 별도로 동의를 받습니다.
          </p>
        </div>

        <Button type="submit" size="xl" className="w-full" aria-disabled={busy || disabled}>
          {status === "submitting" ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              신청하는 중…
            </>
          ) : status === "success" ? (
            "신청 완료 — 이동 중…"
          ) : (
            "무료 점검 상담 신청하기"
          )}
        </Button>
        <p className="sr-only" aria-live="polite">
          {status === "submitting" ? "신청을 전송하고 있습니다." : status === "success" ? "신청이 완료되었습니다." : ""}
        </p>
      </fieldset>
    </form>
  );
}
