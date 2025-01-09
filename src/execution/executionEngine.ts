import { outputChannel } from '../extension';
import { TransformerConfig } from '../types';
import { ExecuterLoader } from "../transformers/executer/executerLoader";
import { DefaultExecuter } from "../transformers/executer/defaultExecuter";
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';

// interface TransformerEntry {
//   id: string;     // Unique identifier for the transformer
//   name: string;   // Name of the transformer
//   folder: string; // Folder path where the transformer's script is located
// }

// /**
//  * Retrieves the transformer entry for a given transformer name from the transformer library.
//  * 
//  * @param transformerName - The name of the transformer to be executed.
//  * @returns The corresponding TransformerEntry object or undefined if not found.
//  */
// function getTransformerEntry(transformerName: string): TransformerEntry | undefined {
//   const transformerLibrary: { transformers: TransformerEntry[] } = require('../media/transformerLibrary/transformerLibrary.json');

//   return transformerLibrary.transformers.find(entry => entry.name === transformerName);
// }

/**
 * Opens the specified file in VS Code.
 * 
 * @param filePath - The path of the file to open.
 */
async function openInVSCode(filePath: string): Promise<void> {
  try {
    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc);
  } catch (error) {
    outputChannel.appendLine(`Failed to open file in VS Code: ${filePath}. Error: ${error}`);
  }
}

/**
 * Executes the specified transformer using its configuration.
 * 
 * @param config - The configuration object containing settings and parameters for the transformer.
 * @returns A promise that resolves when the transformer execution completes successfully or rejects on error.
 */
export async function executeTransformers(config: TransformerConfig): Promise<void> {
  const { name: transformerName } = config;

  outputChannel.show(true);
  outputChannel.appendLine(`Starting transformer execution for "${transformerName}"...`);

  try {
    
    // const transformerEntry = getTransformerEntry(transformerName);

    let outputFiles: string[];
    const executer = new DefaultExecuter();

    outputFiles = await executer.execute(config);

    // if (!transformerEntry) {
    //   outputChannel.appendLine(`Transformer folder not found. Using default executer.`);
    //   const executer = new DefaultExecuter();
    //   outputFiles = await executer.execute(config);
    // } else {
    //   const scriptPath = path.resolve(__dirname, '/media/transformerLibrary', transformerEntry.folder);
    //   outputChannel.appendLine(`Loading transformer script from: ${scriptPath}`);

    //   const loader = new ExecuterLoader();
    //   const executer = await loader.loadExecuters(scriptPath);
    //   outputFiles = await executer.execute(config);
    // }

    outputChannel.appendLine(`Transformer "${transformerName}" executed successfully.`);

    if (outputFiles?.length) {
      outputChannel.appendLine(`Generated ${outputFiles.length} output file(s):`);
      for (const filePath of outputFiles) {
        await openInVSCode(filePath);
        outputChannel.appendLine(`Opened file: ${filePath}`);
      }
    } else {
      outputChannel.appendLine('No output files were generated by this transformer.');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`Error executing transformer "${transformerName}": ${errorMessage}`);
    throw new Error(`Failed to execute transformer "${transformerName}": ${errorMessage}`);
  } finally {
    outputChannel.appendLine("Transformer execution process completed.");
  }
}
