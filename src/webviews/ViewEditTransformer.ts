import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TransformerConfig } from '../types';
import { TransformerManager } from '../transformers/transformerManager';
import { TransformersProvider } from '../providers/TransformersProvider';

export class ViewEditTransformer implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    private transformerManager: TransformerManager;
    private transformersProvider: TransformersProvider;
    private inputFilePath?: string;
    private outputFolderPath?: string;

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
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        try {
            this._view = webviewView;

            webviewView.webview.options = {
                enableScripts: true,
                localResourceRoots: [this.extensionUri]
            };

            webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

            // Handle messages from the webview
            webviewView.webview.onDidReceiveMessage(async (message) => {
                console.log(message);
                switch (message.command) {
                    case 'alert':
                        vscode.window.showInformationMessage(message.text);
                        break;
                    case 'selectTransformer':
                        vscode.window.showInformationMessage(`Selected Transformer: ${message.transformer}`);
                        break;
                    case 'openFileDialog':
                        const options: vscode.OpenDialogOptions = {
                            canSelectMany: false,
                            openLabel: 'Select File',
                            filters: {
                                'All Files': ['*']
                            }
                        };
                    
                        if (message.output) {
                            options.canSelectFiles = false;
                            options.canSelectFolders = true;
                            options.openLabel = 'Select Folder';
                        } else {
                            options.canSelectFiles = true;
                            options.canSelectFolders = false;
                        }

                        const fileUri = await vscode.window.showOpenDialog(options);
                        if (fileUri && fileUri[0]) {
                            const filePath = fileUri[0].fsPath;
                            if (message.output) {
                                this.outputFolderPath = filePath;
                            } else {
                                this.inputFilePath = filePath;
                            }
                            console.log('Message :', JSON.stringify(message));
                            webviewView.webview.postMessage({ 
                                command: 'selectedFile', 
                                filePath: filePath, 
                                inputName: message.inputName, 
                                output: message.output,
                                currentInputPath: this.inputFilePath,
                                currentOutputPath: this.outputFolderPath
                            });
                        }
                        break;
                    case 'save':
                        try {
                            const config = JSON.parse(message.data) as TransformerConfig;
                            // Validate config structure
                            if (!config.id || typeof config.id !== 'string') {
                                throw new Error('Invalid transformer config: missing or invalid id');
                            }
                            if (!config.name || typeof config.name !== 'string') {
                                throw new Error('Invalid transformer config: missing or invalid name');
                            }

                            // Update the config structure to match the TransformerConfig type
                            config.input = config.input || [];
                            config.output = config.output || '';

                            await this.transformerManager.updateTransformer(config);
                            console.log('Transformer updated, refreshing...');
                            await this.transformersProvider.refresh();
                            console.log('Refresh complete');
                            vscode.window.showInformationMessage('Transformer configuration saved');
                        } catch (error) {
                            vscode.window.showErrorMessage('Failed to save transformer configuration');
                            console.error('Save error:', error);
                        }
                        break;
                }
            });

            console.log('ViewEditTransformer view successfully resolved');
        } catch (error) {
            console.error('Error resolving webview:', error);
            vscode.window.showErrorMessage(`Failed to load view: ${error instanceof Error ? error.message : String(error)}`);
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
        }
    }
}
