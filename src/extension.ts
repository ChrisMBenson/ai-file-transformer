import * as vscode from 'vscode';
import { ViewEditTransformer } from './webviews/ViewEditTransformer';
import { TransformersProvider, TransformerTreeItem } from './providers/TransformersProvider';
import { TransformerManager } from './transformers/transformerManager';
import { TransformerConfig } from './types';

export function activate(context: vscode.ExtensionContext) {
    console.log("Activating AI File Transformer extension...");

    // Initialize the Webview View Provider
    const viewEditTransformerProvider = new ViewEditTransformer(context.extensionUri);
    const transformerManager = new TransformerManager(context);

    // Initialize the Tree Data Provider
    //const transformerTreeProvider = new TransformerTreeProvider();
    const transformersProvider = new TransformersProvider(transformerManager);

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
            "treeTransformer.selectItem",
            (item: TransformerTreeItem) => {
                if (!item?.config) {
                    return;
                }
                console.log(`Selected Transformer: ${item.label}`);
                viewEditTransformerProvider.updateContent(JSON.stringify(item.config, null, 2));
            }
        ),
        vscode.commands.registerCommand(
            "ai-file-transformer.refresh",
            () => transformersProvider.refresh()
        ),
        vscode.commands.registerCommand(
            "ai-file-transformer.addTransformer",
            async () => {
                const newConfig: TransformerConfig = {
                    name: "New Transformer",
                    description: "Description",
                    inputFiles: "",
                    outputFolder: "",
                    prompt: "",
                    aiModel: "gpt-4",
                    temperature: 0.7,
                    preserveStructure: true,
                    namingConvention: "same"
                };
                await transformersProvider.addTransformer(newConfig);
                viewEditTransformerProvider.updateContent(JSON.stringify(newConfig, null, 2));
            }
        ),
        vscode.commands.registerCommand(
            "ai-file-transformer.editTransformer",
            async (item: TransformerTreeItem) => {
                if (item?.config) {
                    viewEditTransformerProvider.updateContent(JSON.stringify(item.config, null, 2));
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
                    const copy = { ...item.config };
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

    console.log("AI File Transformer extension activated successfully.");
}

export function deactivate() {
    console.log("Deactivating AI File Transformer extension...");
}
