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
    private constructor(storage: ITransformerStorage) {
        this.storage = storage;
        this.transformers = new Map();
    }

    /**
     * Creates a new TransformerManager instance asynchronously
     * @param storage Storage implementation for transformer configurations
     * @returns Promise that resolves to initialized TransformerManager
     */
    static async create(storage: ITransformerStorage): Promise<TransformerManager> {
        const manager = new TransformerManager(storage);
        await manager.loadTransformers();
        return manager;
    }

    /**
     * Load transformers from storage
     * @private
     */
    public async loadTransformers(): Promise<void> {
        if (process.env.TEST) {
            // In test mode, just load from storage without adding test data
            const stored = await this.storage.loadTransformers();
            this.transformers = new Map(stored);
        } else {
            // Load from filesystem
            const fs = require('fs');
            const path = require('path');

            const transformerListPath = path.join(this.storage.getBasePath(), 'src/transformerList/transformerList.json');
            const transformerListData = fs.readFileSync(transformerListPath, 'utf-8');
            const transformerList = JSON.parse(transformerListData);

            for (const transformer of transformerList.transformers) {
                const configPath = path.join(this.storage.getBasePath(), `src/transformerList/${transformer.folder}/_config.json`);
                const configData = fs.readFileSync(configPath, 'utf-8');
                const config = JSON.parse(configData) as TransformerConfig;
                this.transformers.set(config.id, config);
            }

            await this.saveTransformers();
        }
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
        // Basic required fields
        if (!config.name || typeof config.name !== 'string') {
            throw new TransformerValidationError('Transformer name is required');
        }
        if (!config.prompt || typeof config.prompt !== 'string') {
            throw new TransformerValidationError('Transformer prompt is required');
        }

        // AI Model validation
        const validModels = ['gpt-4', 'gpt-3.5-turbo'];
        if (!validModels.includes(config.aiModel)) {
            throw new TransformerValidationError(`Invalid AI model: ${config.aiModel}`);
        }

        // Temperature validation
        if (typeof config.temperature !== 'number' || 
            config.temperature < 0 || 
            config.temperature > 1) {
            throw new TransformerValidationError('Temperature must be a number between 0 and 1');
        }

        // Input files validation
        if (!Array.isArray(config.inputFiles) || config.inputFiles.length === 0) {
            throw new TransformerValidationError('At least one input file pattern is required');
        }
        const validGlobPattern = /^[^*?{}|\[\]\\\/]+\.[a-zA-Z0-9]+$/;
        for (const pattern of config.inputFiles) {
            if (typeof pattern !== 'string' || !validGlobPattern.test(pattern)) {
                throw new TransformerValidationError(`Invalid input file pattern: ${pattern}`);
            }
        }

        // Output folder validation
        if (typeof config.outputFolder !== 'string' || 
            !config.outputFolder.startsWith('./') || 
            config.outputFolder.includes('..')) {
            throw new TransformerValidationError('Output folder must be a valid relative path');
        }

        // Naming convention validation
        const validNamingConventions = ['original', 'timestamp', 'uuid'];
        if (!validNamingConventions.includes(config.namingConvention)) {
            throw new TransformerValidationError(`Invalid naming convention: ${config.namingConvention}`);
        }

        // Input/output configuration validation
        if (!Array.isArray(config.input) || config.input.length === 0) {
            throw new TransformerValidationError('At least one input configuration is required');
        }
        for (const input of config.input) {
            if (!input.name || typeof input.name !== 'string' || input.name.trim() === '') {
                throw new TransformerValidationError('Input configuration name is required and cannot be empty');
            }
        }
        
        if (!Array.isArray(config.output) || config.output.length === 0) {
            throw new TransformerValidationError('At least one output configuration is required');
        }
        for (const output of config.output) {
            if (typeof output !== 'string' || output.trim() === '') {
                throw new TransformerValidationError('Output configuration cannot be empty');
            }
        }

        // AI configs validation
        if (config.aiConfigs && config.aiConfigs.length > 0) {
            for (const aiConfig of config.aiConfigs) {
                if (!aiConfig.model || !validModels.includes(aiConfig.model)) {
                    throw new TransformerValidationError(`Invalid AI model in config: ${aiConfig.model}`);
                }
                if (typeof aiConfig.temperature !== 'string' || 
                    isNaN(Number(aiConfig.temperature)) || 
                    Number(aiConfig.temperature) < 0 || 
                    Number(aiConfig.temperature) > 1) {
                    throw new TransformerValidationError('AI config temperature must be a string number between 0 and 1');
                }
                if (typeof aiConfig.maxTokens !== 'number' || 
                    aiConfig.maxTokens <= 0) {
                    throw new TransformerValidationError('AI config maxTokens must be a positive number');
                }
            }
        }
    }
}
