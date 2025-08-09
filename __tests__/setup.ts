// Jest setup file
import { config } from 'dotenv';
import { TextEncoder, TextDecoder } from 'util';

// Load environment variables from .env file
config({ path: '.env.test' });

// Add TextEncoder and TextDecoder to global scope for tests
global.TextEncoder = TextEncoder as any;
(global as any).TextDecoder = TextDecoder;

// Set a longer timeout for all tests (can be overridden in individual tests)
jest.setTimeout(30000); // 30 seconds

// Add any global test setup here
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});

afterAll(async () => {
  // Cleanup after all tests
});
