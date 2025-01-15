import * as vscode from 'vscode';
import { ViewEditTransformer } from './webviews/ViewEditTransformer';
import { VSCodeTransformerStorage } from './types/storage';
import { TransformersProvider, TransformerTreeItem } from './providers/TransformersProvider';
import { TransformerManager } from './transformers/transformerManager';
import { TransformerConfig } from './types';
import { executeTransformers } from './execution/executionEngine';
import { count, log } from 'console';

// Create output channel for logging
export const outputChannel = vscode.window.createOutputChannel('AI Transformer Output');
export const logOutputChannel = vscode.window.createOutputChannel('AI Transformer Logs', { "log": true });

export async function activate(context: vscode.ExtensionContext) {
    logOutputChannel.info("Activating Fuzor AI Transformer extension...");

    // Initialize the Transformer Manager with storage
    const transformerStorage = new VSCodeTransformerStorage(context);
    const transformerManager = await TransformerManager.create(transformerStorage);

    // Initialize the Tree Data Provider
    //const transformerTreeProvider = new TransformerTreeProvider();
    const transformersProvider = new TransformersProvider(transformerManager);

    // Initialize the Webview View Provider
    const viewEditTransformerProvider = new ViewEditTransformer(context.extensionUri, context, transformersProvider, transformerManager);

    // Register the Webview View
    const webviewRegistration = vscode.window.registerWebviewViewProvider(
        "viewEditTransformer",
        viewEditTransformerProvider,
        {
            webviewOptions: {
                retainContextWhenHidden: true // Keeps the Webview's state when hidden
            }
        }
    );

    // Register the Tree View
    const treeViewRegistration = vscode.window.createTreeView("treeTransformer", {
        treeDataProvider: transformersProvider, //transformerTreeProvider,
        showCollapseAll: true
    });


    // Register all commands
    const commands = [
        vscode.commands.registerCommand(
            "fuzor-ai-transformer.executeTransformer",
            (item: TransformerTreeItem) => {
                if (item?.config) {
                    executeTransformers(item.config);
                } else {
                    logOutputChannel.info("Error: No transformer configuration found");
                }
            }
        ),
        vscode.commands.registerCommand(
            "fuzor-ai-transformer.exportTransformer",
            (item: TransformerTreeItem) => {
                if (item?.config) {

                    let updatedInput = item.config.input.map((input) => {
                        return {
                            ...input,
                            value: "/",
                        };
                    });
                    let updatedConfig = {
                        ...item.config,
                        input: updatedInput,
                        outputFolder: "/",
                    };

                    vscode.window.showSaveDialog({
                        defaultUri: vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 
                            ? vscode.Uri.file(`${vscode.workspace.workspaceFolders[0].uri.fsPath}/${updatedConfig.name}.fuzor`) 
                            : vscode.Uri.file(`${updatedConfig.name}.fuzor`),
                        filters: {
                            'Fuzor Files': ['fuzor']
                        },
                        saveLabel: 'Export'
                    }).then((uri) => {
                        if (uri) {
                            vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify([updatedConfig], null, 4)));
                            logOutputChannel.info(`Exported transformer ${updatedConfig.name} to ${uri.fsPath}`);
                            vscode.window.showInformationMessage(`Exported transformer ${updatedConfig.name} to ${uri.fsPath}`);
                        }
                    });
                } else {
                    logOutputChannel.info("Error: No transformer configuration found");
                }
            }
        ),
        vscode.commands.registerCommand(
            "treeTransformer.selectItem",
            (item: TransformerTreeItem) => {
                if (!item?.config) {
                    return;
                }
                console.log(`Selected Transformer: ${item.label}`);
                viewEditTransformerProvider.updateContent(item.config);
            }
        ),
        vscode.commands.registerCommand(
            "fuzor-ai-transformer.refresh",
            () => transformersProvider.refresh()
        ),
        vscode.commands.registerCommand(
            "fuzor-ai-transformer.addTransformer",
            async () => {
                const { v4: uuidv4 } = require('uuid');
                const newConfig: TransformerConfig = {
                    id: uuidv4(),
                    name: "New Transformer",
                    description: "Provide Description",
                    prompt: "Write prompt for transforming the input files according to the following requirements: {{content}}",
                    input: [
                        { 
                            name: "content",
                            description: "Input file", 
                            type:'input', 
                            value:'/', 
                            required: true 
                        }
                    ],
                    outputFolder: "outputfolder/",
                    outputFileName: "",
                    temperature: 0.7,
                    processFormat: "eachFile"
                };
                await transformersProvider.addTransformer(newConfig);
                viewEditTransformerProvider.updateContent(newConfig, true);
            }
        ),
        vscode.commands.registerCommand(
            "fuzor-ai-transformer.editTransformer",
            async (item: TransformerTreeItem) => {
                if (item?.config) {
                    viewEditTransformerProvider.updateContent(item.config, true);
                }
            }
        ),
        vscode.commands.registerCommand(
            "fuzor-ai-transformer.deleteTransformer",
            async (item: TransformerTreeItem) => {
                if (item?.config) {
                    const answer = await vscode.window.showWarningMessage(
                        `Are you sure you want to delete transformer "${item.label}"?`,
                        "Yes",
                        "No"
                    );
                    if (answer === "Yes") {
                        await transformersProvider.removeTransformer(item.config.name);
                    }
                }
            }
        ),
        vscode.commands.registerCommand(
            "fuzor-ai-transformer.duplicateTransformer",
            async (item: TransformerTreeItem) => {
                if (item?.config) {
                    const { v4: uuidv4 } = require('uuid');
                    const copy = { ...item.config, id: uuidv4() };
                    copy.name = `${copy.name} (Copy)`;
                    await transformersProvider.addTransformer(copy);
                }
            }
        ),
        vscode.commands.registerCommand(
            "fuzor-ai-transformer.openSettings",
            () => {
                vscode.commands.executeCommand('workbench.action.openSettings', 'Fuzor AI Transformer');
            }
        ),
        vscode.commands.registerCommand(
            "fuzor-ai-transformer.importTransformer",
            async () => {
                const options: vscode.OpenDialogOptions = {
                    canSelectMany: false,
                    openLabel: 'Select',
                    filters: {
                        'Fuzor Files': ['fuzor']
                    },
                    defaultUri: vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 
                        ? vscode.Uri.file(`${vscode.workspace.workspaceFolders[0].uri.fsPath}`) 
                        : vscode.Uri.file(""),
                };

                const fileUri = await vscode.window.showOpenDialog(options);
                if (fileUri && fileUri[0]) {
                    try {
                        const filePath = fileUri[0].fsPath;
                        logOutputChannel.info(`Selected .fuzor file: ${filePath}`);
                        
                        // Read and parse the file
                        const fileContents = await vscode.workspace.fs.readFile(fileUri[0]);
                        const configs: TransformerConfig[] = JSON.parse(fileContents.toString());
                        
                        // Validate and import each config
                        let count = 0;
                        for (const config of configs) {
                            try {
                                await transformerManager.createTransformer(config);
                                count++;
                            } catch (error) {
                                logOutputChannel.error(`Failed to import transformer ${config.name}: ${error}`);
                                vscode.window.showErrorMessage(`Failed to import transformer ${config.name}: ${error}`);
                            }
                        }
                        
                        vscode.window.showInformationMessage(`Successfully imported ${count} of ${configs.length} transformers`);
                        transformersProvider.refresh();
                    } catch (error) {
                        logOutputChannel.error(`Failed to import transformers: ${error}`);
                        vscode.window.showErrorMessage(`Failed to import transformers: ${error}`);
                    }
                }
            }
        ),
    ];

    // Add everything to context subscriptions
    context.subscriptions.push(
        webviewRegistration,
        treeViewRegistration,
        ...commands
    );

    logOutputChannel.info("Fuzor AI Transformer extension activated successfully.");
}

export function deactivate() {
    logOutputChannel.info("Deactivating Fuzor AI Transformer extension...");
    logOutputChannel.dispose();
    outputChannel.dispose();
}
