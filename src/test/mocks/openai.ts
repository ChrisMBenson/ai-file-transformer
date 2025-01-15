import * as sinon from 'sinon';

export function createOpenAIMock(sandbox: sinon.SinonSandbox) {
    return {
        chat: {
            completions: {
                create: sandbox.stub().callsFake((params) => {
                    if (!params || typeof params !== 'object') {
                        throw new Error('Invalid parameters');
                    }
                    
                    // Validate required parameters
                    if (!params.model || typeof params.model !== 'string') {
                        throw new Error('Missing or invalid model parameter');
                    }
                    if (!Array.isArray(params.messages)) {
                        throw new Error('Missing or invalid messages parameter');
                    }
                    if (typeof params.temperature !== 'number') {
                        throw new Error('Missing or invalid temperature parameter');
                    }
                    if (typeof params.max_tokens !== 'number') {
                        throw new Error('Missing or invalid max_tokens parameter');
                    }
                    if (typeof params.top_p !== 'number') {
                        throw new Error('Missing or invalid top_p parameter');
                    }
                    
                    return Promise.resolve({
                        id: 'mock-chat-id',
                        object: 'chat.completion',
                        created: Date.now(),
                        model: 'gpt-4',
                        choices: [{
                            index: 0,
                            message: {
                                role: 'assistant',
                                content: 'Mock response',
                                function_call: undefined
                            },
                            finish_reason: 'stop'
                        }],
                        usage: {
                            prompt_tokens: 10,
                            completion_tokens: 20,
                            total_tokens: 30
                        }
                    });
                })
            }
        }
    };
}

export type OpenAIMock = ReturnType<typeof createOpenAIMock>;
