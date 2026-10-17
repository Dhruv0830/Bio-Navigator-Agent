export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "server-session";
  let sessionId = localStorage.getItem("biopathway_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("biopathway_session_id", sessionId);
  }
  return sessionId;
}
