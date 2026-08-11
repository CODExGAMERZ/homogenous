import { execCommand } from "./shell.js";

export interface VramInfo {
  usedMb: number;
  totalMb: number;
  usedGb: string;
  totalGb: string;
}

let cachedVramInfo: VramInfo | null = null;
let lastProbeTime = 0;
const PROBE_INTERVAL_MS = 5000; // Poll nvidia-smi at most once every 5 seconds

/**
 * Probes NVIDIA GPU VRAM usage non-blockingly with 5s caching interval.
 * Returns null if nvidia-smi is unavailable or on non-NVIDIA systems.
 */
export async function getVramInfo(): Promise<VramInfo | null> {
  const now = Date.now();
  if (cachedVramInfo !== null && now - lastProbeTime < PROBE_INTERVAL_MS) {
    return cachedVramInfo;
  }

  try {
    const res = await execCommand("nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader,nounits", {
      timeoutMs: 1000,
    });

    if (res.exitCode === 0 && res.stdout.trim()) {
      const line = res.stdout.trim().split("\n")[0];
      const parts = line.split(",").map((s) => parseFloat(s.trim()));
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const usedMb = parts[0];
        const totalMb = parts[1];
        cachedVramInfo = {
          usedMb,
          totalMb,
          usedGb: (usedMb / 1024).toFixed(1),
          totalGb: (totalMb / 1024).toFixed(1),
        };
        lastProbeTime = now;
        return cachedVramInfo;
      }
    }
  } catch {
    // Non-NVIDIA GPU or nvidia-smi not in PATH
  }

  lastProbeTime = now;
  cachedVramInfo = null;
  return null;
}
