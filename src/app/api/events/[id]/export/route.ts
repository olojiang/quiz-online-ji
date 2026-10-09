import { loadEvent } from "@/lib/auth";
import { exportFile, fileResponse } from "@/lib/report";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const r = await loadEvent(Number((await params).id));
  if ("error" in r) return r.error;
  return fileResponse(await exportFile(r.event, new URL(req.url).searchParams.get("section") || "all"));
}
