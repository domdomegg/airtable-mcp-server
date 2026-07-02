import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerAll, type ToolContext} from './tools/index.js';

const {version} = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')) as {version: string};

// Library exports
export {AirtableService} from './airtableService.js';
export type {IAirtableService} from './types.js';
export {registerAll, type ToolContext} from './tools/index.js';

export type ServerConfig = ToolContext;

export function createServer(config: ServerConfig): McpServer {
	const server = new McpServer({
		name: 'airtable-mcp-server',
		version,
	});

	registerAll(server, config);

	return server;
}
