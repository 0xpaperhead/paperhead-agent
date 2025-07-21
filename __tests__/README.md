# Integration Test Scripts

This folder contains lightweight TypeScript scripts that exercise parts of the project without using Jest or any other testing framework.  Each script is meant to be executed directly via **Node + ts-node** and simply prints its results to the console.

---

## Prerequisites

1. **Dependencies** – run `npm install` once in the project root.
2. **Environment** – copy or create a `.env` file in the project root and make sure all required variables are set:

   ```text
   OPENAI_API_KEY=<your-key>
   RAPID_API_KEY=<your-key>
   SOLANA_TRACKER_API_KEY=<your-key>
   SOLANA_RPC_URL=https://...
   SOLANA_PRIVATE_KEY=<base58-string>
   ```

   (Add any other variables your particular script relies on.)

---

## Running a Script via npm

A generic npm script has been added to `package.json`:

```json
"integration:test": "node --experimental-specifier-resolution=node --loader ts-node/esm"
```

Everything placed **after `--`** is forwarded to Node, so you can point it at any script file inside `__tests__` (or elsewhere).

### Example: run the NewsService integration test

```bash
npm run integration:test -- __tests__/newsService.integration.ts
```

### Example: run another script

```bash
npm run integration:test -- __tests__/myOtherScript.ts
```

---

## Running a Script Manually (optional)

If you prefer, you can invoke the loader directly without npm:

```bash
node --experimental-specifier-resolution=node --loader ts-node/esm __tests__/newsService.integration.ts
```

Or use the shorthand provided by **ts-node**:

```bash
npx ts-node-esm __tests__/newsService.integration.ts
```

---

## Adding New Integration Scripts

1. Create a new `*.ts` file in this folder (e.g., `coolFeature.integration.ts`).
2. Import the module(s) you want to test and write a small `main()` that calls them.
3. At the end of the file, call `main()` so the script runs when executed.

That’s it—no test runners or assertion libraries required unless you want them. 😊 