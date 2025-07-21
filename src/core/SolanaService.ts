import { Connection, Keypair, PublicKey, ParsedAccountData } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import base58 from "bs58";
import { Config } from "../config/index.js";

export class SolanaService {
  public connection: Connection;
  public keypair: Keypair;

  constructor() {
    this.connection = new Connection(Config.agent.solana_rpc_url, 'confirmed');
    this.keypair = Keypair.fromSecretKey(base58.decode(Config.agent.solana_private_key));
    console.log(`✅ Solana Service initialized. Wallet: ${this.keypair.publicKey.toBase58()}`);
  }

  public getWalletPublicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  public async getWalletBalance(): Promise<number> {
    const balance = await this.connection.getBalance(this.keypair.publicKey);
    return balance / 1e9; // Convert lamports to SOL
  }

  public async getTokenBalance(mintAddress: string): Promise<number> {
    try {
      const tokenMint = new PublicKey(mintAddress);
      const associatedTokenAddress = await getAssociatedTokenAddress(
        tokenMint,
        this.keypair.publicKey
      );

      const accountInfo = await this.connection.getParsedAccountInfo(associatedTokenAddress);

      if (accountInfo?.value?.data && 'parsed' in accountInfo.value.data) {
        const parsedData = accountInfo.value.data as ParsedAccountData;
        const balance = parsedData.parsed?.info?.tokenAmount?.uiAmount || 0;
        return balance;
      }

      return 0;
    } catch (error) {
      // It's common for an account to not exist, so we can treat this as a warning.
      // console.warn(`Could not get token balance for ${mintAddress}:`, error);
      return 0;
    }
  }

  public async getAllTokenBalances(): Promise<Map<string, number>> {
    const balances = new Map<string, number>();
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.keypair.publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      for (const tokenAccount of tokenAccounts.value) {
        const accountData = tokenAccount.account.data as ParsedAccountData;
        const mintAddress = accountData.parsed?.info?.mint;
        const balance = accountData.parsed?.info?.tokenAmount?.uiAmount || 0;

        if (mintAddress && balance > 0) {
          balances.set(mintAddress, balance);
        }
      }
    } catch (error) {
      console.error('Failed to get all token balances:', error);
    }
    return balances;
  }

  public async getTokenPrices(mintAddresses: string[]): Promise<Map<string, number>> {
    // Jupiter Price API V3 allows up to 50 ids per request – chunk the input accordingly
    const PRICES_ENDPOINT = "https://lite-api.jup.ag/price/v3";
    const prices = new Map<string, number>();

    // Helper to process one chunk of up to 50 mints
    const fetchChunk = async (mints: string[]) => {
      if (mints.length === 0) return;
      const idsParam = mints.join(",");
      const url = `${PRICES_ENDPOINT}?ids=${idsParam}`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Price API responded with ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        for (const [mint, priceData] of Object.entries<any>(data)) {
          if (priceData && typeof priceData.usdPrice === 'number') {
            prices.set(mint, priceData.usdPrice);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch prices for chunk:`, error);
      }
    };

    // Chunk mints and fetch in parallel
    const CHUNK_SIZE = 50;
    const chunks: Promise<void>[] = [];
    for (let i = 0; i < mintAddresses.length; i += CHUNK_SIZE) {
      const chunk = mintAddresses.slice(i, i + CHUNK_SIZE);
      chunks.push(fetchChunk(chunk));
    }
    await Promise.all(chunks);

    return prices;
  }

  /**
   * Get a breakdown of the wallet holdings by USD value using Jupiter Price API V3.
   * Returns an array of objects sorted by percentage of total USD value.
   */
  public async getWalletComposition(): Promise<Array<{
    mint: string;
    balance: number;
    usdPrice: number;
    valueUSD: number;
    percentage: number;
  }>> {
    // 1. Fetch token balances (SPL) and SOL balance
    const tokenBalancesMap = await this.getAllTokenBalances();
    const solBalance = await this.getWalletBalance();
    // Add native SOL using wrapped SOL mint address used by Jupiter API
    const SOL_MINT = "So11111111111111111111111111111111111111112";
    tokenBalancesMap.set(SOL_MINT, solBalance);

    const mintAddresses = Array.from(tokenBalancesMap.keys());

    // 2. Fetch USD prices for all mints
    const priceMap = await this.getTokenPrices(mintAddresses);

    // 3. Calculate value in USD for each token
    let totalValueUSD = 0;
    const breakdown: Array<{
      mint: string;
      balance: number;
      usdPrice: number;
      valueUSD: number;
      percentage: number;
    }> = [];

    for (const [mint, balance] of tokenBalancesMap) {
      const usdPrice = priceMap.get(mint) || 0;
      const valueUSD = balance * usdPrice;
      totalValueUSD += valueUSD;
      breakdown.push({ mint, balance, usdPrice, valueUSD, percentage: 0 });
    }

    // 4. Compute percentage representation and sort
    if (totalValueUSD > 0) {
      breakdown.forEach(item => {
        item.percentage = (item.valueUSD / totalValueUSD) * 100;
      });
    }

    breakdown.sort((a, b) => b.valueUSD - a.valueUSD);
    return breakdown;
  }
}
