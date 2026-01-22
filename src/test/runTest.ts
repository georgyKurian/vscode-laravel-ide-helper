import { resolve } from "node:path";
import { runTests, downloadAndUnzipVSCode } from "@vscode/test-electron";

async function main() {
  try {
    console.log("=== Starting Test Runner ===");
    
    // The folder containing the Extension Manifest package.json
    const extensionDevelopmentPath = resolve(__dirname, "../../");

    // The path to the extension test script (compiled to out/)
    const extensionTestsPath = resolve(__dirname, "./suite/index");

    // Use an absolute path for the workspace
    const testWorkspace = resolve(extensionDevelopmentPath, "data/test/test-workspace");

    console.log("Extension Development Path:", extensionDevelopmentPath);
    console.log("Extension Tests Path:", extensionTestsPath);
    console.log("Test Workspace:", testWorkspace);

    // Download VS Code - use specific version for compatibility
    const vscodeExecutablePath = await downloadAndUnzipVSCode("1.85.0");
    console.log("VS Code executable:", vscodeExecutablePath);

    console.log("=== Calling runTests ===");
    
    // Download VS Code, unzip it and run the integration test
    const exitCode = await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        testWorkspace,
        "--disable-workspace-trust",
      ],
      extensionTestsEnv: {
        ...process.env,
      },
    });
    
    console.log("=== runTests completed with exit code:", exitCode, "===");
    process.exit(exitCode);
  } catch (err) {
    console.error("=== Failed to run tests ===", err);
    process.exit(1);
  }
}

main();
