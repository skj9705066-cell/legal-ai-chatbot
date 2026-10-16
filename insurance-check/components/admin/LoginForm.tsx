"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { STAFF_ROLES, STAFF_ROLE_LABEL, type StaffRole } from "@/lib/types";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

export function LoginForm({ mode, setupIssues }: { mode: "demo" | "staging" | "production"; setupIssues: string[] }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("admin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "demo" ? { password, role } : { email, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "로그인에 실패했습니다.");
        setBusy(false);
        return;
      }
      // 세션 쿠키가 바뀌었으므로 클라이언트 라우터 캐시를 쓰지 않고 전체 이동한다.
      // (replace + refresh 조합은 직후의 같은 경로 이동을 멈추게 했다)
      window.location.assign("/admin");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setBusy(false);
    }
  }

  if (setupIssues.length) {
    return (
      <Alert tone="caution" className="mt-5" title="관리자 로그인 설정이 필요합니다">
        환경변수 {setupIssues.join(", ")}를 설정한 뒤 서버를 다시 시작하세요.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-7 space-y-5" noValidate>
      {mode === "demo" && (
        <Alert tone="caution" title="데모 관리자">
          가짜 고객 데이터만 표시됩니다. 권한 차이를 확인하려면 역할을 바꿔 로그인하세요.
        </Alert>
      )}
      {error && <Alert tone="error" role="alert" title={error} />}
      {mode !== "demo" ? (
        <div>
          <label htmlFor="login-email" className="mb-2 block text-[15px] font-semibold text-navy">
            이메일
          </label>
          <Input id="login-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
      ) : (
        <div>
          <label htmlFor="login-role" className="mb-2 block text-[15px] font-semibold text-navy">
            데모 역할
          </label>
          <Select id="login-role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {STAFF_ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div>
        <label htmlFor="login-password" className="mb-2 block text-[15px] font-semibold text-navy">
          비밀번호
        </label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" variant="navy" size="lg" className="w-full" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        로그인
      </Button>
    </form>
  );
}
