import 'dotenv/config';
import { SolanaService } from '../src/core/SolanaService.js';

async function main() {
  try {
    console.log('────────────────────────────────────────────');
    console.log('🧪  Integration Test → SolanaService');
    console.log('────────────────────────────────────────────');

    // Instantiate service (reads RPC & key from env)
    const solana = new SolanaService();

    // 1. Wallet public key
    const pubkey = solana.getWalletPublicKey();
    console.log('\n🔑 Wallet Public Key:', pubkey.toBase58());

    // 2. Native SOL balance
    const solBalance = await solana.getWalletBalance();
    console.log('\n💰 Native SOL balance:', solBalance, 'SOL');

    // 3. All SPL token balances
    const allTokenBalances = await solana.getAllTokenBalances();
    console.log('\n🪙 SPL Token Balances (mint → balance):');
    if (allTokenBalances.size === 0) {
      console.log(' • No SPL token balances found for this wallet.');
    } else {
      allTokenBalances.forEach((bal, mint) => {
        console.log(` • ${mint} → ${bal}`);
      });
    }

    // 4. Fetch balance for a specific token if one exists in map (first entry)
    const firstTokenMint = allTokenBalances.keys().next().value;
    if (firstTokenMint) {
      const firstBal = await solana.getTokenBalance(firstTokenMint);
      console.log(`\n📌 Balance for first token (${firstTokenMint}):`, firstBal);
    }

    // 5. Get Jupiter V3 price lookup
    const mintAddresses = Array.from(allTokenBalances.keys());
    // Always include wrapped SOL mint for native SOL value
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    if (!mintAddresses.includes(SOL_MINT)) {
      mintAddresses.push(SOL_MINT);
    }

    const prices = await solana.getTokenPrices(mintAddresses);
    console.log('\n💱 Jupiter V3 Price Lookup (mint → USD Price):');
    if (prices.size === 0) {
      console.log(' • No prices found for this wallet.');
    } else {
      prices.forEach((price, mint) => {
        console.log(` • ${mint} → $${price.toFixed(4)}`);
      });
    }

    // 6. Get Jupiter V3 portfolio breakdown
    const composition = await solana.getWalletComposition();
    console.log('\n💰 Jupiter V3 Portfolio Breakdown:');
    if (composition.length === 0) {
      console.log(' • No portfolio holdings found for this wallet.');
    } else {
      composition.forEach(c =>
        console.log(
          `${c.mint}: ${c.balance} tokens × $${c.usdPrice.toFixed(4)} = $${c.valueUSD.toFixed(2)} (${c.percentage.toFixed(2)}%)`
        )
      );
    }

    console.log('\n✅ All SolanaService functions exercised successfully.');
    console.log('────────────────────────────────────────────');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

main(); 