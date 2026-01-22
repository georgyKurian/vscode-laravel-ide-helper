import * as assert from "assert";
import FilePath from "../../FilePath";

suite("FilePath Test Suite", () => {
  suite("isMatch", () => {
    test("should match any path with default pattern", () => {
      const filePath = new FilePath("/some/path/to/file.php");
      assert.strictEqual(filePath.isMatch(), true);
    });

    test("should match path containing 'app'", () => {
      const filePath = new FilePath("/project/app/Models/User.php");
      assert.strictEqual(filePath.isMatch("app"), true);
    });

    test("should not match path not containing pattern", () => {
      const filePath = new FilePath("/project/vendor/some/file.php");
      assert.strictEqual(filePath.isMatch("app"), false);
    });

    test("should match model files in app/Models directory", () => {
      const modelPattern = "app(\\/models)?\\/(\\w|_)+.php$";
      
      const userModel = new FilePath("/project/app/Models/User.php");
      assert.strictEqual(userModel.isMatch(modelPattern), true);

      const postModel = new FilePath("/project/app/Models/Post.php");
      assert.strictEqual(postModel.isMatch(modelPattern), true);
    });

    test("should match model files in app directory (legacy location)", () => {
      const modelPattern = "app(\\/models)?\\/(\\w|_)+.php$";
      const legacyModel = new FilePath("/project/app/User.php");
      assert.strictEqual(legacyModel.isMatch(modelPattern), true);
    });

    test("should not match non-PHP files", () => {
      const modelPattern = "app(\\/models)?\\/(\\w|_)+.php$";
      const jsFile = new FilePath("/project/app/Models/User.js");
      assert.strictEqual(jsFile.isMatch(modelPattern), false);
    });

    test("should handle empty pattern", () => {
      const filePath = new FilePath("/any/path/file.php");
      assert.strictEqual(filePath.isMatch(""), true);
    });

    test("should be case insensitive", () => {
      const filePath = new FilePath("/project/APP/Models/User.php");
      assert.strictEqual(filePath.isMatch("app"), true);
    });

    test("should normalize Windows paths", () => {
      const filePath = new FilePath("C:\\project\\app\\Models\\User.php");
      assert.strictEqual(filePath.isMatch("app/Models"), true);
    });
  });

  suite("isNegate", () => {
    test("should return false for empty pattern", () => {
      const filePath = new FilePath("/project/app/User.php");
      assert.strictEqual(filePath.isNegate(""), false);
    });

    test("should return true when pattern matches (negation triggered)", () => {
      const filePath = new FilePath("/project/vendor/package/file.php");
      assert.strictEqual(filePath.isNegate("vendor"), true);
    });

    test("should return false when pattern does not match", () => {
      const filePath = new FilePath("/project/app/User.php");
      assert.strictEqual(filePath.isNegate("vendor"), false);
    });

    test("should negate node_modules paths", () => {
      const filePath = new FilePath("/project/node_modules/package/index.js");
      assert.strictEqual(filePath.isNegate("node_modules"), true);
    });

    test("should be case insensitive", () => {
      const filePath = new FilePath("/project/VENDOR/package/file.php");
      assert.strictEqual(filePath.isNegate("vendor"), true);
    });

    test("should handle undefined pattern gracefully", () => {
      const filePath = new FilePath("/project/app/User.php");
      assert.strictEqual(filePath.isNegate(undefined as unknown as string), false);
    });
  });

  suite("Edge cases", () => {
    test("should handle paths with special characters", () => {
      const filePath = new FilePath("/project/app/Models/User-Model.php");
      assert.strictEqual(filePath.isMatch("app"), true);
    });

    test("should handle paths with underscores", () => {
      const modelPattern = "app(\\/models)?\\/(\\w|_)+.php$";
      const filePath = new FilePath("/project/app/Models/User_Model.php");
      assert.strictEqual(filePath.isMatch(modelPattern), true);
    });

    test("should handle deeply nested paths", () => {
      const filePath = new FilePath("/project/app/Http/Controllers/Api/V1/UserController.php");
      assert.strictEqual(filePath.isMatch("app"), true);
      assert.strictEqual(filePath.isMatch("Controllers"), true);
    });

    test("should handle root paths", () => {
      const filePath = new FilePath("/app.php");
      assert.strictEqual(filePath.isMatch("app"), true);
    });
  });
});
