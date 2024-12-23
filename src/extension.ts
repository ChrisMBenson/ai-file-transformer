import * as vscode from 'vscode';
import { ViewEditTransformer } from './webviews/ViewEditTransformer';
import { TransformersProvider, TransformerTreeItem } from './providers/TransformersProvider';
import { TransformerManager } from './transformers/transformerManager';

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


    // Command to handle Tree View selection and interaction with the Webview
    const selectTransformerCommand = vscode.commands.registerCommand(
        "treeTransformer.selectItem",
        (item: TransformerTreeItem) => {
            if (!item?.config) {
                return;
            }
            console.log(`Selected Transformer: ${item.label}`);
            viewEditTransformerProvider.updateContent(JSON.stringify(item.config, null, 2));
        }
    );

    // Add everything to context subscriptions
    context.subscriptions.push(
        webviewRegistration,
        treeViewRegistration,
        selectTransformerCommand
    );

    console.log("AI File Transformer extension activated successfully.");
}

export function deactivate() {
    console.log("Deactivating AI File Transformer extension...");
}
