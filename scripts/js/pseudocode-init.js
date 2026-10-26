/* global pseudocode, MathJax, btf */
'use strict';

(() => {
  let queue = Promise.resolve();

  async function renderAlgorithms() {
    const sources = [...document.querySelectorAll('pre.pseudocode-source')];
    if (!sources.length || !window.pseudocode) return;
    // MathJax starts at DOM readiness, independently of slow images/resources.
    if (!window.MathJax || !MathJax.startup || !MathJax.startup.promise) {
      const loader = document.getElementById('MathJax-script');
      if (!loader) return;
      await new Promise((resolve, reject) => {
        loader.addEventListener('load', resolve, { once: true });
        loader.addEventListener('error', () => reject(new Error('Local MathJax failed to load.')), { once: true });
      });
    }
    await MathJax.startup.promise;
    for (const source of sources) {
      if (!source.isConnected) continue;
      const container = source.parentElement;
      const result = document.createElement('div');
      result.className = 'pseudocode-rendered';
      result.setAttribute('role', 'figure');
      try {
        // Local compatibility patch leaves math as delimiters for async MathJax 4.
        result.innerHTML = pseudocode.renderToString(source.textContent, {
          lineNumber: true,
          captionCount: document.querySelectorAll('.pseudocode-rendered').length,
          noEnd: false
        });
        container.appendChild(result);
        await MathJax.typesetPromise([result]);
        source.remove();
      } catch (error) {
        if (MathJax.typesetClear) MathJax.typesetClear([result]);
        result.remove();
        container.dataset.pseudocodeError = 'true';
        console.error('Algorithm rendering failed; source retained.', error);
      }
    }
  }

  function schedule() {
    queue = queue.then(renderAlgorithms).catch(error => console.error('Pseudocode:', error));
  }

  if (document.readyState !== 'loading') schedule();
  else document.addEventListener('DOMContentLoaded', schedule, { once: true });
  document.addEventListener('pjax:complete', schedule);
  if (window.btf && btf.addGlobalFn) btf.addGlobalFn('encrypt', schedule, 'pseudocode');
})();
