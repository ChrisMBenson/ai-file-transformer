import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'vscode';
import { LLMClient } from '../llm/llmClient';
import { TransformerConfig, ProgressEvent } from '../types';
import { logOutputChannel } from '../extension';



export interface BaseExecuter {
    // Configuration Methods
    getInputFileBrowserOption(config: TransformerConfig): vscode.OpenDialogOptions;
    getOutputFileName(config: TransformerConfig, inputFilePath: string): string;

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
    private shouldStop = false;
    private progressEmitter = new EventEmitter<ProgressEvent>();

    /**
     * Registers a progress event handler
     * @param handler - Callback function to handle progress events
     */
    onProgress(handler: (event: ProgressEvent) => void) {
        this.progressEmitter.event(handler);
    }

    /**
     * Stops the current execution
     */
    stop(): void {
        this.shouldStop = true;
    }

    /**
     * Provides options for the input file browser dialog.
     * Override this method in derived classes to customize the behaviour.
     */
    getInputFileBrowserOption(config: TransformerConfig): vscode.OpenDialogOptions {
        return {
            canSelectFiles: true,
            canSelectFolders: true,
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
    getOutputFileName(config: TransformerConfig, inputFilePath: string): string {
        const inputFileNameWithoutExtension = path.basename(inputFilePath, path.extname(inputFilePath));
        
        // If outputFileName is not specified, use input filename with .txt extension
        if (!config.outputFileName) {
            return inputFileNameWithoutExtension + '.txt';
        }
        
        // Check if outputFileName contains a wildcard
        if (config.outputFileName.includes('*')) {
            return config.outputFileName.replace('*', inputFileNameWithoutExtension);
        }
        
        // Use the specified outputFileName as-is
        return config.outputFileName;
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
     * Replaces placeholders in the format {{name}} with values from config.input.
     * If the value is a path, reads the file content. Otherwise uses the value directly.
     * The special placeholder {{content}} is replaced with the data parameter.
     */
    generateUserMessage(config: TransformerConfig, data: string): string {
        if (!config.prompt) {
            return data;
        }

        // Replace {{content}} with the data
        let message = config.prompt.replace('{{content}}', data);

        // Find all other placeholders
        const placeholderRegex = /\{\{([^{}]+)\}\}/g;
        let match;
        
        while ((match = placeholderRegex.exec(config.prompt)) !== null) {
            const placeholder = match[1];
            if (placeholder === 'content') {continue;} // Already handled
            
            // Find matching input
            const input = config.input.find(i => i.name === placeholder);
            if (!input) {continue;}
            
            let value = input.value;
            
            // If value is a path, read the file
            if (fs.existsSync(value) && fs.statSync(value).isFile()) {
                try {
                    value = fs.readFileSync(value, 'utf-8');
                } catch (error) {
                    console.error(`Error reading file ${value}:`, error);
                    continue;
                }
            }
            
            // Replace the placeholder
            message = message.replace(new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g'), value);
        }

        const promptPostFix = `The output will be written to a file ending with extension ${config.outputFileName} . Make sure the response only contains data of that type.`;

        message = message + "\n" + promptPostFix;
        
        return message;
    }

    /**
     * Executes the entire transformation process based on the configuration.
     * Override in derived classes to customize execution logic.
     */
    async execute(config: TransformerConfig): Promise<string[]> {
        this.shouldStop = false; // Reset stop flag at start of execution
        vscode.window.showInformationMessage('Executing process...');

    
        const outputFolderUri = vscode.Uri.file(config.outputFolder);
        await vscode.workspace.fs.createDirectory(outputFolderUri);
    
        const outputFileUris: string[] = [];
    
        const processDirectory = async (dirPath: string, relativePath: string = '') => {
            const items = fs.readdirSync(dirPath);
            for (const item of items) {
                if (this.shouldStop) {
                    vscode.window.showInformationMessage('Execution stopped');
                    return;
                }
    
                const itemPath = path.join(dirPath, item);
                const itemStats = fs.statSync(itemPath);
    
                if (itemStats.isDirectory()) {
                    // Recursively process subdirectory
                    const newRelativePath = path.join(relativePath, item);
                    await processDirectory(itemPath, newRelativePath);
                } else {
                    // Process file
                    const relativeFilePath = path.join(relativePath, item);
                    if (item.startsWith('.')) {
                        continue; // Skip hidden files
                    }
                    await this.processFileWithSubdirectoryStructure(itemPath, relativeFilePath, config, outputFolderUri, outputFileUris);
                }
            }
        };

        const contentInput = config.input.find(input => input.name === 'content');
        if (!contentInput) {
            throw new Error('No input with name "content" found');
        }

        try {
            const inputStats = fs.statSync(contentInput.value);

            if (inputStats.isDirectory()) {
                await processDirectory(contentInput.value);
            } else {
                await this.processFileWithSubdirectoryStructure(contentInput.value, path.basename(contentInput.value), config, outputFolderUri, outputFileUris);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error processing input ${contentInput.value}: ${error instanceof Error ? error.message : String(error)}`);
        }
        
    
        if (!this.shouldStop) {
            vscode.window.showInformationMessage('Transformation complete.');
        }
        return outputFileUris;
    }
    
    async processFileWithSubdirectoryStructure(filePath: string, relativeFilePath: string, config: TransformerConfig, outputFolderUri: vscode.Uri, outputFileUris: string[]) {
        try {
            this.progressEmitter.fire({
                type: 'execution',
                subType: 'currentInput',
                filePath: filePath,
                message: `Processing file: ${relativeFilePath}`
            });
    
            const inputData = fs.readFileSync(filePath, 'utf-8');
    
            if (!this.validateInput(config)) {
                vscode.window.showErrorMessage(`Invalid input: ${filePath}`);
                return;
            }
    
            const processedData = this.preProcessInput(inputData);
            const message = this.generateUserMessage(config, processedData);
            const response = await this.sendToLLM(message);
    
            const relativeOutputDir = path.dirname(relativeFilePath);
            const outputFileName = this.getOutputFileName(config, filePath);
            const outputDirUri = vscode.Uri.joinPath(outputFolderUri, relativeOutputDir);
    
            await vscode.workspace.fs.createDirectory(outputDirUri);
            const outputFileUri = vscode.Uri.joinPath(outputDirUri, outputFileName);
    
            await this.writeOutput(response, outputFileUri, config);
            outputFileUris.push(outputFileUri.path);
    
            this.progressEmitter.fire({
                type: 'execution',
                subType: 'outputCreated',
                outputUri: outputFileUri.path,
                message: `Created output file: ${path.basename(outputFileUri.path)}`
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error processing file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
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
        logOutputChannel.info('Sending request to LLM:', (await llmClient.getSelectedAiProvider()).toString());
        try {
            return await llmClient.sendRequest(prompt);
        } catch (error) {
            console.error('Error sending request to LLM:', error);
            return `Error sending request to LLM: ${error instanceof Error ? error.message : String(error)}`;
        }
    }
}
