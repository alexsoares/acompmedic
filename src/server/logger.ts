type LogLevel = "debug" | "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

function writeLog(level: LogLevel, message: string, payload?: LogPayload) {
  const entry = {
    level,
    message,
    payload,
    timestamp: new Date().toISOString(),
  };

  console[level](JSON.stringify(entry));
}

export const logger = {
  debug: (message: string, payload?: LogPayload) => writeLog("debug", message, payload),
  info: (message: string, payload?: LogPayload) => writeLog("info", message, payload),
  warn: (message: string, payload?: LogPayload) => writeLog("warn", message, payload),
  error: (message: string, payload?: LogPayload) => writeLog("error", message, payload),
};
