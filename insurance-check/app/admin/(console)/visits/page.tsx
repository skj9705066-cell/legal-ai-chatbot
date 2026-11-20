import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { getStaffSession } from "@/lib/server/auth";
import { listLeadsForStaff } from "@/lib/server/service";
import { REGION_LABEL, CLAIM_STATUS_LABEL, interestsText } from "@/lib/types";
import { SERVICE_CONTENT } from "@/lib/content";
import { formatVisitAt } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel } from "@/components/admin/ui";

/** "2026-11-25" (한국 시간 날짜) */
const kstDay = (iso: string) => new Date(Date.parse(iso) + 9 * 3_600_000).toISOString().slice(0, 10);

/** 방문 일정: 오늘(한국 시간 0시)부터 잡힌 방문을 날짜별로. 지난 방문은 상담 DB에서 '방문 일정순'으로 볼 수 있다 */
export default async function VisitsPage() {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  const todayKst = kstDay(new Date().toISOString());
  const from = new Date(`${todayKst}T00:00:00+09:00`).toISOString();
  const leads = await listLeadsForStaff(session, { visitFrom: from, sort: "visit", tests: "include" });
  const groups = new Map<string, typeof leads>();
  for (const l of leads) {
    const d = kstDay(l.visitAt!);
    groups.set(d, [...(groups.get(d) ?? []), l]);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="방문 일정" description="오늘부터 잡힌 방문 예약입니다. 일정·장소 변경과 안내 문자는 각 신청의 상세 화면에서 합니다." />
      {leads.length === 0 && (
        <Panel className="p-10 text-center text-[15px] text-navy-500">
          예정된 방문이 없습니다. 상담 DB에서 신청을 열어 방문 일시를 저장하면 여기에 보입니다.
        </Panel>
      )}
      {[...groups.entries()].map(([day, list]) => (
        <section key={day} aria-label={`${day} 방문`}>
          <h2 className="mb-2 text-[16px] font-bold text-navy">
            {formatVisitAt(list[0].visitAt).split(") ")[0]})
            {day === todayKst && <Badge variant="blue" className="ml-2">오늘</Badge>}
            <span className="ml-2 text-[14px] font-medium text-navy-600">{list.length}건</span>
          </h2>
          <Panel className="divide-y divide-navy-100">
            {list.map((l) => (
              <Link prefetch={false} key={l.id} href={`/admin/leads/${l.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-navy-50/60">
                <span className="w-[92px] font-mono text-[15px] font-bold text-navy">{formatVisitAt(l.visitAt).split(") ")[1]}</span>
                <span className="min-w-[90px] text-[15px] font-semibold text-ink">{l.name}</span>
                <span className="text-[14px] text-navy-600">{l.region ? REGION_LABEL[l.region] : "-"}</span>
                <span className="flex min-w-0 items-center gap-1 text-[14px] text-navy-600">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {l.visitPlace ?? "장소 미정"}
                </span>
                <span className="text-[14px] text-navy-600">{interestsText(l.interests) ?? SERVICE_CONTENT[l.serviceType].shortTitle}</span>
                <span className="ml-auto flex gap-1">
                  <Badge>{CLAIM_STATUS_LABEL[l.claimStatus]}</Badge>
                  {l.assignee && <Badge variant="blue">{l.assignee}</Badge>}
                  {l.isDemo && <Badge variant="demo">데모</Badge>}
                  {l.isTest && <Badge variant="demo">테스트</Badge>}
                </span>
              </Link>
            ))}
          </Panel>
        </section>
      ))}
    </div>
  );
}
