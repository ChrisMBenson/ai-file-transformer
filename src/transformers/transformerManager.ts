import { ITransformerStorage, VSCodeTransformerStorage } from '../types/storage';
import { TransformerConfig } from '../types';
import { executeTransformers, stopExecution } from '../execution/executionEngine';
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
        try {
            const stored = await this.storage.loadTransformers();
            if (stored.size > 0) {
                // Load from storage if available
                this.transformers = new Map(stored);
            } else {
                if (!process.env.TEST) {
                    // Load from filesystem
                    const fs = require('fs');
                    const path = require('path');

                    const transformerLibraryPath = path.join(this.storage.getBasePath(), 'media/transformerLibrary/transformerLibrary.json');
                    const transformerLibraryData = fs.readFileSync(transformerLibraryPath, 'utf-8');
                    const transformerLibrary = JSON.parse(transformerLibraryData);

                    for (const transformer of transformerLibrary.transformers) {
                        const configPath = path.join(this.storage.getBasePath(), `media/transformerLibrary/${transformer.folder}/_config.json`);
                        const configData = fs.readFileSync(configPath, 'utf-8');
                        const config = JSON.parse(configData) as TransformerConfig;
                        this.transformers.set(config.id, config);
                    }

                    await this.saveTransformers();
                }
            }

            console.log('Loaded transformers:', Array.from(this.transformers.values()));
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error loading transformers:', error.stack || error.message);
                throw error;
            } else {
                console.error('Unknown error loading transformers:', error);
                throw new Error('Unknown error occurred while loading transformers');
            }
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
    public async createTransformer(config: TransformerConfig): Promise<void> {
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

        // Extract placeholders from prompt
        const placeholderRegex = /\{\{([^}]+)\}\}/g;
        const placeholders = new Set<string>();
        let match;
        while ((match = placeholderRegex.exec(config.prompt)) !== null) {
            placeholders.add(match[1]);
        }

        // Update input configuration based on placeholders
        const newInput = [];
        for (const placeholder of placeholders) {
            // Find existing input with matching name
            const existingInput = config.input.find(input => input.name === placeholder);
            
            // Create new input if it doesn't exist
            newInput.push(existingInput || {
                name: placeholder,
                description: `Input for ${placeholder}`,
                required: true,
                type: 'string', // Default type
                value: '' // Default empty value
            });
        }

        // Remove any inputs that don't have corresponding placeholders
        config.input = newInput.filter(input => placeholders.has(input.name));
        
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

    private currentExecution: { cancel: () => void } | null = null;

    /**
     * Execute a transformer configuration
     * @param config Transformer configuration to execute
     * @throws {TransformerError} If execution fails
     */
    public async executeTransformer(config: TransformerConfig): Promise<void> {
        try {
            // Validate config before execution
            this.validateTransformerConfig(config);
            
            // Execute the transformers
            await executeTransformers(config);
        } catch (error) {
            if (error instanceof Error) {
                throw new TransformerError(`Transformer execution failed: ${error.message}`);
            }
            throw new TransformerError('Unknown error occurred during transformer execution');
        }
    }

    /**
     * Stop current transformer execution
     */
    public async stopExecution(): Promise<void> {
        stopExecution();
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
     * @param config Transformer configuration to validate
     * @throws {TransformerValidationError} If the configuration is invalid
     */
    public validateTransformerConfig(config: TransformerConfig): void {
        // Basic required fields
        if (!config.id || typeof config.id !== 'string') {
            throw new TransformerValidationError('Transformer ID is required');
        }
        if (!config.name || typeof config.name !== 'string') {
            throw new TransformerValidationError('Transformer name is required');
        }
        if (!config.description || typeof config.description !== 'string') {
            throw new TransformerValidationError('Transformer description is required');
        }
        if (!config.prompt || typeof config.prompt !== 'string') {
            throw new TransformerValidationError('Transformer prompt is required');
        }
        if (!config.prompt.includes('{{content}}')) {
            throw new TransformerValidationError('Transformer prompt must contain {{content}} placeholder');
        }

        // Temperature validation
        if (typeof config.temperature !== 'number' || 
            config.temperature < 0 || 
            config.temperature > 1) {
            throw new TransformerValidationError('Temperature must be a number between 0 and 1');
        }

        // Input configuration validation
        if (!Array.isArray(config.input) || config.input.length === 0) {
            throw new TransformerValidationError('At least one input configuration is required');
        }
        for (const input of config.input) {
            if (!input.name || typeof input.name !== 'string' || input.name.trim() === '') {
                throw new TransformerValidationError('Input name is required and cannot be empty');
            }
            if (!input.description || typeof input.description !== 'string') {
                throw new TransformerValidationError('Input description is required');
            }
            if (typeof input.required !== 'boolean') {
                throw new TransformerValidationError('Input required flag must be a boolean');
            }
        }

    }
}
