import * as vscode from 'vscode';
import { TransformerConfig } from './index';

/**
 * Interface for transformer storage operations
 */
export interface ITransformerStorage {
    /**
     * Load all transformers from storage
     * @returns Promise resolving to a map of transformer configurations
     */
    loadTransformers(): Promise<Map<string, TransformerConfig>>;

    /**
     * Save all transformers to storage
     * @param transformers Map of transformer configurations to save
     * @returns Promise that resolves when save is complete
     */
    saveTransformers(transformers: Map<string, TransformerConfig>): Promise<void>;
}

/**
 * Default implementation using VS Code's globalState
 */
export class VSCodeTransformerStorage implements ITransformerStorage {
    private static readonly STORAGE_KEY = 'transformers';
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async loadTransformers(): Promise<Map<string, TransformerConfig>> {
        const storedTransformers = this.context.globalState.get<{ [key: string]: TransformerConfig }>(VSCodeTransformerStorage.STORAGE_KEY) || {};
        return new Map(Object.entries(storedTransformers));
    }

    async saveTransformers(transformers: Map<string, TransformerConfig>): Promise<void> {
        const transformersObj = Object.fromEntries(transformers);
        await this.context.globalState.update(VSCodeTransformerStorage.STORAGE_KEY, transformersObj);
    }
}