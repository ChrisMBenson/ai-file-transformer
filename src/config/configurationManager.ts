// src/config/configurationManager.ts
import * as vscode from 'vscode';

export enum AIProvider {
    Anthropic = 'Anthropic',
    OpenAI = 'OpenAI',
    AzureOpenAI = 'Azure OpenAI',
    GoogleGemini = 'Google Gemini',
    OpenRouter = 'OpenRouter',
    DeepSeek = 'DeepSeek',
}

export class ConfigurationManager {
    private static readonly SECTION = 'fuzorAiTransformer';
    private static readonly PROVIDER_KEY = 'aiProvider';
    private static readonly API_KEY = 'apiKey';
    private static readonly MODEL_NAME_KEY = 'modelName';
    private static readonly MODEL_ENDPOINT = 'modelEndpoint';
    private static readonly API_VERSION = 'apiVersion';
    private static readonly ACCEPT_TERMS = 'acceptTerms';

    static getAcceptTerms(): boolean {
        const config = vscode.workspace.getConfiguration(this.SECTION);
        return config.get<boolean>(this.ACCEPT_TERMS, false);
    }

    static setAcceptTerms(accepted: boolean): Thenable<void> {
        const config = vscode.workspace.getConfiguration(this.SECTION);
        return config.update(this.ACCEPT_TERMS, accepted, vscode.ConfigurationTarget.Global);
    }

    static getModelName(): string | undefined {
        const config = vscode.workspace.getConfiguration(this.SECTION);
        return config.get<string>(this.MODEL_NAME_KEY);
    }

    static setModelName(modelName: string): Thenable<void> {
        const config = vscode.workspace.getConfiguration(this.SECTION);
        return config.update(this.MODEL_NAME_KEY, modelName, vscode.ConfigurationTarget.Global);
    }

    static getAIProvider(): AIProvider {
        const config = vscode.workspace.getConfiguration(this.SECTION);
        return config.get<AIProvider>(this.PROVIDER_KEY, AIProvider.OpenAI);
    }

    static setAIProvider(provider: AIProvider): Thenable<void> {
        const config = vscode.workspace.getConfiguration(this.SECTION);
        return config.update(this.PROVIDER_KEY, provider, vscode.ConfigurationTarget.Global);
    }

    static getAPIKey(): string | undefined {
        const config = vscode.workspace.getConfiguration(this.SECTION);
        return config.get<string>(this.API_KEY);
    }

    static setAPIKey(apiKey: string): Thenable<void> {
        const config = vscode.workspace.getConfiguration(this.SECTION);
        return config.update(this.API_KEY, apiKey, vscode.ConfigurationTarget.Global);
    }

    static getModelEndpoint(): string | undefined {
        const config = vscode.workspace.getConfiguration(this.SECTION);
        return config.get<string>(this.MODEL_ENDPOINT);
    }

    static setModelEndpoint(apiKey: string): Thenable<void> {
        const config = vscode.workspace.getConfiguration(this.SECTION);
        return config.update(this.MODEL_ENDPOINT, apiKey, vscode.ConfigurationTarget.Global);
    }

    static getApiVersion(): string | undefined {
        const config = vscode.workspace.getConfiguration(this.SECTION);
        return config.get<string>(this.API_VERSION);
    }

    static setApiVersion(apiVersion: string): Thenable<void> {
        const config = vscode.workspace.getConfiguration(this.SECTION);
        return config.update(this.API_VERSION, apiVersion, vscode.ConfigurationTarget.Global);
    }

    static async promptForAPIKey(): Promise<void> {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your API key',
            password: true,
            ignoreFocusOut: true
        });

        if (apiKey) {
            await this.setAPIKey(apiKey);
        }
    }
}
