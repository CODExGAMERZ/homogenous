import { PersistentMemory, type MemoryFact } from "./PersistentMemory.js";
import { ContextRetriever } from "../token-budget/ContextRetriever.js";

export class MemoryRetriever {
  /**
   * Selectively retrieves relevant memory facts matching query keywords.
   */
  public static retrieveRelevantFacts(query: string, topK: number = 5): MemoryFact[] {
    const memory = PersistentMemory.getInstance();
    const allFacts = memory.listFacts();
    if (allFacts.length === 0) return [];

    const queryTerms = ContextRetriever.extractTerms(query);
    if (queryTerms.length === 0) return allFacts.slice(0, topK);

    const scored = allFacts.map((fact) => {
      let score = 0;
      const lowerFact = fact.fact.toLowerCase();
      for (const term of queryTerms) {
        if (lowerFact.includes(term.toLowerCase())) {
          score += 1;
        }
      }
      return { fact, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.filter((s) => s.score > 0 || scored.indexOf(s) < topK).map((s) => s.fact).slice(0, topK);
  }
}
