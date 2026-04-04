import { NextResponse } from "next/server";
import { resetAllTasksToOpen } from "@/lib/mock-runtime";

export async function POST() {
  try {
    const result = resetAllTasksToOpen();
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
