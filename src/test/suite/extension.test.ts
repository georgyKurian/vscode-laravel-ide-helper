import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Extension loaded", () => {
    const myExtension = vscode.extensions.getExtension(
      "georgyKurian.laravel-ide-helper"
    );
    assert.notStrictEqual(myExtension, undefined);
    assert.strictEqual(myExtension?.isActive, true);
  });

  test("workspace loaded", () => {
    assert.strictEqual(vscode.workspace.name, "test-workspace");
  });

  test("Commands loaded", async () => {
    const extensionPrefix = "laravelIdeHelper";
    const extensionCommands = [
      `${extensionPrefix}.laravelFacadeGenerate`,
      `${extensionPrefix}.laravelGenerateAll`,
      `${extensionPrefix}.laravelModelGenerate`,
      `${extensionPrefix}.laravelMetaGenerate`,
    ];
    const commands = await vscode.commands.getCommands();
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
  });
});
