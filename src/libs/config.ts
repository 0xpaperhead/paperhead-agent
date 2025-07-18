import dotenv from 'dotenv';
dotenv.config();

export const Config = {

  server: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '8080'),
    apiKey: process.env.INTERNAL_API_KEY!,
  },

  rapidApi: {
    apiKey: process.env.RAPID_API_KEY!,
  },

  agent: {
    solana_rpc_url: process.env.SOLANA_RPC_URL!,
    solana_private_key: process.env.SOLANA_PRIVATE_KEY!,
    openai_api_key: process.env.OPENAI_API_KEY!,
  },
  solanaTracker: {
    apiKey: process.env.SOLANA_TRACKER_API_KEY!,
  },
  moralis: {
    apiKey: process.env.MORALIS_API_KEY!,
  } 

}