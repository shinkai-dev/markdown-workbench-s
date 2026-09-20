window.MarkdownViewer = window.MarkdownViewer || {};
(function (M) {
  var scales = new WeakMap();
  var sequence = 0;
  var renderQueue = Promise.resolve();

  function escapeText(text) {
    var d = document.createElement('div');
    d.textContent = text == null ? '' : String(text);
    return d.innerHTML;
  }

  function errorHtml(message) {
    return '<div class="mermaid-error"><strong>'+M.t('mermaidError')+'</strong><div>' + escapeText(message) + '</div></div>';
  }

  function makeBlock(source) {
    var block = document.createElement('section');
    block.className = 'mermaid-block';
    block.setAttribute('data-mermaid-block', 'true');
    block.innerHTML =
      '<div class="mermaid-toolbar"><strong>Mermaid</strong><span class="spacer"></span>' +
      '<button type="button" class="toolbar-btn mermaid-zoom-out" title="'+M.t('zoomOut')+'">−</button>' +
      '<button type="button" class="toolbar-btn mermaid-zoom-reset" title="100%">100%</button>' +
      '<button type="button" class="toolbar-btn mermaid-zoom-in" title="'+M.t('zoomIn')+'">+</button>' +
      '<button type="button" class="toolbar-btn mermaid-source-toggle" aria-pressed="false">'+M.t('source')+'</button>' +
      '<button type="button" class="toolbar-btn mermaid-redraw">'+M.t('redraw')+'</button>' +
      '</div>' +
      '<div class="mermaid-canvas" role="img" aria-label="'+M.t('mermaidDiagram')+'"></div>' +
      '<pre class="mermaid-source"><code>' + escapeText(source) + '</code></pre>';
    block._mermaidSource = source;
    return block;
  }

  function readPlaceholders(root) {
    return Array.prototype.slice.call(root.querySelectorAll('.mv-mermaid-placeholder'));
  }

  function mountPlaceholders(root) {
    readPlaceholders(root).forEach(function (placeholder) {
      if (placeholder._mvMounted) return;
      var sourceNode = placeholder.querySelector('.mv-mermaid-source-data');
      var source = sourceNode ? sourceNode.value : '';
      var block = makeBlock(source);
      placeholder.replaceWith(block);
      placeholder._mvMounted = true;
    });
  }

  function draw(block) {
    var canvas = block.querySelector('.mermaid-canvas');
    var code = block._mermaidSource || '';
    if (!canvas) return Promise.resolve();

    var scale = scales.get(block) || 1;
    canvas.setAttribute('aria-busy', 'true');
    canvas.innerHTML = '<div class="mermaid-loading">'+M.t('rendering')+'</div>';

    if (!window.mermaid || typeof window.mermaid.render !== 'function') {
      canvas.innerHTML = errorHtml('Mermaid is not loaded. Place the official Mermaid 10.9.8 UMD build at vendor/mermaid.min.js.');
      canvas.removeAttribute('aria-busy');
      return Promise.resolve();
    }

    renderQueue = renderQueue.then(async function () {
      try {
        var theme = document.documentElement.dataset.theme === 'dark' ? 'dark' :
          (document.documentElement.dataset.theme === 'high-contrast' ? 'base' : 'default');
        window.mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: theme
        });

        var id = 'mv-mermaid-' + (++sequence);
        var result = await window.mermaid.render(id, code);
        if (!result || typeof result.svg !== 'string') {
          throw new Error('Mermaid.render() did not return SVG.');
        }

        // Critical: result.svg comes directly from Mermaid. Do not pass it through
        // marked or DOMPurify. Mermaid is already configured with securityLevel=strict.
        canvas.innerHTML = result.svg;
        if (typeof result.bindFunctions === 'function') {
          result.bindFunctions(canvas);
        }

        var svg = canvas.querySelector('svg');
        if (svg) {
          svg.style.transform = 'scale(' + scale + ')';
          svg.style.transformOrigin = 'top center';
          svg.style.display = 'inline-block';
        }
      } catch (e) {
        canvas.innerHTML = errorHtml(e && e.message ? e.message : String(e));
      } finally {
        canvas.removeAttribute('aria-busy');
      }
    });

    return renderQueue;
  }

  function bind(block) {
    if (block.dataset.bound === '1') return;
    block.dataset.bound = '1';

    block.querySelector('.mermaid-zoom-in').addEventListener('click', function () {
      scales.set(block, Math.min(3, (scales.get(block) || 1) + 0.1));
      draw(block);
    });
    block.querySelector('.mermaid-zoom-out').addEventListener('click', function () {
      scales.set(block, Math.max(0.4, (scales.get(block) || 1) - 0.1));
      draw(block);
    });
    block.querySelector('.mermaid-zoom-reset').addEventListener('click', function () {
      scales.set(block, 1);
      draw(block);
    });
    block.querySelector('.mermaid-redraw').addEventListener('click', function () {
      draw(block);
    });
    block.querySelector('.mermaid-source-toggle').addEventListener('click', function () {
      var show = block.classList.toggle('show-source');
      this.setAttribute('aria-pressed', String(show));
    });
  }

  M.renderMermaid = function (root) {
    if (!root) return;
    mountPlaceholders(root);
    var blocks = root.querySelectorAll('.mermaid-block[data-mermaid-block="true"]');
    Array.prototype.forEach.call(blocks, function (block) {
      if (!scales.has(block)) scales.set(block, 1);
      bind(block);
      draw(block);
    });
  };

  M.redrawMermaid = function () {
    var root = document.querySelector('.doc');
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('.mermaid-block[data-mermaid-block="true"]'), function (block) {
      draw(block);
    });
  };
})(window.MarkdownViewer);
