import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LLMClient } from '../../transformers/llmFactory';
import { TransformerConfig } from '../../types';

export interface BaseExecuter {
    // Configuration Methods
    getInputFileBrowserOption(config: TransformerConfig): vscode.OpenDialogOptions;
    getOutputFileName(config: TransformerConfig): string;
    getOutputFileExtension(config: TransformerConfig): string;

    // Input Handling Methods
    validateInput(config: TransformerConfig): boolean;
    sortInput(dataList: string[]): string[];
    preProcessInput(data: string): string;

    // Execution Methods
    generateUserMessage(config: TransformerConfig, data: string): string;
    execute(config: TransformerConfig): Promise<string[]>;
    sendToLLM(prompt: string): Promise<string>;

    // Output Handling Methods
    validateOutput(config: TransformerConfig, data: string): boolean;
    writeOutput(data: string, filePathUri: vscode.Uri, config: TransformerConfig): Promise<vscode.Uri>;
}

export abstract class AbstractBaseExecuter implements BaseExecuter {
    /**
     * Provides options for the input file browser dialog.
     * Override this method in derived classes to customize the behaviour.
     */
    getInputFileBrowserOption(config: TransformerConfig): vscode.OpenDialogOptions {
        return {
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: 'Select Input File',
            filters: {
                'All Files': ['*'],
            },
        };
    }

    /**
     * Provides the output file name based on the configuration.
     * Override this method in derived classes to customize the behaviour.
     */
    getOutputFileName(config: TransformerConfig): string {
        return ''; // Default file name
    }

    /**
     * Provides the output file extension based on the configuration.
     * Override this method in derived classes to customize the behaviour.
     */
    getOutputFileExtension(config: TransformerConfig): string {
        return '.txt'; // Default file extension
    }

    /**
     * Validates the input based on the provided configuration.
     * Override to implement specific validation logic.
     */
    validateInput(config: TransformerConfig): boolean {
        return true;
    }

    /**
     * Sorts the input data alphabetically. Override to customize sorting logic.
     */
    sortInput(dataList: string[]): string[] {
        return dataList.sort();
    }

    /**
     * Preprocesses the input data by trimming whitespace. Override for custom logic.
     */
    preProcessInput(data: string): string {
        return data.trim();
    }

    /**
     * Generates a user message based on the input data and configuration.
     * Override to customize message generation logic.
     */
    generateUserMessage(config: TransformerConfig, data: string): string {
        return (config.prompt || '') + data;
    }

    /**
     * Executes the entire transformation process based on the configuration.
     * Override in derived classes to customize execution logic.
     */
    async execute(config: TransformerConfig): Promise<string[]> {
        vscode.window.showInformationMessage('Executing process...');
    
        // Ensure the output directory exists
        const outputPathParts = config.output.split(/[\\/]/);
        const outputFolderUri =
            outputPathParts[outputPathParts.length - 1] !== 'output'
                ? vscode.Uri.joinPath(vscode.Uri.file(config.output), 'output')
                : vscode.Uri.file(config.output);
    
        await vscode.workspace.fs.createDirectory(outputFolderUri);
    
        const outputFileExtension = this.getOutputFileExtension(config);
        const outputFileUris: string[] = [];
    
        for (const input of config.input) {
            try {
                const inputData = fs.readFileSync(input.value, 'utf-8');
    
                if (!this.validateInput(config)) {
                    vscode.window.showErrorMessage(`Invalid input: ${input.value}`);
                    continue;
                }
    
                const processedData = this.preProcessInput(inputData);
                const message = this.generateUserMessage(config, processedData);
                const response = await this.sendToLLM(message);
    
                const inputFileNameWithoutExtension = path.basename(input.value, path.extname(input.value));
                const outputFileName = `${inputFileNameWithoutExtension}${outputFileExtension}`;
                const outputFileUri = vscode.Uri.joinPath(outputFolderUri, outputFileName);
    
                await this.writeOutput(response, outputFileUri, config);
                outputFileUris.push(outputFileUri.path);
            } catch (error) {
                vscode.window.showErrorMessage(`Error processing file ${input.value}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    
        vscode.window.showInformationMessage('Transformation complete.');
        return outputFileUris;
    }
    

    /**
     * Validates the output data. Override to implement custom validation logic.
     */
    validateOutput(config: TransformerConfig, data: string): boolean {
        return true;
    }

    /**
     * Writes the processed data to the specified file path.
     * Override to customize the writing process.
     */
    async writeOutput(data: string, filePathUri: vscode.Uri, config: TransformerConfig): Promise<vscode.Uri> {
        await vscode.workspace.fs.writeFile(filePathUri, Buffer.from(data));
        return filePathUri;
    }

    /**
     * Sends the prompt to the LLM client and retrieves the response.
     */
    async sendToLLM(prompt: string): Promise<string> {
        const llmClient = new LLMClient();
        try {
            return await llmClient.sendRequest(prompt);
        } catch (error) {
            console.error('Error sending request to LLM:', error);
            return `Error sending request to LLM: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
}
