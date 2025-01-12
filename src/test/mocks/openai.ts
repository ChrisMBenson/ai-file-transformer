import * as sinon from 'sinon';

export function createOpenAIMock(sandbox: sinon.SinonSandbox) {
    return {
        chat: {
            completions: {
                create: sandbox.stub().resolves({
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
                })
            }
        }
    };
}

export type OpenAIMock = ReturnType<typeof createOpenAIMock>;
