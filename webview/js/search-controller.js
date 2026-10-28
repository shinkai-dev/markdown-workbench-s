window.MarkdownViewer = window.MarkdownViewer || {};
(function (M) {
  var panel = null;
  var results = [];
  var index = -1;

  M.openSearch = function () {
    if (!panel) createPanel();
    panel.classList.add('open');
    var input = panel.querySelector('input');
    input.focus();
    // Keep the previous query visible, but do not rerun it on open. Search
    // starts again only when the user edits the retained value.
    results = [];
    index = -1;
    updateMeta();
  };

  M.closeSearch = function () {
    if (panel) {
      panel.classList.remove('open');
      // Retain the query for the next opening; results and highlights are
      // cleared so reopening remains idle until the query is edited.
    }
    clearHighlights();
    results = [];
    index = -1;
    updateMeta();
  };

  function createPanel() {
    panel = document.createElement('div');
    panel.className = 'search-panel';
    panel.setAttribute('role', 'search');

    var row = document.createElement('div');
    row.className = 'search-row';

    var input = document.createElement('input');
    input.type = 'search';
    input.setAttribute('aria-label', M.t('documentSearch'));
    input.placeholder = M.t('searchPlaceholder');
    row.appendChild(input);

    var prev = document.createElement('button');
    prev.className = 'toolbar-btn';
    prev.type = 'button';
    prev.setAttribute('data-s', 'prev');
    prev.setAttribute('aria-label', M.t('searchPrevious'));
    prev.textContent = '↑';
    row.appendChild(prev);

    var next = document.createElement('button');
    next.className = 'toolbar-btn';
    next.type = 'button';
    next.setAttribute('data-s', 'next');
    next.setAttribute('aria-label', M.t('searchNext'));
    next.textContent = '↓';
    row.appendChild(next);

    var close = document.createElement('button');
    close.className = 'toolbar-btn search-close';
    close.type = 'button';
    close.setAttribute('data-s', 'close');
    close.setAttribute('aria-label', M.t('searchClose'));
    close.textContent = '×';
    row.appendChild(close);

    var meta = document.createElement('div');
    meta.className = 'search-meta';
    meta.setAttribute('aria-live', 'polite');

    panel.appendChild(row);
    panel.appendChild(meta);
    document.body.appendChild(panel);

    close.onclick = M.closeSearch;
    prev.onclick = function () { move(-1); };
    next.onclick = function () { move(1); };
    input.addEventListener('input', runSearch);
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        move(event.shiftKey ? -1 : 1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        M.closeSearch();
      }
    });
    updateMeta();
  }

  function clearHighlights() {
    if (!panel) return;
    var root = document.querySelector('.doc');
    if (!root) return;
    root.querySelectorAll('.search-hit').forEach(function (hit) {
      hit.replaceWith(document.createTextNode(hit.textContent));
    });
    root.normalize();
  }

  function runSearch() {
    clearHighlights();
    results = [];
    index = -1;

    var root = document.querySelector('.doc');
    var input = panel && panel.querySelector('input');
    var query = input ? input.value : '';
    if (!root || !query) {
      updateMeta();
      return;
    }

    var lowerQuery = query.toLocaleLowerCase();
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var parent = node.parentElement;
        if (!parent || parent.closest('button, input, textarea, select, option, script, style, [hidden], details:not([open]), .search-hit, .table-toolbar, .table-actions, .column-actions, .mermaid-controls, .mermaid-source:not(.show-source)')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    var nodes = [];
    var node;
    while ((node = walker.nextNode())) nodes.push(node);

    nodes.forEach(function (textNode) {
      var original = textNode.nodeValue;
      var lowerText = original.toLocaleLowerCase();
      var positions = [];
      var from = 0;
      var found;
      while ((found = lowerText.indexOf(lowerQuery, from)) !== -1) {
        positions.push(found);
        from = found + Math.max(1, lowerQuery.length);
      }
      if (!positions.length || !textNode.parentNode) return;

      var fragment = document.createDocumentFragment();
      var cursor = 0;
      positions.forEach(function (start) {
        if (start > cursor) fragment.appendChild(document.createTextNode(original.slice(cursor, start)));
        var hit = document.createElement('mark');
        hit.className = 'search-hit';
        hit.textContent = original.slice(start, start + query.length);
        fragment.appendChild(hit);
        results.push(hit);
        cursor = start + query.length;
      });
      if (cursor < original.length) fragment.appendChild(document.createTextNode(original.slice(cursor)));
      textNode.parentNode.replaceChild(fragment, textNode);
    });

    if (results.length) {
      index = 0;
      setCurrent(false);
    }
    updateMeta();
    if (results.length) scrollToCurrent();
  }

  function setCurrent(shouldScroll) {
    results.forEach(function (hit, i) {
      hit.classList.toggle('current', i === index);
      hit.setAttribute('aria-current', i === index ? 'true' : 'false');
    });
    updateMeta();
    if (shouldScroll) scrollToCurrent();
  }

  function scrollToCurrent() {
    if (index < 0 || !results[index] || !results[index].isConnected) return;
    results[index].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }

  function move(delta) {
    // Closing the panel clears highlights/results but intentionally retains the
    // query. If the user reopens search and presses next/previous without
    // editing that query, rebuild the results on demand instead of doing nothing.
    if (!results.length) {
      var input = panel && panel.querySelector('input');
      if (input && input.value) runSearch();
      if (!results.length) return;
      return; // runSearch selects and scrolls to the first match.
    }
    index = (index + delta + results.length) % results.length;
    setCurrent(true);
  }

  function updateMeta() {
    if (!panel) return;
    var meta = panel.querySelector('.search-meta');
    if (!meta) return;
    var count = results.length;
    var countText = M.t('searchResults').replace('{n}', String(count));
    meta.textContent = countText + (count && index >= 0 ? ' · ' + (index + 1) + '/' + count : '');
  }

  M.refreshSearchText = function () {
    if (!panel) return;
    var input = panel.querySelector('input');
    input.setAttribute('aria-label', M.t('documentSearch'));
    input.placeholder = M.t('searchPlaceholder');
    panel.querySelector('[data-s=prev]').setAttribute('aria-label', M.t('searchPrevious'));
    panel.querySelector('[data-s=next]').setAttribute('aria-label', M.t('searchNext'));
    panel.querySelector('[data-s=close]').setAttribute('aria-label', M.t('searchClose'));
    updateMeta();
  };
})(window.MarkdownViewer);
