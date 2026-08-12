import path from "node:path";
import os from "node:os";

/**
 * Normalizes a file path to use forward slashes consistently across platforms (Windows / POSIX).
 */
export function normalizePath(filePath: string): string {
  if (!filePath) return "";
  // Replace Windows backslashes with forward slashes
  let normalized = filePath.replace(/\\/g, "/");
  // Trim trailing slash unless it's root '/' or 'C:/'
  if (normalized.length > 1 && normalized.endsWith("/") && !normalized.match(/^[a-zA-Z]:\/$/)) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

/**
 * Expands home directory symbol `~` to absolute system home path.
 */
export function expandHome(filePath: string): string {
  if (!filePath) return "";
  if (filePath === "~" || filePath.startsWith("~/")) {
    const home = os.homedir();
    return normalizePath(path.join(home, filePath.slice(2)));
  }
  return normalizePath(filePath);
}

/**
 * Resolves relative or absolute path to a fully normalized absolute path.
 */
export function resolvePath(basePath: string, ...relativePathSegments: string[]): string {
  const expandedBase = expandHome(basePath);
  const combined = path.resolve(expandedBase, ...relativePathSegments);
  return normalizePath(combined);
}

/**
 * Resolves a requested file path against a workspace root and enforces workspace containment (path traversal prevention).
 * Throws an Error if the target path escapes the workspace root, unless allowOutside is explicitly true.
 */
export function resolveWorkspacePath(
  workspaceRoot: string = process.cwd(),
  requestedPath: string,
  allowOutside: boolean = false
): string {
  if (!requestedPath || typeof requestedPath !== "string") {
    throw new Error("Invalid file path: path must be a non-empty string.");
  }
  if (requestedPath.includes("\0")) {
    throw new Error("Invalid file path: path contains null bytes.");
  }

  const normalizedRoot = normalizePath(path.resolve(expandHome(workspaceRoot)));
  const resolvedTarget = resolvePath(normalizedRoot, requestedPath);

  if (allowOutside) {
    return resolvedTarget;
  }

  // Cross-platform check: on Windows case-insensitive, on POSIX case-sensitive
  const isWindows = os.platform() === "win32";
  const checkRoot = isWindows ? normalizedRoot.toLowerCase() : normalizedRoot;
  const checkTarget = isWindows ? resolvedTarget.toLowerCase() : resolvedTarget;

  const isContained = checkTarget === checkRoot || checkTarget.startsWith(checkRoot + "/");
  if (!isContained) {
    throw new Error(
      `Access denied: Path '${requestedPath}' escapes workspace root '${normalizedRoot}' (workspace containment violation).`
    );
  }

  return resolvedTarget;
}

/**
 * System paths for Homogenous global configuration and memory.
 */
export function getGlobalConfigDir(): string {
  return resolvePath(os.homedir(), ".homogenous");
}

export function getGlobalConfigFile(): string {
  return resolvePath(getGlobalConfigDir(), ".toolrc.yaml");
}

export function getProjectConfigFile(projectRoot: string = process.cwd()): string {
  return resolvePath(projectRoot, ".toolrc.yaml");
}

export function getProjectMemoryDir(projectRoot: string = process.cwd()): string {
  return resolvePath(projectRoot, ".agentmemory");
}
