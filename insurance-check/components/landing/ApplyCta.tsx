"use client";

import { ArrowRight, Phone } from "lucide-react";
import type { Interest } from "@/lib/types";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Button, buttonVariants, type ButtonProps } from "@/components/ui/button";
import { useApply, type CtaSource } from "./ApplyContext";

/**
 * 모든 CTA의 공통 버튼. 목적지는 항상 같은 신청 폼이며, interest를 넘기면 그 항목을 관심 서비스에 미리 체크한다.
 * 문구를 넘기지 않으면 메인 CTA A/B 안(?cta=a~d)의 문구를 쓴다. 외부 사이트로 나가지 않는다.
 */
export function ApplyCta({
  source,
  interest,
  children,
  arrow = true,
  ...props
}: Omit<ButtonProps, "onClick" | "type"> & {
  source: CtaSource;
  interest?: Interest | null;
  arrow?: boolean;
}) {
  const { startApply, ctaLabel, ctaVariant } = useApply();
  const label = children ?? ctaLabel;
  return (
    <Button onClick={() => startApply(source, interest)} data-cta-variant={children ? undefined : ctaVariant} {...props}>
      {label}
      {arrow && <ArrowRight className="h-[1.1em] w-[1.1em] transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />}
    </Button>
  );
}

/** 전화 걸기(모바일에서 바로 통화). 50~60대 고객은 신청서보다 전화를 먼저 원하는 경우가 많아 보조 동선으로 둔다 */
export function CallButton({ phone, label, className, size = "xl" }: { phone: string; label?: string; className?: string; size?: ButtonProps["size"] }) {
  const tel = phone.replace(/[^\d+]/g, "");
  return (
    <a
      href={`tel:${tel}`}
      onClick={() => track("call_click")}
      className={cn(
        buttonVariants({ variant: "outline", size }),
        "h-auto min-h-[56px] flex-wrap gap-x-2 gap-y-0 whitespace-normal border-2 border-forest-200 bg-white py-2 text-center text-forest-700 hover:border-forest-300 hover:bg-forest-50",
        className,
      )}
    >
      <span className="inline-flex items-center gap-2">
        <Phone className="h-[1.1em] w-[1.1em]" aria-hidden="true" />
        {label ?? "전화 문의"}
      </span>
      <span className="font-bold">{phone}</span>
    </a>
  );
}
