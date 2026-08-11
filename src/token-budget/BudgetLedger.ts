import pricingData from "./pricing.json" with { type: "json" };

export interface CallRecord {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  isLocal: boolean;
  costUSD: number;
  timestamp: string;
}

export class BudgetLedger {
  private static instance: BudgetLedger;
  private records: CallRecord[] = [];

  public static getInstance(): BudgetLedger {
    if (!BudgetLedger.instance) {
      BudgetLedger.instance = new BudgetLedger();
    }
    return BudgetLedger.instance;
  }

  public recordCall(params: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    isLocal: boolean;
  }): CallRecord {
    const { provider, model, inputTokens, outputTokens, cacheReadTokens = 0, cacheWriteTokens = 0, isLocal } = params;

    let costUSD = 0;
    if (!isLocal) {
      const modelPricing = (pricingData as Record<string, any>)[model] || {
        inputPerM: 3.0,
        outputPerM: 15.0,
      };

      const inputCost = (inputTokens / 1_000_000) * (modelPricing.inputPerM || 0);
      const outputCost = (outputTokens / 1_000_000) * (modelPricing.outputPerM || 0);
      const cacheReadCost = (cacheReadTokens / 1_000_000) * (modelPricing.cacheReadPerM || 0);
      const cacheWriteCost = (cacheWriteTokens / 1_000_000) * (modelPricing.cacheWritePerM || 0);

      costUSD = inputCost + outputCost + cacheReadCost + cacheWriteCost;
    }

    const record: CallRecord = {
      provider,
      model,
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      isLocal,
      costUSD,
      timestamp: new Date().toISOString(),
    };

    this.records.push(record);
    return record;
  }

  public getSummary() {
    let totalInput = 0;
    let totalOutput = 0;
    let totalCacheRead = 0;
    let totalCacheWrite = 0;
    let totalCostUSD = 0;
    let localCalls = 0;
    let cloudCalls = 0;

    for (const r of this.records) {
      totalInput += r.inputTokens;
      totalOutput += r.outputTokens;
      totalCacheRead += r.cacheReadTokens || 0;
      totalCacheWrite += r.cacheWriteTokens || 0;
      totalCostUSD += r.costUSD;
      if (r.isLocal) localCalls++;
      else cloudCalls++;
    }

    const totalTokens = totalInput + totalOutput;
    const cacheHitRatio =
      totalInput + totalCacheRead > 0
        ? Math.round((totalCacheRead / (totalInput + totalCacheRead)) * 100)
        : 0;

    return {
      totalTokens,
      totalInput,
      totalOutput,
      totalCacheRead,
      totalCacheWrite,
      totalCostUSD,
      localCalls,
      cloudCalls,
      cacheHitRatio,
    };
  }

  public formatMeterString(): string {
    const s = this.getSummary();
    const tokK = (s.totalTokens / 1000).toFixed(1);
    const inK = (s.totalInput / 1000).toFixed(1);
    const outK = (s.totalOutput / 1000).toFixed(1);
    const cost = s.totalCostUSD.toFixed(3);

    return `⛁ session: ${tokK}k tok (↑${inK}k ↓${outK}k) │ $${cost} │ cache-hit ${s.cacheHitRatio}% │ ${s.localCalls} local, ${s.cloudCalls} cloud calls`;
  }
}
