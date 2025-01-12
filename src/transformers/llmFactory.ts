import OpenAI from 'openai';
import { ConfigurationManager, AIProvider } from '../config/configurationManager';
import fs from 'fs';
import path from 'path';
import { outputChannel, logOutputChannel } from '../extension';

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

export class OpenAIClient extends LLMBase {
    private openai: OpenAI;

    constructor(apiKey: string, model: string = 'gpt-4', openai?: OpenAI) {
        super(model);
        if (!apiKey) {
            throw new Error('OpenAI API key is missing');
        }
        this.openai = openai || new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    }

    async sendRequest(promptOrMessages: LLMMessage[] | string, options?: any): Promise<string> {
        logOutputChannel.show(true);
        logOutputChannel.info(`Sending request to OpenAI with model: ${this.model}`);
        
        const messages =
            typeof promptOrMessages === 'string'
                ? [{ role: 'user', content: promptOrMessages }]
                : promptOrMessages;

        try {
            logOutputChannel.info(`Preparing request payload...`);
            
            const response = await this.openai.chat.completions.create({
                model: options?.model || this.model,
                messages: messages as any,
                temperature: options?.temperature || 0.7,
                max_tokens: options?.maxTokens || 1000,
                top_p: options?.topP || 0.9,
            });

            logOutputChannel.info(`Response received successfully.`);
            if (response.usage) {
                logOutputChannel.info(`Tokens Used - Prompt: ${response.usage.prompt_tokens}, Completion: ${response.usage.completion_tokens}, Total: ${response.usage.total_tokens}`);
            }

            const result = response.choices[0]?.message?.content || '';
            return result;

        } catch (error) {
            if (error instanceof Error) {
                logOutputChannel.error(`Error while sending request to llm: ${error.message}\nStack: ${error.stack}`);
            } else {
                logOutputChannel.error(`Unknown error sending request to llm: ${JSON.stringify(error)}`);
            }
            throw error;
        }
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
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    async sendRequest(promptOrMessages: LLMMessage[] | string, options?: any): Promise<string> {
        logOutputChannel.info(`Initializing request...`);
        const result = await this.client.sendRequest(promptOrMessages, options);
        logOutputChannel.info(`Request completed successfully.`);
        return result;
    }
}
