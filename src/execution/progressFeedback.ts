import { outputChannel } from '../extension';

export function provideFeedback(message: string) {
  outputChannel.appendLine(message);
}

export function showError(error: Error | string) {
  const errorMessage = error instanceof Error ? error.message : error;
  outputChannel.appendLine(`Error: ${errorMessage}`);
}
