import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Mark test execution environment
process.env.HOMOGENOUS_TEST_ENV = "1";

// Isolate global config directory so tests never touch ~/.homogenous
const testSandboxHome = path.join(os.tmpdir(), `homogenous-test-sandbox-${process.pid}`);
process.env.HOMOGENOUS_HOME = testSandboxHome;

const configDir = path.join(testSandboxHome, ".homogenous");
if (!fs.existsSync(configDir)) {
  try {
    fs.mkdirSync(configDir, { recursive: true });
  } catch {
    // Non-fatal
  }
}

// Cleanup sandbox directory on process exit
process.on("exit", () => {
  try {
    if (fs.existsSync(testSandboxHome)) {
      fs.rmSync(testSandboxHome, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup error on exit
  }
});
