import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TransformerConfig } from '../../types';
import { LLMClient } from '../../transformers/llmFactory';
import { BaseExecuter } from "../../transformers/executer/baseExecuter";

export default class T001JsonToXml implements BaseExecuter {

    getInputFileBrowserOption(config: TransformerConfig): vscode.OpenDialogOptions {
       const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            openLabel: 'Select File',
            filters: {
                'All Files': ['*']
            }
        };
        return options; 
    }

    getOutputFileExtension(config: TransformerConfig): string {
        return "xml";
    }

    sortInput(data: string): string {
        // Implementation logic for sorting input
        return data; // Example return value
    }

    processInput(data: string): string {
        // Implementation logic for processing input
        return data; // Example return value
    }

    generateUserMessage(data: string): string {
        // Implementation logic for generating user message
        return "Transformation complete"; // Example return value
    }

    async execute(config: TransformerConfig): Promise<void> {
        const inputPath = config.input[0].value;    
        const outputDir = path.join(__dirname, 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        let response = '';
        if (fs.existsSync(inputPath)) {
            const stats = fs.statSync(inputPath);
        
            if (stats.isDirectory()) {
                const files = fs.readdirSync(inputPath);
                for (const file of files.filter(file => file.endsWith('.json'))) {
                    const filePath = path.join(inputPath, file);
                    if (fs.statSync(filePath).isFile()) {
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const finalPrompt = (config.prompt || '') + content;
                        response = await this.sendToLLM(finalPrompt);
                    }
                }
            } else if (stats.isFile()) {
                const content = fs.readFileSync(inputPath, 'utf-8');
                const finalPrompt = (config.prompt || '') + content;
                response = await this.sendToLLM(finalPrompt);
            }
        }   

        const outputFilePath = path.join(outputDir, `output_${path.basename(inputPath)}`);
        fs.writeFileSync(outputFilePath, response, 'utf-8');
        this.openInVSCode(outputFilePath);
    }

    async sendToLLM(prompt: string): Promise<string> {
        const llmClient = new LLMClient();
        try {
            const response = await llmClient.sendRequest(prompt);
            return response;
        } catch (error) {
            console.error('Error sending request to LLM:', error);
            return `Error sending request to LLM: ${error instanceof Error ? error.message : String(error)}`;
        }
    }

    openInVSCode(filePath: string) {
        const vscode = require('vscode');
        vscode.workspace.openTextDocument(filePath).then((doc: vscode.TextDocument) => {
            vscode.window.showTextDocument(doc);
        });
    }
}
