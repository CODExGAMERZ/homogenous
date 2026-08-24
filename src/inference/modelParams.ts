/**
 * Parses model parameter capacity in Billions (B) from identifier or name strings.
 */
export function parseModelParams(idOrName: string): number {
  const lower = idOrName.toLowerCase();

  // 1. Check known frontier model parameter scales
  if (lower.includes("deepseek-r1") || lower.includes("deepseek-v3") || lower.includes("deepseek-reasoner") || lower.includes("deepseek-chat")) return 671;
  if (lower.includes("550b")) return 550;
  if (lower.includes("405b")) return 405;
  if (lower.includes("jamba-1.5-large") || lower.includes("398b")) return 398;
  if (lower.includes("nemotron-4-340b") || lower.includes("340b")) return 340;
  if (lower.includes("nemotron-ultra-253b") || lower.includes("253b")) return 253;
  if (lower.includes("claude-3-5-sonnet") || lower.includes("claude-3-7-sonnet") || lower.includes("claude-3-opus") || (lower.includes("gpt-4o") && !lower.includes("mini")) || lower.includes("gpt-4.5") || lower.includes("chatgpt-4o")) return 200;
  if (lower.includes("mixtral-8x22b") || lower.includes("8x22b")) return 176;
  if (lower.includes("dbrx") || lower.includes("132b")) return 132;
  if (lower.includes("mistral-large") || lower.includes("123b")) return 123;
  if (lower.includes("palmyra-creative-122b") || lower.includes("122b")) return 122;
  if (lower.includes("120b") || lower.includes("gpt-oss-120b")) return 120;
  if (lower.includes("kimi-k2.6") || lower.includes("100b")) return 100;
  if (lower.includes("90b")) return 90;
  if (lower.includes("72b")) return 72;
  if (lower.includes("70b") || lower.includes("compound")) return 70;
  if (lower.includes("mixtral-8x7b") || lower.includes("8x7b")) return 56;
  if (lower.includes("51b")) return 51;
  if (lower.includes("49b")) return 49;
  if (lower.includes("34b") || lower.includes("yi-large")) return 34;
  if (lower.includes("32b")) return 32;
  if (lower.includes("31b")) return 31;
  if (lower.includes("30b")) return 30;
  if (lower.includes("27b")) return 27;
  if (lower.includes("24b") || lower.includes("mistral-small")) return 24;
  if (lower.includes("22b") || lower.includes("codestral")) return 22;
  if (lower.includes("20b")) return 20;
  if (lower.includes("15b") || lower.includes("starcoder2-15b")) return 15;
  if (lower.includes("14b")) return 14;
  if (lower.includes("13b")) return 13;
  if (lower.includes("12b")) return 12;
  if (lower.includes("11b")) return 11;
  if (lower.includes("9b")) return 9;
  if (lower.includes("8b") || lower.includes("gpt-4o-mini") || lower.includes("o1-mini") || lower.includes("o3-mini") || lower.includes("haiku")) return 8;
  if (lower.includes("7b")) return 7;
  if (lower.includes("6.7b")) return 6.7;
  if (lower.includes("4b")) return 4;
  if (lower.includes("3.8b") || lower.includes("3.5b")) return 3.5;
  if (lower.includes("3b")) return 3;
  if (lower.includes("2.7b")) return 2.7;
  if (lower.includes("2b")) return 2;
  if (lower.includes("1.5b") || lower.includes("1.1b")) return 1.5;
  if (lower.includes("1b")) return 1;
  if (lower.includes("0.5b") || lower.includes("500m")) return 0.5;
  if (lower.includes("800m")) return 0.8;
  if (lower.includes("135m")) return 0.135;

  // 2. Generic regex for MoE like 8x22b or 8x7b
  const moeMatch = lower.match(/(\d+)x(\d+(?:\.\d+)?)b/);
  if (moeMatch) {
    return parseFloat(moeMatch[1]) * parseFloat(moeMatch[2]);
  }

  // 3. Generic regex for parameters ending with 'b' (e.g. 70b, 1.5b, 8b, 550b)
  const bMatch = lower.match(/(\d+(?:\.\d+)?)b/);
  if (bMatch) {
    return parseFloat(bMatch[1]);
  }

  // 4. Generic regex for parameters ending with 'm' (e.g. 800m, 350m)
  const mMatch = lower.match(/(\d+(?:\.\d+)?)m/);
  if (mMatch) {
    return parseFloat(mMatch[1]) / 1000;
  }

  return 0;
}
