import {
	describe, test, expect, vi, beforeEach, afterEach,
	type Mock,
} from 'vitest';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {AirtableMCPServer} from './mcpServer.js';

// Mock the required modules
vi.mock('./mcpServer.js');

describe('Main Application', () => {
	// Save original argv
	const originalArgv = process.argv;
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks();

		// Reset process.argv
		process.argv = originalArgv;
		process.env = originalEnv;
	});

	test('exits with error when no API key is provided', async () => {
		// Set argv to simulate no arguments
		process.argv = ['node', 'index.js'];
		process.env = {};
		const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

		// Import the module and give it a chance to run
		await import('./index.js');
		await new Promise<void>((resolve) => {
			setTimeout(() => {
				resolve();
			}, 100);
		});

		// Verify it tried to exit with error
		expect(mockExit).toHaveBeenCalledWith(1);
		mockExit.mockRestore();
	});

	test('creates services and connects server with valid API key from command line', async () => {
		// Set argv to simulate valid API key argument
		process.argv = ['node', 'index.js', 'test-api-key'];
		process.env = {};

		// Mock the connect method
		const mockConnect = vi.fn();
		(AirtableMCPServer as Mock).mockImplementation(() => ({
			connect: mockConnect,
		}));

		// Import and execute main
		await import('./index.js');

		// Verify service creation and connection
		expect(AirtableMCPServer).toHaveBeenCalled();
		expect(mockConnect.mock.calls[0][0]).toBeInstanceOf(StdioServerTransport);
	});

	test('creates services and connects server with valid API key from environment', async () => {
		// Set argv to simulate valid API key argument
		process.argv = ['node', 'index.js'];
		process.env = {AIRTABLE_API_KEY: 'test-api-key'};

		// Mock the connect method
		const mockConnect = vi.fn();
		(AirtableMCPServer as Mock).mockImplementation(() => ({
			connect: mockConnect,
		}));

		// Import and execute main
		await import('./index.js');

		// Verify service creation and connection
		expect(AirtableMCPServer).toHaveBeenCalled();
		expect(mockConnect.mock.calls[0][0]).toBeInstanceOf(StdioServerTransport);
	});

	// Cleanup
	afterEach(() => {
		process.argv = originalArgv;
		process.env = originalEnv;
		vi.resetModules();
	});
});
