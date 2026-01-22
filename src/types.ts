interface IConfig {
  isFacade: boolean;
  isModel: boolean;
  autoClearConsole: boolean;
  phpPath: string;
  runOnSave: boolean;
}

interface ICommand {
  isEnabled: boolean;
  match?: string;
  notMatch?: string;
  cmd: string;
  isAsync: boolean;
}

export { IConfig, ICommand };