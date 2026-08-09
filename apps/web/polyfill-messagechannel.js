// Polyfill for MessageChannel on Cloudflare Pages Functions
// Cloudflare Pages Functions runtime doesn't have MessageChannel
if (typeof globalThis.MessageChannel === 'undefined') {
  class MessageChannel {
    constructor() {
      this.port1 = { postMessage: () => {}, onmessage: null };
      this.port2 = { postMessage: () => {}, onmessage: null };
    }
  }
  globalThis.MessageChannel = MessageChannel;
}