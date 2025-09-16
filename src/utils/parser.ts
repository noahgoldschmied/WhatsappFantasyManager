// Simple command parser placeholder

export function parseCommand(body: string) {
  const parts = body.trim().split(" ");
  return { command: parts[0], args: parts.slice(1) };
}
