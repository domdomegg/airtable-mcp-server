import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerAll, type ToolContext} from './tools/index.js';

// Library exports
export {AirtableService} from './airtableService.js';
export type {IAirtableService} from './types.js';
export {registerAll, type ToolContext} from './tools/index.js';

export type ServerConfig = ToolContext;

export function createServer(config: ServerConfig): McpServer {
	const server = new McpServer({
		name: 'airtable-mcp-server',
		version: '1.0.0',
	});

	registerAll(server, config);

	return server;
}
