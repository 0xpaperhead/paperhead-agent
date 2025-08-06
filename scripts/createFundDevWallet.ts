import fs from 'fs';
import path from 'path';
import readline from 'readline';
import bs58 from 'bs58';
import { Keypair, Connection, clusterApiUrl } from '@solana/web3.js';

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    })
  );
}

async function main() {
  const walletPath = path.resolve('./devnet-wallet.json');
  const envExamplePath = path.resolve('./.env.example');
  const envPath = path.resolve('./.env');

  // Ask before overriding
  const confirm = await prompt(
    'Are you sure you want to generate a new devnet wallet? This will override devnet-wallet.json if it exists. (y/N): '
  );
  if (confirm.toLowerCase() !== 'y') {
    console.log('Aborted wallet generation.');
    process.exit(0);
  }

  // Generate keypair and write dev-wallet.json
  const keypair = Keypair.generate();
  fs.writeFileSync(walletPath, JSON.stringify(Array.from(keypair.secretKey)));
  console.log(`\n✅ Wallet generated: ${walletPath}`);

  const publicKey = keypair.publicKey.toBase58();
  console.log(`🔑 Public Key: ${publicKey}`);

  // Fund devnet wallet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const signature = await connection.requestAirdrop(keypair.publicKey, 2e9);
  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      signature,
      ...latestBlockhash,
    },
    'confirmed'
  );

  // Check balance
  const balance = await connection.getBalance(keypair.publicKey);

  // Calculate actual amount airdropped (lamports → SOL)
  const airdroppedSol = balance / 1e9;

  console.log(`\n✅ Airdropped ${airdroppedSol} SOL to: ${keypair.publicKey.toBase58()}`);

  const base58PrivateKey = bs58.encode(keypair.secretKey);
  console.log('\n💡 Add this to your .env file if skipping auto-update:');
  console.log(`SOLANA_PRIVATE_KEY=${base58PrivateKey}`);
  console.log(`SOLANA_RPC_URL=https://api.devnet.solana.com\n`);

  // Prompt to create new .env file
  const answer = await prompt('Do you want to create/update your .env file? (y/N): ');
  if (answer.toLowerCase() === 'y') {
    if (!fs.existsSync(envExamplePath)) {
      console.error('❌ .env.example file not found. Cannot create .env automatically.');
      process.exit(1);
    }
    let envContent = fs.readFileSync(envExamplePath, 'utf-8');

    envContent = envContent
      .replace(/SOLANA_PRIVATE_KEY=.*/g, `SOLANA_PRIVATE_KEY=${base58PrivateKey}`)
      .replace(/SOLANA_RPC_URL=.*/g, `SOLANA_RPC_URL=https://api.devnet.solana.com`);

    fs.writeFileSync(envPath, envContent);
    console.log(`\n✅ .env file created at: ${envPath}`);
  } else {
    console.log('Skipping .env creation. Make sure to update it manually.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});