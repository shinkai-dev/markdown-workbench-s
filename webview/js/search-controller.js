window.MarkdownViewer = window.MarkdownViewer || {
};
(function(M) {
  var p, results =[], idx = 0;
  M.openSearch = function() {
    if ( ! p) {
      p = document.createElement('div');
      p.className = 'search-panel';
      // Build the panel with DOM APIs instead of interpolating strings into HTML.
      // This preserves the same controls while keeping translated text as text/attributes.
      var row = document.createElement('div');
      row.className = 'search-row';
      var input = document.createElement('input');
      input.setAttribute('aria-label', M.t('documentSearch'));
      input.placeholder = M.t('searchPlaceholder');
      row.appendChild(input);
      var prev = document.createElement('button');
      prev.className = 'toolbar-btn';
      prev.setAttribute('data-s', 'prev');
      prev.textContent = '↑';
      row.appendChild(prev);
      var next = document.createElement('button');
      next.className = 'toolbar-btn';
      next.setAttribute('data-s', 'next');
      next.textContent = '↓';
      row.appendChild(next);
      var close = document.createElement('button');
      close.className = 'toolbar-btn';
      close.setAttribute('data-s', 'close');
      close.textContent = M.t('searchClose');
      row.appendChild(close);
      var meta = document.createElement('div');
      meta.className = 'search-meta';
      p.appendChild(row);
      p.appendChild(meta);
      document.body.appendChild(p);
      p.querySelector('[data-s=close]').onclick = M.closeSearch;
      p.querySelector('[data-s=prev]').onclick = function() {
        move( - 1)
      };
      p.querySelector('[data-s=next]').onclick = function() {
        move(1)
      };
      p.querySelector('input').oninput = run
    }
    p.classList.add('open');
    p.querySelector('input').focus()
  };
  M.closeSearch = function() {
    if (p) p.classList.remove('open');
    clear()
  };
  function clear() {
    document.querySelectorAll('.search-hit').forEach(function(x) {
      x.replaceWith(document.createTextNode(x.textContent))
    });
    results =[]
  }
  function run() {
    clear();
    var q = p.querySelector('input').value;
    if ( ! q) return;
    var root = document.querySelector('.doc'), text = root.innerText, low = text.toLowerCase(), needle = q.toLowerCase(), pos = 0;
    while ((pos = low.indexOf(needle, pos)) >= 0) {
      results.push(pos);
      pos += needle.length
    }
    p.querySelector('.search-meta').textContent = M.t('searchResults').replace('{n}', results.length);
    idx = 0;
    highlight(0)
  }
  function highlight(n) {
    if ( ! results.length) return;
    idx =(n + results.length)%results.length;
    var needle = p.querySelector('input').value, root = document.querySelector('.doc');
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes =[], acc = 0, target = results[idx], node;
    while (node = walker.nextNode()) {
      var next = acc + node.nodeValue.length;
      if (target >= acc && target < next) {
        nodes.push({
          node: node, start: target - acc
        });
        break
      }
      acc = next
    }
    if (nodes[0]) {
      var x = nodes[0], s = x.node.nodeValue, a = s.slice(0, x.start), b = s.slice(x.start + needle.length);
      var frag = document.createDocumentFragment();
      if (a) frag.appendChild(document.createTextNode(a));
      var mark = document.createElement('mark');
      mark.className = 'search-hit current';
      mark.textContent = s.slice(x.start, x.start + needle.length);
      frag.appendChild(mark);
      if (b) frag.appendChild(document.createTextNode(b));
      x.node.parentNode.replaceChild(frag, x.node);
      mark.scrollIntoView({
        behavior: 'smooth', block: 'center'
      })
    }
  }
  function move(d) {
    highlight(idx + d)
  }
  M.refreshSearchText = function() {
    if ( ! p) return;
    var input = p.querySelector('input');
    if (input) {
      input.setAttribute('aria-label', M.t('documentSearch'));
      input.placeholder = M.t('searchPlaceholder')
    }
    var close = p.querySelector('[data-s=close]');
    if (close) close.textContent = M.t('searchClose');
    if (p.querySelector('.search-meta') && results.length) p.querySelector('.search-meta').textContent = M.t('searchResults').replace('{n}', results.length)
  }
})(window.MarkdownViewer);
