import { PublicKey } from "@solana/web3.js";

export const isValidSolanaAddress = (address: string): boolean => {
  try {
    const publicKey = new PublicKey(address);
    return publicKey.toBytes().length === 32;
  } catch (error) {
    return false;
  }
};
