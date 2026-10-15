"use client";

import { ArrowRight } from "lucide-react";
import type { ServiceType } from "@/lib/types";
import { HERO } from "@/lib/content";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useApply, type CtaSource } from "./ApplyContext";

/**
 * 모든 CTA의 공통 버튼. target="types"는 점검 유형 선택 영역(히어로·통계 뒤),
 * target="form"(기본)은 같은 신청 폼으로 이동한다. 외부 사이트로 나가지 않는다.
 */
export function ApplyCta({
  source,
  type,
  target = "form",
  children = HERO.cta,
  arrow = true,
  ...props
}: Omit<ButtonProps, "onClick" | "type"> & { source: CtaSource; type?: ServiceType; target?: "types" | "form"; arrow?: boolean }) {
  const { startApply, goToTypes } = useApply();
  return (
    <Button onClick={() => (target === "types" ? goToTypes(source) : startApply(source, type))} {...props}>
      {children}
      {arrow && <ArrowRight className="h-[1.1em] w-[1.1em] transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />}
    </Button>
  );
}
