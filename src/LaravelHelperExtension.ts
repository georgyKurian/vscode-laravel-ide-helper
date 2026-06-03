import * as vscode from "vscode";
import { access, stat } from "node:fs/promises";
import { join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import FilePath from "./FilePath";
import type { ICommand, ICommandResult, IConfig } from "./types";

const execAsync = promisify(exec);

// Storage keys for workspace state
const LAST_RUN_KEY = "laravelHelper.lastRun";
const FILE_TIMESTAMPS_KEY = "laravelHelper.fileTimestamps";

class LaravelHelperExtension {
  private readonly _name = "Laravel Helper";
  private readonly _outputChannel: vscode.OutputChannel;
  private readonly _context: vscode.ExtensionContext;
  private _config: IConfig;

  // Performance: Debounce timer for save operations
  private _debounceTimer: NodeJS.Timeout | undefined;
  private _pendingDocument: vscode.TextDocument | undefined;

  // Performance: Cache for Laravel project detection
  private readonly _laravelProjectCache = new Map<string, boolean>();

  // Performance: Track file modification times
  private _fileTimestamps = new Map<string, number>();

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._outputChannel = vscode.window.createOutputChannel(this._name);
    this._config = this.fetchConfig();

    // Load cached file timestamps from workspace state
    this._loadFileTimestamps();

    // Clear Laravel project cache when workspace folders change
    context.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        this._laravelProjectCache.clear();
      })
    );
  }

  public fetchConfig(): IConfig {
    const config = vscode.workspace.getConfiguration("helper");

    return {
      isFacade: config.get("facades") ?? true,
      isModel: config.get("models") ?? true,
      autoClearConsole: config.get("autoClearConsole") ?? false,
      phpPath: config.get("phpPath") ?? "php",
      runOnSave: config.get("runOnSave") ?? true,
      debounceDelay: config.get("debounceDelay") ?? 1000,
      parallelExecution: config.get("parallelExecution") ?? true,
    };
  }

  public loadConfig(): void {
    this._config = this.fetchConfig();
  }

  /**
   * Load file timestamps from workspace state
   */
  private _loadFileTimestamps(): void {
    const stored = this._context.workspaceState.get<Record<string, number>>(FILE_TIMESTAMPS_KEY);
    if (stored) {
      this._fileTimestamps = new Map(Object.entries(stored));
    }
  }

  /**
   * Save file timestamps to workspace state
   */
  private async _saveFileTimestamps(): Promise<void> {
    const obj = Object.fromEntries(this._fileTimestamps);
    await this._context.workspaceState.update(FILE_TIMESTAMPS_KEY, obj);
  }

  /**
   * Check if the workspace is a Laravel project (with caching)
   */
  private async _isLaravelProject(workspacePath: string): Promise<boolean> {
    // Check cache first
    const cached = this._laravelProjectCache.get(workspacePath);
    if (cached !== undefined) {
      return cached;
    }

    // Check filesystem
    const artisanPath = join(workspacePath, "artisan");
    try {
      await access(artisanPath);
      this._laravelProjectCache.set(workspacePath, true);
      return true;
    } catch {
      this._laravelProjectCache.set(workspacePath, false);
      return false;
    }
  }

  /**
   * Check if files have changed since last generation
   */
  private async _hasFilesChanged(workspacePath: string, pattern: string): Promise<boolean> {
    const lastRun = this._context.workspaceState.get<number>(`${LAST_RUN_KEY}.${pattern}`);
    if (!lastRun) {
      return true; // Never run before
    }

    // For model command, check if any model files changed
    if (pattern.includes("models")) {
      const modelsPath = join(workspacePath, "app", "Models");
      try {
        const stats = await stat(modelsPath);
        return stats.mtimeMs > lastRun;
      } catch {
        // Models folder doesn't exist, check app folder
        const appPath = join(workspacePath, "app");
        try {
          const stats = await stat(appPath);
          return stats.mtimeMs > lastRun;
        } catch {
          return true;
        }
      }
    }

    // For other commands, always run (facades don't have a specific folder to check)
    return true;
  }

  /**
   * Record that a command was run
   */
  private async _recordLastRun(pattern: string): Promise<void> {
    await this._context.workspaceState.update(`${LAST_RUN_KEY}.${pattern}`, Date.now());
  }

  /**
   * Run a single command with proper error handling
   */
  private async _executeCommand(
    command: ICommand,
    workspacePath: string
  ): Promise<ICommandResult> {
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

      // Record successful run
      if (command.match) {
        await this._recordLastRun(command.match);
      }

      return { success: true, output: stdout || "", error: stderr || undefined, command };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this._outputChannel.append(`ERROR: ${errorMessage}`);
      return { success: false, output: "", error: errorMessage, command };
    }
  }

  /**
   * Run multiple commands with progress indicator (supports parallel execution)
   */
  private async _runCommandsWithProgress(
    commandList: ICommand[],
    document: vscode.TextDocument,
    title: string,
    checkChanges = false
  ): Promise<void> {
    const workspacePath = this._getWorkspaceFolderPath(document.uri);

    if (!workspacePath) {
      vscode.window.showErrorMessage("No workspace folder found.");
      return;
    }

    // Check if this is a Laravel project (cached)
    const isLaravel = await this._isLaravelProject(workspacePath);
    if (!isLaravel) {
      vscode.window.showWarningMessage(
        "Not a Laravel project. The artisan file was not found in the workspace."
      );
      return;
    }

    // Filter commands that need to run (skip unchanged)
    let commandsToRun = commandList;
    if (checkChanges) {
      const changedCommands = await Promise.all(
        commandList.map(async (cmd) => {
          if (!cmd.match) return cmd;
          const hasChanged = await this._hasFilesChanged(workspacePath, cmd.match);
          return hasChanged ? cmd : null;
        })
      );
      commandsToRun = changedCommands.filter((cmd): cmd is ICommand => cmd !== null);

      if (commandsToRun.length === 0) {
        this.showOutputMessage("No changes detected, skipping generation.");
        return;
      }
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true,
      },
      async (progress, token) => {
        const totalCommands = commandsToRun.length;
        let hasErrors = false;
        let results: ICommandResult[];

        // Execute commands (parallel or sequential based on config)
        if (this._config.parallelExecution && totalCommands > 1) {
          progress.report({ message: `Running ${totalCommands} commands in parallel...` });

          // Check for cancellation before starting
          if (token.isCancellationRequested) {
            vscode.window.showWarningMessage("Command execution cancelled.");
            return;
          }

          // Run all commands in parallel
          results = await Promise.all(
            commandsToRun.map((cmd) => this._executeCommand(cmd, workspacePath))
          );
        } else {
          // Run commands sequentially
          results = [];
          for (const command of commandsToRun) {
            if (token.isCancellationRequested) {
              vscode.window.showWarningMessage("Command execution cancelled.");
              return;
            }

            progress.report({
              message: `Running: ${command.cmd}`,
              increment: (1 / totalCommands) * 100,
            });

            const result = await this._executeCommand(command, workspacePath);
            results.push(result);
          }
        }

        // Process results
        const completedCommands = results.length;
        for (const result of results) {
          if (!result.success) {
            hasErrors = true;
            vscode.window.showErrorMessage(
              `Command failed: ${result.command.cmd}\n${result.error}`
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
    return this._config.autoClearConsole;
  }

  public get allCommands(): ICommand[] {
    return [this._getFacadeCommand(), this._getModelCommand()];
  }

  private _getFacadeCommand(): ICommand {
    return {
      isEnabled: this._config.isFacade,
      cmd: "php artisan ide-helper:generate",
      isAsync: false,
      match: "\\/app\\/.*\\.php$",
    };
  }

  private _getModelCommand(): ICommand {
    return {
      isEnabled: this._config.isModel,
      cmd: "php artisan ide-helper:models -n",
      isAsync: false,
      match: "\\/app\\/(models\\/)?(\\w|_)+\\.php$",
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

  /**
   * Debounced file save handler
   */
  public async onFileSave(document: vscode.TextDocument): Promise<void> {
    // Clear any pending debounce timer
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = undefined;
    }

    // Store the document for debounced execution
    this._pendingDocument = document;

    // Set debounce timer
    this._debounceTimer = setTimeout(async () => {
      if (!this._pendingDocument) return;

      const doc = this._pendingDocument;
      this._pendingDocument = undefined;
      this._debounceTimer = undefined;

      await this._processFileSave(doc);
    }, this._config.debounceDelay);
  }

  /**
   * Actual file save processing (after debounce)
   */
  private async _processFileSave(document: vscode.TextDocument): Promise<void> {
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

    // Run with change detection for on-save triggers
    await this._runCommandsWithProgress(commands, document, "Laravel IDE Helper", true);
  }

  /**
   * Clear the debounce timer (for cleanup)
   */
  public clearDebounce(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = undefined;
      this._pendingDocument = undefined;
    }
  }

  /**
   * Clear all caches (useful for troubleshooting)
   */
  public clearCaches(): void {
    this._laravelProjectCache.clear();
    this._fileTimestamps.clear();
    this.showOutputMessage("Caches cleared.");
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
