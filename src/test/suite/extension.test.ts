import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
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
    ];
    const commands = await vscode.commands.getCommands();
    const regExp = new RegExp(/laravelFacadeGenerate/i);
    // console.log("---" + commands.find((cmd) => cmd === cmds[0]));
    extensionCommands.forEach((extensionCommand) =>
      assert.strictEqual(
        commands.includes(extensionCommand),
        true,
        `Couldnt find ${extensionCommand}`
      )
    );
  });

  test("Default configuarion", () => {
    const config = vscode.workspace.getConfiguration("helper");
    assert.strictEqual(config.get("facades"), true);
    assert.strictEqual(config.get("models"), true);
  });
});
