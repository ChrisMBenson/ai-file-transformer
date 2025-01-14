import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { logOutputChannel } from '../extension';
import { TransformerConfig } from '../types';
import { TransformerManager } from '../transformers/transformerManager';
import { TransformersProvider } from '../providers/TransformersProvider';
import { LLMClient } from '../transformers/llmFactory';

export class ViewEditTransformer implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private currentExecution: Promise<void> | null = null;

    private transformerManager: TransformerManager;
    private transformersProvider: TransformersProvider;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly context: vscode.ExtensionContext,
        transformersProvider: TransformersProvider,
        transformerManager: TransformerManager
    ) {
        this.transformerManager = transformerManager;
        this.transformersProvider = transformersProvider;
        this.extensionUri = extensionUri;
        this.context = context;

        logOutputChannel.info("ViewEditTransformer initialized.");
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        logOutputChannel.info("Resolving webview view...");
        try {
            this._view = webviewView;

            webviewView.webview.options = {
                enableScripts: true,
                localResourceRoots: [this.extensionUri]
            };

            logOutputChannel.info("Setting webview HTML content...");
            webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

            // Handle messages from the webview
            webviewView.webview.onDidReceiveMessage(async (message) => {
                logOutputChannel.info(`Received message: Command - "${message.command}"`);
                switch (message.command) {
                    case 'alert':
                        vscode.window.showInformationMessage(message.text);
                        break;
                    case 'selectTransformer':
                        vscode.window.showInformationMessage(`Selected Transformer: ${message.transformer}`);
                            break;
                    case 'openFileDialog':
                        const config = JSON.parse(message.data) as TransformerConfig;
                        const isOutput = message.isOutput;
                        const options: vscode.OpenDialogOptions = {
                            canSelectMany: false,
                            openLabel: 'Select File',
                            filters: {
                                'All Files': ['*']
                            }
                        };

                        if (message.isOutput) {
                            options.canSelectFiles = false;
                            options.canSelectFolders = true;
                            options.openLabel = 'Select Folder';
                        } else if (message.isInput && message.inputName === 'content') {
                            options.canSelectFiles = true;
                            options.canSelectFolders = true;
                        }else{
                            options.canSelectFiles = true;
                            options.canSelectFolders = false;
                            options.openLabel = 'Select Folder';
                        }

                        const fileUri = await vscode.window.showOpenDialog(options);
                        if (fileUri && fileUri[0]) {
                            const filePath = fileUri[0].fsPath;
                            if (isOutput) {
                                config.outputFolder = filePath;
                                await this.transformerManager.updateTransformer(config);
                            } else {
                                const updatedInput = config.input.map(i => {
                                    if (i.name === message.inputName) {
                                        return {
                                            ...i,
                                            value: filePath
                                        };
                                    }
                                    return i;
                                });
                                config.input = updatedInput;
                                console.log("Updated Config: ", updatedInput);
                            }
                            await this.transformerManager.updateTransformer(config);
                            await this.transformersProvider.refresh();
                            vscode.window.showInformationMessage('Transformer configuration saved');
                            this.updateContent(config, false);
                        }
                        break;
                    case 'execute':
                        try {
                            const config = JSON.parse(message.data) as TransformerConfig;
                            logOutputChannel.debug(`Saving Config ${JSON.stringify(config)}`);
                            
                            // Notify webview that execution started
                            if (this._view) {
                                this._view.webview.postMessage({
                                    command: 'executionStarted'
                                });
                            }

                            const execution = this.transformerManager.executeTransformer(config);
                            
                            // Store the execution promise for potential cancellation
                            this.currentExecution = execution;

                            await execution;
                            
                            // Notify webview that execution completed
                            if (this._view) {
                                this._view.webview.postMessage({
                                    command: 'executionFinished'
                                });
                            }

                            vscode.window.showInformationMessage('Transformer executed successfully');
                        } catch (error) {
                            if (this._view) {
                                this._view.webview.postMessage({
                                    command: 'executionFinished'
                                });
                            }
                            
                            if (error instanceof Error) {
                                vscode.window.showErrorMessage(`Failed to execute transformer: ${error.message}`);
                                logOutputChannel.error(`Error executing transformer: ${error.stack}`);
                            } else {
                                vscode.window.showErrorMessage('An unknown error occurred while executing the transformer.');
                                logOutputChannel.error(`Unknown error: ${JSON.stringify(error)}`);
                            }
                        }
                        break;
                    case 'stopExecution':
                        if (this.currentExecution) {
                            try {
                                await this.transformerManager.stopExecution();
                                this.currentExecution = null;
                                
                                if (this._view) {
                                    this._view.webview.postMessage({
                                        command: 'executionStopped'
                                    });
                                }
                                
                                vscode.window.showInformationMessage('Execution stopped');
                            } catch (error) {
                                if (error instanceof Error) {
                                    vscode.window.showErrorMessage(`Failed to stop execution: ${error.message}`);
                                    logOutputChannel.error(`Error stopping execution: ${error.stack}`);
                                } else {
                                    vscode.window.showErrorMessage('An unknown error occurred while stopping execution.');
                                    logOutputChannel.error(`Unknown error: ${JSON.stringify(error)}`);
                                }
                            }
                        }
                        break;
                    case 'save':
                        try {
                            const config = JSON.parse(message.data) as TransformerConfig;
                            logOutputChannel.debug(`Saving Config ${JSON.stringify(config)}`);
                            // Validate config structure
                            if (!config.id || typeof config.id !== 'string') {
                                throw new Error('Invalid transformer config: missing or invalid id');
                            }
                            if (!config.name || typeof config.name !== 'string') {
                                throw new Error('Invalid transformer config: missing or invalid name');
                            }

                            // Print only id and name
                            logOutputChannel.info(`Saving transformer: id=${config.id}, name=${config.name}`);

                            // Update the config structure to match the TransformerConfig type
                            config.input = config.input || [];
                            config.outputFolder = config.outputFolder || '';

                            await this.transformerManager.updateTransformer(config);
                            await this.transformersProvider.refresh();
                            vscode.window.showInformationMessage('Transformer configuration saved');
                            this.updateContent(config, false);
                        } catch (error) {
                            if (error instanceof Error) {
                                vscode.window.showErrorMessage(`Failed to save transformer configuration: ${error.message}`);
                                logOutputChannel.error(`Error saving transformer configuration: ${error.stack}`);
                            } else {
                                vscode.window.showErrorMessage('An unknown error occurred while saving the transformer configuration.');
                                logOutputChannel.error(`Unknown error: ${JSON.stringify(error)}`);
                            }
                        }
                        break;
                    case 'enhancePrompt':
                        try {
                            const { name, description, prompt } = JSON.parse(message.data);
                            const llm = new LLMClient();

                            const enhancementPrompt = `

                                You are prompt engineer working for a company which transforms file from one format to another format.
                                
                                Using the provided details: Name: ${name}, Description: ${description}, and Current Prompt: ${prompt},
                                enhance the given prompt to be more clear, specific, and effective for its intended transformation. 
                                Ensure the improved prompt is concise and includes at least one placeholder like {{content}} for dynamic input replacement. 
                                Do not repeat the provided details in the enhanced prompt. Do not repeat same placeholder multiple times. 
                                By default place the placeholder at the end of the prompt in a new line`;

                            const llmResponse = await llm.sendRequest(enhancementPrompt);

                            webviewView.webview.postMessage({
                                command: 'enhancedPrompt',
                                prompt: llmResponse
                            });

                            logOutputChannel.info('Prompt enhancement completed');
                        } catch (error) {
                            if (error instanceof Error) {
                                logOutputChannel.error(`Error enhancing prompt: ${error.message}`);
                            } else {
                                logOutputChannel.error(`Unknown error enhancing prompt: ${JSON.stringify(error)}`);
                            }
                        }
                        break;
                    case 'openPromptInEditor':
                        try {
                            const prompt = message.prompt;
                            // Create a temporary file
                            // Ensure global storage directory exists
                            await fs.promises.mkdir(this.context.globalStorageUri.fsPath, { recursive: true });
                            
                            const tempFile = path.join(this.context.globalStorageUri.fsPath, 'temp_prompt.txt');
                            try {
                                await fs.promises.writeFile(tempFile, prompt);
                            } catch (error) {
                                if (error instanceof Error) {
                                    throw new Error(`Failed to create temp prompt file: ${error.message}`);
                                }
                                throw new Error('Failed to create temp prompt file');
                            }
                            
                            // Open the temporary file
                            const doc = await vscode.workspace.openTextDocument(tempFile);
                            const editor = await vscode.window.showTextDocument(doc);
                            
                            // Watch for changes
                            const watcher = vscode.workspace.createFileSystemWatcher(tempFile);
                            const saveDisposable = vscode.workspace.onDidSaveTextDocument(savedDoc => {
                                if (savedDoc.uri.fsPath === tempFile) {
                                    const newContent = savedDoc.getText();
                                    if (this._view) {
                                        this._view.webview.postMessage({
                                            command: 'updatePrompt',
                                            prompt: newContent
                                        });
                                    }
                                }
                            });

                            // Clean up when editor is closed
                            const closeDisposable = vscode.window.onDidChangeVisibleTextEditors(editors => {
                                if (!editors.some(e => e.document.uri.fsPath === tempFile)) {
                                    watcher.dispose();
                                    saveDisposable.dispose();
                                    closeDisposable.dispose();
                                    fs.promises.unlink(tempFile).catch(err => {
                                        logOutputChannel.error(`Error deleting temp file: ${err.message}`);
                                    });
                                }
                            });
                        } catch (error) {
                            if (error instanceof Error) {
                                logOutputChannel.error(`Error opening prompt in editor: ${error.message}`);
                            } else {
                                logOutputChannel.error(`Unknown error opening prompt in editor: ${JSON.stringify(error)}`);
                            }
                        }
                        break;
                }
            });

            // Register command for opening prompt in editor
            this.context.subscriptions.push(
                vscode.commands.registerCommand('fuzor-ai-transformer.openPromptInEditor', async () => {
                    if (this._view) {
                        this._view.webview.postMessage({
                            command: 'openPromptInEditor'
                        });
                    }
                })
            );

            logOutputChannel.info("ViewEditTransformer view successfully resolved.");
        } catch (error) {
            if (error instanceof Error) {
                logOutputChannel.error(`Error resolving webview: ${error.message}\nStack: ${error.stack}`);
                vscode.window.showErrorMessage(`Failed to load view: ${error.message}`);
            } else {
                logOutputChannel.error(`Unknown error resolving webview: ${JSON.stringify(error)}`);
                vscode.window.showErrorMessage('Failed to load view due to an unknown error.');
            }
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const htmlFilePath = path.join(this.context.extensionUri.fsPath, 'media', 'viewEditTransformer.html');
        const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

        const nonce = this._getNonce();

        // Replace placeholders in the HTML with dynamic values
        return htmlContent
            .replace(/\${webview.cspSource}/g, webview.cspSource)
            .replace(/\${nonce}/g, nonce);
    }

    private _getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    public updateContent(content: TransformerConfig, showEditForm: boolean = false) {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'update',
                data: JSON.stringify(content),
                showEditForm
            });
            logOutputChannel.info(`Updated webview content for transformer: id=${content.id}, name=${content.name}`);
        }
    }
}
