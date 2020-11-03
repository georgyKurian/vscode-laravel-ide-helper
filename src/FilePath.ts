import * as path from "path";

class FilePath {
  private _path;

  constructor(path: string) {
    this._path = this._parse(path);
  }

  private _parse(path: string): string {
    return path.replace(/\\/g, "/");
  }

  private _matchFilePath(pattern: string, parsedPath: string): boolean {
    return (
      pattern != null &&
      pattern.length > 0 &&
      new RegExp(pattern, "i").test(parsedPath)
    );
  }

  public isMatch(pattern = ".*?") {
    // if no match pattern was provided, or if match pattern succeeds
    return pattern.length === 0 || this._matchFilePath(pattern, this._path);
  }

  public isNeggate(pattern = "") {
    // negation has to be explicitly provided
    return pattern.length > 0 && this._matchFilePath(pattern, this._path);
  }
}

export default FilePath;
