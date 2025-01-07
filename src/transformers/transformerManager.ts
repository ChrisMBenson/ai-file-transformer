import { ITransformerStorage, VSCodeTransformerStorage } from '../types/storage';
import { TransformerConfig } from '../types';
import {
    TransformerError,
    TransformerNotFoundError,
    TransformerExistsError,
    TransformerValidationError
} from '../types/errors';

/**
 * Manages transformer configurations and operations
 */
export class TransformerManager {
    private storage: ITransformerStorage;
    private transformers: Map<string, TransformerConfig>;

    /**
     * Creates a new TransformerManager instance
     * @param storage Storage implementation for transformer configurations
     */
    constructor(storage: ITransformerStorage) {
        this.storage = storage;
        this.transformers = new Map();
    }

    /**
     * Load transformers from storage
     * @private
     */
    public async loadTransformers(): Promise<void> {
        const fs = require('fs');
        const path = require('path');

        const transformerListPath = path.resolve(__dirname, '../src/transformerList/transformerList.json');
        const transformerListData = fs.readFileSync(transformerListPath, 'utf-8');
        const transformerList = JSON.parse(transformerListData);

        for (const transformer of transformerList.transformers) {
            const configPath = path.resolve(__dirname, `../src/transformerList/${transformer.folder}/_config.json`);
            const configData = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configData) as TransformerConfig;
            this.transformers.set(config.id, config);
        }

        await this.saveTransformers();
    }

    /**
     * Save transformers to storage
     * @private
     */
    private async saveTransformers(): Promise<void> {
        await this.storage.saveTransformers(this.transformers);
    }

    /**
     * Create a new transformer configuration
     * @param config Transformer configuration
     * @throws {TransformerExistsError} If a transformer with the same name already exists
     * @throws {TransformerValidationError} If the configuration is invalid
     */
    async createTransformer(config: TransformerConfig): Promise<void> {
        if (this.transformers.has(config.id)) {
            throw new TransformerExistsError(config.name);
        }
        this.validateTransformerConfig(config);
        this.transformers.set(config.id, config);
        await this.saveTransformers();
    }

    /**
     * Update an existing transformer configuration
     * @param config Transformer configuration
     * @throws {TransformerNotFoundError} If the transformer doesn't exist
     * @throws {TransformerValidationError} If the configuration is invalid
     */
    async updateTransformer(config: TransformerConfig): Promise<void> {
        // Validate ID exists and is a string
        if (!config.id || typeof config.id !== 'string') {
            throw new TransformerValidationError('Transformer ID is required and must be a string');
        }

        // Check if transformer exists
        if (!this.transformers.has(config.id)) {
            throw new TransformerNotFoundError(config.id);
        }
        
        // Validate the rest of the config
        this.validateTransformerConfig(config);
        
        // Update the transformer
        console.log('Updating transformer:', config);
        this.transformers.set(config.id, config);
        console.log('Current transformers:', Array.from(this.transformers.values()));
        await this.saveTransformers();
    }

    /**
     * Delete a transformer configuration
     * @param id ID of the transformer to delete
     * @throws {TransformerNotFoundError} If the transformer doesn't exist
     */
    async deleteTransformer(id: string): Promise<void> {
        if (!this.transformers.has(id)) {
            const config = Array.from(this.transformers.values()).find(t => t.name === id);
            if (!config) {
                throw new TransformerNotFoundError(id);
            }
            id = config.id;
        }
        this.transformers.delete(id);
        await this.saveTransformers();
    }

    /**
     * Get a transformer configuration by ID or name
     * @param id ID or name of the transformer
     * @returns Transformer configuration or undefined if not found
     */
    getTransformer(id: string): TransformerConfig | undefined {
        let config = this.transformers.get(id);
        if (!config) {
            // Fallback to name lookup for backward compatibility
            config = Array.from(this.transformers.values()).find(t => t.name === id);
        }
        return config;
    }

    /**
     * Get all transformer configurations
     * @returns Array of transformer configurations
     */
    getAllTransformers(): TransformerConfig[] {
        return Array.from(this.transformers.values());
    }

    /**
     * Validate transformer configuration
     * @private
     * @param config Transformer configuration to validate
     * @throws {TransformerValidationError} If the configuration is invalid
     */
    private validateTransformerConfig(config: TransformerConfig): void {
        if (!config.name || typeof config.name !== 'string') {
            throw new TransformerValidationError('Transformer name is required');
        }
        // if (!config.prompt || typeof config.prompt !== 'string') {
        //     throw new TransformerValidationError('Transformer prompt is required');
        // }
        // Add more validation rules as needed
    }
}
