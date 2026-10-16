"use client";

import { ArrowRight } from "lucide-react";
import type { ServiceType } from "@/lib/types";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useApply, type CtaSource } from "./ApplyContext";

/**
 * 모든 CTA의 공통 버튼. target="types"는 점검 유형 선택 영역, target="form"(기본)은 같은 신청 폼으로 이동한다.
 * 문구를 넘기지 않으면 메인 CTA A/B 안(?cta=a~d)의 문구를 쓴다. 외부 사이트로 나가지 않는다.
 */
export function ApplyCta({
  source,
  type,
  target = "form",
  children,
  primaryLabel,
  arrow = true,
  ...props
}: Omit<ButtonProps, "onClick" | "type"> & {
  source: CtaSource;
  type?: ServiceType;
  target?: "types" | "form";
  arrow?: boolean;
  /** 기본안(A)일 때 이 문구를 쓰고, 광고 URL로 다른 안(?cta=b~d)이 지정되면 그 안의 문구를 쓴다 */
  primaryLabel?: string;
}) {
  const { startApply, goToTypes, ctaLabel, ctaVariant } = useApply();
  const label = children ?? (primaryLabel && ctaVariant === "a" ? primaryLabel : ctaLabel);
  return (
    <Button
      onClick={() => (target === "types" ? goToTypes(source) : startApply(source, type))}
      data-cta-variant={children ? undefined : ctaVariant}
      {...props}
    >
      {label}
      {arrow && <ArrowRight className="h-[1.1em] w-[1.1em] transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />}
    </Button>
  );
}
