"use client";

import { ArrowRight } from "lucide-react";
import type { ServiceType } from "@/lib/types";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useApply } from "./ApplyContext";

export function ApplyCta({
  source,
  type,
  children = "내 보험금 점검 시작하기",
  ...props
}: Omit<ButtonProps, "onClick" | "type"> & {
  source: Parameters<ReturnType<typeof useApply>["startApply"]>[0];
  type?: ServiceType;
}) {
  const { startApply } = useApply();
  return (
    <Button onClick={() => startApply(source, type)} {...props}>
      {children}
      <ArrowRight className="h-[1.1em] w-[1.1em]" aria-hidden="true" />
    </Button>
  );
}
