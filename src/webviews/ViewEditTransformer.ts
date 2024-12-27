import * as vscode from 'vscode';
import { TransformerConfig } from '../types';
import { TransformerManager } from '../transformers/transformerManager';
import { VSCodeTransformerStorage } from '../types/storage';

export class ViewEditTransformer implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    private transformerManager: TransformerManager;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly context: vscode.ExtensionContext
    ) {
        this.transformerManager = new TransformerManager(new VSCodeTransformerStorage(this.context));
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

            // Set the webview's initial HTML content
            webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

            // Handle messages from the webview
            webviewView.webview.onDidReceiveMessage(async (message) => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showInformationMessage(message.text);
                        break;
                    case 'selectTransformer':
                        vscode.window.showInformationMessage(`Selected Transformer: ${message.transformer}`);
                        break;
                    case 'save':
                        try {
                            const config = JSON.parse(message.data) as TransformerConfig;
                            await this.transformerManager.updateTransformer(config);
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
        const nonce = this._getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <title>AI File Transformer</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 10px;
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                    }
                    .container {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 12px;
                        cursor: pointer;
                        border-radius: 2px;
                    }
                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .section {
                        background-color: var(--vscode-editor-background);
                        padding: 10px;
                        border-radius: 4px;
                        border: 1px solid var(--vscode-panel-border);
                    }
                    pre {
                        background-color: var(--vscode-editor-background);
                        padding: 10px;
                        border-radius: 4px;
                        overflow-x: auto;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    }
                    .transformer-field {
                        margin: 8px 0;
                    }
                    .field-label {
                        color: var(--vscode-editor-foreground);
                        font-weight: bold;
                    }
                    .field-value {
                        color: var(--vscode-textPreformat-foreground);
                        margin-left: 8px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="section">
                        <h3>AI File Transformer</h3>
                        <p>Select a transformer from the tree to edit its details here.</p>
                        <div id="transformerDetails">
                            <p>No transformer selected.</p>
                        </div>
                        <div id="editControls" style="display: none;">
                            <h4>Edit Transformer</h4>
                            <div class="form-group">
                                <label for="nameInput">Name:</label>
                                <input type="text" id="nameInput" class="form-control">
                            </div>
                            <div class="form-group">
                                <label for="descriptionInput">Description:</label>
                                <textarea id="descriptionInput" class="form-control"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="inputFilesInput">Input Files:</label>
                                <input type="text" id="inputFilesInput" class="form-control">
                            </div>
                            <div class="form-group">
                                <label for="outputFolderInput">Output Folder:</label>
                                <input type="text" id="outputFolderInput" class="form-control">
                            </div>
                            <div class="form-group">
                                <label for="promptInput">Prompt:</label>
                                <textarea id="promptInput" class="form-control"></textarea>
                            </div>
                            <button id="saveButton" class="btn-primary">Save Changes</button>
                            <button id="cancelButton" class="btn-secondary">Cancel</button>
                        </div>
                    </div>
                </div>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    let currentConfig = null;

                    // Handle incoming messages
                    window.addEventListener('message', (event) => {
                        const message = event.data;
                        if (message.command === 'update') {
                            currentConfig = JSON.parse(message.data);
                            const details = document.getElementById('transformerDetails');
                            const editControls = document.getElementById('editControls');
                            
                            try {
                                function escapeHtml(unsafe) {
                                    return unsafe
                                        .replace(/&/g, "&amp;")
                                        .replace(/</g, "&lt;")
                                        .replace(/>/g, "&gt;")
                                        .replace(/"/g, "&quot;")
                                        .replace(/'/g, "&#039;");
                                }
                                
                                const html =
                                    '<div class="transformer-field">' +
                                    '<span class="field-label">Name:</span>' +
                                    '<span class="field-value">' + escapeHtml(currentConfig.name) + '</span>' +
                                    '</div>' +
                                    '<div class="transformer-field">' +
                                    '<span class="field-label">Description:</span>' +
                                    '<span class="field-value">' + escapeHtml(currentConfig.description) + '</span>' +
                                    '</div>' +
                                    '<div class="transformer-field">' +
                                    '<span class="field-label">Input Files:</span>' +
                                    '<span class="field-value">' + escapeHtml(currentConfig.inputFiles) + '</span>' +
                                    '</div>' +
                                    '<div class="transformer-field">' +
                                    '<span class="field-label">Output Folder:</span>' +
                                    '<span class="field-value">' + escapeHtml(currentConfig.outputFolder) + '</span>' +
                                    '</div>' +
                                    '<div class="transformer-field">' +
                                    '<span class="field-label">Prompt:</span>' +
                                    '<pre>' + escapeHtml(currentConfig.prompt) + '</pre>' +
                                    '</div>' +
                                    '<button id="editButton">Edit Transformer</button>';
                                
                                details.innerHTML = html;
                                editControls.style.display = 'none';
                                
                                // Set up edit button
                                document.getElementById('editButton')?.addEventListener('click', () => {
                                    details.style.display = 'none';
                                    editControls.style.display = 'block';
                                    
                                    // Populate form fields
                                    document.getElementById('nameInput').value = currentConfig.name;
                                    document.getElementById('descriptionInput').value = currentConfig.description;
                                    document.getElementById('inputFilesInput').value = currentConfig.inputFiles;
                                    document.getElementById('outputFolderInput').value = currentConfig.outputFolder;
                                    document.getElementById('promptInput').value = currentConfig.prompt;
                                });
                            } catch (e) {
                                details.innerHTML = '<p>Error displaying transformer details</p>';
                            }
                        }
                    });

                    // Set up save button
                    document.getElementById('saveButton')?.addEventListener('click', () => {
                        const updatedConfig = {
                            ...currentConfig,
                            id: currentConfig.id,
                            name: document.getElementById('nameInput').value,
                            description: document.getElementById('descriptionInput').value,
                            inputFiles: document.getElementById('inputFilesInput').value,
                            outputFolder: document.getElementById('outputFolderInput').value,
                            prompt: document.getElementById('promptInput').value
                        };
                        
                        vscode.postMessage({
                            command: 'save',
                            data: JSON.stringify(updatedConfig)
                        });
                        
                        // Switch back to view mode
                        document.getElementById('transformerDetails').style.display = 'block';
                        document.getElementById('editControls').style.display = 'none';
                    });

                    // Set up cancel button
                    document.getElementById('cancelButton')?.addEventListener('click', () => {
                        document.getElementById('transformerDetails').style.display = 'block';
                        document.getElementById('editControls').style.display = 'none';
                    });
                </script>
            </body>
            </html>`;
    }

    private _getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    public updateContent(content: string) {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'update',
                data: content
            });
        }
    }
}
