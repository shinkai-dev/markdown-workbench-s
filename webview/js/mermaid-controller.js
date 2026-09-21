window.MarkdownViewer = window.MarkdownViewer || {};
(function (M) {
  var scales = new WeakMap();
  var initialized = new WeakMap();
  var sequence = 0;
  var renderQueue = Promise.resolve();
  var pans = new WeakMap();
  var activePointers = new WeakMap();
  var frameSizes = new WeakMap();
  var PAN_MARGIN = 220;
  var DEFAULT_FRAME_HEIGHT = 360;
  var MIN_AUTO_SCALE = 0.5;
  var ZOOM_LEVELS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];

  function escapeText(text) {
    var d = document.createElement('div');
    d.textContent = text == null ? '' : String(text);
    return d.innerHTML;
  }

  function errorHtml(message) {
    return '<div class="mermaid-error"><strong>Mermaid描画エラー</strong><div>' + escapeText(message) + '</div></div>';
  }

  function makeBlock(source) {
    var block = document.createElement('section');
    block.className = 'mermaid-block';
    block.setAttribute('data-mermaid-block', 'true');
    block.innerHTML =
      '<div class="mermaid-toolbar"><strong>Mermaid</strong><span class="spacer"></span>' +
      '<button type="button" class="toolbar-btn mermaid-zoom-out" title="'+M.t('mermaidZoomOut')+'" aria-label="'+M.t('mermaidZoomOut')+'">−</button>' +
      '<select class="toolbar-select mermaid-zoom-select" title="'+M.t('mermaidZoom')+'" aria-label="'+M.t('mermaidZoom')+'">' +
      '<option value="0.5">50%</option>' +
      '<option value="0.67">67%</option>' +
      '<option value="0.75">75%</option>' +
      '<option value="0.8">80%</option>' +
      '<option value="0.9">90%</option>' +
      '<option value="1" selected>100%</option>' +
      '<option value="1.1">110%</option>' +
      '<option value="1.25">125%</option>' +
      '<option value="1.5">150%</option>' +
      '<option value="1.75">175%</option>' +
      '<option value="2">200%</option>' +
      '<option value="2.5">250%</option>' +
      '<option value="3">300%</option>' +
      '</select>' +
      '<button type="button" class="toolbar-btn mermaid-zoom-in" title="'+M.t('mermaidZoomIn')+'" aria-label="'+M.t('mermaidZoomIn')+'">+</button>' +
      '<button type="button" class="toolbar-btn mermaid-source-toggle" aria-pressed="false">'+M.t('mermaidSource')+'</button>' +
      '<button type="button" class="toolbar-btn mermaid-open-diagram">'+M.t('mermaidOpen')+'</button>' +
      '</div>' +
      '<div class="mermaid-canvas" role="img" aria-label="Mermaid図"></div>' +
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
    canvas.innerHTML = '<div class="mermaid-loading">図を描画しています…</div>';

    if (!window.mermaid || typeof window.mermaid.render !== 'function') {
      canvas.innerHTML = errorHtml('Mermaidが読み込まれていません。vendor/mermaid.min.js に公式Mermaid 10.9.8のUMD版を配置してください。');
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
          throw new Error('Mermaid.render() がSVGを返しませんでした。');
        }

        // Critical: result.svg comes directly from Mermaid. Do not pass it through
        // marked or DOMPurify. Mermaid is already configured with securityLevel=strict.
        canvas.innerHTML = '';
        var stage = document.createElement('div');
        stage.className = 'mermaid-stage';
        var svgHolder = document.createElement('div');
        svgHolder.className = 'mermaid-svg-holder';
        svgHolder.innerHTML = result.svg;
        stage.appendChild(svgHolder);
        canvas.appendChild(stage);
        if (typeof result.bindFunctions === 'function') {
          result.bindFunctions(svgHolder);
        }

        var svg = svgHolder.querySelector('svg');
        if (svg) {
          var vb = (svg.getAttribute('viewBox') || '').trim().split(/[ ,]+/).map(Number);
          var naturalWidth = vb.length === 4 && isFinite(vb[2]) && vb[2] > 0 ? vb[2] : svg.getBBox().width;
          var naturalHeight = vb.length === 4 && isFinite(vb[3]) && vb[3] > 0 ? vb[3] : svg.getBBox().height;
          svg.removeAttribute('width');
          svg.removeAttribute('height');
          svg.style.width = naturalWidth + 'px';
          svg.style.height = naturalHeight + 'px';
          svg.style.maxWidth = 'none';
          svg.style.display = 'block';
          svg.style.transformOrigin = 'top left';

          /*
           * The canvas itself is the user-resizable frame.  It never becomes
           * wider than the document because horizontal overflow is hidden.
           * The diagram is positioned inside that frame and can be dragged
           * freely without changing the frame size.
           */
          var frame = frameSizes.get(block);
          if (!frame) {
            frame = { userSized: false };
            frameSizes.set(block, frame);
            if (!canvas.style.height) {
              canvas.style.height = Math.max(DEFAULT_FRAME_HEIGHT, Math.min(720, naturalHeight + 64)) + 'px';
            }
          }

          var frameWidth = canvas.clientWidth || 320;
          var frameHeight = canvas.clientHeight || DEFAULT_FRAME_HEIGHT;

          /*
           * Initial layout: keep ordinary diagrams at 100% and center them
           * horizontally at the top of the frame.  If the diagram is too
           * large, choose the largest predefined zoom level that fits both
           * dimensions.  When even the minimum automatic zoom cannot make
           * the diagram fit, keep that minimum zoom and anchor it at the
           * upper-left so no part of the initial view is hidden behind the
           * frame.
           */
          /*
           * Calculate the automatic initial zoom only once. Subsequent redraws
           * (including user zoom in/out) must preserve the explicitly selected
           * scale; otherwise every zoom operation would immediately jump back
           * to the initial fit scale.
           */
          if (!initialized.has(block)) {
            var fitScale = Math.min(1, frameWidth / naturalWidth, frameHeight / naturalHeight);
            var initialScale = 1;
            var oversized = fitScale < 1;
            if (oversized) {
              initialScale = MIN_AUTO_SCALE;
              for (var zi = 0; zi < ZOOM_LEVELS.length; zi++) {
                if (ZOOM_LEVELS[zi] <= fitScale + 0.0001) initialScale = ZOOM_LEVELS[zi];
              }
            }
            scale = initialScale;
            scales.set(block, scale);
            initialized.set(block, true);
          } else {
            scale = scales.get(block) || 1;
          }

          // Keep the zoom selector synchronized with the actual scale.
          // This is especially important for diagrams that are automatically
          // reduced on first display (for example 80% or 67%).
          var zoomSelect = block.querySelector('.mermaid-zoom-select');
          if (zoomSelect) {
            zoomSelect.value = String(scale);
          }

          var scaledWidth = naturalWidth * scale;
          var scaledHeight = naturalHeight * scale;
          var fitsFrame = scaledWidth <= frameWidth + 1 && scaledHeight <= frameHeight + 1;
          var baseLeft = fitsFrame ? Math.max(0, (frameWidth - scaledWidth) / 2) : 0;
          var baseTop = 0;
          var pan = {x: 0, y: 0};
          pans.set(block, pan);

          stage.style.width = '100%';
          stage.style.height = '100%';
          stage.style.minWidth = '0';
          stage.style.minHeight = '0';

          svgHolder.style.width = naturalWidth + 'px';
          svgHolder.style.height = naturalHeight + 'px';
          svgHolder.style.position = 'absolute';
          svgHolder.style.left = baseLeft + 'px';
          svgHolder.style.top = baseTop + 'px';
          svgHolder.style.transform = 'scale(' + scale + ')';
          svgHolder.style.transformOrigin = 'top left';
          canvas.dataset.panX = '0';
          canvas.dataset.panY = '0';
        }
      } catch (e) {
        canvas.innerHTML = errorHtml(e && e.message ? e.message : String(e));
      } finally {
        canvas.removeAttribute('aria-busy');
      }
    });

    return renderQueue;
  }

  function openDiagramInNewTab(block) {
    var holder = block.querySelector('.mermaid-svg-holder');
    var svg = holder && holder.querySelector('svg');
    if (!svg) {
      if (M.notify) M.notify(M.t('failed'));
      return;
    }

    var svgText = svg.outerHTML;
    if (M.vscode) {
      M.vscode.postMessage({
        type: 'openMermaid',
        svg: svgText,
        language: (M.settings && M.settings.language === 'en') ? 'en' : 'ja',
        theme: document.documentElement.dataset.theme || 'light'
      });
      return;
    }
    var isDark = document.documentElement.dataset.theme === 'dark';
    var isContrast = document.documentElement.dataset.theme === 'high-contrast';
    var bg = isDark ? '#101318' : (isContrast ? '#000' : '#f7f8fb');
    var fg = isDark ? '#e7eaf0' : (isContrast ? '#fff' : '#202634');
    var border = isDark ? '#303846' : (isContrast ? '#fff' : '#dce1e8');
    var surface = isDark ? '#171b22' : (isContrast ? '#000' : '#fff');
    var accent = isDark ? '#86a1ff' : (isContrast ? '#00e5ff' : '#4969d8');

    var html = '<!doctype html><html><head><meta charset="utf-8"><title>Mermaid</title>' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<style>' +
      'html,body{margin:0;width:100%;height:100%;overflow:hidden;background:' + bg + ';color:' + fg + ';font-family:system-ui,sans-serif}' +
      '.bar{position:fixed;z-index:10;top:12px;right:12px;display:flex;align-items:center;gap:6px;padding:6px;background:' + surface + ';border:1px solid ' + border + ';border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.18)}' +
      'button{border:1px solid ' + border + ';background:' + surface + ';color:' + fg + ';border-radius:6px;padding:4px 9px;font:inherit;font-size:13px;cursor:pointer}' +
      'button:hover{background:' + (isDark ? '#202631' : '#f1f4f8') + '}' +
      'select{border:1px solid ' + border + ';background:' + surface + ';color:' + fg + ';border-radius:6px;padding:4px 8px;font:inherit;font-size:13px}' +
      '.viewport{position:absolute;inset:0;overflow:hidden;cursor:grab;touch-action:none}' +
      '.viewport.dragging{cursor:grabbing}' +
      '.stage{position:absolute;left:0;top:0;transform-origin:top left;will-change:transform}' +
      'svg{display:block;max-width:none;height:auto}' +
      '</style></head><body>' +
      '<div class="bar"><button id="out" type="button" title="縮小">−</button>' +
      '<select id="zoom" aria-label="倍率">' +
      '<option value="0.5">50%</option><option value="0.67">67%</option><option value="0.75">75%</option><option value="0.8">80%</option><option value="0.9">90%</option><option value="1" selected>100%</option><option value="1.1">110%</option><option value="1.25">125%</option><option value="1.5">150%</option><option value="1.75">175%</option><option value="2">200%</option><option value="2.5">250%</option><option value="3">300%</option>' +
      '</select><button id="in" type="button" title="拡大">+</button></div>' +
      '<div id="viewport" class="viewport"><div id="stage" class="stage">' + svgText + '</div></div>' +
      '<script>(function(){' +
      'var viewport=document.getElementById("viewport"),stage=document.getElementById("stage"),svg=stage.querySelector("svg"),sel=document.getElementById("zoom");' +
      'var levels=[.5,.67,.75,.8,.9,1,1.1,1.25,1.5,1.75,2,2.5,3],scale=1,x=0,y=0,drag=null;' +
      'var vb=(svg.getAttribute("viewBox")||"").trim().split(/[ ,]+/).map(Number);' +
      'var nw=vb.length===4&&isFinite(vb[2])&&vb[2]>0?vb[2]:(svg.getBoundingClientRect().width||800);' +
      'var nh=vb.length===4&&isFinite(vb[3])&&vb[3]>0?vb[3]:(svg.getBoundingClientRect().height||600);' +
      'svg.removeAttribute("width");svg.removeAttribute("height");svg.style.width=nw+"px";svg.style.height=nh+"px";svg.style.maxWidth="none";' +
      'function center(){var w=viewport.clientWidth,h=viewport.clientHeight; x=Math.max(0,(w-nw*scale)/2); y=Math.max(72,(h-nh*scale)/2); render();}' +
      'function render(){stage.style.transform="translate("+x+"px,"+y+"px) scale("+scale+")";sel.value=String(scale)}' +
      'function setScale(v){scale=v;center()}' +
      'document.getElementById("in").onclick=function(){var i=levels.findIndex(function(v){return v>=scale-.0001});scale=levels[Math.min(levels.length-1,Math.max(0,i+1))];center()};' +
      'document.getElementById("out").onclick=function(){var i=levels.findIndex(function(v){return v>=scale-.0001});scale=levels[Math.max(0,i-1)];center()};' +
      'sel.onchange=function(){setScale(Number(this.value))};' +
      'viewport.addEventListener("pointerdown",function(e){if(e.button!==0)return;drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,x:x,y:y};viewport.classList.add("dragging");viewport.setPointerCapture(e.pointerId);e.preventDefault()});' +
      'viewport.addEventListener("pointermove",function(e){if(!drag||drag.id!==e.pointerId)return;x=drag.x+e.clientX-drag.sx;y=drag.y+e.clientY-drag.sy;render();e.preventDefault()});' +
      'function end(e){if(drag&&drag.id===e.pointerId){drag=null;viewport.classList.remove("dragging")}}' +
      'viewport.addEventListener("pointerup",end);viewport.addEventListener("pointercancel",end);' +
      'window.addEventListener("resize",center);center();' +
      '})();</script></body></html>';

    var win = window.open('', '_blank');
    if (!win) {
      if (M.notify) M.notify(M.t('popupBlocked'));
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  function bind(block) {
    if (block.dataset.bound === '1') return;
    block.dataset.bound = '1';

    var canvas = block.querySelector('.mermaid-canvas');
    if (!pans.has(block)) {
      // Start with the diagram centered when it fits in the visible canvas.
      // This is calculated after the first SVG render as well, but keeping a
      // real pan state here lets subsequent redraws preserve the user's view.
      pans.set(block, {x: 0, y: 0});
    }
    canvas.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      var target = event.target;
      if (!target.closest || !target.closest('svg')) return;
      var pan = pans.get(block) || {x: 0, y: 0};
      activePointers.set(block, {id: event.pointerId, startX: event.clientX, startY: event.clientY, panX: pan.x, panY: pan.y});
      canvas.classList.add('is-panning');
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    canvas.addEventListener('pointermove', function (event) {
      var state = activePointers.get(block);
      if (!state || state.id !== event.pointerId) return;
      pans.set(block, {x: state.panX + event.clientX - state.startX, y: state.panY + event.clientY - state.startY});
      var holder = canvas.querySelector('.mermaid-svg-holder');
      var stage = canvas.querySelector('.mermaid-stage');
      if (holder && stage) {
        var pan = pans.get(block) || {x: 0, y: 0};
        var scale = scales.get(block) || 1;
        var svg = holder.querySelector('svg');
        var vb = svg ? (svg.getAttribute('viewBox') || '').trim().split(/[ ,]+/).map(Number) : [];
        var naturalWidth = vb.length === 4 && isFinite(vb[2]) && vb[2] > 0 ? vb[2] : holder.offsetWidth;
        var naturalHeight = vb.length === 4 && isFinite(vb[3]) && vb[3] > 0 ? vb[3] : holder.offsetHeight;
        var frameWidth = canvas.clientWidth || stage.clientWidth || 320;
        var frameHeight = canvas.clientHeight || stage.clientHeight || DEFAULT_FRAME_HEIGHT;
        var scaledWidth = naturalWidth * scale;
        var scaledHeight = naturalHeight * scale;
        var baseLeft = (frameWidth - scaledWidth) / 2;
        var baseTop = (frameHeight - scaledHeight) / 2;

        /*
         * Internal pan margin: the diagram can be moved beyond its centered
         * position without changing the frame dimensions.  This creates an
         * invisible working area around the diagram while the visible frame
         * remains fixed.
         */
        var minPanX = -PAN_MARGIN - Math.max(0, scaledWidth - frameWidth);
        var maxPanX = PAN_MARGIN + Math.max(0, scaledWidth - frameWidth);
        var minPanY = -PAN_MARGIN - Math.max(0, scaledHeight - frameHeight);
        var maxPanY = PAN_MARGIN + Math.max(0, scaledHeight - frameHeight);
        pan.x = Math.min(maxPanX, Math.max(minPanX, pan.x));
        pan.y = Math.min(maxPanY, Math.max(minPanY, pan.y));
        pans.set(block, pan);

        /* Panning changes only the diagram position. Never resize the stage. */
        holder.style.left = (baseLeft + pan.x) + 'px';
        holder.style.top = (baseTop + pan.y) + 'px';
        holder.style.transform = 'scale(' + scale + ')';
        canvas.dataset.panX = String(pan.x);
        canvas.dataset.panY = String(pan.y);
      }
      event.preventDefault();
    });
    function endPan(event) {
      var state = activePointers.get(block);
      if (state && state.id === event.pointerId) activePointers.delete(block);
      canvas.classList.remove('is-panning');
    }
    canvas.addEventListener('pointerup', endPan);
    canvas.addEventListener('pointercancel', endPan);

    var zoomSelect = block.querySelector('.mermaid-zoom-select');
    var zoomLevels = ZOOM_LEVELS.slice();
    function syncZoomSelect() {
      var current = scales.get(block) || 1;
      var nearest = zoomLevels.reduce(function (best, value) {
        return Math.abs(value - current) < Math.abs(best - current) ? value : best;
      }, zoomLevels[0]);
      zoomSelect.value = String(nearest);
    }
    block.querySelector('.mermaid-zoom-in').addEventListener('click', function () {
      var current = scales.get(block) || 1;
      var index = zoomLevels.findIndex(function (value) { return value >= current - 0.0001; });
      if (index < 0) index = zoomLevels.length - 1;
      if (zoomLevels[index] <= current + 0.0001) index++;
      scales.set(block, zoomLevels[Math.min(zoomLevels.length - 1, index)]);
      syncZoomSelect();
      draw(block);
    });
    block.querySelector('.mermaid-zoom-out').addEventListener('click', function () {
      var current = scales.get(block) || 1;
      var index = zoomLevels.findIndex(function (value) { return value >= current - 0.0001; });
      if (index < 0) index = zoomLevels.length - 1;
      if (zoomLevels[index] >= current - 0.0001) index--;
      scales.set(block, zoomLevels[Math.max(0, index)]);
      syncZoomSelect();
      draw(block);
    });
    zoomSelect.addEventListener('change', function () {
      scales.set(block, Number(this.value));
      draw(block);
    });
    syncZoomSelect();
    block.querySelector('.mermaid-source-toggle').addEventListener('click', function () {
      var show = block.classList.toggle('show-source');
      this.setAttribute('aria-pressed', String(show));
    });
    block.querySelector('.mermaid-open-diagram').addEventListener('click', function () { openDiagramInNewTab(block); });
  }

  M.refreshMermaidText = function () {
    document.querySelectorAll('.mermaid-block[data-mermaid-block="true"]').forEach(function (block) {
      var out=block.querySelector('.mermaid-zoom-out'); if(out){out.title=M.t('mermaidZoomOut');out.setAttribute('aria-label',M.t('mermaidZoomOut'));}
      var sel=block.querySelector('.mermaid-zoom-select'); if(sel){sel.title=M.t('mermaidZoom');sel.setAttribute('aria-label',M.t('mermaidZoom'));}
      var inn=block.querySelector('.mermaid-zoom-in'); if(inn){inn.title=M.t('mermaidZoomIn');inn.setAttribute('aria-label',M.t('mermaidZoomIn'));}
      var src=block.querySelector('.mermaid-source-toggle'); if(src)src.textContent=M.t('mermaidSource');
      var open=block.querySelector('.mermaid-open-diagram'); if(open){open.textContent=M.t('mermaidOpen');open.title=M.t('mermaidOpen');open.setAttribute('aria-label',M.t('mermaidOpen'));}
      var canvas=block.querySelector('.mermaid-canvas'); if(canvas)canvas.setAttribute('aria-label',M.t('mermaidDiagram'));
    });
  };

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
