interface IConfig {
  isFacade: boolean;
  isModel: boolean;
  autoClearConsole: boolean;
  phpPath: string;
  runOnSave: boolean;
  debounceDelay: number;
  parallelExecution: boolean;
}

interface ICommand {
  isEnabled: boolean;
  match?: string;
  notMatch?: string;
  cmd: string;
  isAsync: boolean;
}

interface ICommandResult {
  success: boolean;
  output: string;
  error?: string;
  command: ICommand;
}

export { IConfig, ICommand, ICommandResult };
