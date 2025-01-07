import * as assert from 'assert';
import * as vscode from 'vscode';
import { afterEach } from 'mocha';

suite('Extension Behavior Tests', () => {
  let extensionContext: vscode.ExtensionContext;

  suiteSetup(async () => {
    // Activate the extension
    const extension = vscode.extensions.getExtension('your-extension-id');
    if (!extension) {
      throw new Error('Extension not found');
    }
    extensionContext = await extension.activate();
  });

  test('should register all commands', async () => {
    const commands = await vscode.commands.getCommands(true);
    const expectedCommands = [
      'extension.transformFile',
      'extension.configureSettings',
      'extension.viewTransformations'
    ];
    
    expectedCommands.forEach(command => {
      assert.ok(commands.includes(command), `Command ${command} not registered`);
    });
  });

  test('should transform valid file correctly', async () => {
    // Create a test file
    const uri = vscode.Uri.file('test-file.txt');
    await vscode.workspace.fs.writeFile(uri, Buffer.from('test content'));
    
    // Execute transform command
    await vscode.commands.executeCommand('extension.transformFile', uri);
    
    // Verify transformation
    const transformedContent = await vscode.workspace.fs.readFile(uri);
    assert.notStrictEqual(transformedContent.toString(), 'test content', 
      'File content should be transformed');
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

  afterEach(async () => {
    // Clean up test files
    const uri = vscode.Uri.file('test-file.txt');
    try {
      await vscode.workspace.fs.delete(uri);
    } catch (error) {
      // File may not exist
    }
  });
});
