import { NextResponse, type NextRequest } from "next/server";
import { PRIVACY_REQUEST_STATUSES, type PrivacyRequestStatus } from "@/lib/types";
import { requireApi } from "@/lib/server/auth";
import { isSameOrigin, readJson } from "@/lib/server/request";
import { updatePrivacyRequestByStaff } from "@/lib/server/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const auth = await requireApi("handlePrivacy");
  if (auth.error) return auth.error;
  const body = await readJson(req);
  const status = body?.status as PrivacyRequestStatus;
  if (!body || !(PRIVACY_REQUEST_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "잘못된 상태입니다." }, { status: 400 });
  }
  const { id } = await ctx.params;
  const updated = await updatePrivacyRequestByStaff(auth.session, id, status, typeof body.note === "string" ? body.note : "");
  if (!updated) return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
