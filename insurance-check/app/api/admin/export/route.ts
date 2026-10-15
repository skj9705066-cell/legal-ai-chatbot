import { NextResponse, type NextRequest } from "next/server";
import { requireApi } from "@/lib/server/auth";
import { leadsToCsv } from "@/lib/server/csv";
import { listLeadsForStaff, recordStaffAudit } from "@/lib/server/service";
import { parseLeadQuery } from "@/lib/lead-query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** CSV 내보내기: 관리자만. 마스킹 연락처만 포함하며 내보낸 조건·건수를 감사로그에 남긴다. */
export async function GET(req: NextRequest) {
  const auth = await requireApi("exportCsv");
  if (auth.error) return auth.error;
  const filter = parseLeadQuery(Object.fromEntries(req.nextUrl.searchParams));
  const leads = await listLeadsForStaff(auth.session, { ...filter, limit: 10_000 });
  await recordStaffAudit(auth.session, "lead.export_csv", `CSV 내보내기 ${leads.length}건 (${req.nextUrl.search || "전체"})`);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(leadsToCsv(leads), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="insurance-check-leads-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
