import * as assert from 'assert';
import { AbstractBaseExecuter } from '../transformers/executer/baseExecuter';
import { TransformerConfig } from '../types';

class TestExecuter extends AbstractBaseExecuter {}

suite('Executer Test Suite', () => {
  let executer: TestExecuter;

  setup(() => {
    executer = new TestExecuter();
  });

  test('should handle wildcard in output filename', () => {
    const config: TransformerConfig = {
      id: 'test-transformer',
      name: 'Test Transformer',
      description: 'Test description',
      prompt: 'Test prompt',
      input: [],
      outputFolder: 'output/',
      outputFileName: '*_out.md',
      temperature: 0.7,
      maxTokens: 1000,
      preserveStructure: true,
      processFormat: 'eachFile'
    };
    const inputPath = '/path/to/input/abc.txt';
    
    const result = executer.getOutputFileName(config, inputPath);
    assert.strictEqual(result, 'abc_out.md');
  });

  test('should fallback to default filename when no wildcard', () => {
    const config: TransformerConfig = {
      id: 'test-transformer',
      name: 'Test Transformer',
      description: 'Test description',
      prompt: 'Test prompt',
      input: [],
      outputFolder: 'output/',
      outputFileName: 'output.txt',
      temperature: 0.7,
      maxTokens: 1000,
      preserveStructure: true,
      processFormat: 'eachFile'
    };
    const inputPath = '/path/to/input/abc.txt';
    
    const result = executer.getOutputFileName(config, inputPath);
    assert.strictEqual(result, 'output.txt');
  });

  test('should handle empty outputFileName', () => {
    const config: TransformerConfig = {
      id: 'test-transformer',
      name: 'Test Transformer',
      description: 'Test description',
      prompt: 'Test prompt',
      input: [],
      outputFolder: 'output/',
      outputFileName: '',
      temperature: 0.7,
      maxTokens: 1000,
      preserveStructure: true,
      processFormat: 'eachFile'
    };
    const inputPath = '/path/to/input/abc.txt';
    
    const result = executer.getOutputFileName(config, inputPath);
    assert.strictEqual(result, 'abc.txt');
  });

  test('should handle undefined outputFileName', () => {
    const config: TransformerConfig = {
      id: 'test-transformer',
      name: 'Test Transformer',
      description: 'Test description',
      prompt: 'Test prompt',
      input: [],
      outputFolder: 'output/',
      outputFileName: null,
      temperature: 0.7,
      maxTokens: 1000,
      preserveStructure: true,
      processFormat: 'eachFile'
    };
    const inputPath = '/path/to/input/abc.txt';
    
    const result = executer.getOutputFileName(config, inputPath);
    assert.strictEqual(result, 'abc.txt');
  });
});
