# Full System Test Script

This script runs the complete autonomous trading system integration test as a standalone script (converted from Jest test).

## Usage

### Prerequisites
Make sure you have all required environment variables set:

```bash
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

### Running the Script

#### Option 1: Direct execution with ts-node
```bash
npx ts-node src/scripts/fullSystemTest.ts
```

#### Option 2: Using npm script (if configured)
```bash
npm run system-test
```

#### Option 3: Compile and run with Node.js
```bash
# Compile TypeScript
npx tsc src/scripts/fullSystemTest.ts --outDir dist --target es2020 --module commonjs

# Run compiled JavaScript
node dist/scripts/fullSystemTest.js
```

## What the Script Does

The script performs a comprehensive 7-phase test of the autonomous trading system:

1. **🎯 PHASE 1: System Initialization**
   - Initializes the AgenticSystem
   - Validates initial state and data collection

2. **🎯 PHASE 2: Conservative Portfolio Generation**
   - Generates a 3-token conservative portfolio
   - Validates all token data and Solana addresses
   - Displays detailed portfolio analysis

3. **🎯 PHASE 3: Moderate Portfolio Generation**
   - Generates a 5-token moderate portfolio
   - Validates risk profile and allocations

4. **🎯 PHASE 4: Aggressive Portfolio Generation**
   - Generates a 4-token aggressive portfolio
   - Validates higher risk tolerance

5. **🎯 PHASE 5: System State Analysis**
   - Analyzes final system state
   - Validates portfolio persistence

6. **🎯 PHASE 6: Performance Metrics**
   - Measures total execution time
   - Validates performance requirements

7. **🎯 PHASE 7: Portfolio Comparison**
   - Compares risk profiles across all portfolios
   - Validates risk progression logic

## Expected Output

The script will provide comprehensive console output showing:
- ✅ Real-time progress updates
- 📊 Portfolio details and analysis
- 🪙 Token selections with reasoning
- 📈 Performance metrics
- 🎯 Risk profile comparisons
- ⚡ Success/failure status

## Performance Expectations

- **Duration**: 3-5 minutes
- **Portfolios**: 3 (Conservative, Moderate, Aggressive)
- **API Calls**: Uses real market data from live APIs
- **Validation**: Complete Solana address validation
- **Error Handling**: Comprehensive error reporting

## Error Handling

If the script fails, it will:
- Display detailed error information
- Clean up system resources
- Exit with error code 1
- Show exactly which phase failed

## Success Criteria

✅ All 7 phases complete successfully  
✅ 3 portfolios generated with real market data  
✅ All validations pass  
✅ Performance requirements met  
✅ System ready for autonomous trading  

## Troubleshooting

1. **Environment Variables**: Ensure all required API keys are set
2. **Network Issues**: Check internet connection for API calls
3. **API Limits**: Verify API rate limits haven't been exceeded
4. **Dependencies**: Run `npm install` to ensure all packages are installed

## Integration with CI/CD

This script can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run Full System Test
  run: npx ts-node src/scripts/fullSystemTest.ts
  env:
    RAPID_API_KEY: ${{ secrets.RAPID_API_KEY }}
    SOLANA_TRACKER_API_KEY: ${{ secrets.SOLANA_TRACKER_API_KEY }}
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    SOLANA_RPC_URL: ${{ secrets.SOLANA_RPC_URL }}
    SOLANA_PRIVATE_KEY: ${{ secrets.SOLANA_PRIVATE_KEY }}
``` 