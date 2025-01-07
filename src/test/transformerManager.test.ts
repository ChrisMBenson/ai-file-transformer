import type { TransformerConfig } from '../types';
import type { ITransformerStorage } from '../types/storage';
import type { TransformerManager as TransformerManagerType } from '../transformers/transformerManager';

const { TransformerManager } = require('../transformers/transformerManager');
const chai = require('chai');
const expect = chai.expect;
const { TransformerExistsError, TransformerNotFoundError, TransformerValidationError } = require('../types/errors');

// Mock storage implementation
class MockStorage implements ITransformerStorage {
    private transformers: Map<string, TransformerConfig> = new Map();

    async saveTransformers(transformers: Map<string, TransformerConfig>): Promise<void> {
        this.transformers = new Map(transformers);
    }

    async loadTransformers(): Promise<Map<string, TransformerConfig>> {
        return new Map(this.transformers);
    }
}

describe('TransformerManager', () => {
    let manager: TransformerManagerType;
    let storage: MockStorage;

    beforeEach(() => {
        storage = new MockStorage();
        manager = new TransformerManager(storage);
        // Initialize with test data
        manager['transformers'] = new Map();
    });

    describe('Transformer Creation', () => {
        const validConfig: TransformerConfig = {
            id: 'test-transformer',
            name: 'Test Transformer',
            description: 'A test transformer',
            prompt: 'Test prompt',
            input: [{
                name: 'test-input',
                description: 'Test input',
                required: true
            }],
            output: ['output.txt'],
            configs: [],
            prompts: [],
            aiConfigs: [],
            inputFiles: ['*.txt'],
            outputFolder: './output',
            aiModel: 'gpt-4',
            temperature: 0.7,
            preserveStructure: true,
            namingConvention: 'original'
        };

        it('should create a new transformer with valid configuration', async () => {
            await manager.createTransformer(validConfig);
            const saved = manager.getTransformer(validConfig.id);
            expect(saved).to.deep.equal(validConfig);
        });

        it('should prevent creation of duplicate transformers by ID', async () => {
            await manager.createTransformer(validConfig);
            try {
                await manager.createTransformer(validConfig);
                expect.fail('Should have thrown TransformerExistsError');
            } catch (error) {
                expect(error).to.be.instanceOf(TransformerExistsError);
            }
        });

        it('should prevent creation of transformer without required fields', async () => {
            const invalidConfig = { ...validConfig, name: '' };
            try {
                await manager.createTransformer(invalidConfig);
                expect.fail('Should have thrown TransformerValidationError');
            } catch (error) {
                expect(error).to.be.instanceOf(TransformerValidationError);
            }
        });
    });

    describe('Transformer Retrieval', () => {
        const transformer1: TransformerConfig = {
            id: 'transformer-1',
            name: 'First Transformer',
            description: 'First test transformer',
            prompt: 'First test prompt',
            input: [{
                name: 'test-input-1',
                description: 'Test input 1',
                required: true
            }],
            output: ['output1.txt'],
            configs: [],
            prompts: [],
            aiConfigs: [],
            inputFiles: ['*.txt'],
            outputFolder: './output1',
            aiModel: 'gpt-4',
            temperature: 0.7,
            preserveStructure: true,
            namingConvention: 'original'
        };

        const transformer2: TransformerConfig = {
            id: 'transformer-2',
            name: 'Second Transformer',
            description: 'Second test transformer',
            prompt: 'Second test prompt',
            input: [{
                name: 'test-input-2',
                description: 'Test input 2',
                required: true
            }],
            output: ['output2.txt'],
            configs: [],
            prompts: [],
            aiConfigs: [],
            inputFiles: ['*.json'],
            outputFolder: './output2',
            aiModel: 'gpt-4',
            temperature: 0.7,
            preserveStructure: true,
            namingConvention: 'original'
        };

        beforeEach(async () => {
            await manager.createTransformer(transformer1);
            await manager.createTransformer(transformer2);
        });

        it('should retrieve transformer by ID', () => {
            const result = manager.getTransformer(transformer1.id);
            expect(result).to.deep.equal(transformer1);
        });

        it('should retrieve transformer by name', () => {
            const result = manager.getTransformer(transformer1.name);
            expect(result).to.deep.equal(transformer1);
        });

        it('should return undefined for non-existent transformer', () => {
            const result = manager.getTransformer('non-existent');
            expect(result).to.be.undefined;
        });

        it('should list all transformers', () => {
            const allTransformers = manager.getAllTransformers();
            expect(allTransformers).to.have.lengthOf(2);
            expect(allTransformers).to.deep.include.members([transformer1, transformer2]);
        });
    });

    describe('Transformer Updates', () => {
        const originalConfig: TransformerConfig = {
            id: 'update-test',
            name: 'Update Test',
            description: 'Original description',
            prompt: 'Update test prompt',
            input: [{
                name: 'test-input',
                description: 'Test input',
                required: true
            }],
            output: ['output.txt'],
            configs: [],
            prompts: [],
            aiConfigs: [],
            inputFiles: ['*.txt'],
            outputFolder: './output',
            aiModel: 'gpt-4',
            temperature: 0.7,
            preserveStructure: true,
            namingConvention: 'original'
        };

        beforeEach(async () => {
            await manager.createTransformer(originalConfig);
        });

        it('should update existing transformer', async () => {
            const updatedConfig = {
                ...originalConfig,
                description: 'Updated description',
                inputFiles: ['*.json']
            };

            await manager.updateTransformer(updatedConfig);
            const result = manager.getTransformer(updatedConfig.id);
            expect(result).to.deep.equal(updatedConfig);
        });

        it('should prevent updates to non-existent transformer', async () => {
            const nonExistentConfig = {
                ...originalConfig,
                id: 'non-existent'
            };

            try {
                await manager.updateTransformer(nonExistentConfig);
                expect.fail('Should have thrown TransformerNotFoundError');
            } catch (error) {
                expect(error).to.be.instanceOf(TransformerNotFoundError);
            }
        });

        it('should validate updated configuration', async () => {
            const invalidConfig = {
                ...originalConfig,
                name: ''  // Name is required
            };

            try {
                await manager.updateTransformer(invalidConfig);
                expect.fail('Should have thrown TransformerValidationError');
            } catch (error) {
                expect(error).to.be.instanceOf(TransformerValidationError);
            }
        });
    });

    describe('Transformer Deletion', () => {
        const transformer: TransformerConfig = {
            id: 'delete-test',
            name: 'Delete Test',
            description: 'Test transformer for deletion',
            prompt: 'Delete test prompt',
            input: [{
                name: 'test-input',
                description: 'Test input',
                required: true
            }],
            output: ['output.txt'],
            configs: [],
            prompts: [],
            aiConfigs: [],
            inputFiles: ['*.txt'],
            outputFolder: './output',
            aiModel: 'gpt-4',
            temperature: 0.7,
            preserveStructure: true,
            namingConvention: 'original'
        };

        beforeEach(async () => {
            await manager.createTransformer(transformer);
        });

        it('should delete existing transformer by ID', async () => {
            await manager.deleteTransformer(transformer.id);
            expect(manager.getTransformer(transformer.id)).to.be.undefined;
        });

        it('should delete existing transformer by name', async () => {
            await manager.deleteTransformer(transformer.name);
            expect(manager.getTransformer(transformer.name)).to.be.undefined;
        });

        it('should throw error when deleting non-existent transformer', async () => {
            try {
                await manager.deleteTransformer('non-existent');
                expect.fail('Should have thrown TransformerNotFoundError');
            } catch (error) {
                expect(error).to.be.instanceOf(TransformerNotFoundError);
            }
        });

        it('should maintain other transformers after deletion', async () => {
            const otherTransformer: TransformerConfig = {
            id: 'other-transformer',
            name: 'Other Transformer',
            description: 'Another test transformer',
            prompt: 'Other test prompt',
            input: [{
                name: 'test-input',
                description: 'Test input',
                required: true
            }],
            output: ['output.txt'],
            configs: [],
            prompts: [],
            aiConfigs: [],
            inputFiles: ['*.json'],
            outputFolder: './other-output',
            aiModel: 'gpt-4',
            temperature: 0.7,
            preserveStructure: true,
            namingConvention: 'original'
            };

            await manager.createTransformer(otherTransformer);
            await manager.deleteTransformer(transformer.id);

            expect(manager.getTransformer(otherTransformer.id)).to.deep.equal(otherTransformer);
            expect(manager.getAllTransformers()).to.have.lengthOf(1);
        });
    });

    describe('Storage Integration', () => {
        const transformer: TransformerConfig = {
            id: 'storage-test',
            name: 'Storage Test',
            description: 'Test transformer for storage',
            prompt: 'Storage test prompt',
            input: [{
                name: 'test-input',
                description: 'Test input',
                required: true
            }],
            output: ['output.txt'],
            configs: [],
            prompts: [],
            aiConfigs: [],
            inputFiles: ['*.txt'],
            outputFolder: './output',
            aiModel: 'gpt-4',
            temperature: 0.7,
            preserveStructure: true,
            namingConvention: 'original'
        };

        it('should save transformer to storage on creation', async () => {
            await manager.createTransformer(transformer);
            const saved = await storage.loadTransformers();
            expect(saved.get(transformer.id)).to.deep.equal(transformer);
        });

        it('should save updated transformer to storage', async () => {
            await manager.createTransformer(transformer);
            const updatedConfig = {
                ...transformer,
                description: 'Updated description'
            };
            await manager.updateTransformer(updatedConfig);
            
            const saved = await storage.loadTransformers();
            expect(saved.get(transformer.id)).to.deep.equal(updatedConfig);
        });

        it('should remove transformer from storage on deletion', async () => {
            await manager.createTransformer(transformer);
            await manager.deleteTransformer(transformer.id);
            
            const saved = await storage.loadTransformers();
            expect(saved.has(transformer.id)).to.be.false;
        });
    });
});
