import { strict as assert } from 'assert';
import { AbstractBaseExecuter } from '../transformers/executer/baseExecuter';
import { TransformerConfig } from '../types';

// Mock class extending AbstractBaseExecuter for testing
class MockBaseExecuter extends AbstractBaseExecuter {
  constructor() {
    super();
  }

  async sendToLLM(prompt: string): Promise<string> {
    return `Mock response for: ${prompt}`;
  }
}

type MockTransformerConfig = TransformerConfig;

suite('BaseExecuter Test Suite', () => {
  let executer: MockBaseExecuter;

  setup(() => {
    executer = new MockBaseExecuter();
  });

  test('should return correct file browser options', () => {
    const config: MockTransformerConfig = { outputFileExtension: '.txt' } as any;
    const options = executer.getInputFileBrowserOption(config);

    assert.equal(options.canSelectFiles, true);
    assert.equal(options.canSelectFolders, true);
    assert.equal(options.canSelectMany, false);
    assert.equal(options.openLabel, 'Select Input File');
    assert.deepEqual(options.filters, { 'All Files': ['*'] });
  });

  test('should generate correct output file name', () => {
    const config: MockTransformerConfig = { outputFileExtension: '.txt' } as any;
    const inputFilePath = '/path/to/input/file.json';
    const outputFileName = executer.getOutputFileName(config, inputFilePath);

    assert.equal(outputFileName, 'file.txt');
  });

  test('should sort input data alphabetically', () => {
    const data = ['banana', 'apple', 'cherry'];
    const sortedData = executer.sortInput(data);

    assert.deepEqual(sortedData, ['apple', 'banana', 'cherry']);
  });

  test('should preprocess input data by trimming whitespace', () => {
    const data = '   some input data   ';
    const preprocessedData = executer.preProcessInput(data);

    assert.equal(preprocessedData, 'some input data');
  });

  test('should generate correct user message', () => {
    const config: MockTransformerConfig = { prompt: 'Prefix: {{content}}' } as any;
    const data = 'sample input';
    const message = executer.generateUserMessage(config, data);

    assert.equal(message, 'Prefix: sample input');
  });

  test('should validate output data', () => {
    const config: MockTransformerConfig = {} as any;
    const isValid = executer.validateOutput(config, 'output data');

    assert.equal(isValid, true);
  });

});

