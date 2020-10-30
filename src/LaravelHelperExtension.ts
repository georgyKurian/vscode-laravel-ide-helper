import * as vscode from "vscode";
import * as path from "path";
import { exec } from "child_process";

interface IConfig {
  isFacade: boolean;
  isModel: boolean;
  autoClearConsole: boolean;
}

interface ICommand {
  match?: string;
  notMatch?: string;
  cmd: string;
  isAsync: boolean;
}

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
    return {
      isFacade: config.get("facades") ?? true,
      isModel: config.get("models") ?? true,
      autoClearConsole: false,
    };
  }

  public loadConfig(): void {
    this._config = this.fetchConfig();
  }

  /** Recursive call to run commands. */
  private _runCommands(
    commands: Array<ICommand>,
    document: vscode.TextDocument
  ): void {
    const cfg = commands.shift();
    if (cfg) {
      this.showOutputMessage(`[CMD] ${cfg.cmd}`);

      const execOptions = this._getExecOption(document);

      const child = exec(cfg.cmd, execOptions, (error, stdout, stderr) => {
        if (!cfg.isAsync) {
          this._runCommands(commands, document);
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
      });

      // if async, go ahead and run next command
      if (cfg.isAsync) {
        this._runCommands(commands, document);
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
    return workspaceFolder
      ? workspaceFolder.uri.fsPath
      : vscode.workspace.rootPath;
  }

  public get isEnabled(): boolean {
    return true;
    //return !!this._context.globalState.get('isEnabled', true);
  }

  public set isEnabled(value: boolean) {
    this._context.globalState.update("isEnabled", value);
    this.showOutputMessage();
  }

  public get shell(): string {
    return "";
    //return this._config.shell "";
  }

  public get autoClearConsole(): boolean {
    return !!this._config.autoClearConsole;
  }

  public get commands(): Array<ICommand> {
    return [this.getFacadeCommand(), this.getModelCommand()];
  }

  public getFacadeCommand(): ICommand {
    return {
      cmd: "php artisan ide-helper:generate",
      isAsync: false,
      match: "app",
    };
  }

  public getModelCommand(): ICommand {
    return {
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

  /**
   * Show message in status bar and output channel.
   * Return a disposable to remove status bar message.
   */
  public showStatusMessage(message: string): vscode.Disposable {
    this.showOutputMessage(message);
    return vscode.window.setStatusBarMessage(message);
  }

  /* public runHelper() {
    this._runCommands(
      this.commands.map((commandObject) => ({
        cmd: commandObject.cmd,
        isAsync: !!commandObject.isAsync,
      }))
    );
  } */

  public onFileSave(document: vscode.TextDocument): void {
    if (this.autoClearConsole) {
      this._outputChannel.clear();
    }

    if (!this.isEnabled) {
      this.showOutputMessage();
      return;
    }

    const parsedPath = document.fileName.replace(/\\/g, "/");

    const match = (pattern: string) =>
      pattern &&
      pattern.length > 0 &&
      new RegExp(pattern, "i").test(parsedPath);

    const commandConfigs = this.commands.filter((cfg) => {
      const matchPattern = cfg.match || ".*?";
      const negatePattern = cfg.notMatch || "";

      // if no match pattern was provided, or if match pattern succeeds
      const isMatch = matchPattern.length === 0 || match(matchPattern);

      // negation has to be explicitly provided
      const isNegate = negatePattern.length > 0 && match(negatePattern);

      // negation wins over match
      return !isNegate && isMatch;
    });

    if (commandConfigs.length === 0) {
      return;
    }

    // build our commands by replacing parameters with values
    const commands: Array<ICommand> = [];
    for (const cfg of commandConfigs) {
      let cmdStr = cfg.cmd;

      const extName = path.extname(document.fileName);
      const workspaceFolderPath =
        this._getWorkspaceFolderPath(document.uri) ?? "";
      const relativeFile = path.relative(
        workspaceFolderPath,
        document.uri.fsPath
      );

      cmdStr = cmdStr.replace(/\${file}/g, `${document.fileName}`);

      // DEPRECATED: workspaceFolder is more inline with vscode variables,
      // but leaving old version in place for any users already using it.
      cmdStr = cmdStr.replace(/\${workspaceRoot}/g, workspaceFolderPath);

      cmdStr = cmdStr.replace(/\${workspaceFolder}/g, workspaceFolderPath);
      cmdStr = cmdStr.replace(
        /\${fileBasename}/g,
        path.basename(document.fileName)
      );
      cmdStr = cmdStr.replace(
        /\${fileDirname}/g,
        path.dirname(document.fileName)
      );
      cmdStr = cmdStr.replace(/\${fileExtname}/g, extName);
      cmdStr = cmdStr.replace(
        /\${fileBasenameNoExt}/g,
        path.basename(document.fileName, extName)
      );
      cmdStr = cmdStr.replace(/\${relativeFile}/g, relativeFile);
      cmdStr = cmdStr.replace(/\${cwd}/g, process.cwd());

      commands.push({
        cmd: cmdStr,
        isAsync: !!cfg.isAsync,
      });
    }

    this._runCommands(commands, document);
  }
}

export default LaravelHelperExtension;
