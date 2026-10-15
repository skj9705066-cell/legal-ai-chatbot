"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { PublicConfig } from "@/lib/config";
import { CONTACT_METHODS, CONTACT_METHOD_LABEL, PREFERRED_TIMES, PREFERRED_TIME_LABEL, type ContactMethod, type PreferredTime } from "@/lib/types";
import { coverageConsentRows } from "@/lib/consent-text";
import { isPlaceholder } from "@/lib/display";
import { validateCoverageInput, type FieldErrors } from "@/lib/validation";
import { saveReceipt, track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, Label, Select } from "@/components/ui/field";
import { useReceipt } from "./useReceipt";
import { LoadingView, MissingReceiptView, RefNo } from "./StateViews";

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
      <Alert tone="info" title="보장 분석 추가 신청을 진행할 수 없는 상태입니다">
        이미 처리되었거나 신청 확인 시간이 지났습니다. 보장 분석을 원하시면 상담 연락 시 말씀해 주세요.
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
      const domId = { contactMethod: `cov-method-${CONTACT_METHODS[0]}`, preferredTime: "cov-time", coverageConsent: "cov-consent" }[first!];
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
    <form noValidate onSubmit={onSubmit} aria-labelledby="cov-title" className="rounded-3xl border border-navy-200/80 bg-white p-6 shadow-card sm:p-8">
      <p className="text-[13px] font-bold text-blue">선택 상담 · 별도 동의</p>
      <h1 id="cov-title" className="mt-1.5 text-[22px] font-extrabold leading-snug text-navy sm:text-[26px]">
        무료 보장 분석 상담 신청
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-navy-600">
        보험금 점검과 별개의 상담입니다. 아래 내용을 확인하고 동의하시는 경우에만 신청됩니다.
      </p>
      <RefNo refNo={receipt.refNo} demo={receipt.demo} />

      <div ref={alertRef} tabIndex={-1} className="focus:outline-none">
        {serverError && (
          <Alert tone="error" role="alert" className="mt-5" title={serverError} />
        )}
      </div>

      <section aria-labelledby="cov-info" className="mt-6 rounded-2xl bg-navy-50 p-5">
        <h2 id="cov-info" className="text-[15px] font-bold text-navy">
          상담 및 개인정보 이용 안내
        </h2>
        <dl className="mt-3 space-y-2.5 text-[14px] leading-relaxed">
          {rows.map((r) => (
            <div key={r.label} className="grid gap-0.5 sm:grid-cols-[96px_1fr] sm:gap-3">
              <dt className="font-semibold text-navy-700">{r.label}</dt>
              <dd className={cn("text-navy-600", isPlaceholder(r.value) && "font-medium text-caution")}>{r.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 border-t border-navy-200 pt-3 text-[13px] leading-relaxed text-navy-600">
          보장 분석 상담을 신청해도 보험 계약이나 보험금·환급금 지급을 보장하지 않으며, 상담 후 보험 가입 의무는 없습니다. 상담 과정에서 보험증권 등
          추가 자료가 필요하면 그때 별도로 안내하고 동의를 받습니다.
        </p>
      </section>

      <fieldset disabled={busy} className="mt-6 space-y-6">
        <fieldset aria-describedby={errors.contactMethod ? "cov-method-error" : undefined}>
          <legend className="mb-2 text-[15px] font-semibold text-navy">
            연락 방법<span className="ml-1 text-blue" aria-hidden="true">*</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {CONTACT_METHODS.map((m) => (
              <label
                key={m}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[14.5px] font-semibold text-navy has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue",
                  contactMethod === m ? "border-blue bg-blue-50" : errors.contactMethod ? "border-danger" : "border-navy-200",
                )}
              >
                <input
                  id={`cov-method-${m}`}
                  type="radio"
                  name="contactMethod"
                  value={m}
                  checked={contactMethod === m}
                  onChange={() => {
                    setContactMethod(m);
                    setErrors((x) => ({ ...x, contactMethod: undefined }));
                  }}
                  className="h-4 w-4 accent-blue"
                />
                {CONTACT_METHOD_LABEL[m]}
              </label>
            ))}
          </div>
          <FieldError id="cov-method-error">{errors.contactMethod}</FieldError>
        </fieldset>

        <div>
          <Label htmlFor="cov-time" required>
            보장 분석 상담 희망 시간
          </Label>
          <Select
            id="cov-time"
            value={preferredTime}
            invalid={!!errors.preferredTime}
            aria-describedby={errors.preferredTime ? "cov-time-error" : undefined}
            onChange={(e) => {
              setPreferredTime(e.target.value as PreferredTime);
              setErrors((x) => ({ ...x, preferredTime: undefined }));
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
          <FieldError id="cov-time-error">{errors.preferredTime}</FieldError>
        </div>

        <div className={cn("rounded-xl border p-4", errors.coverageConsent ? "border-danger" : "border-navy-200")}>
          <div className="flex items-start gap-3">
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
              className="mt-0.5 h-5 w-5 shrink-0 accent-blue"
            />
            <label htmlFor="cov-consent" className="cursor-pointer text-[14.5px] font-semibold leading-snug text-navy">
              <span className="mr-1.5 text-navy-500">[선택]</span>
              위 안내에 따라 보장 분석 상담 및 보험상품 안내를 위한 개인정보 이용과 연락에 동의합니다.
            </label>
          </div>
          <FieldError id="cov-consent-error">{errors.coverageConsent}</FieldError>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
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
          <Button variant="outline" size="lg" className="w-full" onClick={decline}>
            보험금 점검만 이용할게요
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
