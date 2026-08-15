/**
 * Extracts balanced JSON substrings (objects and arrays) from raw text.
 */
function extractJsonCandidates(text: string): string[] {
  const candidates: string[] = [];
  let inString = false;
  let escape = false;
  let depth = 0;
  let startIndex = -1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{" || char === "[") {
        if (depth === 0) {
          startIndex = i;
        }
        depth++;
      } else if (char === "}" || char === "]") {
        if (depth > 0) {
          depth--;
          if (depth === 0 && startIndex !== -1) {
            candidates.push(text.slice(startIndex, i + 1));
            startIndex = -1;
          }
        }
      }
    }
  }
  return candidates;
}

/**
 * Universal Tool Call Parser:
 * Extracts structured tool invocations from raw text outputs across all model providers
 * (OpenAI, Anthropic, Ollama, LM Studio, Groq, NVIDIA NIM, DeepSeek, Mistral, Together, OpenRouter)
 * when models format function calls in content rather than API response structures.
 */
export function parseEmbeddedToolCalls(rawText: string): {
  remainingText: string;
  toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>;
} {
  const toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
  let remainingText = rawText;

  // 1. Tag format: <tool_call> ... </tool_call>, <function_call> ... </function_call>, or <tool> ... </tool>
  const xmlRegex = /<(?:tool_call|function_call|tool|action|call)>([\s\S]*?)<\/(?:tool_call|function_call|tool|action|call)>/gi;
  let xmlMatch;
  while ((xmlMatch = xmlRegex.exec(rawText)) !== null) {
    try {
      const parsed = JSON.parse(xmlMatch[1].trim());
      const name = parsed.name || parsed.function?.name;
      const input = parsed.parameters || parsed.arguments || parsed.input || parsed.function?.arguments || parsed.function?.parameters || {};
      if (name) {
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name,
          input: typeof input === "string" ? JSON.parse(input) : input,
        });
        remainingText = remainingText.replace(xmlMatch[0], "").trim();
      }
    } catch {}
  }

  // 2. Llama 3 / Groq inline format: <function/write_file({...})> or <function:write_file({...})>
  const funcInlineRegex = /<function[\/:\.=_]([a-zA-Z0-9_-]+)\s*(?:\(([\s\S]*?)\)|\{([\s\S]*?)\})\s*>/gi;
  let funcMatch;
  while ((funcMatch = funcInlineRegex.exec(rawText)) !== null) {
    try {
      const name = funcMatch[1];
      const rawArg = funcMatch[2] ? funcMatch[2].trim() : `{${funcMatch[3]}}`;
      let input: Record<string, unknown> = {};
      try {
        input = JSON.parse(rawArg);
      } catch {
        const cands = extractJsonCandidates(rawArg);
        if (cands.length > 0) input = JSON.parse(cands[0]);
      }
      if (name) {
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name,
          input,
        });
        remainingText = remainingText.replace(funcMatch[0], "").trim();
      }
    } catch {}
  }

  // 2b. Unclosed or trailing Llama 3 inline format: <function/write_file({...})
  if (toolCalls.length === 0) {
    const trailingFuncRegex = /<function[\/:\.=_]([a-zA-Z0-9_-]+)\s*\(([\s\S]*)/i;
    const trailingMatch = trailingFuncRegex.exec(rawText);
    if (trailingMatch) {
      const name = trailingMatch[1];
      const rest = trailingMatch[2];
      const cands = extractJsonCandidates(rest);
      if (cands.length > 0) {
        try {
          const input = JSON.parse(cands[0]);
          if (name && input) {
            toolCalls.push({
              id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name,
              input,
            });
            remainingText = rawText.slice(0, trailingMatch.index).trim();
          }
        } catch {}
      }
    }
  }

  // 3. Anthropic style XML format: <invoke name="..."> <parameter name="...">...</parameter> </invoke>
  const invokeRegex = /<invoke\s+name=["']([^"']+)["']>([\s\S]*?)<\/invoke>/gi;
  let invokeMatch;
  while ((invokeMatch = invokeRegex.exec(rawText)) !== null) {
    try {
      const name = invokeMatch[1];
      const paramBody = invokeMatch[2];
      const paramRegex = /<parameter\s+name=["']([^"']+)["']>([\s\S]*?)<\/parameter>/gi;
      const input: Record<string, unknown> = {};
      let pMatch;
      while ((pMatch = paramRegex.exec(paramBody)) !== null) {
        input[pMatch[1]] = pMatch[2].trim();
      }
      if (name && Object.keys(input).length > 0) {
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name,
          input,
        });
        remainingText = remainingText.replace(invokeMatch[0], "").trim();
      }
    } catch {}
  }

  // 4. Fenced markdown block format: ```json { "type": "function", ... } ``` or ```json [ {...} ] ```
  const fencedRegex = /```(?:json)?\s*([\{\[][\s\S]*?[\}\]])\s*```/gi;
  let fencedMatch;
  while ((fencedMatch = fencedRegex.exec(rawText)) !== null) {
    try {
      const parsed = JSON.parse(fencedMatch[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const name = item.name || (item.type === "function" && item.name ? item.name : item.function?.name);
        const input = item.parameters || item.arguments || item.input || item.function?.arguments || item.function?.parameters;
        if (name && input) {
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name,
            input: typeof input === "string" ? JSON.parse(input) : input,
          });
          remainingText = remainingText.replace(fencedMatch[0], "").trim();
        }
      }
    } catch {}
  }

  // 5. Raw / Balanced JSON object format anywhere in text (e.g. {"type": "function", "name": "write_file", ...})
  if (toolCalls.length === 0) {
    const candidates = extractJsonCandidates(rawText);
    for (const cand of candidates) {
      try {
        const parsed = JSON.parse(cand.trim());
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          const name = item.name || (item.type === "function" && item.name ? item.name : item.function?.name);
          const input = item.parameters || item.arguments || item.input || item.function?.parameters || item.function?.arguments;
          if (name && input) {
            toolCalls.push({
              id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name,
              input: typeof input === "string" ? JSON.parse(input) : input,
            });
            remainingText = remainingText.replace(cand, "").trim();
          }
        }
      } catch {}
    }
  }

  return { remainingText, toolCalls };
}
