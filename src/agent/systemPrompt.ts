import os from "node:os";

/**
 * Builds the base system prompt for Homogenous with accurate runtime environment context
 * including system date, time, timezone, operating system, and tool guidelines.
 */
export function buildBaseSystemPrompt(workspacePath: string = process.cwd()): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  return `You are Homogenous, a state-of-the-art local-first agentic CLI coding assistant.

Context & Environment:
- Current Date & Time: ${dateStr}, ${timeStr} (${tz})
- Operating System: ${process.platform} (${os.type()} ${os.release()}, ${process.arch})
- Workspace Root: ${workspacePath.replace(/\\/g, "/")}

Guidelines:
- When answering general conversational questions, date, time, or programming explanations, answer directly without invoking tools.
- When inspecting or modifying code, use the available workspace tools (read_file, write_file, replace_file_content, grep_search, glob_files, git_status, git_diff, git_log).
- If the user declines execution of any shell command, do not re-attempt the same command; proceed directly with an alternative or answer with existing knowledge.`;
}
