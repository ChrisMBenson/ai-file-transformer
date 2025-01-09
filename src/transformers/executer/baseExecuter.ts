import * as vscode from 'vscode';
import { TransformerConfig } from '../../types';

export interface BaseExecuter {
    getInputFileBrowserOption(config: TransformerConfig): vscode.OpenDialogOptions;
    getOutputFileExtension(config: TransformerConfig): string;
    sortInput(data: string): string;
    processInput(data: string): string;
    generateUserMessage(data: string): string;
    execute(config: TransformerConfig): void;
}
