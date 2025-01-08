import * as assert from 'assert';
import { TransformerManager } from '../transformers/transformerManager';
import { 
  TransformerExistsError,
  TransformerNotFoundError,
  TransformerValidationError
} from '../types/errors';
import type { TransformerConfig } from '../types';
import type { ITransformerStorage } from '../types/storage';

  // Mock storage implementation
  class MockStorage implements ITransformerStorage {
    private transformers = new Map<string, TransformerConfig>();

    constructor() {
      this.clear();
    }

    async saveTransformers(transformers: Map<string, TransformerConfig>): Promise<void> {
      // Clear and repopulate the instance map
      this.transformers.clear();
      transformers.forEach((value, key) => {
        this.transformers.set(key, value);
      });
    }

    async loadTransformers(): Promise<Map<string, TransformerConfig>> {
      // Return a new Map with the current values
      return new Map(this.transformers);
    }

    clear(): void {
      this.transformers.clear();
    }

    getBasePath(): string {
      return '/mock/path';
    }
  }

describe('TransformerManager Behavior Tests', () => {
  let manager: TransformerManager;
  let storage: MockStorage;

  const baseConfig: TransformerConfig = {
    id: 'test-transformer',
    name: 'Test Transformer',
    description: 'Test description',
    prompt: 'Test prompt',
    input: [{
      name: 'test-input',
      description: 'Test input',
      required: true
    }],
    output: 'output.txt',
    aiModel: 'gpt-4',
    temperature: 0.7,
    preserveStructure: true,
    namingConvention: 'original'
  };

  before(() => {
    storage = new MockStorage();
  });

  beforeEach(async () => {
    storage.clear();
    manager = await TransformerManager.create(storage);
  });

  it('should allow creating a new transformer with valid configuration', async () => {
    await manager.createTransformer(baseConfig);
    const result = manager.getTransformer(baseConfig.id);
    assert.deepStrictEqual(result, baseConfig);
  });

  it('should prevent creating duplicate transformers', async () => {
    await manager.createTransformer(baseConfig);
    await assert.rejects(
      () => manager.createTransformer(baseConfig),
      TransformerExistsError
    );
  });

  it('should validate required fields when creating transformer', async () => {
    const invalidConfig = { ...baseConfig, name: '' };
    await assert.rejects(
      () => manager.createTransformer(invalidConfig),
      TransformerValidationError
    );
  });

  it('should retrieve transformer by ID or name', async () => {
    await manager.createTransformer(baseConfig);
    
    const byId = manager.getTransformer(baseConfig.id);
    assert.deepStrictEqual(byId, baseConfig);
    
    const byName = manager.getTransformer(baseConfig.name);
    assert.deepStrictEqual(byName, baseConfig);
  });

  it('should return undefined for non-existent transformer', () => {
    const result = manager.getTransformer('non-existent');
    assert.strictEqual(result, undefined);
  });

  it('should list all available transformers', async () => {
    await manager.createTransformer(baseConfig);
    const secondConfig = { ...baseConfig, id: 'test-2', name: 'Test 2' };
    await manager.createTransformer(secondConfig);

    const all = manager.getAllTransformers();
    assert.strictEqual(all.length, 2);
    assert.deepStrictEqual(all, [baseConfig, secondConfig]);
  });

  it('should update existing transformer configuration', async () => {
    await manager.createTransformer(baseConfig);
    const updatedConfig = { ...baseConfig, description: 'Updated description' };
    
    await manager.updateTransformer(updatedConfig);
    const result = manager.getTransformer(baseConfig.id);
    assert.deepStrictEqual(result, updatedConfig);
  });

  it('should prevent updating non-existent transformer', async () => {
    const nonExistentConfig = { ...baseConfig, id: 'non-existent' };
    await assert.rejects(
      () => manager.updateTransformer(nonExistentConfig),
      TransformerNotFoundError
    );
  });

  it('should validate configuration when updating transformer', async () => {
    await manager.createTransformer(baseConfig);
    const invalidConfig = { ...baseConfig, name: '' };
    
    await assert.rejects(
      () => manager.updateTransformer(invalidConfig),
      TransformerValidationError
    );
  });

  it('should delete transformer by ID or name', async () => {
    await manager.createTransformer(baseConfig);
    
    // Delete by ID
    await manager.deleteTransformer(baseConfig.id);
    assert.strictEqual(manager.getTransformer(baseConfig.id), undefined);
    
    // Recreate and delete by name
    await manager.createTransformer(baseConfig);
    await manager.deleteTransformer(baseConfig.name);
    assert.strictEqual(manager.getTransformer(baseConfig.name), undefined);
  });

  it('should throw error when deleting non-existent transformer', async () => {
    await assert.rejects(
      () => manager.deleteTransformer('non-existent'),
      TransformerNotFoundError
    );
  });

  it('should persist transformers to storage', async () => {
    await manager.createTransformer(baseConfig);
    const saved = await storage.loadTransformers();
    assert.deepStrictEqual(saved.get(baseConfig.id), baseConfig);
  });

  it('should load transformers from storage on initialization', async () => {
    // Create initial manager and save transformer
    const initialManager = await TransformerManager.create(storage);
    await initialManager.createTransformer(baseConfig);
    
    // Create new manager instance with same storage
    const newManager = await TransformerManager.create(storage);
    const result = newManager.getTransformer(baseConfig.id);
    assert.deepStrictEqual(result, baseConfig);
  });

  it('should maintain data integrity after multiple operations', async () => {
    // Create initial transformer
    await manager.createTransformer(baseConfig);
    
    // Update transformer
    const updatedConfig = { ...baseConfig, description: 'Updated' };
    await manager.updateTransformer(updatedConfig);
    
    // Create second transformer
    const secondConfig = { ...baseConfig, id: 'test-2', name: 'Test 2' };
    await manager.createTransformer(secondConfig);
    
    // Delete first transformer
    await manager.deleteTransformer(baseConfig.id);
    
    // Verify final state
    const all = manager.getAllTransformers();
    assert.strictEqual(all.length, 1);
    assert.deepStrictEqual(all[0], secondConfig);
  });

  describe('AI Model Configuration Tests', () => {
    it('should validate AI model configuration', async () => {
      const invalidConfig = { ...baseConfig, aiModel: 'invalid-model' };
      await assert.rejects(
        () => manager.createTransformer(invalidConfig),
        TransformerValidationError
      );
    });

    it('should validate temperature range', async () => {
      const highTemp = { ...baseConfig, temperature: 2.0 };
      const lowTemp = { ...baseConfig, temperature: -1.0 };
      
      await assert.rejects(
        () => manager.createTransformer(highTemp),
        TransformerValidationError
      );
      await assert.rejects(
        () => manager.createTransformer(lowTemp),
        TransformerValidationError
      );
    });

    it('should accept valid temperature values', async () => {
      const validConfig = { ...baseConfig, temperature: 0.5 };
      await manager.createTransformer(validConfig);
      const result = manager.getTransformer(validConfig.id);
      assert.ok(result);
      assert.strictEqual(result!.temperature, 0.5);
    });
  });

  describe('File Handling Tests', () => {
    it('should validate naming convention', async () => {
      const invalidConfig = { ...baseConfig, namingConvention: 'invalid' };
      await assert.rejects(
        () => manager.createTransformer(invalidConfig),
        TransformerValidationError
      );
    });
  });

  describe('Additional Validation Tests', () => {
    it('should validate prompt content', async () => {
      const invalidConfig = { ...baseConfig, prompt: '' };
      await assert.rejects(
        () => manager.createTransformer(invalidConfig),
        TransformerValidationError
      );
    });

    it('should validate input/output configuration', async () => {
      const invalidInput = { ...baseConfig, input: [] };
      const invalidOutput = { ...baseConfig, output: '' };
      
      await assert.rejects(
        () => manager.createTransformer(invalidInput),
        TransformerValidationError
      );
      await assert.rejects(
        () => manager.createTransformer(invalidOutput),
        TransformerValidationError
      );
    });

    it('should validate AI configs', async () => {
      // Test invalid model
      const invalidModel = { 
        ...baseConfig, 
        aiModel: 'invalid-model'
      };
      await assert.rejects(
        () => manager.createTransformer(invalidModel),
        TransformerValidationError
      );

      // Test invalid temperature
      const invalidTemp = { 
        ...baseConfig, 
        temperature: 2.0
      };
      await assert.rejects(
        () => manager.createTransformer(invalidTemp),
        TransformerValidationError
      );

      // Test valid config
      const validConfig = { 
        ...baseConfig, 
        aiModel: 'gpt-4',
        temperature: 0.7
      };
      await assert.doesNotReject(
        () => manager.createTransformer(validConfig)
      );
    });

    it('should validate input/output array elements', async () => {
      // Test invalid input array element
      const invalidInput = { 
        ...baseConfig, 
        input: [{
          name: '',
          description: 'Test',
          required: true
        }]
      };
      await assert.rejects(
        () => manager.createTransformer(invalidInput),
        TransformerValidationError
      );

      // Test invalid output array element
      const invalidOutput = { 
        ...baseConfig, 
        output: '' 
      };
      await assert.rejects(
        () => manager.createTransformer(invalidOutput),
        TransformerValidationError
      );
    });
  });
});
