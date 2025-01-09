import { outputChannel } from '../extension';
import { TransformerConfig } from '../types';
import { ExecuterLoader } from "../transformers/executer/executerLoader";
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Retrieves the transformer entry for a given transformer name from the transformer library.
 * 
 * @param transformerName - The name of the transformer to be executed.
 * @returns The corresponding TransformerEntry object, which includes metadata like id, name, and folder.
 * @throws An error if the transformer name is not found in the library.
 */
function getTransformerEntry(transformerName: string) {
  interface TransformerEntry {
    id: string;     // Unique identifier for the transformer
    name: string;   // Name of the transformer
    folder: string; // Folder path where the transformer's script is located
  }

  // Load the transformer library JSON containing all registered transformers
  const transformerLibrary: { transformers: TransformerEntry[] } = require('../transformerLibrary/transformerLibrary.json');

  // Find the entry that matches the transformer name
  const transformerEntry = transformerLibrary.transformers.find(entry => entry.name === transformerName);

  if (!transformerEntry) {
    throw new Error(`No transformer entry found for "${transformerName}". Ensure the transformer is correctly configured in transformerLibrary.json.`);
  }

  return transformerEntry;
}

/**
 * Executes the specified transformer using its configuration.
 * 
 * @param config - The configuration object containing settings and parameters for the transformer.
 * @returns A promise that resolves when the transformer execution completes successfully or rejects on error.
 * 
 * This function performs the following:
 * 1. Displays and logs the start of the transformer execution process.
 * 2. Retrieves the transformer metadata from the transformer library.
 * 3. Loads the transformer's script using the `ExecuterLoader`.
 * 4. Executes the transformer with the given configuration.
 * 5. Logs success or failure messages to the output channel.
 * 6. Ensures the output channel logs process completion in all scenarios.
 */
export async function executeTransformers(config: TransformerConfig): Promise<void> {
  const { name: transformerName } = config;

  // Show the output channel and log the start of execution
  outputChannel.show(true);
  outputChannel.appendLine(`Starting transformer execution for "${transformerName}"...`);

  try {
    // Step 1: Load the transformer metadata
    const transformerEntry = getTransformerEntry(transformerName);
    const scriptPath = path.resolve(__dirname, '../src/transformerLibrary', transformerEntry.folder);

    outputChannel.appendLine(`Loading transformer script from: ${scriptPath}`);

    // Step 2: Load and execute the transformer
    const loader = new ExecuterLoader();
    const executer = await loader.loadExecuters(scriptPath);

    outputChannel.appendLine(`Executing transformer "${transformerName}"...`);
    const outputFiles = await executer.execute(config);

    /**
     * Opens the specified file in VS Code.
     */
    function openInVSCode(filePath: string): void {
        vscode.workspace.openTextDocument(filePath).then((doc: vscode.TextDocument) => {
            vscode.window.showTextDocument(doc);
        });
    }
    
    // Log success
    outputChannel.appendLine(`Opened file: ${outputFiles[0]}`);
    outputChannel.appendLine(`Transformer "${transformerName}" executed successfully.`);
    
    // Open each output file in VS Code and print the file paths
    outputFiles.forEach((filePath: string) => {
        openInVSCode(filePath);
        outputChannel.appendLine(`Opened file: ${filePath}`);
    });

  } catch (error) {
    // Handle and log errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`Error executing transformer "${transformerName}": ${errorMessage}`);
    throw new Error(`Failed to execute transformer "${transformerName}": ${errorMessage}`);
  } finally {
    // Ensure this message is logged in all scenarios
    outputChannel.appendLine("Transformer execution process completed.");
  }
}


