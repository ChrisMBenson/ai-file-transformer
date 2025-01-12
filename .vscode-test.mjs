import { defineConfig } from '@vscode/test-cli';

// Set the NODE_OPTIONS environment variable
process.env.NODE_OPTIONS = '--force-node-api-uncaught-exceptions-policy=true';

export default defineConfig({
	files: 'out/test/**/*.test.js',
});
