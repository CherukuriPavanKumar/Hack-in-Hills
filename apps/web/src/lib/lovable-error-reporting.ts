export function reportLovableError(error: unknown, context?: Record<string, unknown>) {
  if (typeof console !== "undefined" && console.error) {
    console.error("Error reported:", error, context);
  }
}
