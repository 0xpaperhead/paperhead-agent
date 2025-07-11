import { Connection, PublicKey, AccountInfo, ParsedAccountData } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';

/**
 * Get the token balance for a specific mint in a wallet
 */
export async function getTokenBalance(
  connection: Connection,
  walletPublicKey: PublicKey,
  tokenMint: PublicKey
): Promise<number> {
  try {
    // Get the associated token account for this mint
    const associatedTokenAddress = await getAssociatedTokenAddress(
      tokenMint,
      walletPublicKey
    );

    // Get the account info
    const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
    
    if (!accountInfo) {
      // Account doesn't exist, balance is 0
      return 0;
    }

    // Parse the account data to get the balance
    const accountData = await connection.getParsedAccountInfo(associatedTokenAddress);
    
    if (accountData?.value?.data && 'parsed' in accountData.value.data) {
      const parsedData = accountData.value.data as ParsedAccountData;
      const balance = parsedData.parsed?.info?.tokenAmount?.uiAmount || 0;
      return balance;
    }

    return 0;
  } catch (error) {
    console.warn(`Failed to get token balance for ${tokenMint.toString()}:`, error);
    return 0;
  }
}

/**
 * Get all token balances for a wallet
 */
export async function getAllTokenBalances(
  connection: Connection,
  walletPublicKey: PublicKey
): Promise<Map<string, number>> {
  const balances = new Map<string, number>();
  
  try {
    // Get all token accounts for this wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPublicKey,
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

/**
 * Check if a token account exists for a given mint
 */
export async function tokenAccountExists(
  connection: Connection,
  walletPublicKey: PublicKey,
  tokenMint: PublicKey
): Promise<boolean> {
  try {
    const associatedTokenAddress = await getAssociatedTokenAddress(
      tokenMint,
      walletPublicKey
    );

    const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
    return accountInfo !== null;
  } catch (error) {
    console.warn(`Failed to check token account existence:`, error);
    return false;
  }
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: number, decimals: number = 6): string {
  if (amount === 0) return '0';
  
  if (amount < 0.000001) {
    return amount.toExponential(2);
  }
  
  if (amount < 1) {
    return amount.toFixed(6);
  }
  
  if (amount < 1000) {
    return amount.toFixed(2);
  }
  
  if (amount < 1000000) {
    return (amount / 1000).toFixed(1) + 'K';
  }
  
  return (amount / 1000000).toFixed(1) + 'M';
}

/**
 * Calculate USD value from SOL amount
 */
export function calculateUSDValue(solAmount: number, solPriceUSD: number): number {
  return solAmount * solPriceUSD;
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Validate if a string is a valid Solana public key
 */
export function isValidSolanaPublicKey(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get token decimals from mint account
 */
export async function getTokenDecimals(
  connection: Connection,
  tokenMint: PublicKey
): Promise<number> {
  try {
    const mintInfo = await connection.getParsedAccountInfo(tokenMint);
    
    if (mintInfo?.value?.data && 'parsed' in mintInfo.value.data) {
      const parsedData = mintInfo.value.data as ParsedAccountData;
      return parsedData.parsed?.info?.decimals || 6;
    }
    
    return 6; // Default decimals
  } catch (error) {
    console.warn(`Failed to get token decimals for ${tokenMint.toString()}:`, error);
    return 6;
  }
}

/**
 * Convert raw token amount to UI amount
 */
export function rawToUiAmount(rawAmount: number, decimals: number): number {
  return rawAmount / Math.pow(10, decimals);
}

/**
 * Convert UI amount to raw token amount
 */
export function uiToRawAmount(uiAmount: number, decimals: number): number {
  return Math.floor(uiAmount * Math.pow(10, decimals));
}