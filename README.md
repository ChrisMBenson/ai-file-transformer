# VS Code AI Transformers Plugin

The **VS Code AI Transformers Plugin** is a powerful extension that enables AI-powered file transformations directly within Visual Studio Code. This plugin provides a customizable interface for processing files using various AI models, making it easy to automate complex workflows and enhance productivity.

## Features

- **Multiple AI Model Support**: Choose from OpenAI, Anthropic, and Mistral AI models
- **Customizable Transformers**: Create and manage transformers with:
  - Wildcard file matching
  - Custom prompt templates with metadata support
  - Configurable output file naming and structure
- **Parallel Processing**: Enable parallel execution with configurable concurrency limits
- **Real-time Feedback**: Get progress updates and detailed execution logs
- **Transformer Management**:
  - Create, duplicate, edit, and delete transformers
  - Browse and import transformers from online library (planned feature)

## Use Cases

The VS Code AI Transformers Plugin can be used for various scenarios, including:

1. **Source Code Documentation**:
   - Automatically generate documentation for code files
   - Create API references from source code
   - Generate inline comments for complex functions

2. **Code Refactoring**:
   - Automate code style improvements
   - Convert code between different patterns or paradigms
   - Optimize code for performance or readability

3. **Code Conversions**:
   - Convert from one language to another

4. **Data Transformation**:
   - Convert between different data formats (JSON, XML, CSV)
   - Normalize data structures
   - Generate sample data from schemas

5. **Localization**:
   - Translate documentation and UI strings
   - Generate localized versions of code comments
   - Create multilingual documentation sets

6. **Testing**
    - Generate unit tests for files / folders
    - Generate test automations

## Architecture

The plugin follows a modular architecture with these key components:

1. **Configuration Manager**: Centralizes AI model settings and global configurations
2. **AI Model Manager**: Handles requests to various AI models and applies model-specific settings
3. **Transformer Manager**: Manages creation, editing, and deletion of transformers
4. **Prompt Editor**: Provides tools for crafting AI prompts with metadata and fine-tuning options
5. **Input File Processor**: Identifies and manages input files based on wildcard filters
6. **Output File Manager**: Handles output directory structures and naming conventions
7. **Execution Engine**: Orchestrates file processing through transformers and AI calls
8. **Progress & Feedback**: Provides real-time progress indicators and execution logs
9. **User Interface**: Centralizes user interaction through a comprehensive dashboard

## Installation

1. Install the extension from the VS Code Marketplace
2. Configure your API keys in the settings:
   - Open VS Code settings
   - Navigate to "AI Transformers" section
   - Enter API keys for your preferred AI providers
3. Create your first transformer using the command palette (`Ctrl+Shift+P` -> "Create Transformer")

## Usage

1. Open the AI Transformers view from the activity bar
2. Create a new transformer or select an existing one
3. Configure:
   - Input file patterns (e.g., `*.txt`, `src/**/*.js`)
   - AI prompt template
   - Output file naming and location
4. Run the transformer and view results in the output panel

## Roadmap

- [ ] Online transformer library for sharing and discovering transformers
- [ ] Enhanced prompt templates with AI-assisted suggestions
- [ ] Integration with additional AI providers
- [ ] Support for batch processing of large file sets
- [ ] Advanced error handling and retry mechanisms

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a new branch for your feature/bugfix
3. Submit a pull request with detailed description of changes

Before contributing, please read our [contribution guidelines](CONTRIBUTING.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
