import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
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
        const storedData = this.context.globalState.get<TransformerConfig[] | { [key: string]: TransformerConfig }>(VSCodeTransformerStorage.STORAGE_KEY);
        const transformerMap = new Map<string, TransformerConfig>();

        if (Array.isArray(storedData)) {
            // New format: array of transformers
            storedData.forEach(config => {
                if (this.isValidTransformer(config)) {
                    transformerMap.set(config.id, config);
                }
            });
        } else if (storedData && typeof storedData === 'object') {
            // Old format: object with name keys
            for (const [name, config] of Object.entries(storedData)) {
                if (this.isValidTransformer(config)) {
                    // Generate ID for old configs
                    if (!config.id) {
                        config.id = crypto.randomUUID();
                    }
                    transformerMap.set(config.id, config);
                }
            }
            // Save the cleaned-up data in new format
            await this.saveTransformers(transformerMap);
        }

        return transformerMap;
    }

    private isValidTransformer(config: any): boolean {
        return config &&
            typeof config === 'object' &&
            (config.id || config.name) &&
            typeof config.name === 'string' &&
            typeof config.prompt === 'string';
    }

    async saveTransformers(transformers: Map<string, TransformerConfig>): Promise<void> {
        const transformersArray = Array.from(transformers.values());
        await this.context.globalState.update(VSCodeTransformerStorage.STORAGE_KEY, transformersArray);
    }
}