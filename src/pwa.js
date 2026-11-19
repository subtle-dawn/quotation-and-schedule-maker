// Relative to the page so GitHub Pages project paths and local file use still work.
if (import.meta.env.PROD && ['https:', 'http:'].includes(location.protocol) && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('./sw.js', location.href)).catch(error => {
      console.warn('オフライン機能を登録できませんでした。', error);
    });
  });
}
