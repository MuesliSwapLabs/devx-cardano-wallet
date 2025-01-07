declare global {
  interface Window {
    cardano: {
      [name: string]: {};
    };
  }
}

console.log('Injecting!!! Hello World');
// TODO: Inject actual CIP30 compliant connector here
window.cardano = {
  ...(window.cardano || {}),
  devx: 'Hello World asdf in src with proper ts injection.',
};

export {};
