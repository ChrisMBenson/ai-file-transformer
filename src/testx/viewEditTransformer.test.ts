import * as assert from 'assert';
import * as vscode from './mocks/vscode';
import { ViewEditTransformer } from '../webviews/ViewEditTransformer';
import { TransformerManager } from '../transformers/transformerManager';
import { TransformersProvider } from '../providers/TransformersProvider';
import { VSCodeTransformerStorage } from '../types/storage';
import type { TransformerConfig } from '../types';

describe('ViewEditTransformer Tests', () => {
  let webview: ViewEditTransformer;
  let manager: TransformerManager;
  let storage: VSCodeTransformerStorage;
  let provider: TransformersProvider;
  let extensionContext: vscode.ExtensionContext;
  let webviewView: vscode.WebviewView;

  const baseConfig: TransformerConfig = {
    id: 'test-transformer',
    name: 'Test Transformer',
    description: 'Test description',
    prompt: 'Test prompt',
    input: [{
      name: 'test-input',
      description: 'Test input',
      required: true
    }],
    output: 'output.txt',
    aiModel: 'gpt-4',
    temperature: 0.7,
    preserveStructure: true,
    namingConvention: 'original'
  };

  beforeEach(async () => {
    // Mock the extension context
    extensionContext = {
      extensionUri: vscode.Uri.file(__dirname),
      subscriptions: [],
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve()
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
        setKeysForSync: () => {}
      },
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve()
      },
      extensionPath: __dirname,
      asAbsolutePath: (relativePath: string) => __dirname + '/' + relativePath,
      storagePath: __dirname + '/storage',
      globalStoragePath: __dirname + '/globalStorage',
      logPath: __dirname + '/logs',
      extensionMode: vscode.ExtensionMode.Test,
      environmentVariableCollection: {
        persistent: false,
        append: () => {},
        clear: () => {},
        delete: () => {},
        forEach: () => {},
        get: () => undefined,
        prepend: () => {},
        replace: () => {}
      },
      storageUri: vscode.Uri.file(__dirname + '/storage'),
      globalStorageUri: vscode.Uri.file(__dirname + '/globalStorage'),
      logUri: vscode.Uri.file(__dirname + '/logs'),
      extension: {
        id: 'test-extension',
        extensionUri: vscode.Uri.file(__dirname),
        extensionPath: __dirname,
        isActive: true,
        packageJSON: {},
        exports: undefined,
        activate: () => Promise.resolve()
      }
    } as unknown as vscode.ExtensionContext;

    // Create storage and manager
    storage = new VSCodeTransformerStorage(extensionContext);
    manager = await TransformerManager.create(storage);
    
    // Create provider
    provider = new TransformersProvider(manager);

    // Create webview
    webview = new ViewEditTransformer(
      extensionContext.extensionUri,
      extensionContext,
      provider,
      manager
    );

    // Mock webview view
    webviewView = {
      webview: {
        html: '',
        options: {},
        onDidReceiveMessage: () => ({ dispose: () => {} }),
        postMessage: async (message: any) => true
      }
    } as unknown as vscode.WebviewView;
  });

  describe('View Transformer Tests', () => {
    it('should initialize webview correctly', async () => {
      await manager.createTransformer(baseConfig);
      webview.resolveWebviewView(webviewView, {} as vscode.WebviewViewResolveContext, {} as vscode.CancellationToken);
      
      // Verify webview was initialized
      assert.ok(webviewView.webview.html.length > 0);
    });

    it('should update content when transformer changes', async () => {
      await manager.createTransformer(baseConfig);
      webview.resolveWebviewView(webviewView, {} as vscode.WebviewViewResolveContext, {} as vscode.CancellationToken);
      
      // Mock postMessage to capture updates
      let lastMessage: any;
      webviewView.webview.postMessage = async (message: any) => {
        lastMessage = message;
        return true;
      };

      // Update content
      webview.updateContent(baseConfig);
      
      // Verify update was sent
      assert.ok(lastMessage);
      assert.strictEqual(lastMessage.command, 'update');
      const data = JSON.parse(lastMessage.data);
      assert.strictEqual(data.name, baseConfig.name);
      assert.strictEqual(data.description, baseConfig.description);
    });
  });

  describe('Message Handling Tests', () => {
    beforeEach(() => {
      webview.resolveWebviewView(webviewView, {} as vscode.WebviewViewResolveContext, {} as vscode.CancellationToken);
    });

    it('should handle save message', async () => {
      await manager.createTransformer(baseConfig);
      
      const updatedConfig = {
        ...baseConfig,
        name: 'Updated Name',
        description: 'Updated description'
      };

      // Simulate save message from webview
      const messageHandler = (webviewView.webview.onDidReceiveMessage as any).mock.calls[0][0];
      await messageHandler({
        command: 'save',
        data: JSON.stringify(updatedConfig)
      });

      // Verify transformer was updated
      const saved = manager.getTransformer(baseConfig.id);
      assert.strictEqual(saved?.name, 'Updated Name');
      assert.strictEqual(saved?.description, 'Updated description');
    });

    it('should validate data before saving', async () => {
      await manager.createTransformer(baseConfig);
      
      const invalidConfig = {
        ...baseConfig,
        name: '' // Invalid: empty name
      };

      // Simulate save message with invalid data
      const messageHandler = (webviewView.webview.onDidReceiveMessage as any).mock.calls[0][0];
      try {
        await messageHandler({
          command: 'save',
          data: JSON.stringify(invalidConfig)
        });
        assert.fail('Should reject invalid transformer config');
      } catch (error) {
        assert.ok(error instanceof Error);
      }
    });
  });
});
