import * as vscode from "vscode";
import { exec } from "child_process";
import FilePath from "./FilePath";
import { ICommand, IConfig } from "./types";

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
      autoClearConsole: false,
    };

    return extConfig;
  }

  public loadConfig(): void {
    this._config = this.fetchConfig();
  }

  /** Recursive call to run commands. */
  private _runCommands(
    commandList: Array<ICommand>,
    document: vscode.TextDocument
  ): void {
    const commandObject = commandList.shift();

    if (commandObject) {
      this.showOutputMessage(`[CMD] ${commandObject.cmd}`);

      const child = exec(
        commandObject.cmd,
        this._getExecOption(document),
        (error, stdout, stderr) => {
          if (!commandObject.isAsync) {
            this._runCommands(commandList, document);
          }
          if (error) {
            console.error(`ERROR: ${error}`);
            return;
          }
          if (stdout) {
            console.log(`${stdout}`);
            this._outputChannel.append(`STDOUT: ${stdout}`);
          }
          if (stderr) {
            console.error(`ERROR: ${stderr}`);
            this._outputChannel.append(`ERROR: ${stderr}`);
          }
        }
      );

      // if async, go ahead and run next command
      if (commandObject.isAsync) {
        this._runCommands(commandList, document);
      }
    } else {
      // NOTE: This technically just marks the end of commands starting.
      // There could still be asyc commands running.
      this.showStatusMessage("Generation completed.");
    }
  }

  private _getExecOption(document: vscode.TextDocument): { cwd: string } {
    return {
      cwd: this._getWorkspaceFolderPath(document.uri) ?? "",
    };
  }

  private _getWorkspaceFolderPath(uri: vscode.Uri) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);

    // NOTE: rootPath seems to be deprecated but seems like the best fallback so that
    // single project workspaces still work. If I come up with a better option, I'll change it.
    return workspaceFolder?.uri?.fsPath ?? vscode.workspace.rootPath;
  }

  public get isEnabled(): boolean {
    return true;
    //return !!this._context.globalState.get('isEnabled', true);
  }

  public set isEnabled(value: boolean) {
    this._context.globalState.update("isEnabled", value);
    this.showOutputMessage();
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

  /**
   * Show message in output channel
   */
  public showOutputMessage(message?: string): void {
    const newMessage =
      message ?? `${this._name} ${this.isEnabled ? "enabled" : "disabled"}.`;
    this._outputChannel.appendLine(newMessage);
  }

  private _consoleAutoClear() {
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

  public onFileSave(document: vscode.TextDocument): void {
    this._consoleAutoClear();

    if (!this.isEnabled) {
      this.showOutputMessage();
      return;
    }

    const filePath = new FilePath(document.fileName);

    const commands = this.allCommands.filter((cfg) => {
      if (!cfg.isEnabled) return false;

      // negation wins over match
      return !filePath.isNeggate(cfg.notMatch) && filePath.isMatch(cfg.match);
    });

    if (commands.length === 0) {
      return;
    }

    this._runCommands(commands, document);
  }

  /**
   * Runs Facade helper generator command
   */
  public runAllCommands(document: vscode.TextDocument) {
    this._consoleAutoClear();

    const commandList = this.allCommands;

    if (!this.isEnabled) {
      this.showOutputMessage();
      return;
    }

    this._runCommands(commandList, document);
  }

  /**
   * Runs Facade helper generator command
   */
  public runFacadeGenerator(document: vscode.TextDocument) {
    this._consoleAutoClear();

    const commandList = [this._getFacadeCommand()];

    if (!this.isEnabled) {
      this.showOutputMessage();
      return;
    }

    this._runCommands(commandList, document);
  }

  /**
   * Runs Model helper generator command
   */
  public runModelGenerator(document: vscode.TextDocument) {
    this._consoleAutoClear();

    const commandList = [this._getModelCommand()];

    if (!this.isEnabled) {
      this.showOutputMessage();
      return;
    }

    this._runCommands(commandList, document);
  }
}

export default LaravelHelperExtension;
