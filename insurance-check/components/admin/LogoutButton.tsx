"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("w-full justify-start", className)}
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
        window.location.assign("/admin/login");
      }}
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      로그아웃
    </Button>
  );
}
