import {
	describe, test, expect, beforeEach, afterEach,
} from 'vitest';
import type {
	CallToolResult,
	JSONRPCMessage,
	JSONRPCRequest,
	JSONRPCResponse,
	ListResourcesResult,
	ListToolsResult,
	ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {execSync, spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {AirtableMCPServer} from './mcpServer.js';
import {AirtableService} from './airtableService.js';

// Readonly API key for integration tests
const AIRTABLE_API_KEY = 'patDAZ0YDQu7LqGSy.f4736bbdec6ea0cb8ba8b5dba80c53f8b80e46d78a046a1769e749596671e677';

type MCPClient = {
	sendRequest: <T>(message: JSONRPCRequest) => Promise<T>;
	close: () => Promise<void>;
};

/**
 * Creates an MCP client that communicates with a spawned process via stdin/stdout
 */
function createProcessBasedClient(
	serverProcess: ReturnType<typeof spawn>,
	cleanup?: () => void,
): MCPClient {
	let requestId = 1;

	const pendingRequests = new Map<string, {resolve: (value: any) => void; reject: (error: any) => void}>();

	// Handle server responses
	serverProcess.stdout?.on('data', (data) => {
		const lines = data.toString().split('\n').filter((line: string) => line.trim());

		for (const line of lines) {
			try {
				const response = JSON.parse(line);
				if (response.id && pendingRequests.has(response.id)) {
					const {resolve, reject} = pendingRequests.get(response.id)!;
					pendingRequests.delete(response.id);
					if ('result' in response) {
						resolve(response.result);
					} else if ('error' in response) {
						reject(new Error(response.error.message || 'Unknown error'));
					}
				}
			} catch {
				// Ignore non-JSON lines
			}
		}
	});

	const sendRequest = async <T>(message: JSONRPCRequest): Promise<T> => {
		return new Promise((resolve, reject) => {
			// eslint-disable-next-line no-plusplus
			const id = (requestId++).toString();
			const requestWithId = {...message, id};

			pendingRequests.set(id, {resolve: resolve as any, reject: reject as any});

			try {
				serverProcess.stdin?.write(`${JSON.stringify(requestWithId)}\n`);
			} catch (e: unknown) {
				pendingRequests.delete(id);
				reject(e instanceof Error ? e : new Error(String(e)));
			}

			// Timeout
			setTimeout(() => {
				if (pendingRequests.has(id)) {
					pendingRequests.delete(id);
					reject(new Error('Request timeout'));
				}
			}, 10_000);
		});
	};

	return {
		sendRequest,
		async close() {
			try {
				serverProcess.kill();
			} catch {
				// Process might already be dead
			}

			// Run any additional cleanup
			if (cleanup) {
				cleanup();
			}
		},
	};
}

/**
 * Main test suite that runs the same tests across different deployment methods
 */
describe.each([
	{
		name: 'InMemory Transport',
		condition: true,
		async createClient(): Promise<MCPClient> {
			const airtableService = new AirtableService(AIRTABLE_API_KEY);
			const server = new AirtableMCPServer(airtableService);
			const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
			await server.connect(serverTransport);

			const sendRequest = async <T>(message: JSONRPCRequest): Promise<T> => {
				return new Promise((resolve, reject) => {
					clientTransport.onmessage = (response: JSONRPCMessage) => {
						const typedResponse = response as JSONRPCResponse;
						if ('result' in typedResponse) {
							resolve(typedResponse.result as T);
							return;
						}

						reject(new Error('No result in response'));
					};

					clientTransport.onerror = (err: Error) => {
						reject(err);
					};

					clientTransport.send(message).catch((err: unknown) => {
						reject(err instanceof Error ? err : new Error(String(err)));
					});
				});
			};

			return {
				sendRequest,
				close: async () => server.close(),
			};
		},
	},
	{
		name: 'MCP Bundle',
		condition: process.env.RUN_MCPB_TEST,
		async createClient(): Promise<MCPClient> {
			// Build MCP Bundle if it doesn't exist
			if (!existsSync('airtable-mcp-server.mcpb')) {
				execSync('./build-mcpb.sh', {stdio: 'inherit'});
			}

			// Extract MCP Bundle to test directory
			const testDir = 'test-mcpb-client';
			execSync(`rm -rf ${testDir}`);
			execSync(`mkdir -p ${testDir} && unzip -q airtable-mcp-server.mcpb -d ${testDir}`);

			// Start the MCP server from the extracted MCP Bundle
			const serverProcess = spawn('node', [path.join(testDir, 'dist/index.js')], {
				stdio: ['pipe', 'pipe', 'pipe'],
				env: {...process.env, AIRTABLE_API_KEY},
			});

			return createProcessBasedClient(
				serverProcess,
				() => {
					// Clean up test directory
					if (fs.existsSync(testDir)) {
						execSync(`rm -rf ${testDir}`);
					}
				},
			);
		},
	},
	{
		name: 'Docker Container',
		condition: process.env.RUN_DOCKER_TEST,
		async createClient(): Promise<MCPClient> {
			// Build Docker image
			execSync('docker build -t airtable-mcp-server:test .', {stdio: 'inherit'});

			// Start the MCP server in a Docker container
			const serverProcess = spawn('docker', [
				'run',
				'--rm',
				'-i',
				'-e',
				`AIRTABLE_API_KEY=${AIRTABLE_API_KEY}`,
				'airtable-mcp-server:test',
			], {
				stdio: ['pipe', 'pipe', 'pipe'],
			});

			return createProcessBasedClient(serverProcess);
		},
	},
])('MCP Server Tests - $name', ({name, condition, createClient}) => {
	(condition ? describe : describe.skip)(`${name} Integration`, () => {
		let client: MCPClient;

		beforeEach(async () => {
			client = await createClient();
		}, 60_000);

		afterEach(async () => {
			if (client) {
				await client.close();
			}
		});

		test('should list available tools', async () => {
			const result = await client.sendRequest<ListToolsResult>({
				jsonrpc: '2.0',
				id: '1',
				method: 'tools/list',
				params: {},
			});

			expect(result.tools.map((t) => t.name)).toEqual([
				'list_records',
				'search_records',
				'list_bases',
				'list_tables',
				'describe_table',
				'get_record',
				'create_record',
				'update_records',
				'delete_records',
				'create_table',
				'update_table',
				'create_field',
				'update_field',
			]);
			expect(result.tools[0]).toMatchObject({
				name: 'list_records',
				description: expect.any(String),
				inputSchema: expect.objectContaining({
					type: 'object',
				}),
			});
		}, 30_000);

		test('should list bases, tables, and records', async () => {
			// First get bases
			const basesResult = await client.sendRequest<CallToolResult>({
				jsonrpc: '2.0',
				id: '1',
				method: 'tools/call',
				params: {
					name: 'list_bases',
					arguments: {},
				},
			});

			expect(basesResult).toMatchObject({
				content: [{
					type: 'text',
					text: expect.any(String),
				}],
			});

			const bases = JSON.parse(basesResult.content[0]!.text as string);
			expect(Array.isArray(bases)).toBe(true);
			expect(bases.length).toBeGreaterThan(0);
			expect(bases[0]).toMatchObject({
				id: expect.any(String),
				name: expect.any(String),
				permissionLevel: expect.any(String),
			});

			const baseId = bases[0]!.id;

			// Then list tables in the first base
			const tablesResult = await client.sendRequest<CallToolResult>({
				jsonrpc: '2.0',
				id: '2',
				method: 'tools/call',
				params: {
					name: 'list_tables',
					arguments: {
						baseId,
					},
				},
			});

			expect(tablesResult).toMatchObject({
				content: [{
					type: 'text',
					text: expect.any(String),
				}],
			});

			const tables = JSON.parse(tablesResult.content[0]!.text as string);
			expect(Array.isArray(tables)).toBe(true);
			if (tables.length > 0) {
				expect(tables[0]).toMatchObject({
					id: expect.any(String),
					name: expect.any(String),
					fields: expect.any(Array),
				});

				const tableId = tables[0]!.id;

				// Finally list records in the first table
				const recordsResult = await client.sendRequest<CallToolResult>({
					jsonrpc: '2.0',
					id: '3',
					method: 'tools/call',
					params: {
						name: 'list_records',
						arguments: {
							baseId,
							tableId,
							maxRecords: 10,
						},
					},
				});

				expect(recordsResult).toMatchObject({
					content: [{
						type: 'text',
						text: expect.any(String),
					}],
				});

				const records = JSON.parse(recordsResult.content[0]!.text as string);
				expect(Array.isArray(records)).toBe(true);
				if (records.length > 0) {
					expect(records[0]).toMatchObject({
						id: expect.any(String),
						fields: expect.any(Object),
					});
				}
			} else {
				console.warn('Skipping list_records test as no tables found');
			}
		}, 30_000);

		test('should list and read resources', async () => {
			// First list resources
			const listResult = await client.sendRequest<ListResourcesResult>({
				jsonrpc: '2.0',
				id: '1',
				method: 'resources/list',
				params: {},
			});

			expect(listResult).toMatchObject({
				resources: expect.any(Array),
			});

			if (listResult.resources.length === 0) {
				console.warn('Skipping resource read test as no resources found');
				return;
			}

			// Then read the first resource
			const resource = listResult.resources[0]!;
			const readResult = await client.sendRequest<ReadResourceResult>({
				jsonrpc: '2.0',
				id: '2',
				method: 'resources/read',
				params: {
					uri: resource.uri,
				},
			});

			expect(readResult).toMatchObject({
				contents: [{
					uri: resource.uri,
					mimeType: 'application/json',
					text: expect.any(String),
				}],
			});

			const content = JSON.parse(readResult.contents[0]!.text as string);

			expect(content).toMatchObject({
				baseId: expect.any(String),
				tableId: expect.any(String),
				name: expect.any(String),
				fields: expect.any(Array),
			});
		}, 30_000);
	});
});
