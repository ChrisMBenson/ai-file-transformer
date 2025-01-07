import { outputChannel } from '../extension';

import { TransformerConfig } from '../types';

export function executeTransformers(config: TransformerConfig) {
  outputChannel.show(true); // Show the output channel and bring it into focus
  outputChannel.appendLine(`Starting transformer execution for "${config.name}"...`);
  
  try {
    outputChannel.appendLine(`Input Files: ${config.inputFiles}`);
    outputChannel.appendLine(`Output Folder: ${config.outputFolder}`);
    outputChannel.appendLine(`AI Model: ${config.aiModel}`);
    // TODO: Add actual transformer execution logic here
    outputChannel.appendLine("Transformer execution completed successfully.");
  } catch (error) {
    outputChannel.appendLine(`Error executing transformer: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
