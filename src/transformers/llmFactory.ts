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

    abstract sendRequestWithStructuredResponse(
        promptOrMessages: LLMMessage[] | string,
        responseFormat: string,
        options?: any
    ): Promise<any>;

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

    public logRequestResponse(
        prompt: string | LLMMessage[],
        response: string,
        stepName: string,
        folder = './responses'
    ): void {
        const { date, time } = LLMBase.getTimestamp();
        const logDir = path.join(folder, stepName, date);
        LLMBase.ensureDirectoryExists(logDir);

        const requestFile = path.join(logDir, `${time}_req.txt`);
        const responseFile = path.join(logDir, `${time}_res.txt`);

        fs.writeFileSync(
            requestFile,
            typeof prompt === 'string' ? prompt : prompt.map((msg) => msg.content).join('\n'),
            'utf-8'
        );

        fs.writeFileSync(responseFile, response, 'utf-8');
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

    async sendRequestWithStructuredResponse(
        promptOrMessages: LLMMessage[] | string,
        responseFormat: string,
        options?: any
    ): Promise<any> {
        throw new Error('Structured response logic not implemented for OpenAI');
    }
}

class AzureOpenAIClient extends LLMBase {
    private endpoint: string;

    constructor(apiKey: string, endpoint: string, model: string = 'gpt-4') {
        super(model);
        if (!apiKey || !endpoint) {
            throw new Error('Azure OpenAI API key or endpoint is missing');
        }
        this.endpoint = endpoint;
    }

    async sendRequest(promptOrMessages: LLMMessage[] | string, options?: any): Promise<string> {
        const messages =
            typeof promptOrMessages === 'string'
                ? [{ role: 'user', content: promptOrMessages }]
                : promptOrMessages;

        const url = `${this.endpoint}/openai/deployments/${options?.deployment || 'deployment-name'}/chat/completions?api-version=2023-05-15`;
        const body = {
            model: options?.model || this.model,
            messages,
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens || 1000,
            top_p: options?.topP || 0.9,
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': options?.apiKey || '', // Ensure apiKey is passed in options
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`Azure OpenAI request failed: ${response.statusText}`);
        }

        const data = await response.json() as { choices: { message: { content: string } }[] };
        return data.choices[0]?.message?.content || '';
    }

    async sendRequestWithStructuredResponse(
        promptOrMessages: LLMMessage[] | string,
        responseFormat: string,
        options?: any
    ): Promise<any> {
        throw new Error('Structured response logic not implemented for Azure OpenAI');
    }
}

class GeminiClient extends LLMBase {
    constructor(apiKey: string, model: string = 'gemini-1.5-flash') {
        super(model);
        if (!apiKey) {
            throw new Error('Gemini API key is missing');
        }
    }

    async sendRequest(promptOrMessages: LLMMessage[] | string, options?: any): Promise<string> {
        const messages =
            typeof promptOrMessages === 'string'
                ? [{ role: 'user', content: promptOrMessages }]
                : promptOrMessages;

        const url = 'https://api.gemini-platform.com/v1/completions';
        const body = {
            model: options?.model || this.model,
            messages,
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens || 1000,
            top_p: options?.topP || 0.9,
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${options?.apiKey || ''}`, // Ensure apiKey is passed in options
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`Gemini request failed: ${response.statusText}`);
        }

        const data = await response.json() as { choices: { message: { content: string } }[] };
        return data.choices[0]?.message?.content || '';
    }

    async sendRequestWithStructuredResponse(
        promptOrMessages: LLMMessage[] | string,
        responseFormat: string,
        options?: any
    ): Promise<any> {
        throw new Error('Structured response logic not implemented for Gemini');
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
            case AIProvider.AzureOpenAI:
                this.client = new AzureOpenAIClient(
                    ConfigurationManager.getAPIKey()!,
                    ConfigurationManager.getModelEndpoint()!,
                    model
                );
                break;
            case AIProvider.GoogleGemini:
                this.client = new GeminiClient(ConfigurationManager.getAPIKey()!, model);
                break;
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    async sendRequest(promptOrMessages: LLMMessage[] | string, options?: any): Promise<string> {
        return this.client.sendRequest(promptOrMessages, options);
    }

    async sendRequestWithStructuredResponse(
        promptOrMessages: LLMMessage[] | string,
        responseFormat: string,
        options?: any
    ): Promise<any> {
        return this.client.sendRequestWithStructuredResponse(promptOrMessages, responseFormat, options);
    }

    logRequestResponse(prompt: string | LLMMessage[], response: string, stepName: string): void {
        this.client.logRequestResponse(prompt, response, stepName);
    }
}
