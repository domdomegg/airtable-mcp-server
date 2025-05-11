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
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { AirtableMCPServer } from './mcpServer.js';
import { AirtableService } from './airtableService.js';

// Run me with:
// AIRTABLE_API_KEY=pat1234.abcd RUN_INTEGRATION=TRUE npm run test -- 'src/e2e.test.ts'
(process.env.RUN_INTEGRATION ? describe : describe.skip)('AirtableMCPServer Integration', () => {
  let server: AirtableMCPServer;
  let serverTransport: InMemoryTransport;
  let clientTransport: InMemoryTransport;

  beforeEach(async () => {
    const apiKey = process.env.AIRTABLE_API_KEY;
    if (!apiKey) {
      throw new Error('AIRTABLE_API_KEY environment variable is required for integration tests');
    }

    const airtableService = new AirtableService(apiKey);
    server = new AirtableMCPServer(airtableService);
    [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
  });

  const sendRequest = async <T>(message: JSONRPCRequest): Promise<T> => {
    return new Promise((resolve, reject) => {
      // Set up response handler
      clientTransport.onmessage = (response: JSONRPCMessage) => {
        const typedResponse = response as JSONRPCResponse;
        if ('result' in typedResponse) {
          resolve(typedResponse.result as T);
          return;
        }
        reject(new Error('No result in response'));
      };

      clientTransport.send(message);
    });
  };

  test('should list available tools', async () => {
    const result = await sendRequest<ListToolsResult>({
      jsonrpc: '2.0',
      id: '1',
      method: 'tools/list',
      params: {},
    });

    expect(result.tools.map((t) => t.name)).toMatchInlineSnapshot(`
      [
        "list_records",
        "search_records",
        "list_bases",
        "list_tables",
        "describe_table",
        "get_record",
        "create_record",
        "update_records",
        "delete_records",
        "create_table",
        "update_table",
        "create_field",
        "update_field",
      ]
    `);
    expect(result.tools[0]).toMatchObject({
      name: 'list_records',
      description: expect.any(String),
      inputSchema: expect.objectContaining({
        type: 'object',
      }),
    });
  });

  test('should list bases', async () => {
    const result = await sendRequest<CallToolResult>({
      jsonrpc: '2.0',
      id: '1',
      method: 'tools/call',
      params: {
        name: 'list_bases',
        arguments: {},
      },
    });

    expect(result).toMatchObject({
      content: [{
        type: 'text',
        mimeType: 'application/json',
        text: expect.any(String),
      }],
      isError: false,
    });

    const content = JSON.parse(result.content[0]!.text as string);
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBeGreaterThan(0);
    expect(content[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      permissionLevel: expect.any(String),
    });
  });

  test('should list tables in a base', async () => {
    // First get a base ID
    const basesResult = await sendRequest<CallToolResult>({
      jsonrpc: '2.0',
      id: '1',
      method: 'tools/call',
      params: {
        name: 'list_bases',
        arguments: {},
      },
    });

    const bases = JSON.parse(basesResult.content[0]!.text as string);
    expect(bases.length).toBeGreaterThan(0);
    const baseId = bases[0]!.id;

    // Then list tables
    const result = await sendRequest<CallToolResult>({
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

    expect(result).toMatchObject({
      content: [{
        type: 'text',
        mimeType: 'application/json',
        text: expect.any(String),
      }],
      isError: false,
    });

    const content = JSON.parse(result.content[0]!.text as string);
    expect(Array.isArray(content)).toBe(true);
    if (content.length > 0) {
      expect(content[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        fields: expect.any(Array),
      });
    }
  });

  test('should list records in a table', async () => {
    // First get a base ID
    const basesResult = await sendRequest<CallToolResult>({
      jsonrpc: '2.0',
      id: '1',
      method: 'tools/call',
      params: {
        name: 'list_bases',
        arguments: {},
      },
    });

    const bases = JSON.parse(basesResult.content[0]!.text as string);
    expect(bases.length).toBeGreaterThan(0);
    const baseId = bases[0]!.id;

    // Then get a table ID
    const tablesResult = await sendRequest<CallToolResult>({
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

    const tables = JSON.parse(tablesResult.content[0]!.text as string);
    if (tables.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('Skipping list_records test as no tables found');
      return;
    }
    const tableId = tables[0]!.id;

    // Finally list records
    const result = await sendRequest<CallToolResult>({
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

    expect(result).toMatchObject({
      content: [{
        type: 'text',
        mimeType: 'application/json',
        text: expect.any(String),
      }],
      isError: false,
    });

    const content = JSON.parse(result.content[0]!.text as string);
    expect(Array.isArray(content)).toBe(true);
    if (content.length > 0) {
      expect(content[0]).toMatchObject({
        id: expect.any(String),
        fields: expect.any(Object),
      });
    }
  });

  test('should list records from a view', async () => {
    // First get a base ID
    const basesResult = await sendRequest<CallToolResult>({
      jsonrpc: '2.0',
      id: '1',
      method: 'tools/call',
      params: {
        name: 'list_bases',
        arguments: {},
      },
    });

    const bases = JSON.parse(basesResult.content[0]!.text as string);
    expect(bases.length).toBeGreaterThan(0);
    const baseId = bases[0]!.id;

    // Then get a table ID and view ID
    const tablesResult = await sendRequest<CallToolResult>({
      jsonrpc: '2.0',
      id: '2',
      method: 'tools/call',
      params: {
        name: 'list_tables',
        arguments: {
          baseId,
          detailLevel: 'full',
        },
      },
    });

    const tables = JSON.parse(tablesResult.content[0]!.text as string);
    if (tables.length === 0 || !tables[0]?.views || tables[0]?.views.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('Skipping list_records_from_view test as no tables or views found');
      return;
    }

    const tableId = tables[0]!.id;
    const viewId = tables[0]!.views[0]!.id;

    // List records from the view
    const result = await sendRequest<CallToolResult>({
      jsonrpc: '2.0',
      id: '3',
      method: 'tools/call',
      params: {
        name: 'list_records',
        arguments: {
          baseId,
          tableId,
          view: viewId,
          maxRecords: 10,
        },
      },
    });

    expect(result).toMatchObject({
      content: [{
        type: 'text',
        mimeType: 'application/json',
        text: expect.any(String),
      }],
      isError: false,
    });

    const content = JSON.parse(result.content[0]!.text as string);
    expect(Array.isArray(content)).toBe(true);
    // Records might be empty if the view has filters that exclude all records
    if (content.length > 0) {
      expect(content[0]).toMatchObject({
        id: expect.any(String),
        fields: expect.any(Object),
      });
    }
  });

  test('should search records with view filtering', async () => {
    // First get a base ID
    const basesResult = await sendRequest<CallToolResult>({
      jsonrpc: '2.0',
      id: '1',
      method: 'tools/call',
      params: {
        name: 'list_bases',
        arguments: {},
      },
    });

    const bases = JSON.parse(basesResult.content[0]!.text as string);
    expect(bases.length).toBeGreaterThan(0);
    const baseId = bases[0]!.id;

    // Then get a table ID and view ID
    const tablesResult = await sendRequest<CallToolResult>({
      jsonrpc: '2.0',
      id: '2',
      method: 'tools/call',
      params: {
        name: 'list_tables',
        arguments: {
          baseId,
          detailLevel: 'full',
        },
      },
    });

    const tables = JSON.parse(tablesResult.content[0]!.text as string);
    if (tables.length === 0 || !tables[0]?.views || tables[0]?.views.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('Skipping search_records_with_view test as no tables or views found');
      return;
    }

    const tableId = tables[0]!.id;
    const viewId = tables[0]!.views[0]!.id;

    // Search records using the view
    const result = await sendRequest<CallToolResult>({
      jsonrpc: '2.0',
      id: '3',
      method: 'tools/call',
      params: {
        name: 'search_records',
        arguments: {
          baseId,
          tableId,
          view: viewId,
          searchTerm: 'a', // Using a common letter to increase chances of finding matches
          maxRecords: 10,
        },
      },
    });

    expect(result).toMatchObject({
      content: [{
        type: 'text',
        mimeType: 'application/json',
        text: expect.any(String),
      }],
      isError: false,
    });

    const content = JSON.parse(result.content[0]!.text as string);
    expect(Array.isArray(content)).toBe(true);
    // Records might be empty if no matches or if the view has filters that exclude all records
  });

  test('should list and read resources', async () => {
    // First list resources
    const listResult = await sendRequest<ListResourcesResult>({
      jsonrpc: '2.0',
      id: '1',
      method: 'resources/list',
      params: {},
    });

    expect(listResult).toMatchObject({
      resources: expect.any(Array),
    });

    if (listResult.resources.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('Skipping resource read test as no resources found');
      return;
    }

    // Then read the first resource
    const resource = listResult.resources[0]!;
    const readResult = await sendRequest<ReadResourceResult>({
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
  });

  afterEach(async () => {
    await server.close();
  });
});
