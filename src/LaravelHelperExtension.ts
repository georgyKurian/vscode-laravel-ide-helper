import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import FilePath from "./FilePath";
import { ICommand, IConfig } from "./types";

const execAsync = promisify(exec);

class LaravelHelperExtension {
  private _name = "Laravel Helper";
  private _outputChannel: vscode.OutputChannel;
  private _context: vscode.ExtensionContext;
  private _config: IConfig;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._outputChannel = vscode.window.createOutputChannel(this._name);
    this._config = this.fetchConfig();
  }

  public fetchConfig(): IConfig {
    const config = vscode.workspace.getConfiguration("helper");

    const extConfig: IConfig = {
      isFacade: config.get("facades") ?? true,
      isModel: config.get("models") ?? true,
      autoClearConsole: config.get("autoClearConsole") ?? false,
      phpPath: config.get("phpPath") ?? "php",
      runOnSave: config.get("runOnSave") ?? true,
    };

    return extConfig;
  }

  public loadConfig(): void {
    this._config = this.fetchConfig();
  }

  /**
   * Check if the workspace is a Laravel project by looking for artisan file
   */
  private async _isLaravelProject(workspacePath: string): Promise<boolean> {
    const artisanPath = path.join(workspacePath, "artisan");
    return fs.existsSync(artisanPath);
  }

  /**
   * Run a single command with proper error handling
   */
  private async _executeCommand(
    command: ICommand,
    document: vscode.TextDocument
  ): Promise<{ success: boolean; output: string; error?: string }> {
    const workspacePath = this._getWorkspaceFolderPath(document.uri);
    
    if (!workspacePath) {
      return { success: false, output: "", error: "No workspace folder found" };
    }

    // Check if this is a Laravel project
    const isLaravel = await this._isLaravelProject(workspacePath);
    if (!isLaravel) {
      return { 
        success: false, 
        output: "", 
        error: "Not a Laravel project (artisan file not found)" 
      };
    }

    // Replace 'php' with configured PHP path
    const actualCmd = command.cmd.replace(/^php\s/, `${this._config.phpPath} `);
    
    this.showOutputMessage(`[CMD] ${actualCmd}`);

    try {
      const { stdout, stderr } = await execAsync(actualCmd, {
        cwd: workspacePath,
      });

      if (stdout) {
        this._outputChannel.append(`STDOUT: ${stdout}`);
      }
      if (stderr) {
        this._outputChannel.append(`STDERR: ${stderr}`);
      }

      return { success: true, output: stdout || "", error: stderr || undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this._outputChannel.append(`ERROR: ${errorMessage}`);
      return { success: false, output: "", error: errorMessage };
    }
  }

  /**
   * Run multiple commands with progress indicator
   */
  private async _runCommandsWithProgress(
    commandList: Array<ICommand>,
    document: vscode.TextDocument,
    title: string
  ): Promise<void> {
    const workspacePath = this._getWorkspaceFolderPath(document.uri);
    
    if (!workspacePath) {
      vscode.window.showErrorMessage("No workspace folder found.");
      return;
    }

    // Check if this is a Laravel project
    const isLaravel = await this._isLaravelProject(workspacePath);
    if (!isLaravel) {
      vscode.window.showWarningMessage(
        "Not a Laravel project. The artisan file was not found in the workspace."
      );
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true,
      },
      async (progress, token) => {
        const totalCommands = commandList.length;
        let completedCommands = 0;
        let hasErrors = false;

        for (const command of commandList) {
          if (token.isCancellationRequested) {
            vscode.window.showWarningMessage("Command execution cancelled.");
            return;
          }

          progress.report({
            message: `Running: ${command.cmd}`,
            increment: (1 / totalCommands) * 100,
          });

          const result = await this._executeCommand(command, document);
          completedCommands++;

          if (!result.success) {
            hasErrors = true;
            vscode.window.showErrorMessage(
              `Command failed: ${command.cmd}\n${result.error}`
            );
          }
        }

        if (!hasErrors) {
          vscode.window.showInformationMessage(
            `Successfully completed ${completedCommands} command(s).`
          );
        }

        this.showStatusMessage("Generation completed.");
      }
    );
  }

  private _getWorkspaceFolderPath(uri: vscode.Uri): string | undefined {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    return workspaceFolder?.uri?.fsPath ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  public get isEnabled(): boolean {
    return this._config.runOnSave;
  }

  public get autoClearConsole(): boolean {
    return !!this._config.autoClearConsole;
  }

  public get allCommands(): Array<ICommand> {
    return [this._getFacadeCommand(), this._getModelCommand()];
  }

  private _getFacadeCommand(): ICommand {
    return {
      isEnabled: this._config.isFacade,
      cmd: "php artisan ide-helper:generate",
      isAsync: false,
      match: "app",
    };
  }

  private _getModelCommand(): ICommand {
    return {
      isEnabled: this._config.isModel,
      cmd: "php artisan ide-helper:models -n",
      isAsync: false,
      match: "app(\\/models)?\\/(\\w|_)+.php$",
    };
  }

  private _getMetaCommand(): ICommand {
    return {
      isEnabled: true,
      cmd: "php artisan ide-helper:meta",
      isAsync: false,
    };
  }

  /**
   * Show message in output channel
   */
  public showOutputMessage(message?: string): void {
    const newMessage =
      message ?? `${this._name} ${this.isEnabled ? "enabled" : "disabled"}.`;
    this._outputChannel.appendLine(newMessage);
  }

  private _consoleAutoClear(): void {
    if (this.autoClearConsole) {
      this._outputChannel.clear();
    }
  }

  /**
   * Show message in status bar and output channel.
   * Return a disposable to remove status bar message.
   */
  public showStatusMessage(message: string): vscode.Disposable {
    this.showOutputMessage(message);
    return vscode.window.setStatusBarMessage(message);
  }

  public async onFileSave(document: vscode.TextDocument): Promise<void> {
    this._consoleAutoClear();

    if (!this.isEnabled) {
      this.showOutputMessage();
      return;
    }

    const filePath = new FilePath(document.fileName);

    const commands = this.allCommands.filter((cfg) => {
      if (!cfg.isEnabled) return false;

      // negation wins over match
      return !filePath.isNegate(cfg.notMatch) && filePath.isMatch(cfg.match);
    });

    if (commands.length === 0) {
      return;
    }

    await this._runCommandsWithProgress(commands, document, "Laravel IDE Helper");
  }

  /**
   * Runs all helper generator commands
   */
  public async runAllCommands(document: vscode.TextDocument): Promise<void> {
    this._consoleAutoClear();
    const commandList = this.allCommands.filter((cmd) => cmd.isEnabled);
    await this._runCommandsWithProgress(commandList, document, "Generating All Helpers");
  }

  /**
   * Runs Facade helper generator command
   */
  public async runFacadeGenerator(document: vscode.TextDocument): Promise<void> {
    this._consoleAutoClear();
    const commandList = [this._getFacadeCommand()];
    await this._runCommandsWithProgress(commandList, document, "Generating Facade Helpers");
  }

  /**
   * Runs Model helper generator command
   */
  public async runModelGenerator(document: vscode.TextDocument): Promise<void> {
    this._consoleAutoClear();
    const commandList = [this._getModelCommand()];
    await this._runCommandsWithProgress(commandList, document, "Generating Model Helpers");
  }

  /**
   * Runs Meta helper generator command
   */
  public async runMetaGenerator(document: vscode.TextDocument): Promise<void> {
    this._consoleAutoClear();
    const commandList = [this._getMetaCommand()];
    await this._runCommandsWithProgress(commandList, document, "Generating Meta Helpers");
  }
}

export default LaravelHelperExtension;
