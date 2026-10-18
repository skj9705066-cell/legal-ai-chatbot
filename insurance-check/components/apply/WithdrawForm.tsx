"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { PRIVACY_REQUEST_TYPES, PRIVACY_REQUEST_TYPE_LABEL, type PrivacyRequestType } from "@/lib/types";
import { formatPhoneInput, validatePrivacyRequest, type FieldErrors } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";

const TYPE_HELP: Record<PrivacyRequestType, string> = {
  withdraw_marketing: "광고성 문자 발송이 즉시 중단됩니다.",
  withdraw_coverage: "보장 분석·보험상품 안내 연락이 즉시 중단됩니다. 보험금 점검 안내는 유지됩니다.",
  delete_all: "모든 연락이 즉시 중단되고, 본인 확인 후 신청 정보를 파기합니다.",
};

export function WithdrawForm() {
  const [type, setType] = useState<PrivacyRequestType | "">("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  // 연타 시 요청이 여러 번 나가 같은 요청이 중복 접수되지 않도록 즉시 잠근다(state는 다음 렌더링에 반영됨)
  const inFlight = useRef(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state !== "idle") return;
    setServerError(null);
    const v = validatePrivacyRequest({ type, name, phone });
    if (!v.ok) {
      setErrors(v.errors);
      const first = (["type", "name", "phone"] as const).find((k) => v.errors[k]);
      document.getElementById({ type: "wd-type-withdraw_marketing", name: "wd-name", phone: "wd-phone" }[first!])?.focus();
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setState("busy");
    try {
      const res = await fetch("/api/privacy-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name, phone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setServerError(data?.error ?? "요청을 처리하지 못했습니다.");
        setState("idle");
        inFlight.current = false;
        return;
      }
      setState("done");
      requestAnimationFrame(() => doneRef.current?.focus());
    } catch {
      setServerError("네트워크 연결을 확인한 뒤 다시 시도해 주세요.");
      setState("idle");
      inFlight.current = false;
    }
  }

  if (state === "done") {
    return (
      <div ref={doneRef} tabIndex={-1} role="status" className="rounded-2xl border border-mint-100 bg-mint-50 p-6 text-center focus:outline-none">
        <CheckCircle2 className="mx-auto h-10 w-10 text-mint" aria-hidden="true" />
        <p className="mt-3 text-[17px] font-bold text-navy">요청이 접수되었습니다</p>
        <p className="mt-2 text-[14px] leading-relaxed text-navy-600">
          입력하신 정보와 일치하는 신청이 있으면 요청 내용대로 처리합니다. 삭제 요청은 본인 확인을 위해 연락드릴 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-6">
      {serverError && <Alert tone="error" role="alert" title={serverError} />}
      <fieldset disabled={state === "busy"} className="space-y-6">
        <fieldset aria-describedby={errors.type ? "wd-type-error" : undefined}>
          <legend className="mb-2 text-[15px] font-semibold text-navy">
            요청 유형<span className="ml-1 text-blue" aria-hidden="true">*</span>
          </legend>
          <div className="space-y-2">
            {PRIVACY_REQUEST_TYPES.map((t) => (
              <label
                key={t}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border px-4 py-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue",
                  type === t ? "border-blue bg-blue-50" : errors.type ? "border-danger" : "border-navy-200",
                )}
              >
                <input
                  id={`wd-type-${t}`}
                  type="radio"
                  name="type"
                  value={t}
                  checked={type === t}
                  onChange={() => {
                    setType(t);
                    setErrors((x) => ({ ...x, type: undefined }));
                  }}
                  className="mt-1 h-4 w-4 accent-blue"
                />
                <span>
                  <span className="block text-[15px] font-semibold text-navy">{PRIVACY_REQUEST_TYPE_LABEL[t]}</span>
                  <span className="mt-0.5 block text-[13.5px] text-navy-600">{TYPE_HELP[t]}</span>
                </span>
              </label>
            ))}
          </div>
          <FieldError id="wd-type-error">{errors.type}</FieldError>
        </fieldset>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="wd-name" required>
              신청 시 입력한 이름
            </Label>
            <Input
              id="wd-name"
              autoComplete="name"
              value={name}
              invalid={!!errors.name}
              aria-describedby={errors.name ? "wd-name-error" : undefined}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((x) => ({ ...x, name: undefined }));
              }}
            />
            <FieldError id="wd-name-error">{errors.name}</FieldError>
          </div>
          <div>
            <Label htmlFor="wd-phone" required>
              신청 시 입력한 휴대전화번호
            </Label>
            <Input
              id="wd-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              invalid={!!errors.phone}
              aria-describedby={errors.phone ? "wd-phone-error" : undefined}
              onChange={(e) => {
                setPhone(formatPhoneInput(e.target.value));
                setErrors((x) => ({ ...x, phone: undefined }));
              }}
              placeholder="010-0000-0000"
            />
            <FieldError id="wd-phone-error">{errors.phone}</FieldError>
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          {state === "busy" ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              접수 중…
            </>
          ) : (
            "요청 접수"
          )}
        </Button>
      </fieldset>
    </form>
  );
}
