import { measure } from "@/src/status";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await measure(), { headers: { "Cache-Control": "no-store" } });
}
