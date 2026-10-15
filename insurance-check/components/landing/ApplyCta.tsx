"use client";

import { ArrowRight } from "lucide-react";
import type { ServiceType } from "@/lib/types";
import { HERO } from "@/lib/content";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useApply, type CtaSource } from "./ApplyContext";

export function ApplyCta({
  source,
  type,
  children = HERO.cta,
  arrow = true,
  ...props
}: Omit<ButtonProps, "onClick" | "type"> & { source: CtaSource; type?: ServiceType; arrow?: boolean }) {
  const { startApply } = useApply();
  return (
    <Button onClick={() => startApply(source, type)} {...props}>
      {children}
      {arrow && <ArrowRight className="h-[1.1em] w-[1.1em]" aria-hidden="true" />}
    </Button>
  );
}
