Object.defineProperty(globalThis, 'fetch', {
  value: async function() { console.log('intercepted'); return await Object.getOwnPropertyDescriptor(globalThis, 'fetch').value.apply(this, arguments); },
  configurable: true,
  writable: true
});
