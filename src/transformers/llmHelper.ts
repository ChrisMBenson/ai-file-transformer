import OpenAI from 'openai';
import { ConfigurationManager } from '../config/configurationManager';

export interface LLMMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface LLMResponse {
    content?: string;
    model: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export class LLMHelper {
    private openai: OpenAI;

    constructor() {
        const apiKey = ConfigurationManager.getAPIKey();
        
        if (!apiKey) {
            throw new Error('OpenAI API key is not configured');
        }

        this.openai = new OpenAI({
            apiKey: apiKey,
            dangerouslyAllowBrowser: true // Only for development purposes
        });
    }

    private toOpenAIMessages(messages: LLMMessage[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
        return messages.map(message => ({
            role: message.role,
            content: message.content
        }));
    }

    private fromOpenAICompletion(completion: OpenAI.Chat.Completions.ChatCompletion): LLMResponse {
        const content = completion.choices[0]?.message?.content || '';
        return {
            content: content,
            model: completion.model,
            usage: completion.usage
        };
    }

    /**
     * Generic method to call chat completion API
     * @param messages Array of chat messages
     * @param model Model to use for completion
     * @param temperature Controls randomness (0 to 2)
     * @param maxTokens Maximum number of tokens to generate
     * @returns The chat completion response
     */
    public async createChatCompletion(
        messages: LLMMessage[],
        model: string = 'gpt-4',
        temperature: number = 0.7,
        maxTokens: number = 1000
    ): Promise<LLMResponse> {
        try {
            const completion = await this.openai.chat.completions.create({
                messages,
                model,
                temperature,
                max_tokens: maxTokens
            });

            return completion;
        } catch (error) {
            if (error instanceof OpenAI.APIError) {
                console.error('OpenAI API Error:', {
                    status: error.status,
                    message: error.message,
                    code: error.code,
                    type: error.type
                });
                throw new Error(`OpenAI API Error: ${error.message}`);
            } else {
                console.error('Unexpected error:', error);
                throw new Error('An unexpected error occurred');
            }
        }
    }

    /**
     * Stream chat completions for real-time responses
     * @param messages Array of chat messages
     * @param model Model to use for completion
     * @param temperature Controls randomness (0 to 2)
     * @param maxTokens Maximum number of tokens to generate
     * @returns Async generator for streaming responses
     */
    public async *streamChatCompletion(
        messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        model: string = 'gpt-4',
        temperature: number = 0.7,
        maxTokens: number = 1000
    ): AsyncGenerator<string, void, unknown> {
        try {
            const stream = await this.openai.chat.completions.create({
                messages,
                model,
                temperature,
                max_tokens: maxTokens,
                stream: true
            });

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                yield content;
            }
        } catch (error) {
            if (error instanceof OpenAI.APIError) {
                console.error('OpenAI API Error:', {
                    status: error.status,
                    message: error.message,
                    code: error.code,
                    type: error.type
                });
                throw new Error(`OpenAI API Error: ${error.message}`);
            } else {
                console.error('Unexpected error:', error);
                throw new Error('An unexpected error occurred');
            }
        }
    }
}