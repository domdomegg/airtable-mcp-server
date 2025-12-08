import {
	describe, test, expect, vi, beforeEach, afterEach,
} from 'vitest';
import type {
	JSONRPCMessage, JSONRPCRequest, JSONRPCResponse, Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {IAirtableService} from './types.js';
import {createServer} from './index.js';

describe('AirtableMCPServer', () => {
	let server: McpServer;
	let mockAirtableService: IAirtableService;
	let serverTransport: InMemoryTransport;
	let clientTransport: InMemoryTransport;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Create mock AirtableService
		mockAirtableService = {
			listBases: vi.fn().mockResolvedValue({
				bases: [
					{id: 'base1', name: 'Test Base', permissionLevel: 'create'},
				],
			}),
			getBaseSchema: vi.fn().mockResolvedValue({
				tables: [
					{
						id: 'tbl1',
						name: 'Test Table',
						description: 'Test Description',
						fields: [],
						views: [],
						primaryFieldId: 'fld1',
					},
				],
			}),
			listRecords: vi.fn().mockResolvedValue([
				{id: 'rec1', fields: {name: 'Test Record'}},
			]),
			getRecord: vi.fn().mockResolvedValue({
				id: 'rec1',
				fields: {name: 'Test Record'},
			}),
			createRecord: vi.fn().mockResolvedValue({
				id: 'rec1',
				fields: {name: 'New Record'},
			}),
			updateRecords: vi.fn().mockResolvedValue([
				{id: 'rec1', fields: {name: 'Updated Record'}},
			]),
			deleteRecords: vi.fn().mockResolvedValue([
				{id: 'rec1', deleted: true},
			]),
			createTable: vi.fn().mockResolvedValue({
				id: 'tbl1',
				name: 'New Table',
				fields: [],
			}),
			updateTable: vi.fn().mockResolvedValue({
				id: 'tbl1',
				name: 'Updated Table',
				fields: [],
			}),
			createField: vi.fn().mockResolvedValue({
				id: 'fld1',
				name: 'New Field',
				type: 'singleLineText',
			}),
			updateField: vi.fn().mockResolvedValue({
				id: 'fld1',
				name: 'Updated Field',
				type: 'singleLineText',
			}),
			searchRecords: vi.fn().mockResolvedValue([
				{id: 'rec1', fields: {name: 'Test Result'}},
			]),
			createComment: vi.fn().mockResolvedValue({
				id: 'com123',
				createdTime: '2021-03-01T09:00:00.000Z',
				lastUpdatedTime: null,
				text: 'Test comment',
				author: {
					id: 'usr123',
					email: 'test@example.com',
					name: 'Test User',
				},
			}),
			listComments: vi.fn().mockResolvedValue({
				comments: [
					{
						id: 'com123',
						createdTime: '2021-03-01T09:00:00.000Z',
						lastUpdatedTime: null,
						text: 'Test comment',
						author: {
							id: 'usr123',
							email: 'test@example.com',
							name: 'Test User',
						},
					},
				],
				offset: null,
			}),
		};

		// Create server instance with test transport
		server = createServer({airtableService: mockAirtableService});
		[serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
		await server.connect(serverTransport);
	});

	const sendRequest = async (message: JSONRPCRequest): Promise<JSONRPCResponse> => new Promise((resolve, reject) => {
		// Set up response handler
		clientTransport.onmessage = (response: JSONRPCMessage) => {
			resolve(response as JSONRPCResponse);
		};

		clientTransport.onerror = (err: Error) => {
			reject(err);
		};

		clientTransport.send(message).catch((err: unknown) => {
			reject(err instanceof Error ? err : new Error(String(err)));
		});
	});

	describe('server functionality', () => {
		test('handles list_tools request', async () => {
			const response = await sendRequest({
				jsonrpc: '2.0',
				id: '1',
				method: 'tools/list',
				params: {},
			});

			expect((response.result.tools as Tool[]).length).toBe(15);
			expect((response.result.tools as Tool[])[0]).toMatchObject({
				name: expect.any(String),
				description: expect.any(String),
				inputSchema: expect.objectContaining({
					type: 'object',
				}),
			});
		});

		test('handles list_records tool call', async () => {
			const response = await sendRequest({
				jsonrpc: '2.0',
				id: '1',
				method: 'tools/call',
				params: {
					name: 'list_records',
					arguments: {
						baseId: 'base1',
						tableId: 'tbl1',
						maxRecords: 100,
					},
				},
			});

			expect(response.result).toEqual({
				content: [{
					type: 'text',
					text: JSON.stringify({
						records: [{id: 'rec1', fields: {name: 'Test Record'}}],
					}, null, 2),
				}],
				structuredContent: {
					records: [{id: 'rec1', fields: {name: 'Test Record'}}],
				},
			});
		});

		test('handles create_comment tool call', async () => {
			const response = await sendRequest({
				jsonrpc: '2.0',
				id: '1',
				method: 'tools/call',
				params: {
					name: 'create_comment',
					arguments: {
						baseId: 'base1',
						tableId: 'tbl1',
						recordId: 'rec1',
						text: 'Test comment',
					},
				},
			});

			expect(mockAirtableService.createComment).toHaveBeenCalledWith(
				'base1',
				'tbl1',
				'rec1',
				'Test comment',
				undefined,
			);

			expect(response.result).toEqual({
				content: [{
					type: 'text',
					text: JSON.stringify({
						comment: {
							id: 'com123',
							createdTime: '2021-03-01T09:00:00.000Z',
							lastUpdatedTime: null,
							text: 'Test comment',
							author: {
								id: 'usr123',
								email: 'test@example.com',
								name: 'Test User',
							},
						},
					}, null, 2),
				}],
				structuredContent: {
					comment: {
						id: 'com123',
						createdTime: '2021-03-01T09:00:00.000Z',
						lastUpdatedTime: null,
						text: 'Test comment',
						author: {
							id: 'usr123',
							email: 'test@example.com',
							name: 'Test User',
						},
					},
				},
			});
		});

		test('handles create_comment tool call with parent comment', async () => {
			const response = await sendRequest({
				jsonrpc: '2.0',
				id: '1',
				method: 'tools/call',
				params: {
					name: 'create_comment',
					arguments: {
						baseId: 'base1',
						tableId: 'tbl1',
						recordId: 'rec1',
						text: 'Reply comment',
						parentCommentId: 'com123',
					},
				},
			});

			expect(mockAirtableService.createComment).toHaveBeenCalledWith(
				'base1',
				'tbl1',
				'rec1',
				'Reply comment',
				'com123',
			);

			expect(response.result).toEqual({
				content: [{
					type: 'text',
					text: JSON.stringify({
						comment: {
							id: 'com123',
							createdTime: '2021-03-01T09:00:00.000Z',
							lastUpdatedTime: null,
							text: 'Test comment',
							author: {
								id: 'usr123',
								email: 'test@example.com',
								name: 'Test User',
							},
						},
					}, null, 2),
				}],
				structuredContent: {
					comment: {
						id: 'com123',
						createdTime: '2021-03-01T09:00:00.000Z',
						lastUpdatedTime: null,
						text: 'Test comment',
						author: {
							id: 'usr123',
							email: 'test@example.com',
							name: 'Test User',
						},
					},
				},
			});
		});

		test('handles list_comments tool call', async () => {
			const response = await sendRequest({
				jsonrpc: '2.0',
				id: '1',
				method: 'tools/call',
				params: {
					name: 'list_comments',
					arguments: {
						baseId: 'base1',
						tableId: 'tbl1',
						recordId: 'rec1',
					},
				},
			});

			expect(mockAirtableService.listComments).toHaveBeenCalledWith(
				'base1',
				'tbl1',
				'rec1',
				undefined,
				undefined,
			);

			expect(response.result).toEqual({
				content: [{
					type: 'text',
					text: JSON.stringify({
						comments: [{
							id: 'com123',
							createdTime: '2021-03-01T09:00:00.000Z',
							lastUpdatedTime: null,
							text: 'Test comment',
							author: {
								id: 'usr123',
								email: 'test@example.com',
								name: 'Test User',
							},
						}],
						offset: null,
					}, null, 2),
				}],
				structuredContent: {
					comments: [{
						id: 'com123',
						createdTime: '2021-03-01T09:00:00.000Z',
						lastUpdatedTime: null,
						text: 'Test comment',
						author: {
							id: 'usr123',
							email: 'test@example.com',
							name: 'Test User',
						},
					}],
					offset: null,
				},
			});
		});

		test('handles list_comments tool call with pagination', async () => {
			const response = await sendRequest({
				jsonrpc: '2.0',
				id: '1',
				method: 'tools/call',
				params: {
					name: 'list_comments',
					arguments: {
						baseId: 'base1',
						tableId: 'tbl1',
						recordId: 'rec1',
						pageSize: 50,
						offset: 'offset123',
					},
				},
			});

			expect(mockAirtableService.listComments).toHaveBeenCalledWith(
				'base1',
				'tbl1',
				'rec1',
				50,
				'offset123',
			);

			expect(response.result).toEqual({
				content: [{
					type: 'text',
					text: JSON.stringify({
						comments: [{
							id: 'com123',
							createdTime: '2021-03-01T09:00:00.000Z',
							lastUpdatedTime: null,
							text: 'Test comment',
							author: {
								id: 'usr123',
								email: 'test@example.com',
								name: 'Test User',
							},
						}],
						offset: null,
					}, null, 2),
				}],
				structuredContent: {
					comments: [{
						id: 'com123',
						createdTime: '2021-03-01T09:00:00.000Z',
						lastUpdatedTime: null,
						text: 'Test comment',
						author: {
							id: 'usr123',
							email: 'test@example.com',
							name: 'Test User',
						},
					}],
					offset: null,
				},
			});
		});
	});

	afterEach(async () => {
		await server.close();
	});
});
