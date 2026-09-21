// 只干一件事：挡住「调了不存在的东西」。setQuickGroup、MARK 都是这么炸的。
export default [{
  files: ['dev/fruit-heart.js'],
  languageOptions: {
    ecmaVersion: 2023,
    sourceType: 'script',
    globals: {
      window: 'readonly', document: 'readonly', console: 'readonly', navigator: 'readonly',
      localStorage: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
      setInterval: 'readonly', clearInterval: 'readonly', requestAnimationFrame: 'readonly',
      structuredClone: 'readonly', Blob: 'readonly', URL: 'readonly', FileReader: 'readonly', DOMParser: 'readonly',
      jQuery: 'readonly', $: 'readonly', toastr: 'readonly',
      getPreset: 'readonly', updatePresetWith: 'readonly', getLoadedPresetName: 'readonly',
      triggerSlash: 'readonly', getButtonEvent: 'readonly', eventOn: 'readonly',
      SillyTavern: 'readonly', TavernHelper: 'readonly', FruitHeartECoT: 'readonly', AbortSignal: 'readonly', AbortController: 'readonly', fetch: 'readonly', queueMicrotask: 'readonly', tavern_events: 'readonly', getSortableDelay: 'readonly', globalThis: 'readonly', crypto: 'readonly', performance: 'readonly', TextEncoder: 'readonly', self: 'readonly', define: 'readonly', module: 'readonly', process: 'readonly', global: 'readonly', ArrayBuffer: 'readonly',
    },
  },
  linterOptions: { reportUnusedDisableDirectives: false },
  rules: { 'no-undef': 'error' },
}];
