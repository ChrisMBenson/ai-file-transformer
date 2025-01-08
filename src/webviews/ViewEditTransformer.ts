import * as vscode from 'vscode';
import { TransformerConfig } from '../types';
import { TransformerManager } from '../transformers/transformerManager';
import { VSCodeTransformerStorage } from '../types/storage';
import { TransformersProvider } from '../providers/TransformersProvider';

export class ViewEditTransformer implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

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
                        padding: 0 16px 16px;
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-sideBar-background);
                    }
                    .container {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 4px 12px;
                        cursor: pointer;
                        border-radius: 2px;
                        font-size: var(--vscode-font-size);
                    }
                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .section {
                        background-color: var(--vscode-sideBarSectionHeader-background);
                        padding: 16px;
                        border-radius: 4px;
                        border: 1px solid var(--vscode-panel-border);
                    }
                    pre {
                        background-color: var(--vscode-textBlockQuote-background);
                        padding: 8px;
                        border-radius: 2px;
                        overflow-x: auto;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        font-family: var(--vscode-editor-font-family);
                        font-size: var(--vscode-editor-font-size);
                    }
                    .form-group {
                        margin-bottom: 12px;
                    }
                    label {
                        display: block;
                        margin-bottom: 4px;
                        color: var(--vscode-foreground);
                        font-size: var(--vscode-font-size);
                    }
                    input, textarea {
                        width: 100%;
                        padding: 4px;
                        border: 1px solid var(--vscode-input-border);
                        background-color: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        border-radius: 2px;
                    }
                    textarea {
                        min-height: 100px;
                        resize: vertical;
                    }
                    .transformer-field {
                        margin: 8px 0;
                    }
                    .field-label {
                        color: var(--vscode-foreground);
                        font-weight: 600;
                        font-size: var(--vscode-font-size);
                    }
                    .field-value {
                        color: var(--vscode-descriptionForeground);
                        margin-left: 8px;
                        font-size: var(--vscode-font-size);
                    }
                    h3, h4 {
                        color: var(--vscode-foreground);
                        margin-top: 0;
                        margin-bottom: 12px;
                    }
                    p {
                        margin: 0 0 12px;
                        color: var(--vscode-foreground);
                        font-size: var(--vscode-font-size);
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
                                <label for="promptInput">Prompt:</label>
                                <textarea id="promptInput" class="form-control"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="aiModelInput">AI Model:</label>
                                <input type="text" id="aiModelInput" class="form-control">
                            </div>
                            <div class="form-group">
                                <label for="temperatureInput">Temperature:</label>
                                <input type="number" id="temperatureInput" class="form-control" min="0" max="1" step="0.1">
                            </div>
                            <div class="form-group">
                                <label for="preserveStructureInput">Preserve Structure:</label>
                                <input type="checkbox" id="preserveStructureInput" class="form-control">
                            </div>
                            <div class="form-group">
                                <label for="namingConventionInput">Naming Convention:</label>
                                <select id="namingConventionInput" class="form-control">
                                    <option value="camelCase">camelCase</option>
                                    <option value="PascalCase">PascalCase</option>
                                    <option value="snake_case">snake_case</option>
                                    <option value="kebab-case">kebab-case</option>
                                </select>
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
                                    if (unsafe === null || unsafe === undefined) {
                                        return '';
                                    }
                                    return String(unsafe)
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
                                '<span class="field-label">Input:</span>' +
                                '<span class="field-value">' + escapeHtml((currentConfig.input || []).map(i => i?.name || '').join(', ')) + '</span>' +
                                '</div>' +
                                '<div class="transformer-field">' +
                                '<span class="field-label">Output:</span>' +
                                '<span class="field-value">' + escapeHtml(currentConfig.output || '') + '</span>' +
                                '</div>' +
                                '<div class="transformer-field">' +
                                '<span class="field-label">Prompt:</span>' +
                                '<pre>' + escapeHtml(currentConfig.prompt || '') + '</pre>' +
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
                                    document.getElementById('promptInput').value = currentConfig.prompt;
                                });

                                // If showEditForm is true, automatically click the edit button
                                if (message.showEditForm) {
                                    details.style.display = 'none';
                                    editControls.style.display = 'block';
                                    
                                    // Populate form fields
                                    document.getElementById('nameInput').value = currentConfig.name;
                                    document.getElementById('descriptionInput').value = currentConfig.description;
                                    document.getElementById('promptInput').value = currentConfig.prompt;
                                }
                            } catch (e) {
                                const errorMessage = e instanceof Error ? e.message : String(e);
                                const errorStack = e instanceof Error ? e.stack : '';
                                console.error('Error displaying transformer details:', e);
                                details.innerHTML = 
                                    '<p style="color: var(--vscode-errorForeground);">Error displaying transformer details</p>' +
                                    '<pre style="color: var(--vscode-errorForeground);">' + escapeHtml(errorMessage) + '</pre>' +
                                    (errorStack ? '<pre style="color: var(--vscode-errorForeground);">' + escapeHtml(errorStack) + '</pre>' : '');
                            }
                        }
                    });

                    // Set up save button
                    document.getElementById('saveButton')?.addEventListener('click', () => {
                        const name = document.getElementById('nameInput').value;
                        const prompt = document.getElementById('promptInput').value;
                        
                        // Clear previous errors
                        document.querySelectorAll('.error-message').forEach(el => el.remove());
                        
                        // Validate required fields
                        let isValid = true;
                        if (!name.trim()) {
                            document.getElementById('nameInput').insertAdjacentHTML('afterend',
                                '<div class="error-message" style="color: var(--vscode-errorForeground); margin-top: 4px;">Name is required</div>');
                            isValid = false;
                        }
                        if (!prompt.trim()) {
                            document.getElementById('promptInput').insertAdjacentHTML('afterend',
                                '<div class="error-message" style="color: var(--vscode-errorForeground); margin-top: 4px;">Prompt is required</div>');
                            isValid = false;
                        }
                        
                        if (!isValid) return;
                        
                        const updatedConfig = {
                            ...currentConfig,
                            id: currentConfig.id,
                            name: name,
                            description: document.getElementById('descriptionInput').value,
                            prompt: document.getElementById('promptInput').value,
                            input: currentConfig.input,
                            output: currentConfig.output
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
