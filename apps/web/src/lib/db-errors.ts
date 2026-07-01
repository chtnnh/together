/** Map DB failures to safe user-facing copy. Full details stay in server logs only. */
export function formatPublicDbError(error: unknown, fallback: string): string {
  const cause = extractCause(error);

  if (cause && typeof cause === "object") {
    const pg = cause as { code?: string };
    switch (pg.code) {
      case "42P01":
      case "42703":
        return process.env.NODE_ENV === "development"
          ? "Database schema is out of date. Run: ENV_FILE=.env.prod pnpm db:migrate"
          : fallback;
      case "23503":
        return "Could not link this action to your account. Try signing out and back in.";
      case "23505":
        return "This record already exists.";
      case "ECONNREFUSED":
        return fallback;
    }
  }

  if (error instanceof Error && looksLikeInternalDbError(error.message)) {
    return fallback;
  }

  return fallback;
}

function extractCause(error: unknown): unknown {
  if (error && typeof error === "object" && "cause" in error) {
    return (error as { cause?: unknown }).cause;
  }
  return error;
}

function looksLikeInternalDbError(message: string): boolean {
  return /failed query|insert into|update |select |delete from|params:/i.test(message);
}
