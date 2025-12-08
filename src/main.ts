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

const transport = process.env.MCP_TRANSPORT || 'stdio';
const airtableService = new AirtableService();
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
