window.MarkdownViewer = window.MarkdownViewer || {};
(function (M) {
  var MERMAID_TOKEN_PREFIX = 'MVMERMAIDTOKEN_';

  function normalizeNewlines(text) {
    return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Extract Mermaid BEFORE marked sees the source. We intentionally do not
  // put Mermaid SVG/HTML through marked or DOMPurify.
  function extractMermaid(source) {
    var list = [];
    var text = normalizeNewlines(source);
    var re = /^```[ \t]*mermaid[ \t]*\n([\s\S]*?)\n```[ \t]*(?=\n|$)/gmi;
    var replaced = text.replace(re, function (_, code) {
      var index = list.length;
      list.push(code.replace(/\n$/, ''));
      return '\n' + MERMAID_TOKEN_PREFIX + index + '\n';
    });
    return { markdown: replaced, mermaids: list };
  }

  function wrapTables(html) {
    html = html.replace(/<table>/g, '<table class="raw-md-table">');
    return html.replace(/<table class="raw-md-table">([\s\S]*?)<\/table>/g, function (_, inside) {
      return '<div class="md-table-block">' +
        '<div class="table-toolbar">' +
        '<span class="table-label">'+M.t('table')+'</span>' +
        '<button type="button" class="table-toggle" data-action="toggle-column" aria-pressed="false">'+M.t('freezeColumn')+'</button>' +
        '<button type="button" class="table-toggle" data-action="toggle-header" aria-pressed="false">'+M.t('freezeHeader')+'</button>' +
        '<button type="button" class="table-toggle" data-action="toggle-both" aria-pressed="false">'+M.t('freezeBoth')+'</button>' +
        '<button type="button" class="toolbar-btn" data-action="reset-columns">'+M.t('resetColumns')+'</button>' +
        '<button type="button" class="toolbar-btn" data-action="reset-size">'+M.t('resetSize')+'</button>' +
        '<button type="button" class="toolbar-btn" data-action="copy-table">'+M.t('copy')+'</button>' +
        '<button type="button" class="toolbar-btn" data-action="export-csv">'+M.t('csv')+'</button>' +
        '</div>' +
        '<div class="table-scroll"><table>' + inside + '</table></div>' +
        '<div class="table-right-resizer" role="separator" aria-label="'+M.t('resizeTableWidth')+'" tabindex="0"></div>' +
        '<div class="table-resize-handle" role="separator" aria-label="'+M.t('resizeTable')+'" tabindex="0"></div>' +
        '</div>';
    });
  }

  function wrapCodeBlocks(html) {
    return html.replace(/<pre><code(?: class="language-([^\"]*)")?>([\s\S]*?)<\/code><\/pre>/g, function (_, lang, code) {
      var safeLang = lang || 'text';
      return '<div class="code-wrap"><div class="code-head"><span class="code-lang">' +
        escapeHtml(safeLang) +
        '</span><span class="spacer"></span>' +
        '<button type="button" class="toolbar-btn code-copy">'+M.t('copy')+'</button>' +
        '<button type="button" class="toolbar-btn code-wrap-toggle" aria-pressed="false">'+M.t('wrap')+'</button>' +
        '<button type="button" class="toolbar-btn code-collapse" aria-expanded="true">'+M.t('collapse')+'</button>' +
        '</div><pre><code class="language-' + escapeHtml(safeLang) + '">' + code + '</code></pre></div>';
    });
  }

  function injectMermaidPlaceholders(html, sources) {
    for (var i = 0; i < sources.length; i++) {
      var token = MERMAID_TOKEN_PREFIX + i;
      var placeholder = '<div class="mv-mermaid-placeholder" data-mermaid-index="' + i + '">' +
        '<textarea class="mv-mermaid-source-data" hidden>' + escapeHtml(sources[i]) + '</textarea>' +
        '</div>';
      var p = new RegExp('<p>\\s*' + token + '\\s*<\\/p>', 'g');
      var raw = new RegExp(token, 'g');
      if (p.test(html)) {
        html = html.replace(p, placeholder);
      } else {
        html = html.replace(raw, placeholder);
      }
    }
    return html;
  }

  M.renderMarkdown = function (source) {
    if (!window.marked) throw new Error('Markdown library is not loaded');
    if (!window.DOMPurify) throw new Error('Sanitization library is not loaded');

    var extracted = extractMermaid(source);
    var html = marked.parse(extracted.markdown, {
      gfm: true,
      breaks: true,
      headerIds: true,
      mangle: false
    });

    // Sanitize ordinary Markdown first. Mermaid has not entered the DOM yet.
    html = DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true }
    });

    // Only after sanitization do we insert our inert Mermaid placeholders.
    // The source is stored as textarea text, never as executable HTML.
    html = injectMermaidPlaceholders(html, extracted.mermaids);
    html = wrapCodeBlocks(html);
    html = wrapTables(html);
    return html;
  };
})(window.MarkdownViewer);
