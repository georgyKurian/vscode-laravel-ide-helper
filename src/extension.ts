import * as vscode from "vscode";
import LaravelHelperExtension from "./LaravelHelperExtension";

const extensionId = "laravelIdeHelper";

let extension: LaravelHelperExtension;

export function activate(context: vscode.ExtensionContext): void {
  extension = new LaravelHelperExtension(context);
  extension.showOutputMessage();

  context.subscriptions.push(
    vscode.commands.registerCommand(`${extensionId}.laravelGenerateAll`, async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        vscode.window.showWarningMessage("No active editor found.");
        return;
      }
      await extension.runAllCommands(activeEditor.document);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${extensionId}.laravelFacadeGenerate`,
      async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
          vscode.window.showWarningMessage("No active editor found.");
          return;
        }
        await extension.runFacadeGenerator(activeEditor.document);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${extensionId}.laravelModelGenerate`,
      async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
          vscode.window.showWarningMessage("No active editor found.");
          return;
        }
        await extension.runModelGenerator(activeEditor.document);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${extensionId}.laravelMetaGenerate`,
      async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
          vscode.window.showWarningMessage("No active editor found.");
          return;
        }
        await extension.runMetaGenerator(activeEditor.document);
      }
    )
  );

  // Command to clear caches (useful for troubleshooting)
  context.subscriptions.push(
    vscode.commands.registerCommand(`${extensionId}.clearCaches`, () => {
      extension.clearCaches();
      vscode.window.showInformationMessage("Laravel Helper caches cleared.");
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(() => {
      const disposeStatus = extension.showStatusMessage("Reloading config.");
      extension.loadConfig();
      disposeStatus.dispose();
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
      await extension.onFileSave(document);
    })
  );
}

export function deactivate(): void {
  // Clean up debounce timer
  if (extension) {
    extension.clearDebounce();
  }
}
