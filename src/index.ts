#!/usr/bin/env node

// Library exports
export {createServer, type ServerConfig} from './server.js';
export {AirtableService} from './airtableService.js';
export type {IAirtableService} from './types.js';
export {registerAll, type ToolContext} from './tools/index.js';

// CLI entry point (for backwards compatibility with existing bin usage)
// New installs should use main.ts via the bin field
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {AirtableService} from './airtableService.js';
import {createServer} from './server.js';

const main = async () => {
	const apiKey = process.argv.slice(2)[0];
	if (apiKey) {
		console.warn('warning (airtable-mcp-server): Passing in an API key as a command-line argument is deprecated and may be removed in a future version. Instead, set the `AIRTABLE_API_KEY` environment variable. See https://github.com/domdomegg/airtable-mcp-server/blob/master/README.md#usage for an example with Claude Desktop.');
	}

	const airtableService = new AirtableService(apiKey);
	const server = createServer({airtableService});
	const transport = new StdioServerTransport();
	await server.connect(transport);
};

// Only run if this is the entry point
if (process.argv[1]?.endsWith('index.js')) {
	main().catch((error: unknown) => {
		console.error(error);
		process.exit(1);
	});
}
