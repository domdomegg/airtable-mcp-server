#!/usr/bin/env node

import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {AirtableService} from './airtableService.js';
import {AirtableMCPServer} from './mcpServer.js';

const main = async () => {
	const apiKey = process.argv.slice(2)[0];
	if (apiKey) {
		// Deprecation warning
		console.warn('warning (airtable-mcp-server): Passing in an API key as a command-line argument is deprecated and may be removed in a future version. Instead, set the `AIRTABLE_API_KEY` environment variable. See https://github.com/domdomegg/airtable-mcp-server/blob/master/README.md#usage for an example with Claude Desktop.');
	}

	const airtableService = new AirtableService(apiKey);
	const server = new AirtableMCPServer(airtableService);
	const transport = new StdioServerTransport();
	await server.connect(transport);
};

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
