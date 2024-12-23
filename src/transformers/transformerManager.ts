// src/transformers/transformerManager.ts
import * as vscode from 'vscode';
import { TransformerConfig } from '../types';

export class TransformerManager {
    private static readonly STORAGE_KEY = 'transformers';
    private context: vscode.ExtensionContext;
    private transformers: Map<string, TransformerConfig>;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.transformers = new Map();
        this.loadTransformers();
    }

    private loadTransformers(): void {
        const storedTransformers = this.context.globalState.get<{ [key: string]: TransformerConfig }>(TransformerManager.STORAGE_KEY) || {};
        this.transformers = new Map(Object.entries(storedTransformers));
    }

    private async saveTransformers(): Promise<void> {
        const transformersObj = Object.fromEntries(this.transformers);
        await this.context.globalState.update(TransformerManager.STORAGE_KEY, transformersObj);
    }

    async createTransformer(config: TransformerConfig): Promise<void> {
        if (this.transformers.has(config.name)) {
            throw new Error(`Transformer with name "${config.name}" already exists`);
        }
        this.transformers.set(config.name, config);
        await this.saveTransformers();
    }

    async updateTransformer(config: TransformerConfig): Promise<void> {
        if (!this.transformers.has(config.name)) {
            throw new Error(`Transformer with name "${config.name}" not found`);
        }
        this.transformers.set(config.name, config);
        await this.saveTransformers();
    }

    async deleteTransformer(name: string): Promise<void> {
        if (!this.transformers.has(name)) {
            throw new Error(`Transformer with name "${name}" not found`);
        }
        this.transformers.delete(name);
        await this.saveTransformers();
    }

    getTransformer(name: string): TransformerConfig | undefined {
        return this.transformers.get(name);
    }

    getAllTransformers(): TransformerConfig[] {
        return Array.from(this.transformers.values());
    }
}
