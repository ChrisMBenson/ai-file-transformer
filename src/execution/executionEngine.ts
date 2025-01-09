import { outputChannel } from '../extension';
import { TransformerConfig } from '../types';
import { BaseExecuter } from '../transformers/executer/baseExecuter';
import { ExecuterLoader } from "../transformers/executer/executerLoader";
import * as path from 'path';

export async function executeTransformers(config: TransformerConfig) {
  outputChannel.show(true); // Show the output channel and bring it into focus
  outputChannel.appendLine(`Starting transformer execution for "${config.name}"...`);
  
  try {
    // Delegate execution to the appropriate BaseExecuter implementation
    outputChannel.appendLine(`Delegating execution to the transformer script for "${config.name}".`);
    // Load the correct script based on TransformerConfig name
    const transformer = config.name;
    interface TransformerEntry {
      id: string;
      name: string;
      folder: string;
    }

    const transformerLibrary: { transformers: TransformerEntry[] } = require('../transformerLibrary/transformerLibrary.json');
    const transformerEntry = transformerLibrary.transformers.find((t: TransformerEntry) => t.name === transformer);

    if (!transformerEntry) {
      throw new Error(`No transformer entry found for "${transformer}"`);
    }

    const scriptPath = path.join(__dirname, '../src/transformerLibrary', transformerEntry.folder);
    outputChannel.appendLine(`Loading transformer from: ${scriptPath}`);

    const loader = new ExecuterLoader();
    try {
      const executer = await loader.loadExecuters(scriptPath);
      await executer.execute(config);
      outputChannel.appendLine(`Successfully executed transformer "${transformer}"`);
    } catch (error) {
      outputChannel.appendLine(`Error executing transformer "${transformer}": ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
    outputChannel.appendLine("Transformer execution completed successfully.");
  } catch (error) {
    outputChannel.appendLine(`Error executing transformer: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
