import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  test("workspace loaded", () => {
    const workspaceName = vscode.workspace.name;
    console.log("Workspace name:", workspaceName);
    assert.strictEqual(workspaceName, "test-workspace");
  });

  test("Extension loaded", async function () {
    this.timeout(30000);
    
    // List all extensions for debugging
    const allExtensions = vscode.extensions.all;
    console.log("Total extensions:", allExtensions.length);
    
    const ourExtension = vscode.extensions.getExtension("georgykurian.laravel-ide-helper");
    console.log("Our extension found:", !!ourExtension);
    
    if (ourExtension) {
      console.log("Extension is active:", ourExtension.isActive);
      if (!ourExtension.isActive) {
        console.log("Activating extension...");
        await ourExtension.activate();
        console.log("Extension activated:", ourExtension.isActive);
      }
    }
    
    assert.notStrictEqual(ourExtension, undefined, "Extension should be found");
    assert.strictEqual(ourExtension?.isActive, true, "Extension should be active");
  });

  test("Commands loaded", async function () {
    this.timeout(5000);
    
    const extensionPrefix = "laravelIdeHelper";
    const extensionCommands = [
      `${extensionPrefix}.laravelFacadeGenerate`,
      `${extensionPrefix}.laravelGenerateAll`,
      `${extensionPrefix}.laravelModelGenerate`,
      `${extensionPrefix}.laravelMetaGenerate`,
      `${extensionPrefix}.clearCaches`,
    ];
    
    const commands = await vscode.commands.getCommands(true);
    console.log("Total commands:", commands.length);
    
    const ourCommands = commands.filter(cmd => cmd.includes("laravel"));
    console.log("Laravel commands:", ourCommands.join(", "));
    
    extensionCommands.forEach((extensionCommand) =>
      assert.strictEqual(
        commands.includes(extensionCommand),
        true,
        `Couldn't find ${extensionCommand}`
      )
    );
  });

  test("Default configuration", () => {
    const config = vscode.workspace.getConfiguration("helper");
    assert.strictEqual(config.get("facades"), true);
    assert.strictEqual(config.get("models"), true);
    assert.strictEqual(config.get("autoClearConsole"), false);
    assert.strictEqual(config.get("phpPath"), "php");
    assert.strictEqual(config.get("runOnSave"), true);
    assert.strictEqual(config.get("debounceDelay"), 1000);
    assert.strictEqual(config.get("parallelExecution"), true);
  });
});
