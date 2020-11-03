// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import LaravelHelperExtension from "./LaravelHelperExtension";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const extension = new LaravelHelperExtension(context);
  extension.showOutputMessage();

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.laravelFacadeGenerate", () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        return;
      }

      extension.runFacadeGenerator(activeEditor.document);

      // Display a message box to the user
      vscode.window.showInformationMessage("Generating Helper files!");
    })
  );
  
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.laravelModelGenerate", () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        return;
      }

      extension.runModelGenerator(activeEditor.document);

      // Display a message box to the user
      vscode.window.showInformationMessage("Generating Helper files!");
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
    vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
      extension.onFileSave(document);
    })
  );
}
