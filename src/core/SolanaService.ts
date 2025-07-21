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
}
