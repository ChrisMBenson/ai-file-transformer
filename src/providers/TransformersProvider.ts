import * as vscode from 'vscode';
import { TransformerManager } from '../transformers/transformerManager';
import { TransformerConfig } from '../types';

export class TransformerTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly config: TransformerConfig
    ) {
        super(label, collapsibleState);
        this.tooltip = `${description}\nInput: ${config.input.map(i => i.name).join(', ')}\nOutput: ${config.output}`;
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

    constructor(public transformerManager: TransformerManager) {}

    async refresh(): Promise<void> {
        console.log('Refreshing transformers...');
        await this.transformerManager.loadTransformers();
        console.log('Transformers refreshed, firing change event');
        this._onDidChangeTreeData.fire(undefined);
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
                        t.name,
                        t.description,
                        vscode.TreeItemCollapsibleState.None,
                        t
                    )
                )
            );
        }
    }

    async addTransformer(config: TransformerConfig) {
        await this.transformerManager.createTransformer(config);
        this.refresh();
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
