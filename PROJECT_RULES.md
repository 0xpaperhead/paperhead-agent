# Project Rules and Guidelines

## 🚨 **MANDATORY RULE: Test-First Development**

### **Every code change MUST include integration tests and be validated by running the tests.**

This rule applies to:
- ✅ All new features
- ✅ All bug fixes  
- ✅ All refactoring
- ✅ All configuration changes
- ✅ All dependency updates

### **Process:**
1. **Write integration tests** for your implementation
2. **Run the tests** to ensure they pass
3. **Fix any issues** discovered by the tests
4. **Document the validation** in your commit/PR

### **No Exceptions:**
- **No code merges** without passing tests
- **No "I'll add tests later"** - tests are written first
- **No mocks** - use real APIs and data for integration tests
- **No shortcuts** - every feature gets comprehensive testing

## 🔧 **Technical Standards**

### **Integration Test Requirements**
- **Real APIs**: Use actual external services (RapidAPI, SolanaTracker, OpenAI)
- **Real Data**: Test with live market data and blockchain connections
- **Real Validation**: Use proper Solana address validation with `PublicKey` class
- **Comprehensive Coverage**: Test error handling, edge cases, and performance
- **Environment Validation**: Ensure all required environment variables are set

### **Test Structure**
```typescript
// ✅ Good - Real integration test
test('should generate portfolio with real market data', async () => {
  const portfolio = await agenticSystem.generatePortfolioNow('moderate', 5);
  
  // Validate real Solana addresses
  portfolio.portfolio.tokens.forEach(token => {
    expect(isValidSolanaAddress(token.mint)).toBe(true);
  });
  
  // Validate real market conditions
  expect(portfolio.portfolio.metadata.basedOnData.totalTokensAnalyzed).toBeGreaterThan(0);
}, 120000); // Adequate timeout for real API calls
```

```typescript
// ❌ Bad - Mock test
test('should generate portfolio', async () => {
  const mockService = jest.fn().mockResolvedValue(mockData);
  // This doesn't test real-world scenarios
});
```

### **Solana Address Validation**
**Always use proper Solana validation:**
```typescript
import { PublicKey } from '@solana/web3.js';

const isValidSolanaAddress = (address: string): boolean => {
  try {
    const publicKey = new PublicKey(address);
    return publicKey.toBytes().length === 32;
  } catch (error) {
    return false;
  }
};
```

**Never use regex patterns** for Solana addresses - they're unreliable.

## 📋 **Development Workflow**

### **Before Writing Code:**
1. **Understand the requirement** thoroughly
2. **Design the integration test** approach
3. **Identify real APIs/data** needed for testing
4. **Set up test environment** with required credentials

### **While Writing Code:**
1. **Write integration tests** alongside implementation
2. **Test frequently** during development
3. **Use real data** to validate behavior
4. **Handle edge cases** discovered during testing

### **Before Committing:**
1. **Run full test suite** to ensure nothing breaks
2. **Validate performance** (tests should complete within reasonable time)
3. **Check test coverage** includes new functionality
4. **Document test results** in commit message

### **Example Commit Message:**
```
feat: Add portfolio risk assessment integration

- Implemented real-time risk scoring for Solana tokens
- Added comprehensive integration tests with live token data
- Validated with 58 real tokens from SolanaTracker API
- All tests pass (16/16) with proper Solana address validation
- Performance: Portfolio generation completes in <60s

Test Results:
✅ System initialization with blockchain connection
✅ Portfolio generation with real market data
✅ Solana address validation using PublicKey class
✅ Real API integration (news, sentiment, tokens)
✅ Error handling and resilience testing
```

## 🛠 **Tool Requirements**

### **Required Environment Variables**
```env
# Crypto News & Sentiment
RAPID_API_KEY=your_rapid_api_key

# Solana Token Data  
SOLANA_TRACKER_API_KEY=your_solana_tracker_api_key

# AI Analysis
OPENAI_API_KEY=your_openai_api_key

# Blockchain Connection
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=your_base58_encoded_private_key
```

### **Test Commands**
```bash
# Run all integration tests
npm test

# Run specific test file
npm test -- --testPathPattern=agenticSystem.integration.test.ts

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch
```

## 📊 **Quality Standards**

### **Test Coverage Requirements**
- **System Integration**: Complete end-to-end workflows
- **Service Integration**: Individual service testing with real APIs
- **Error Handling**: API failures, rate limits, network issues
- **Performance**: Response times, resource usage, concurrent operations
- **Data Validation**: Real-world data formats and edge cases

### **Performance Benchmarks**
- **Portfolio Generation**: < 60 seconds
- **API Response Times**: < 30 seconds per service
- **Test Suite**: Complete in < 20 minutes
- **Memory Usage**: Stable, no memory leaks

### **Reliability Standards**
- **Tests must pass consistently** (not flaky)
- **Handle API rate limits** gracefully
- **Validate all external dependencies**
- **Fail fast** on missing environment variables

## 🚫 **What NOT to Do**

### **Forbidden Practices:**
❌ **Mock external APIs** - defeats the purpose of integration testing
❌ **Skip test validation** - every implementation must be tested
❌ **Use fake data** - always use real market data
❌ **Ignore test failures** - fix the underlying issue
❌ **Commit without running tests** - breaks the development workflow
❌ **Use regex for Solana addresses** - unreliable and error-prone

### **Bad Examples:**
```typescript
// ❌ Don't do this
expect(token.mint).toMatch(/^[A-Za-z0-9]{32,44}$/);

// ❌ Don't do this  
const mockTokens = [{ mint: 'fake-address', symbol: 'FAKE' }];

// ❌ Don't do this
test('should work', () => {
  expect(true).toBe(true); // Meaningless test
});
```

## 🎯 **Success Metrics**

### **We know we're successful when:**
✅ **All tests pass** consistently across environments
✅ **Real market data** is processed correctly
✅ **Performance** meets benchmarks
✅ **Error handling** works in production scenarios
✅ **Code quality** is validated by comprehensive testing

### **Test Results Should Show:**
- **Real API integrations** working
- **Proper data validation** with real formats
- **Performance characteristics** under load
- **Error resilience** with actual failures
- **Production readiness** through comprehensive testing

## 🔄 **Continuous Improvement**

### **Regular Review:**
- **Monthly**: Review test coverage and performance
- **Weekly**: Check for new edge cases in production
- **Daily**: Ensure all tests pass before any merges

### **Test Enhancement:**
- **Add new tests** for production issues discovered
- **Update tests** when APIs change
- **Improve performance** of test suite
- **Expand coverage** for new features

---

## 📝 **Implementation Notes**

This rule was established after discovering that running real integration tests revealed:
- **Configuration issues** not caught by unit tests
- **API response format** differences from documentation  
- **Performance bottlenecks** under real load
- **Data validation errors** with actual market data
- **Network resilience** requirements

**The test-first approach ensures code works in production conditions from day one.**

---

**Remember: Code without integration tests is untested code. Untested code is broken code.**