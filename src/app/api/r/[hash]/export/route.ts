import { fromLink } from "@/lib/public";
import { exportFile, fileResponse } from "@/lib/report";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ hash: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const r = await fromLink((await params).hash, ["report"]);
  if ("error" in r) return r.error;
  return fileResponse(await exportFile(r.event, new URL(req.url).searchParams.get("section") || "all"));
}
