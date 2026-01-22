import { resolve } from "node:path";
import Mocha from "mocha";
import { glob } from "glob";

export async function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: "tdd",
    color: true,
    timeout: 60000,
    reporter: "spec",
  });

  const testsRoot = resolve(__dirname);

  console.log("[Test Suite] Tests root:", testsRoot);
  
  const files = await glob("*.test.js", { cwd: testsRoot });
  
  console.log("[Test Suite] Test files found:", files);

  // Add files to the test suite
  files.forEach((f) => {
    const filePath = resolve(testsRoot, f);
    console.log("[Test Suite] Adding test file:", filePath);
    mocha.addFile(filePath);
  });

  return new Promise((resolve, reject) => {
    try {
      // Run the mocha test
      mocha.run((failures) => {
        console.log("[Test Suite] Tests completed with", failures, "failures");
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
    } catch (err) {
      console.error("[Test Suite] Error running tests:", err);
      reject(err);
    }
  });
}
