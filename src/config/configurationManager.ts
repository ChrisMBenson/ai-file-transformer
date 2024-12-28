// src/config/configurationManager.ts
import * as vscode from 'vscode';

export enum AIProvider {
    Anthropic = 'Anthropic',
    OpenAI = 'OpenAI',
    AzureOpenAI = 'Azure OpenAI',
    OpenRouter = 'OpenRouter'
}

export class ConfigurationManager {
    private static readonly SECTION = 'aiFileTransformer';
    private static readonly PROVIDER_KEY = 'aiProvider';
    private static readonly API_KEY = 'apiKey';
    private static readonly MODEL_NAME_KEY = 'modelName';

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
