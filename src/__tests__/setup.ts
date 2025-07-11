import { PublicKey } from '@solana/web3.js';

// Global test setup
beforeAll(() => {
  console.log('🧪 Starting Integration Test Suite');
  console.log('📊 Testing with real-world data and APIs');
  console.log('⚠️  This may take several minutes...\n');
  
  // Verify environment variables are set
  const requiredEnvVars = [
    'RAPID_API_KEY',
    'SOLANA_TRACKER_API_KEY', 
    'OPENAI_API_KEY',
    'SOLANA_RPC_URL',
    'SOLANA_PRIVATE_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    console.error('Please set these variables in your .env file:');
    missingVars.forEach(varName => {
      console.error(`  ${varName}=your_value_here`);
    });
    process.exit(1);
  }
  
  // Set test environment
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  console.log('\n🎉 Integration Test Suite Completed');
  console.log('📊 All tests executed with real-world data');
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Rate limiting helpers
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Checks if a given string is a valid Solana public key (address).
 * @param {string} address - The address to validate.
 * @returns {boolean} - True if the address is valid, false otherwise.
 */
export const isValidSolanaAddress = (address: string): boolean => {
  try {
    // Check if the input is a string and not empty
    if (typeof address !== 'string' || address.trim() === '') {
      return false;
    }

    // Attempt to create a PublicKey object
    const publicKey = new PublicKey(address);

    // Verify the address is 32 bytes and properly decoded
    return publicKey.toBytes().length === 32;
  } catch (error) {
    // If PublicKey constructor throws (e.g., invalid base58, wrong length), return false
    return false;
  }
};

// Test utilities
export const expectValidTokenMint = (mint: string) => {
  expect(isValidSolanaAddress(mint)).toBe(true);
};

export const expectValidTimestamp = (timestamp: number) => {
  expect(timestamp).toBeGreaterThan(Date.now() - 24 * 60 * 60 * 1000); // Within last 24 hours
  expect(timestamp).toBeLessThanOrEqual(Date.now() + 1000); // Not in future
};

export const expectValidPercentage = (value: number) => {
  expect(value).toBeGreaterThanOrEqual(0);
  expect(value).toBeLessThanOrEqual(100);
};

export const expectValidPriceChange = (change: number) => {
  expect(change).toBeGreaterThan(-99.99); // Can't lose more than 100%
  expect(change).toBeLessThan(10000); // Reasonable upper bound
};

export const expectValidRiskScore = (score: number) => {
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(10);
};

export const expectValidConfidenceScore = (score: number) => {
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
};