import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as mockVSCode from '../test/mocks/vscode';
import { executeTransformers } from '../execution/executionEngine';
import { DefaultExecuter } from '../transformers/executer/defaultExecuter';
import { TransformerConfig } from '../types';
import { logOutputChannel } from '../extension';

suite('executeTransformers', () => {
  let sandbox: sinon.SinonSandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
  });

  teardown(() => {
    sandbox.restore();
  });
  const validConfig: TransformerConfig = {
    id: 'test-transformer',
    name: 'Test Transformer',
    description: 'Test transformer description',
    prompt: 'Test prompt',
    input: [{
      name: 'input1',
      description: 'Test input',
      type: 'file',
      required: true,
      value: '/valid/path/to/file.txt'
    }],
    outputFolder: '/valid/output/folder',
    outputFileName: null,
    outputFileExtension: null,
    temperature: 0.7,
    maxTokens: 1000,
    preserveStructure: false,
    processFormat: 'eachFile',
  };

  suite('with valid configuration', () => {
    test('should execute transformer successfully', async () => {
      // Arrange
      const mockExecuter = {
        execute: () => Promise.resolve(['/output/file1.txt']),
        getInputFileBrowserOption: () => ({}),
        getOutputFileName: () => null,
        getOutputFileExtension: () => null,
        validateInput: () => true,
        getInputFileFilter: () => ({}),
        getOutputFileFilter: () => ({}),
        getInputFileOptions: () => ({}),
        getOutputFileOptions: () => ({}),
        getInputFilePrompt: () => '',
        getOutputFilePrompt: () => '',
        getInputFileDefaultPath: () => '',
        getOutputFileDefaultPath: () => ''
      } as unknown as DefaultExecuter;
      
      const mockLogChannel = {
        info: (message: string) => {},
        error: (message: string) => {},
        warn: (message: string) => {},
        show: () => {}
      };

      //sandbox.replace(vscode, 'workspace', mockVSCode.workspace);
      //sandbox.replace(vscode, 'window', mockVSCode.window);
      sandbox.stub(require('../extension'), 'logOutputChannel').returns(mockLogChannel);
      sandbox.stub(require('fs'), 'existsSync').returns(true);
      sandbox.stub(require('fs'), 'statSync').returns({ 
        isFile: () => true, 
        isDirectory: () => true 
      });

      // Act
      await executeTransformers(validConfig);

      // Assert
      assert.ok(mockExecuter.execute);
    });
  });

  suite('with invalid configuration', () => {
    test('should throw error for missing input', async () => {
      // Arrange
      const invalidConfig = { ...validConfig, input: [] };

      // Act & Assert
      await assert.rejects(
        () => executeTransformers(invalidConfig),
        (error: Error) => {
          assert.strictEqual(error.message.includes('At least one valid input is required'), true);
          return true;
        }
      );
    });

    test('should throw error for invalid input path', async () => {
      // Arrange
      const invalidConfig = { 
        ...validConfig, 
        input: [{
          name: 'input1',
          description: 'Test input',
          type: 'file',
          required: true,
          value: '/invalid/path'
        }]
      };
      sandbox.stub(require('fs'), 'existsSync').returns(false);

      // Act & Assert
      await assert.rejects(
        () => executeTransformers(invalidConfig),
        (error: Error) => {
          assert.strictEqual(error.message.includes('path does not exist or is invalid'), true);
          return true;
        }
      );
    });
  });
});
