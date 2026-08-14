import type { SlashCommand } from "../SlashCommand.js";
import { PersistentMemory } from "../../../memory/PersistentMemory.js";

export const memoryCommands: SlashCommand[] = [
  {
    name: "memory",
    description: "View or manage persistent project memory facts",
    category: "memory",
    usage: "/memory [list|add|remove|clear] [args]",
    execute: async (args) => {
      const action = (args[0] || "list").toLowerCase();
      const memory = PersistentMemory.getInstance();

      if (action === "list") {
        const facts = memory.listFacts();
        if (facts.length === 0) {
          return { output: "Persistent Facts:\nNo persistent facts stored in .agentmemory/facts.json" };
        }
        const items = facts.map((f) => `- [${f.id}] (${f.category}): ${f.fact} (by ${f.updated_by})`);
        return { output: `Persistent Facts:\n${items.join("\n")}` };
      } else if (action === "remember" || action === "add") {
        const factText = args.slice(1).join(" ");
        if (!factText) return { output: "Usage: /memory add [fact text]" };
        const added = memory.addFact(factText);
        return { output: `Saved fact with ID '${added.id}'` };
      } else if (action === "forget" || action === "remove" || action === "delete") {
        const id = args[1];
        if (!id) return { output: "Usage: /memory remove [fact-id]" };
        const ok = memory.removeFact(id);
        return { output: ok ? `Removed fact '${id}'` : `Fact '${id}' not found.` };
      } else if (action === "clear") {
        memory.clearFacts();
        return { output: "✓ All persistent facts cleared from .agentmemory/facts.json" };
      }
      return { output: "Usage: /memory [list|add|remove|clear]" };
    },
  },
];
