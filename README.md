# Laravel IDE Helper (VS Code)

Runs [laravel-ide-helper](https://github.com/barryvdh/laravel-ide-helper) commands in VS Code.

This extension helps generate helper files for better code suggestions in Laravel projects.

## Features

* Improved Laravel code suggestions for **Facades**
* Improved Laravel code suggestions for **Models**
* Improved Laravel code suggestions for **Macros**
* Automatic Laravel project detection
* Progress indicators with cancellation support
* Configurable PHP path and run-on-save behavior

## Demo

![demo](demo.gif)

## Requirements

1. A Laravel project with the [laravel-ide-helper](https://github.com/barryvdh/laravel-ide-helper) package installed:

```bash
composer require --dev barryvdh/laravel-ide-helper
```

2. A working database connection (required for generating model helpers)

## Usage

### Automatic (Run on Save)

* Save any `.php` file in the `app` directory to generate **Facade helper** files
* Save any model file to generate **Model helper** files

### Manual Commands

Open the Command Palette ( `Ctrl+Shift+P` / `Cmd+Shift+P` ) and run:

| Command | Description |
|---------|-------------|
| `Laravel Helper: Run All Helpers` | Runs all enabled IDE helper commands |
| `Laravel Helper: Run Facade Helper` | Generates PHPDoc for Facades ( `ide-helper:generate` ) |
| `Laravel Helper: Run Model Helper` | Generates PHPDoc for Models ( `ide-helper:models` ) |
| `Laravel Helper: Run Meta Helper` | Generates meta file for IDE support ( `ide-helper:meta` ) |

## Settings

Configure the extension in your VS Code settings:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `helper.facades` | boolean | `true` | Enable Facade helper generation |
| `helper.models` | boolean | `true` | Enable Model helper generation |
| `helper.runOnSave` | boolean | `true` | Automatically run helpers when saving PHP files |
| `helper.autoClearConsole` | boolean | `false` | Clear output console before running commands |
| `helper.phpPath` | string | `"php"` | Path to PHP executable |

### Example Configuration

```json
{
  "helper.facades": true,
  "helper.models": true,
  "helper.runOnSave": true,
  "helper.autoClearConsole": false,
  "helper.phpPath": "/usr/local/bin/php"
}
```

## Recommended Setup

Publish and customize the configuration for laravel-ide-helper for better results:

```bash
php artisan vendor:publish --provider="Barryvdh\LaravelIdeHelper\IdeHelperServiceProvider" --tag=config
```

## Troubleshooting

* **"Not a Laravel project" warning**: Ensure your workspace contains an `artisan` file at the root
* **Model generation fails**: Check that your database connection is properly configured
* **PHP not found**: Set the `helper.phpPath` setting to your PHP executable path

## License

See [LICENSE.txt](LICENSE.txt)
