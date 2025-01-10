import * as vscode from 'vscode';
import { TransformerManager } from '../transformers/transformerManager';
import { TransformerConfig } from '../types';

export class TransformerTreeItem extends vscode.TreeItem {
    constructor(
        public readonly id: string,
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly config: TransformerConfig
    ) {
        super(label, collapsibleState);
        this.tooltip = `${description}\nInput: ${config.input.map(i => i.name).join(', ')}\nOutput: ${config.outputFolder}`;
        this.description = description;
        this.contextValue = 'transformer';
        this.iconPath = new vscode.ThemeIcon('file-code');
        this.command = {
            command: 'treeTransformer.selectItem',
            title: 'Select Transformer',
            arguments: [this]
        };
    }
}

export class TransformersProvider implements vscode.TreeDataProvider<TransformerTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TransformerTreeItem | undefined | null | void> = new vscode.EventEmitter<TransformerTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TransformerTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    private treeView: vscode.TreeView<TransformerTreeItem>;

    constructor(public transformerManager: TransformerManager) {
        this.treeView = vscode.window.createTreeView('treeTransformer', {
            treeDataProvider: this,
            showCollapseAll: true
        });
    }

    async refresh(): Promise<void> {
        console.log('Refreshing transformers...');
        await this.transformerManager.loadTransformers();
        console.log('Transformers refreshed, firing change event');
        
        return new Promise<void>((resolve) => {
            // Fire the change event
            this._onDidChangeTreeData.fire(undefined);
            
            // Give the tree view time to update
            setTimeout(resolve, 100);
        });
    }

    getTreeItem(element: TransformerTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TransformerTreeItem): Thenable<TransformerTreeItem[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
            const transformers = this.transformerManager.getAllTransformers();
            return Promise.resolve(
                transformers.map(t => 
                    new TransformerTreeItem(
                        t.id,
                        t.name,
                        t.description,
                        vscode.TreeItemCollapsibleState.None,
                        t
                    )
                )
            );
        }
    }

    getParent(_element: TransformerTreeItem): vscode.ProviderResult<TransformerTreeItem> {
        return null; // All items are root level
    }

    async addTransformer(config: TransformerConfig) {
        await this.transformerManager.createTransformer(config);
        await this.refresh();
        
        // Wait a bit for the tree view to fully update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Find the tree item for the new transformer
        const transformers = await this.getChildren();
        const newTransformer = transformers.find(t => t.id === config.id);
        
        if (newTransformer) {
            try {
                await this.treeView.reveal(newTransformer, {
                    select: true,
                    focus: true,
                    expand: true
                });
            } catch (error) {
                console.error('Failed to reveal transformer:', error);
            }
        }
    }

    async updateTransformer(config: TransformerConfig) {
        await this.transformerManager.updateTransformer(config);
        this.refresh();
    }

    async removeTransformer(name: string) {
        await this.transformerManager.deleteTransformer(name);
        this.refresh();
    }

    getTransformer(name: string): TransformerConfig | undefined {
        return this.transformerManager.getTransformer(name);
    }
}
