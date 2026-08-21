import fs from "node:fs";
import os from "node:os";
import { resolvePath, getProjectMemoryDir } from "../platform/paths.js";

export interface MemoryFact {
  id: string;
  fact: string;
  category: "architecture" | "convention" | "preference" | "general";
  updated_at: string;
  updated_by: string;
}

function sanitizeFact(text: string): string {
  if (!text) return text;
  let scrubbed = text.replace(
    /((?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|amqp|mssql):\/\/[^:\s\/]+:)([^@\s]+)(@)/gi,
    "$1[REDACTED_PASSWORD]$3"
  );
  return scrubbed.replace(
    /(?:bearer\s+[A-Za-z0-9_.-]{16,}|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_.-]{16,}|gsk_[A-Za-z0-9_.-]{16,}|nvapi-[A-Za-z0-9_.-]{16,}|ghp_[A-Za-z0-9_.-]{16,}|gho_[A-Za-z0-9_.-]{16,}|github_pat_[A-Za-z0-9_.-]{20,}|glpat-[A-Za-z0-9_.-]{16,}|hf_[A-Za-z0-9]{16,}|xox[baprs]-[A-Za-z0-9_.-]{10,}|AKIA[0-9A-Z]{16}|enc:v1:[a-f0-9:]+|eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9-_./+=]{10,})/gi,
    "[REDACTED]"
  );
}

export class PersistentMemory {
  private static instance: PersistentMemory;
  private memoryDir: string;
  private factsFile: string;

  private constructor(projectRoot: string = process.cwd()) {
    this.memoryDir = getProjectMemoryDir(projectRoot);
    this.factsFile = resolvePath(this.memoryDir, "facts.json");
    this.ensureDirExists();
  }

  public static getInstance(projectRoot?: string): PersistentMemory {
    if (!PersistentMemory.instance) {
      PersistentMemory.instance = new PersistentMemory(projectRoot);
    }
    return PersistentMemory.instance;
  }

  private ensureDirExists() {
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }
    if (!fs.existsSync(this.factsFile)) {
      fs.writeFileSync(this.factsFile, JSON.stringify([], null, 2), "utf-8");
    }
  }

  public listFacts(): MemoryFact[] {
    try {
      const content = fs.readFileSync(this.factsFile, "utf-8");
      return JSON.parse(content) as MemoryFact[];
    } catch {
      return [];
    }
  }

  public addFact(fact: string, category: MemoryFact["category"] = "general", author: string = os.userInfo().username || "user"): MemoryFact {
    const facts = this.listFacts();
    const cleanFact = sanitizeFact(fact);
    const newFact: MemoryFact = {
      id: `fact-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fact: cleanFact,
      category,
      updated_at: new Date().toISOString(),
      updated_by: author,
    };

    facts.push(newFact);
    fs.writeFileSync(this.factsFile, JSON.stringify(facts, null, 2), "utf-8");
    return newFact;
  }

  public removeFact(id: string): boolean {
    const facts = this.listFacts();
    const filtered = facts.filter((f) => f.id !== id && !f.id.endsWith(id));
    if (filtered.length !== facts.length) {
      fs.writeFileSync(this.factsFile, JSON.stringify(filtered, null, 2), "utf-8");
      return true;
    }
    return false;
  }

  public clearFacts(): void {
    fs.writeFileSync(this.factsFile, JSON.stringify([], null, 2), "utf-8");
  }

  public getFormattedSystemFacts(): string {
    const facts = this.listFacts();
    if (facts.length === 0) return "";
    const items = facts.map((f) => `- [${f.category}] ${f.fact} (updated: ${f.updated_at} by ${f.updated_by})`).join("\n");
    return `\nPersistent Project Memory:\n${items}\n`;
  }
}
