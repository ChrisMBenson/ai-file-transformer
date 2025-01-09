import * as vscode from 'vscode';
import * as assert from 'assert';
import { MockTransformerManager } from './mocks/transformerManager';

suite('Transformer Operations Test Suite', () => {
  let manager: MockTransformerManager;

  setup(() => {
    // Reset state before each test
    manager = new MockTransformerManager();
  });

  test('should view transformer details', async () => {
    // Add a test transformer
    await manager.addTransformer({
      id: 'test-transformer',
      name: 'Test Transformer',
      description: 'Test description',
      prompt: 'Test prompt',
      input: [],
      output: "outputfolder/",
      outputFileExtension: ".txt",
      aiModel: "gpt-4o",
      temperature: 0.7,
      maxTokens: 1000,
      preserveStructure: true,
      processFormat: "eachFile",
      namingConvention: "camelCase",
    });

    // View the transformer
    const transformer = await manager.getTransformer('test-transformer');
    assert.ok(transformer);
    assert.strictEqual(transformer.name, 'Test Transformer');
    assert.strictEqual(transformer.description, 'Test description');
  });

  test('should edit transformer', async () => {
    // Add initial transformer
    await manager.addTransformer({
      id: 'test-transformer',
      name: 'Initial Name',
      description: 'Initial Description',
      prompt: 'Initial Prompt',
      input: [],
      output: "outputfolder/",
      outputFileExtension: ".txt",
      aiModel: "gpt-4o",
      temperature: 0.7,
      maxTokens: 1000,
      preserveStructure: true,
      processFormat: "eachFile",
      namingConvention: "camelCase",
    });

    // Edit the transformer
    await manager.editTransformer('test-transformer', {
      name: 'Updated Name',
      description: 'Updated Description',
      prompt: 'Updated Prompt',
      temperature: 0.8
    });

    // Verify changes
    const transformer = await manager.getTransformer('test-transformer');
    assert.ok(transformer);
    assert.strictEqual(transformer.name, 'Updated Name');
    assert.strictEqual(transformer.description, 'Updated Description');
    assert.strictEqual(transformer.prompt, 'Updated Prompt');
    assert.strictEqual(transformer.temperature, 0.8);
  });

  test('should delete transformer', async () => {
    // Add a transformer to delete
    await manager.addTransformer({
      id: 'test-transformer',
      name: 'Test Transformer',
      description: 'Test description',
      prompt: 'Test prompt',
      input: [],
      output: "outputfolder/",
      outputFileExtension: ".txt",
      aiModel: "gpt-4o",
      temperature: 0.7,
      maxTokens: 1000,
      preserveStructure: true,
      processFormat: "eachFile",
      namingConvention: "camelCase",
    });

    // Delete the transformer
    await manager.deleteTransformer('test-transformer');

    // Verify deletion
    const transformer = await manager.getTransformer('test-transformer');
    assert.strictEqual(transformer, undefined);
  });

  test('should duplicate transformer', async () => {
    // Add original transformer
    await manager.addTransformer({
      id: 'original-transformer',
      name: 'Original Transformer',
      description: 'Original description',
      prompt: 'Original prompt',
      input: [],
      output: "outputfolder/",
      outputFileExtension: ".txt",
      aiModel: "gpt-4o",
      temperature: 0.7,
      maxTokens: 1000,
      preserveStructure: true,
      processFormat: "eachFile",
      namingConvention: "camelCase",
    });

    // Duplicate the transformer
    const newId = await manager.duplicateTransformer('original-transformer');

    // Verify duplication
    const original = await manager.getTransformer('original-transformer');
    const duplicate = await manager.getTransformer(newId);
    
    assert.ok(original);
    assert.ok(duplicate);
    assert.strictEqual(duplicate.name, 'Original Transformer (Copy)');
    assert.strictEqual(duplicate.description, 'Original description');
    assert.strictEqual(duplicate.prompt, 'Original prompt');
    assert.strictEqual(duplicate.aiModel, 'gpt-4o');
    assert.strictEqual(duplicate.temperature, 0.7);
    assert.notStrictEqual(original.id, duplicate.id);
    assert.strictEqual(duplicate.preserveStructure, true);
    assert.strictEqual(duplicate.namingConvention, 'camelCase');
  });
});
