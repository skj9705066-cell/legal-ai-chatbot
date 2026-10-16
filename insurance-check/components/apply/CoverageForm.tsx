"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, MessageSquareText, PhoneCall } from "lucide-react";
import type { PublicConfig } from "@/lib/config";
import { CONTACT_METHODS, CONTACT_METHOD_LABEL, PREFERRED_TIMES, PREFERRED_TIME_LABEL, type ContactMethod, type PreferredTime } from "@/lib/types";
import { coverageConsentRows } from "@/lib/consent-text";
import { isPlaceholder } from "@/lib/display";
import { validateCoverageInput, type FieldErrors } from "@/lib/validation";
import { saveReceipt, track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { useReceipt } from "./useReceipt";
import { LoadingView, MissingReceiptView, RefNo } from "./StateViews";

const METHOD_ICON = { phone: PhoneCall, sms_then_phone: MessageSquareText } as const;

/** 10. 보장 분석 별도 동의 화면. 목적·항목·연락 방법·처리 주체를 펼쳐서 보여주고, 미체크 시 제출 불가. */
export function CoverageForm({ config }: { config: PublicConfig }) {
  const router = useRouter();
  const [receipt] = useReceipt();
  const [contactMethod, setContactMethod] = useState<ContactMethod | "">("");
  const [preferredTime, setPreferredTime] = useState<PreferredTime | "">("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  if (receipt === undefined) return <LoadingView />;
  if (receipt === null) return <MissingReceiptView />;
  if (receipt.coverage !== "offered" || !receipt.receiptToken) {
    return (
      <Alert tone="neutral" title="보장 분석 추가 신청을 진행할 수 없는 상태입니다">
        이미 처리되었거나 신청 확인 시간이 지났어요. 보장 분석을 원하시면 상담 연락 때 말씀해 주세요.
      </Alert>
    );
  }

  const decline = () => {
    track("coverage_decline", { serviceType: receipt.serviceType });
    saveReceipt({ ...receipt, receiptToken: null, coverage: "declined" });
    router.push("/apply/done");
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !receipt?.receiptToken) return;
    setServerError(null);
    const body = { coverageConsent: consent, contactMethod, preferredTime };
    const v = validateCoverageInput(body);
    if (!v.ok) {
      setErrors(v.errors);
      const first = (["contactMethod", "preferredTime", "coverageConsent"] as const).find((k) => v.errors[k]);
      const domId = { contactMethod: `cov-method-${CONTACT_METHODS[0]}`, preferredTime: `cov-time-${PREFERRED_TIMES[0]}`, coverageConsent: "cov-consent" }[first!];
      document.getElementById(domId)?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/leads/coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, receiptToken: receipt.receiptToken }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        if (data?.fieldErrors) setErrors(data.fieldErrors);
        setServerError(data?.error ?? "추가 신청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setBusy(false);
        requestAnimationFrame(() => alertRef.current?.focus());
        return;
      }
      track("coverage_opt_in", { serviceType: receipt.serviceType });
      saveReceipt({ ...receipt, receiptToken: null, coverage: "opted_in" });
      router.push("/apply/coverage/complete");
    } catch {
      setServerError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
      setBusy(false);
      requestAnimationFrame(() => alertRef.current?.focus());
    }
  }

  const rows = coverageConsentRows(config.operator);

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby="cov-title" className="rounded-[28px] bg-white p-6 shadow-card sm:p-9">
      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[14px] font-bold text-blue-700">선택 상담 · 별도 동의</span>
      <h1 id="cov-title" className="mt-4 text-[26px] font-bold leading-snug tracking-[-0.03em] text-navy sm:text-[30px]">
        무료 보장 분석 상담 신청
      </h1>
      <p className="mt-3 text-[16px] leading-[1.7] text-navy-600">
        보험금 점검과는 별개의 상담이에요. 아래 내용을 확인하고 동의하시는 경우에만 신청됩니다.
      </p>
      <RefNo refNo={receipt.refNo} trial={receipt.trial ?? null} />

      <div ref={alertRef} tabIndex={-1} className="focus:outline-none">
        {serverError && <Alert tone="error" role="alert" className="mt-6" title={serverError} />}
      </div>

      <section aria-labelledby="cov-info" className="mt-8">
        <h2 id="cov-info" className="text-[18px] font-bold text-navy">
          상담 및 개인정보 이용 안내
        </h2>
        <dl className="mt-4 divide-y divide-navy-100 rounded-2xl bg-navy-50 px-5">
          {rows.map((r) => (
            <div key={r.label} className="grid gap-1 py-4 sm:grid-cols-[96px_1fr] sm:gap-4">
              <dt className="text-[15px] font-semibold text-navy">{r.label}</dt>
              <dd className={cn("text-[16px] leading-relaxed text-navy-600", isPlaceholder(r.value) && "font-medium text-caution")}>{r.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[15px] leading-relaxed text-navy-600">
          보장 분석 상담을 신청해도 보험 계약이나 보험금·환급금 지급을 보장하지 않으며, 상담 후 보험 가입 의무는 없습니다. 상담 중 보험증권 등 추가 자료가
          필요하면 그때 따로 안내하고 동의를 받아요.
        </p>
      </section>

      <fieldset disabled={busy} className="mt-9 space-y-9">
        <div role="radiogroup" aria-labelledby="cov-method-label" aria-describedby={errors.contactMethod ? "cov-method-error" : undefined}>
          <p id="cov-method-label" className="mb-3 text-[17px] font-semibold text-navy">
            연락 방법
          </p>
          <div className="grid gap-2.5">
            {CONTACT_METHODS.map((m) => {
              const Icon = METHOD_ICON[m];
              const checked = contactMethod === m;
              return (
                <label
                  key={m}
                  className={cn(
                    "flex min-h-[64px] cursor-pointer items-center gap-3.5 rounded-2xl border-2 px-4 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-blue/20",
                    checked ? "border-blue bg-blue-50/60" : errors.contactMethod ? "border-danger" : "border-navy-100 hover:border-navy-200",
                  )}
                >
                  <input
                    id={`cov-method-${m}`}
                    type="radio"
                    name="contactMethod"
                    value={m}
                    checked={checked}
                    onChange={() => {
                      setContactMethod(m);
                      setErrors((x) => ({ ...x, contactMethod: undefined }));
                    }}
                    className="sr-only"
                  />
                  <Icon className={cn("h-5 w-5 shrink-0", checked ? "text-blue" : "text-navy-500")} aria-hidden="true" />
                  <span className="flex-1 text-[16px] font-semibold text-ink">{CONTACT_METHOD_LABEL[m]}</span>
                  <span
                    aria-hidden="true"
                    className={cn("flex h-6 w-6 items-center justify-center rounded-full border-2", checked ? "border-blue bg-blue text-white" : "border-navy-200 text-transparent")}
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </label>
              );
            })}
          </div>
          <FieldError id="cov-method-error">{errors.contactMethod}</FieldError>
        </div>

        <div role="radiogroup" aria-labelledby="cov-time-label" aria-describedby={errors.preferredTime ? "cov-time-error" : undefined}>
          <p id="cov-time-label" className="mb-3 text-[17px] font-semibold text-navy">
            보장 분석 상담 희망 시간
          </p>
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
                    id={`cov-time-${t}`}
                    type="radio"
                    name="coveragePreferredTime"
                    value={t}
                    checked={checked}
                    onChange={() => {
                      setPreferredTime(t);
                      setErrors((x) => ({ ...x, preferredTime: undefined }));
                    }}
                    className="sr-only"
                  />
                  <span className={cn("text-[16px] font-semibold", checked ? "text-blue-700" : "text-ink")}>{main}</span>
                  {sub && <span className="mt-0.5 text-[14px] text-navy-500">{sub.replace(")", "")}</span>}
                </label>
              );
            })}
          </div>
          <FieldError id="cov-time-error">{errors.preferredTime}</FieldError>
        </div>

        <div className={cn("rounded-2xl border-2 p-4 sm:p-5", errors.coverageConsent ? "border-danger" : consent ? "border-blue/60" : "border-navy-100")}>
          <div className="flex items-start gap-3">
            <span className="relative mt-0.5 flex h-6 w-6 shrink-0">
              <input
                id="cov-consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  setErrors((x) => ({ ...x, coverageConsent: undefined }));
                }}
                aria-invalid={errors.coverageConsent ? true : undefined}
                aria-describedby={errors.coverageConsent ? "cov-consent-error" : undefined}
                className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border-2 border-navy-300 bg-white checked:border-blue checked:bg-blue focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/25"
              />
              <Check className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} aria-hidden="true" />
            </span>
            <label htmlFor="cov-consent" className="cursor-pointer text-[16px] font-semibold leading-relaxed text-ink">
              <span className="mr-1.5 text-navy-500">[선택]</span>
              위 안내에 따라 보장 분석 상담 및 보험상품 안내를 위한 개인정보 이용과 연락에 동의합니다.
            </label>
          </div>
          <FieldError id="cov-consent-error">{errors.coverageConsent}</FieldError>
        </div>

        <div className="grid gap-2.5">
          <Button type="submit" size="lg" className="w-full">
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                신청하는 중…
              </>
            ) : (
              "동의하고 보장 분석 신청"
            )}
          </Button>
          <Button variant="ghost" size="lg" className="w-full" onClick={decline}>
            보험금 점검만 이용할게요
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
