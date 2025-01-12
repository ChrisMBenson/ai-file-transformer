import * as assert from 'assert';
import * as sinon from 'sinon';
import * as mockVSCode from '../test/mocks/vscode';
import { createOpenAIMock, OpenAIMock } from '../test/mocks/openai';
import { LLMClient, LLMMessage, OpenAIClient } from '../transformers/llmFactory';
import { ConfigurationManager, AIProvider } from '../config/configurationManager';
import OpenAI from 'openai';

suite('LLMFactory Tests', () => {
    let llmClient: LLMClient;
    let openaiStub: OpenAIMock;
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        // Mock VSCode output channels
        mockVSCode.window.createOutputChannel = () => ({
            show: () => {},
            appendLine: () => {},
            clear: () => {}
        });

        // Create mock OpenAI instance
        openaiStub = createOpenAIMock(sandbox);
        
        // Create mock OpenAI instance and inject it
        openaiStub = createOpenAIMock(sandbox);
        
        // Mock configuration
        sandbox.stub(ConfigurationManager, 'getAPIKey').returns('test-api-key');
        sandbox.stub(ConfigurationManager, 'getModelName').returns('gpt-4');
        sandbox.stub(ConfigurationManager, 'getAIProvider').returns(AIProvider.OpenAI);
        
        // Initialize client with mock OpenAI instance
        llmClient = new LLMClient();
        // Replace the internal OpenAI client with our mock
        const openaiClient = (llmClient as any).client as OpenAIClient;
        (openaiClient as any).openai = openaiStub;
    });

    teardown(() => {
        sandbox.restore();
    });


    test('should throw error for unsupported provider', () => {
        // Restore any existing stub first
        if ((ConfigurationManager.getAIProvider as sinon.SinonStub).restore) {
            (ConfigurationManager.getAIProvider as sinon.SinonStub).restore();
        }
        sandbox.stub(ConfigurationManager, 'getAIProvider').returns('InvalidProvider' as AIProvider);
        assert.throws(
            () => new LLMClient(), 
            { 
                message: 'Unsupported provider: InvalidProvider',
                name: 'Error'
            }
        );
    });

    test('should send request with string prompt', async () => {
        const response = await llmClient.sendRequest('Test prompt');
        assert.equal(response, 'Mock response');
        sinon.assert.calledOnce(openaiStub.chat.completions.create);
    });

    test('should send request with message array', async () => {
        const messages: LLMMessage[] = [
            { role: 'user' as const, content: 'Test message' }
        ];
        const response = await llmClient.sendRequest(messages);
        assert.equal(response, 'Mock response');
        sinon.assert.calledOnce(openaiStub.chat.completions.create);
    });

    test('should handle OpenAI API errors', async () => {
        openaiStub.chat.completions.create.rejects(new Error('OpenAI API Error: Test Error'));
        await assert.rejects(
            llmClient.sendRequest('Test prompt'), 
            /OpenAI API Error/
        );
        sinon.assert.calledOnce(openaiStub.chat.completions.create);
    });

    test('should handle empty response from OpenAI', async () => {
        openaiStub.chat.completions.create.resolves({
            choices: [{
                message: {
                    content: ''
                }
            }]
        });
        const response = await llmClient.sendRequest('Test prompt');
        assert.equal(response, '');
        sinon.assert.calledOnce(openaiStub.chat.completions.create);
    });
});
