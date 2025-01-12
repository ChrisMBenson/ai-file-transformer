import * as vscode from 'vscode';
import { ViewEditTransformer } from './webviews/ViewEditTransformer';
import { VSCodeTransformerStorage } from './types/storage';
import { TransformersProvider, TransformerTreeItem } from './providers/TransformersProvider';
import { TransformerManager } from './transformers/transformerManager';
import { TransformerConfig } from './types';
import { executeTransformers } from './execution/executionEngine';

// Create output channel for logging
export const outputChannel = vscode.window.createOutputChannel('AI Transformer Output');
export const logOutputChannel = vscode.window.createOutputChannel('AI Transformer Logs', { "log": true });

export async function activate(context: vscode.ExtensionContext) {
    logOutputChannel.info("Activating AI File Transformer extension...");

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
            "ai-file-transformer.executeTransformer",
            (item: TransformerTreeItem) => {
                if (item?.config) {
                    executeTransformers(item.config);
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
            "ai-file-transformer.refresh",
            () => transformersProvider.refresh()
        ),
        vscode.commands.registerCommand(
            "ai-file-transformer.addTransformer",
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
                    maxTokens: 1000,
                    processFormat: "eachFile"
                };
                await transformersProvider.addTransformer(newConfig);
                viewEditTransformerProvider.updateContent(newConfig, true);
            }
        ),
        vscode.commands.registerCommand(
            "ai-file-transformer.editTransformer",
            async (item: TransformerTreeItem) => {
                if (item?.config) {
                    viewEditTransformerProvider.updateContent(item.config, true);
                }
            }
        ),
        vscode.commands.registerCommand(
            "ai-file-transformer.deleteTransformer",
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
            "ai-file-transformer.duplicateTransformer",
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
            "ai-file-transformer.openSettings",
            () => {
                vscode.commands.executeCommand('workbench.action.openSettings', 'AI File Transformer');
            }
        )
    ];

    // Add everything to context subscriptions
    context.subscriptions.push(
        webviewRegistration,
        treeViewRegistration,
        ...commands
    );

    logOutputChannel.info("AI File Transformer extension activated successfully.");
}

export function deactivate() {
    logOutputChannel.info("Deactivating AI File Transformer extension...");
    logOutputChannel.dispose();
    outputChannel.dispose();
}
