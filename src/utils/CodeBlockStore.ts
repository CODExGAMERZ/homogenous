import { execSync } from "node:child_process";

export interface CodeBlockItem {
  lang: string;
  code: string;
}

export class CodeBlockStore {
  private static instance: CodeBlockStore;
  private blocks: CodeBlockItem[] = [];

  public static getInstance(): CodeBlockStore {
    if (!CodeBlockStore.instance) {
      CodeBlockStore.instance = new CodeBlockStore();
    }
    return CodeBlockStore.instance;
  }

  public addBlock(lang: string, code: string): void {
    const trimmed = code.trim();
    if (!trimmed) return;
    this.blocks.push({ lang: lang || "code", code: trimmed });
    if (this.blocks.length > 30) {
      this.blocks = this.blocks.slice(this.blocks.length - 30);
    }
  }

  public addBlocksFromMarkdown(markdown: string): void {
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;
    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      const lang = match[1].trim() || "code";
      const code = match[2].trimEnd();
      this.addBlock(lang, code);
    }
  }

  public getLastBlock(indexFromLast = 1): CodeBlockItem | undefined {
    if (this.blocks.length === 0) return undefined;
    const targetIdx = this.blocks.length - indexFromLast;
    return this.blocks[targetIdx >= 0 ? targetIdx : 0];
  }

  public getAllBlocks(): CodeBlockItem[] {
    return [...this.blocks];
  }

  public copyToClipboard(text: string): boolean {
    try {
      if (process.platform === "win32") {
        execSync("clip", { input: text, encoding: "utf-8" });
        return true;
      } else if (process.platform === "darwin") {
        execSync("pbcopy", { input: text, encoding: "utf-8" });
        return true;
      } else {
        execSync("xclip -selection clipboard", { input: text, encoding: "utf-8" });
        return true;
      }
    } catch {
      return false;
    }
  }
}
