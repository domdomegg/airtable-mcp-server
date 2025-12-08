#!/usr/bin/env node

import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import {AirtableService} from './airtableService.js';
import {createServer} from './index.js';

function setupSignalHandlers(cleanup: () => Promise<void>): void {
	process.on('SIGINT', async () => {
		await cleanup();
		process.exit(0);
	});
	process.on('SIGTERM', async () => {
		await cleanup();
		process.exit(0);
	});
}

(async () => {
	const apiKey = process.argv.slice(2)[0];
	if (apiKey) {
		console.warn('warning (airtable-mcp-server): Passing in an API key as a command-line argument is deprecated and may be removed in a future version. Instead, set the `AIRTABLE_API_KEY` environment variable. See https://github.com/domdomegg/airtable-mcp-server/blob/master/README.md#usage for an example with Claude Desktop.');
	}

	const transport = process.env.MCP_TRANSPORT || 'stdio';
	const airtableService = new AirtableService(apiKey);
	const server = createServer({airtableService});

	if (transport === 'stdio') {
		setupSignalHandlers(async () => server.close());

		const stdioTransport = new StdioServerTransport();
		await server.connect(stdioTransport);
	} else if (transport === 'http') {
		const app = express();
		app.use(express.json());

		const httpTransport = new StreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
			enableJsonResponse: true,
		});

		app.post('/mcp', async (req, res) => {
			await httpTransport.handleRequest(req, res, req.body);
		});

		await server.connect(httpTransport);

		const port = parseInt(process.env.PORT || '3000', 10);
		const httpServer = app.listen(port, () => {
			console.error(`Airtable MCP server running on http://localhost:${port}/mcp`);
			console.error('WARNING: HTTP transport has no authentication. Only use behind a reverse proxy or in a secured setup.');
		});

		setupSignalHandlers(async () => {
			await server.close();
			httpServer.close();
		});
	} else {
		console.error(`Unknown transport: ${transport}. Use MCP_TRANSPORT=stdio or MCP_TRANSPORT=http`);
		process.exit(1);
	}
})().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
