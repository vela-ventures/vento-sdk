# Vento SDK

Lightweight TypeScript SDK for AO DEX aggregation. Works in browsers and Node.js.

## Installation

```bash
npm install @vela-ventures/vento-sdk
```

## Quick Start

### Browser Usage

```javascript
import { VentoClient } from '@vela-ventures/vento-sdk';
import { createSigner } from '@permaweb/aoconnect';

// Connect wallet and create signer
await window.arweaveWallet.connect();
const signer = createSigner(window.arweaveWallet);

// Initialize client
const client = new VentoClient({
  signer
});

// Get user address
const userAddress = await window.arweaveWallet.getActiveAddress();

// Get swap quote
const quote = await client.getSwapQuote({
  fromTokenId: '0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc', // AO
  toTokenId: 'xU9zFkq3X2ZQ6olwNVvr1vUWIjc3kXTWr7xKQD6dh10',   // wAR
  amount: 1000000000000,
  userAddress
});

// Execute swap
const minAmount = VentoClient.calculateMinAmount(quote.bestRoute.estimatedOutput, 1);
const result = await client.executeSwap(
  quote.bestRoute,
  quote.fromTokenId,
  quote.toTokenId,
  quote.inputAmount,
  minAmount,
  userAddress
);

console.log('Swap completed:', result.messageId);
```

### Reverse Quote (Find Best Route for Desired Output)

```javascript
// Find the best route to get exactly 100 Token B
const reverseQuote = await client.getReverseQuote({
  fromTokenId: 'tokenA',
  toTokenId: 'tokenB', 
  desiredOutput: 100000000000000, // 100 tokens (raw amount)
  userAddress: 'your-address'
});

console.log(`Best route requires ${reverseQuote.bestRoute?.inputWithFee} Token A`);
console.log(`Found ${reverseQuote.routes.length} possible routes`);
```

> 📖 See [REVERSE_QUOTE.md](./REVERSE_QUOTE.md) for detailed documentation and examples.

### Node.js Usage

```javascript
import { VentoClient } from '@vela-ventures/vento-sdk';

// Initialize without signer for read operations
const client = new VentoClient();

// Get pools
const pools = await client.getPools();

// Get quotes
const quote = await client.getSwapQuote({
  fromTokenId: 'token1',
  toTokenId: 'token2',
  amount: 1000000,
  userAddress: 'user-address'
});

// Prepare message for external signing
const minAmount = VentoClient.calculateMinAmount(quote.bestRoute.estimatedOutput, 1);
const messageResponse = await client.prepareSwapMessage({
  route: quote.bestRoute,
  fromTokenId: 'token1',
  toTokenId: 'token2',
  amount: 1000000,
  minAmount,
  userAddress: 'user-address'
});
```

## API Reference

### Constructor

```javascript
new VentoClient({ apiBaseUrl?, timeout?, signer? })
```

### Methods

#### Core Methods
- `getSwapQuote(request)` - Get swap quotes for input amount
- `getReverseQuote(request)` - Get quotes for desired output amount ✨ **NEW**
- `executeSwap(route, fromTokenId, toTokenId, amount, minAmount, userAddress)` - Execute swap
- `prepareSwapMessage(request)` - Prepare unsigned message
- `signAndSendMessage(unsignedMessage)` - Sign and send message

#### Utility Methods
- `getPools(forceRefresh?)` - Get available pools
- `getBestRoute(fromTokenId, toTokenId, amount, userAddress?)` - Get best route
- `hasValidPair(fromTokenId, toTokenId)` - Check if pair exists
- `VentoClient.calculateMinAmount(estimatedOutput, slippagePercent)` - Calculate slippage

## Usage Modes

### With Signer (Full functionality)
```javascript
const client = new VentoClient({ signer }); // Can execute swaps
```

### Without Signer (Read-only)
```javascript
const client = new VentoClient(); // Can get quotes and prepare messages
```

## Error Handling

```javascript
try {
  const result = await client.executeSwap(route, fromToken, toToken, amount, minAmount, userAddress);
} catch (error) {
  if (error.message.includes('No signer provided')) {
    console.log('Please initialize client with a signer');
  } else {
    console.error('Swap failed:', error.message);
  }
}
```

## Requirements

- **Browser**: ArConnect extension or compatible wallet
- **Node.js**: 16+
- **Dependencies**: `@permaweb/aoconnect` for signer creation

## Features

- ✅ Universal compatibility (browser + Node.js)
- ✅ Multiple DEX support (Botega, Permaswap)
- ✅ Route optimization
- ✅ Slippage protection
- ✅ TypeScript support
- ✅ Signer-based architecture

## License

MIT 