import type { Metadata } from "next";
import { getPublicConfig } from "@/lib/config";
import { orSetting } from "@/lib/display";
import { ApplyShell } from "@/components/apply/ApplyShell";
import { WithdrawForm } from "@/components/apply/WithdrawForm";

export const metadata: Metadata = { title: "동의 철회 · 삭제 요청" };

export default function WithdrawPage() {
  const config = getPublicConfig();
  return (
    <ApplyShell config={config} wide>
      <div className="rounded-3xl border border-navy-200/80 bg-white p-6 shadow-card sm:p-10">
        <h1 className="text-[24px] font-extrabold text-navy sm:text-[26px]">동의 철회 · 개인정보 삭제 요청</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-navy-600">
          신청 시 입력한 이름과 휴대전화번호로 요청을 접수합니다. 전화({orSetting(config.operator.contactPhone, "대표 연락처", config.mode)})나 이메일(
          {orSetting(config.operator.contactEmail, "문의 이메일", config.mode)})로도 요청할 수 있습니다.
        </p>
        <div className="mt-8">
          <WithdrawForm />
        </div>
      </div>
    </ApplyShell>
  );
}
