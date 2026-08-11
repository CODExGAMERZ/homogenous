import fs from "node:fs";
import { resolvePath } from "../platform/paths.js";

export interface FileSnapshot {
  id: string;
  filePath: string;
  previousContent: string | null;
  newContent: string;
  timestamp: string;
}

export interface DiffHunk {
  targetPath: string;
  originalLines: string[];
  newLines: string[];
  isFullRewrite: boolean;
  modificationRatio: number;
}

export class DiffEngine {
  private static undoStack: FileSnapshot[] = [];

  /**
   * Records a file modification in the undo stack before applying.
   */
  public static recordFileEdit(filePath: string, newContent: string): FileSnapshot {
    const absPath = resolvePath(process.cwd(), filePath);
    let previousContent: string | null = null;

    if (fs.existsSync(absPath)) {
      previousContent = fs.readFileSync(absPath, "utf-8");
    }

    const snapshot: FileSnapshot = {
      id: `edit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      filePath,
      previousContent,
      newContent,
      timestamp: new Date().toISOString(),
    };

    DiffEngine.undoStack.push(snapshot);
    return snapshot;
  }

  /**
   * Reverts the last recorded file modification in the undo stack.
   */
  public static undoLastEdit(): { success: boolean; snapshot?: FileSnapshot; message: string } {
    if (DiffEngine.undoStack.length === 0) {
      return { success: false, message: "Undo stack is empty. No recent file edits to undo." };
    }

    const snapshot = DiffEngine.undoStack.pop()!;
    const absPath = resolvePath(process.cwd(), snapshot.filePath);

    try {
      if (snapshot.previousContent === null) {
        // File was newly created, delete it
        if (fs.existsSync(absPath)) {
          fs.unlinkSync(absPath);
        }
        return {
          success: true,
          snapshot,
          message: `Undid creation of file '${snapshot.filePath}' (deleted).`,
        };
      } else {
        // Restore previous content
        fs.writeFileSync(absPath, snapshot.previousContent, "utf-8");
        return {
          success: true,
          snapshot,
          message: `Reverted '${snapshot.filePath}' back to previous state (${snapshot.timestamp}).`,
        };
      }
    } catch (err) {
      return {
        success: false,
        snapshot,
        message: `Failed to undo edit for '${snapshot.filePath}': ${(err as Error).message}`,
      };
    }
  }

  public static getEditHistory(): FileSnapshot[] {
    return [...DiffEngine.undoStack];
  }

  public static getSessionDiffSummary(): string {
    if (DiffEngine.undoStack.length === 0) {
      return "No file modifications made in this session.";
    }

    const summaries: string[] = [];
    for (const snap of DiffEngine.undoStack) {
      const orig = snap.previousContent || "";
      const diff = DiffEngine.generateUnifiedDiff(orig, snap.newContent, snap.filePath);
      summaries.push(diff);
    }

    return summaries.join("\n\n");
  }

  /**
   * Evaluates if a file edit proposal should be performed as a unified diff hunk or full file rewrite.
   */
  public static evaluateDiff(
    filePath: string,
    proposedContent: string,
    fullRewriteThreshold: number = 0.4
  ): DiffHunk {
    const absPath = resolvePath(process.cwd(), filePath);
    if (!fs.existsSync(absPath)) {
      return {
        targetPath: filePath,
        originalLines: [],
        newLines: proposedContent.split(/\r?\n/),
        isFullRewrite: true,
        modificationRatio: 1.0,
      };
    }

    const originalText = fs.readFileSync(absPath, "utf-8");
    const originalLines = originalText.split(/\r?\n/);
    const newLines = proposedContent.split(/\r?\n/);

    if (originalLines.length < 50) {
      return {
        targetPath: filePath,
        originalLines,
        newLines,
        isFullRewrite: true,
        modificationRatio: 1.0,
      };
    }

    let changedLineCount = 0;
    const maxLen = Math.max(originalLines.length, newLines.length);

    for (let i = 0; i < maxLen; i++) {
      if (originalLines[i] !== newLines[i]) {
        changedLineCount++;
      }
    }

    const modificationRatio = changedLineCount / maxLen;
    const isFullRewrite = modificationRatio > fullRewriteThreshold;

    return {
      targetPath: filePath,
      originalLines,
      newLines,
      isFullRewrite,
      modificationRatio,
    };
  }

  /**
   * Generates colorized unified diff string representation.
   */
  public static generateUnifiedDiff(originalContent: string, newContent: string, filePath: string): string {
    const origLines = originalContent.split(/\r?\n/);
    const newLines = newContent.split(/\r?\n/);

    const diffLines: string[] = [`--- a/${filePath}`, `+++ b/${filePath}`];

    let i = 0, j = 0;
    while (i < origLines.length || j < newLines.length) {
      if (i < origLines.length && j < newLines.length && origLines[i] === newLines[j]) {
        diffLines.push(` ${origLines[i]}`);
        i++;
        j++;
      } else {
        if (i < origLines.length) {
          diffLines.push(`-${origLines[i]}`);
          i++;
        }
        if (j < newLines.length) {
          diffLines.push(`+${newLines[j]}`);
          j++;
        }
      }
    }

    return diffLines.join("\n");
  }
}
