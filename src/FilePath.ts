class FilePath {
  private readonly _path: string;

  constructor(filePath: string) {
    this._path = this._parse(filePath);
  }

  private _parse(filePath: string): string {
    return filePath.replace(/\\/g, "/");
  }

  private _matchFilePath(pattern: string, parsedPath: string): boolean {
    return (
      pattern != null &&
      pattern.length > 0 &&
      new RegExp(pattern, "i").test(parsedPath)
    );
  }

  public isMatch(pattern = ".*?"): boolean {
    // if no match pattern was provided, or if match pattern succeeds
    return pattern.length === 0 || this._matchFilePath(pattern, this._path);
  }

  public isNegate(pattern = ""): boolean {
    // negation has to be explicitly provided
    return pattern.length > 0 && this._matchFilePath(pattern, this._path);
  }
}

export default FilePath;
