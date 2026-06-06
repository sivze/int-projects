import { NextResponse } from "next/server";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Unexpected server error.";
  console.error("API request failed", {
    name: error instanceof Error ? error.name : "UnknownError",
    message
  });

  return NextResponse.json({ error: message }, { status: 500 });
}
