import { NextResponse } from "next/server";

export interface ApiLogger {
  route: string;
  method: string;
  requestId: string;
  info(message: string, extra?: Record<string, unknown>): void;
  warn(message: string, extra?: Record<string, unknown>): void;
  error(message: string, err?: unknown, extra?: Record<string, unknown>): void;
  span<T>(label: string, fn: () => Promise<T>): Promise<T>;
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}

function writeLog(
  level: "info" | "warn" | "error",
  payload: Record<string, unknown>,
): void {
  const line = JSON.stringify({ level, service: "together-web", ...payload });
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function createApiLogger(route: string, method: string): ApiLogger {
  const requestId = crypto.randomUUID().slice(0, 8);
  const started = Date.now();

  const base = () => ({
    route,
    method,
    requestId,
    ms: Date.now() - started,
  });

  return {
    route,
    method,
    requestId,
    info(message, extra) {
      writeLog("info", { ...base(), event: message, ...extra });
    },
    warn(message, extra) {
      writeLog("warn", { ...base(), event: message, ...extra });
    },
    error(message, err, extra) {
      writeLog("error", {
        ...base(),
        event: message,
        ...(err !== undefined ? { error: serializeError(err) } : {}),
        ...extra,
      });
    },
    span(label, fn) {
      return runSpan(route, label, fn, requestId);
    },
  };
}

export async function runSpan<T>(
  scope: string,
  label: string,
  fn: () => Promise<T>,
  requestId?: string,
): Promise<T> {
  const started = Date.now();
  writeLog("info", {
    scope,
    label,
    requestId,
    event: "span_start",
    ms: 0,
  });
  try {
    const result = await fn();
    writeLog("info", {
      scope,
      label,
      requestId,
      event: "span_end",
      ms: Date.now() - started,
    });
    return result;
  } catch (err) {
    writeLog("error", {
      scope,
      label,
      requestId,
      event: "span_error",
      ms: Date.now() - started,
      error: serializeError(err),
    });
    throw err;
  }
}

export type RouteContext = {
  params: Promise<Record<string, string>>;
};

export type ApiRouteHandler = (
  log: ApiLogger,
  request: Request,
  context: RouteContext,
) => Promise<Response>;

export function withApiHandler(route: string, handler: ApiRouteHandler) {
  return async (request: Request, context: RouteContext): Promise<Response> => {
    const log = createApiLogger(route, request.method);
    log.info("request_start", { path: route });
    try {
      const response = await handler(log, request, context);
      log.info("request_complete", { status: response.status });
      return response;
    } catch (err) {
      log.error("request_failed", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
