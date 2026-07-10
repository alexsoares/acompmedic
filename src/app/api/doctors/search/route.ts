import { NextResponse, type NextRequest } from "next/server";
import { searchDoctorUsers } from "@/actions/dashboard-actions";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const results = await searchDoctorUsers(q.trim());
  return NextResponse.json(results);
}
