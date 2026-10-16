"use client";

import { ArrowRight } from "lucide-react";
import type { ServiceType } from "@/lib/types";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useApply, type CtaSource } from "./ApplyContext";

/**
 * 모든 CTA의 공통 버튼. 목적지는 항상 같은 신청 폼이며, 이미 고른 점검 유형을 유지한다(type을 넘기면 그 유형).
 * 문구를 넘기지 않으면 메인 CTA A/B 안(?cta=a~d)의 문구를 쓴다. 외부 사이트로 나가지 않는다.
 */
export function ApplyCta({
  source,
  type,
  children,
  arrow = true,
  ...props
}: Omit<ButtonProps, "onClick" | "type"> & {
  source: CtaSource;
  type?: ServiceType | null;
  arrow?: boolean;
}) {
  const { startApply, ctaLabel, ctaVariant } = useApply();
  const label = children ?? ctaLabel;
  return (
    <Button
      onClick={() => startApply(source, type)}
      data-cta-variant={children ? undefined : ctaVariant}
      {...props}
    >
      {label}
      {arrow && <ArrowRight className="h-[1.1em] w-[1.1em] transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />}
    </Button>
  );
}
