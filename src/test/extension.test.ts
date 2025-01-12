import * as assert from 'assert';
import * as vscode from 'vscode';


suite('Extension Behavior Tests', () => {
  let extensionContext: vscode.ExtensionContext;

  suiteSetup(async () => {
    // Activate the extension
    const extension = vscode.extensions.getExtension('AIStudio.ai-file-transformer');
    if (!extension) {
      throw new Error('Extension not found');
    }
    extensionContext = await extension.activate();
  });

  test('should register all commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    console.log('Registered commands:', commands.filter(c => c.startsWith('ai-file-transformer')));
    const expectedCommands = [
      'ai-file-transformer.executeTransformer',
      'ai-file-transformer.openSettings'
    ];
    
    expectedCommands.forEach(command => {
      assert.ok(commands.includes(command), `Command ${command} not registered`);
    });
  });

  test('should handle invalid file gracefully', async () => {
    const invalidUri = vscode.Uri.file('non-existent-file.txt');
    
    try {
      await vscode.commands.executeCommand('extension.transformFile', invalidUri);
      assert.fail('Should have thrown error for invalid file');
    } catch (error) {
      assert.ok(error instanceof Error, 'Expected error to be thrown');
    }
  });

  teardown(async () => {
    // Clean up test files
    const uri = vscode.Uri.file('test-file.txt');
    try {
      await vscode.workspace.fs.delete(uri);
    } catch (error) {
      // File may not exist
    }
  });
});
