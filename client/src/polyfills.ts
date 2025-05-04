// Polyfills for Solana web3.js
(window as any).global = window;
(window as any).process = {
  env: { NODE_ENV: 'development' }
};
(window as any).Buffer = {
  isBuffer: () => false
};