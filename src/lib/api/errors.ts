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

  // Log the real error server-side, but never leak internal detail to the client.
  console.error("API request failed", {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : "Unknown error"
  });

  return NextResponse.json(
    { error: "Something went wrong while processing the image. Please try again." },
    { status: 500 }
  );
}
