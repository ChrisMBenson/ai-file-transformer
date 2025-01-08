import { outputChannel } from '../extension';
import { TransformerConfig } from '../types';
import { LLMClient } from '../transformers/llmFactory';
import * as fs from 'fs';
import * as path from 'path';

export function executeTransformers(config: TransformerConfig) {
  outputChannel.show(true); // Show the output channel and bring it into focus
  outputChannel.appendLine(`Starting transformer execution for "${config.name}"...`);
  
  try {
    const inputPath = config.input[0].value;
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    if (fs.existsSync(inputPath)) {
      const stats = fs.statSync(inputPath);

      if (stats.isDirectory()) {
        const files = fs.readdirSync(inputPath);
        files.filter(file => file.endsWith('.json')).forEach(file => {
          const filePath = path.join(inputPath, file);
          if (fs.statSync(filePath).isFile()) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const finalPrompt = (config.prompt || '') + content;
            sendToLLM(finalPrompt, file);
          }
        });
      } else if (stats.isFile()) {
        const content = fs.readFileSync(inputPath, 'utf-8');
        const finalPrompt = (config.prompt || '') + content;
        sendToLLM(finalPrompt, path.basename(inputPath));
      }
    } else {
      outputChannel.appendLine(`Input path does not exist: ${inputPath}`);
    }

    function sendToLLM(prompt: string, fileName: string) {
      const llmClient = new LLMClient();
      llmClient.sendRequest(prompt)
        .then(response => {
          const outputFilePath = path.join(outputDir, `output_${fileName}`);
          fs.writeFileSync(outputFilePath, response, 'utf-8');
          outputChannel.appendLine(`LLM Response written to: ${outputFilePath}`);
          openInVSCode(outputFilePath);
        })
        .catch(error => {
          console.error('Error sending request to LLM:', error);
          outputChannel.appendLine(`Error sending request to LLM: ${error instanceof Error ? error.message : String(error)}`);
        });
    }

    function openInVSCode(filePath: string) {
      const vscode = require('vscode');
      vscode.workspace.openTextDocument(filePath).then((doc: vscode.TextDocument) => {
        vscode.window.showTextDocument(doc);
      });
    }

    outputChannel.appendLine(`Input: ${config.input.map(i => i.name).join(', ')}`);
    outputChannel.appendLine(`Output: ${config.output}`);
    outputChannel.appendLine(`AI Model: ${config.aiModel}`);
    // TODO: Add actual transformer execution logic here
    outputChannel.appendLine("Transformer execution completed successfully.");
  } catch (error) {
    outputChannel.appendLine(`Error executing transformer: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
