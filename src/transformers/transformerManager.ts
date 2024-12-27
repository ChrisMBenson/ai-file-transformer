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
        this.loadTransformers();
    }

    /**
     * Load transformers from storage
     * @private
     */
    private async loadTransformers(): Promise<void> {
        this.transformers = await this.storage.loadTransformers();
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
        if (this.transformers.has(config.name)) {
            throw new TransformerExistsError(config.name);
        }
        this.validateTransformerConfig(config);
        this.transformers.set(config.name, config);
        await this.saveTransformers();
    }

    /**
     * Update an existing transformer configuration
     * @param config Transformer configuration
     * @throws {TransformerNotFoundError} If the transformer doesn't exist
     * @throws {TransformerValidationError} If the configuration is invalid
     */
    async updateTransformer(config: TransformerConfig): Promise<void> {
        if (!this.transformers.has(config.name)) {
            throw new TransformerNotFoundError(config.name);
        }
        this.validateTransformerConfig(config);
        this.transformers.set(config.name, config);
        await this.saveTransformers();
    }

    /**
     * Delete a transformer configuration
     * @param name Name of the transformer to delete
     * @throws {TransformerNotFoundError} If the transformer doesn't exist
     */
    async deleteTransformer(name: string): Promise<void> {
        if (!this.transformers.has(name)) {
            throw new TransformerNotFoundError(name);
        }
        this.transformers.delete(name);
        await this.saveTransformers();
    }

    /**
     * Get a transformer configuration by name
     * @param name Name of the transformer
     * @returns Transformer configuration or undefined if not found
     */
    getTransformer(name: string): TransformerConfig | undefined {
        return this.transformers.get(name);
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
        if (!config.prompt || typeof config.prompt !== 'string') {
            throw new TransformerValidationError('Transformer prompt is required');
        }
        // Add more validation rules as needed
    }
}
