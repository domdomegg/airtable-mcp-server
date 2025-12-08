import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {AirtableService} from '../airtableService.js';
import {createServer} from '../server.js';

export function initServer(): McpServer {
	const airtableService = new AirtableService();
	return createServer({airtableService});
}

export function setupSignalHandlers(cleanup: () => Promise<void>): void {
	process.on('SIGINT', async () => {
		await cleanup();
		process.exit(0);
	});
	process.on('SIGTERM', async () => {
		await cleanup();
		process.exit(0);
	});
}

export function handleStartupError(error: unknown): never {
	console.error('Server startup failed:', error);
	process.exit(1);
}
