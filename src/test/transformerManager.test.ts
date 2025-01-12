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

suite('TransformerManager Behavior Tests', () => {
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
      value: 'Content',
      type: 'input',
      required: true
    }],
    outputFolder: "outputfolder/",
    outputFileName: "output",
    temperature: 0.7,
    maxTokens: 1000,
    preserveStructure: true,
    processFormat: "eachFile",
  };

  suiteSetup(() => {
    process.env.TEST = 'true';
    storage = new MockStorage();
  });

  setup(async () => {
    storage.clear();
    manager = await TransformerManager.create(storage);
  });

  test('should allow creating a new transformer with valid configuration', async () => {
    await manager.createTransformer(baseConfig);
    const result = manager.getTransformer(baseConfig.id);
    assert.deepStrictEqual(result, baseConfig);
  });

  test('should prevent creating duplicate transformers', async () => {
    await manager.createTransformer(baseConfig);
    await assert.rejects(
      () => manager.createTransformer(baseConfig),
      TransformerExistsError
    );
  });

  test('should validate required fields when creating transformer', async () => {
    const invalidConfig = { ...baseConfig, name: '' };
    await assert.rejects(
      () => manager.createTransformer(invalidConfig),
      TransformerValidationError
    );
  });

  test('should retrieve transformer by ID or name', async () => {
    await manager.createTransformer(baseConfig);
    
    const byId = manager.getTransformer(baseConfig.id);
    assert.deepStrictEqual(byId, baseConfig);
    
    const byName = manager.getTransformer(baseConfig.name);
    assert.deepStrictEqual(byName, baseConfig);
  });

  test('should return undefined for non-existent transformer', () => {
    const result = manager.getTransformer('non-existent');
    assert.strictEqual(result, undefined);
  });

  test('should list all available transformers', async () => {
    await manager.createTransformer(baseConfig);
    const secondConfig = { ...baseConfig, id: 'test-2', name: 'Test 2' };
    await manager.createTransformer(secondConfig);

    const all = manager.getAllTransformers();
    assert.strictEqual(all.length, 2);
    assert.deepStrictEqual(all, [baseConfig, secondConfig]);
  });

  test('should update existing transformer configuration', async () => {
    await manager.createTransformer(baseConfig);
    const updatedConfig = { ...baseConfig, description: 'Updated description' };
    
    await manager.updateTransformer(updatedConfig);
    const result = manager.getTransformer(baseConfig.id);
    assert.deepStrictEqual(result, updatedConfig);
  });

  test('should prevent updating non-existent transformer', async () => {
    const nonExistentConfig = { ...baseConfig, id: 'non-existent' };
    await assert.rejects(
      () => manager.updateTransformer(nonExistentConfig),
      TransformerNotFoundError
    );
  });

  test('should validate configuration when updating transformer', async () => {
    await manager.createTransformer(baseConfig);
    const invalidConfig = { ...baseConfig, name: '' };
    
    await assert.rejects(
      () => manager.updateTransformer(invalidConfig),
      TransformerValidationError
    );
  });

  test('should delete transformer by ID or name', async () => {
    await manager.createTransformer(baseConfig);
    
    // Delete by ID
    await manager.deleteTransformer(baseConfig.id);
    assert.strictEqual(manager.getTransformer(baseConfig.id), undefined);
    
    // Recreate and delete by name
    await manager.createTransformer(baseConfig);
    await manager.deleteTransformer(baseConfig.name);
    assert.strictEqual(manager.getTransformer(baseConfig.name), undefined);
  });

  test('should throw error when deleting non-existent transformer', async () => {
    await assert.rejects(
      () => manager.deleteTransformer('non-existent'),
      TransformerNotFoundError
    );
  });

  test('should persist transformers to storage', async () => {
    await manager.createTransformer(baseConfig);
    const saved = await storage.loadTransformers();
    assert.deepStrictEqual(saved.get(baseConfig.id), baseConfig);
  });

  test('should load transformers from storage on initialization', async () => {
    // Create initial manager and save transformer
    const initialManager = await TransformerManager.create(storage);
    await initialManager.createTransformer(baseConfig);
    
    // Create new manager instance with same storage
    const newManager = await TransformerManager.create(storage);
    const result = newManager.getTransformer(baseConfig.id);
    assert.deepStrictEqual(result, baseConfig);
  });

  test('should maintain data integrity after multiple operations', async () => {
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

  suite('AI Model Configuration Tests', () => {

    test('should validate temperature range', async () => {
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

    test('should accept valid temperature values', async () => {
      const validConfig = { ...baseConfig, temperature: 0.5 };
      await manager.createTransformer(validConfig);
      const result = manager.getTransformer(validConfig.id);
      assert.ok(result);
      assert.strictEqual(result!.temperature, 0.5);
    });
  });

  suite('Additional Validation Tests', () => {
    test('should validate prompt content', async () => {
      const invalidConfig = { ...baseConfig, prompt: '' };
      await assert.rejects(
        () => manager.createTransformer(invalidConfig),
        TransformerValidationError
      );
    });

    test('should validate input/output configuration', async () => {
      const invalidInput = { ...baseConfig, input: [] };
      
      await assert.rejects(
        () => manager.createTransformer(invalidInput),
        TransformerValidationError
      );
    });

    test('should validate AI configs', async () => {
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
        aiModel: 'gpt-4o',
        temperature: 0.7
      };
      await assert.doesNotReject(
        () => manager.createTransformer(validConfig)
      );
    });

    test('should validate input/output array elements', async () => {
      // Test invalid input array element
      const invalidInput = { 
        ...baseConfig, 
        input: [{
          name: '',
          description: 'Test',
          type: 'input',
          value: 'Content',
          required: true
        }]
      };
      await assert.rejects(
        () => manager.createTransformer(invalidInput),
        TransformerValidationError
      );

    });
  });
});
