import OpenAI from 'openai';
import { ConfigurationManager, AIProvider } from '../config/configurationManager';
import fs from 'fs';
import path from 'path';

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

abstract class LLMBase {
    protected model: string;

    constructor(model: string) {
        this.model = model;
    }

    abstract sendRequest(promptOrMessages: LLMMessage[] | string, options?: any): Promise<string>;

    protected static getTimestamp(): { date: string; time: string } {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        return { date, time };
    }

    protected static ensureDirectoryExists(directory: string): void {
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }
    }
}

class OpenAIClient extends LLMBase {
    private openai: OpenAI;

    constructor(apiKey: string, model: string = 'gpt-4') {
        super(model);
        if (!apiKey) {
            throw new Error('OpenAI API key is missing');
        }
        this.openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    }

    async sendRequest(promptOrMessages: LLMMessage[] | string, options?: any): Promise<string> {
        const messages =
            typeof promptOrMessages === 'string'
                ? [{ role: 'user', content: promptOrMessages }]
                : promptOrMessages;

        const response = await this.openai.chat.completions.create({
            model: options?.model || this.model,
            messages: messages as any, // Temporarily cast to any to bypass type error
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens || 1000,
            top_p: options?.topP || 0.9,
        });

        return response.choices[0]?.message?.content || '';
    }
}


export class LLMClient {
    private client: LLMBase;

    constructor() {
        const provider = ConfigurationManager.getAIProvider();
        const model = ConfigurationManager.getModelName() || 'default-model';

        switch (provider) {
            case AIProvider.OpenAI:
                this.client = new OpenAIClient(
                    ConfigurationManager.getAPIKey()!,
                    model
                );
                break;
            // case AIProvider.AzureOpenAI:
            //     this.client = new AzureOpenAIClient(
            //         ConfigurationManager.getAPIKey()!,
            //         ConfigurationManager.getModelEndpoint()!,
            //         model
            //     );
            //     break;
            // case AIProvider.GoogleGemini:
            //     this.client = new GeminiClient(ConfigurationManager.getAPIKey()!, model);
            //     break;
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    async sendRequest(promptOrMessages: LLMMessage[] | string, options?: any): Promise<string> {
        return this.client.sendRequest(promptOrMessages, options);
    }
}
