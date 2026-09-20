window.MarkdownViewer = window.MarkdownViewer || {};
(function (M) {
  M.vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
  M.notify = function (s) { var t = document.getElementById('toast'); if (!t) return; t.textContent = s; t.classList.add('show'); clearTimeout(t._x); t._x = setTimeout(function () { t.classList.remove('show'); }, 2200); };
  M.copy = function (text, msg) { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { M.notify(msg || 'Copied.'); }).catch(function () { M.notify('Clipboard is unavailable.'); }); };

  var currentMarkdownText='', currentMarkdownName='';
  var I18N = {
    en: {settings:'Display Settings',toc:'Table of Contents',searchToc:'Search TOC',closeSidebar:'Close sidebar',openSidebar:'Open sidebar',loading:'Loading Markdown…',widthMinus:'Width −',widthPlus:'Width +',notLoaded:'Not loaded',emptyTitle:'Markdown Workbench S',emptyText:'Open the preview from a Markdown editor.',theme:'Theme',system:'System',light:'Light',dark:'Dark',contrast:'High Contrast',fontSize:'Font size',lineHeight:'Line height',documentWidth:'Document width',language:'Language',english:'English',japanese:'Japanese',close:'Close',chars:'characters',empty:'The Markdown document is empty.',renderError:'Load/render error',failed:'Operation failed.',codeCopied:'Code copied.',sourceHint:'Double-click to open the Markdown source',table:'Table',csv:'CSV',matches:'matches',mermaidDiagram:'Mermaid diagram',resizeTableWidth:'Resize table width',resizeTable:'Resize table',columnFiltersActive:'column filters active',rows:'rows',filter:'filter',mermaidError:'Mermaid rendering error',searchDocument:'Search document',freezeColumn:'Freeze first column',freezeHeader:'Freeze header row',freezeBoth:'Freeze both',resetColumns:'Reset column widths',resetSize:'Reset table size',copy:'Copy',wrap:'Wrap',collapse:'Collapse',mermaid:'Mermaid',source:'Source',redraw:'Redraw',zoomOut:'Zoom out',zoomIn:'Zoom in',rendering:'Rendering diagram…',tableFiltered:'Table filtered.',filterCleared:'Column filter cleared.',filtersCleared:'Table filters cleared.',sortCleared:'Table sort cleared.',sortedAsc:'Sorted ascending.',sortedDesc:'Sorted descending.',csvSaved:'CSV saved.',csvFailed:'Failed to save CSV.',tableCopied:'Table copied.',widthChanged:'Table width changed.',sizeChanged:'Table size changed.',clearAll:'Clear all',searchKeywords:'Search keywords',apply:'Apply',clear:'Clear',column:'Column',sortAsc:'Sort ascending',sortDesc:'Sort descending',clearSort:'Clear sort',resizeColumn:'Resize column',filterColumn:'Filter this column'},
    ja: {settings:'表示設定',toc:'目次',searchToc:'目次を検索',closeSidebar:'サイドバーを閉じる',openSidebar:'サイドバーを開く',loading:'Markdownを読み込み中…',widthMinus:'幅 −',widthPlus:'幅 +',notLoaded:'未読み込み',emptyTitle:'Markdown Workbench S',emptyText:'Markdownエディタからプレビューを開いてください。',theme:'テーマ',system:'システム',light:'ライト',dark:'ダーク',contrast:'ハイコントラスト',fontSize:'文字サイズ',lineHeight:'行間',documentWidth:'本文幅',language:'言語',english:'English',japanese:'日本語',close:'閉じる',chars:'文字',empty:'Markdownドキュメントは空です。',renderError:'読み込み／レンダリングエラー',failed:'操作に失敗しました。',codeCopied:'コードをコピーしました。',sourceHint:'ダブルクリックするとMarkdown本体を開きます',table:'表',csv:'CSV',matches:'件',mermaidDiagram:'Mermaid図',resizeTableWidth:'表の幅を変更',resizeTable:'表のサイズを変更',columnFiltersActive:'列フィルターが有効',rows:'行',filter:'フィルター',mermaidError:'Mermaidの描画エラー',searchDocument:'ドキュメントを検索',freezeColumn:'先頭列を固定',freezeHeader:'先頭行を固定',freezeBoth:'両方固定',resetColumns:'列幅をリセット',resetSize:'表サイズをリセット',copy:'コピー',wrap:'折り返し',collapse:'折りたたむ',mermaid:'Mermaid',source:'ソース',redraw:'再描画',zoomOut:'縮小',zoomIn:'拡大',rendering:'図を描画中…',tableFiltered:'表をフィルターしました。',filterCleared:'列フィルターを解除しました。',filtersCleared:'表のフィルターをすべて解除しました。',sortCleared:'表の並べ替えを解除しました。',sortedAsc:'昇順に並べ替えました。',sortedDesc:'降順に並べ替えました。',csvSaved:'CSVを保存しました。',csvFailed:'CSVの保存に失敗しました。',tableCopied:'表をコピーしました。',widthChanged:'表の幅を変更しました。',sizeChanged:'表のサイズを変更しました。',clearAll:'すべて解除',searchKeywords:'キーワードを検索',apply:'適用',clear:'クリア',column:'列',sortAsc:'昇順で並べ替え',sortDesc:'降順で並べ替え',clearSort:'並べ替えを解除',resizeColumn:'列幅を変更',filterColumn:'この列をフィルター'}
  };
  M.t=function(key){var lang=M.settings&&M.settings.language==='ja'?'ja':'en';return (I18N[lang]&&I18N[lang][key])||I18N.en[key]||key;};
  M.updateSidebarButton=function(){var b=document.getElementById('toc-btn'),w=document.querySelector('.workspace');if(!b||!w)return;var open=!w.classList.contains('sidebar-collapsed');b.textContent=open?'×':'☰';b.title=open?M.t('closeSidebar'):M.t('openSidebar');b.setAttribute('aria-label',b.title);b.setAttribute('aria-expanded',String(open));};
  M.toggleSidebar=function(){var w=document.querySelector('.workspace');if(!w)return;w.classList.toggle('sidebar-collapsed');M.settings.tocOpen=!w.classList.contains('sidebar-collapsed');M.saveSettings();M.updateSidebarButton();};
  M.refreshText=function(){var map={'settings-btn':'settings','toc-title':'toc','width-minus':'widthMinus','width-plus':'widthPlus'};Object.keys(map).forEach(function(id){var e=document.getElementById(id);if(e)e.textContent=M.t(map[id]);});var q=document.querySelector('.toc-search');if(q){q.placeholder=M.t('searchToc');q.setAttribute('aria-label',M.t('searchToc'));}var h=document.querySelector('.source-nav-hint');if(h)h.textContent=M.t('sourceHint');M.updateSidebarButton();};

  function shell() {
    var app=document.getElementById('app');
    app.innerHTML='<div class="app-shell"><header class="topbar"><button class="icon-btn sidebar-toggle" id="toc-btn" aria-expanded="true">☰</button><strong class="brand">Markdown Workbench S</strong><span class="filename">'+M.t('notLoaded')+'</span><div class="top-actions"><button class="icon-btn" id="settings-btn">'+M.t('settings')+'</button></div></header><div class="workspace"><aside class="sidebar"><div class="sidebar-head"><h2 id="toc-title">'+M.t('toc')+'</h2></div><input class="toc-search" placeholder="'+M.t('searchToc')+'" aria-label="'+M.t('searchToc')+'"><ol class="toc"></ol></aside><main class="main"><div class="reading-toolbar"><span id="status">'+M.t('loading')+'</span><span class="spacer"></span><button class="toolbar-btn" id="width-minus">'+M.t('widthMinus')+'</button><button class="toolbar-btn" id="width-plus">'+M.t('widthPlus')+'</button></div><article class="doc"><div class="empty"><div class="empty-card"><h1>'+M.t('emptyTitle')+'</h1><p>'+M.t('emptyText')+'</p></div></div></article></main></div></div>';
    document.getElementById('settings-btn').onclick=settings;document.getElementById('toc-btn').onclick=M.toggleSidebar;
    document.getElementById('width-minus').onclick=function(){M.settings.docWidth=Math.max(520,M.settings.docWidth-60);M.saveSettings();M.applySettings();};
    document.getElementById('width-plus').onclick=function(){M.settings.docWidth=Math.min(1400,M.settings.docWidth+60);M.saveSettings();M.applySettings();};
    if(!M.settings.tocOpen)document.querySelector('.workspace').classList.add('sidebar-collapsed');M.updateSidebarButton();M.applySettings();
  }

  function settings(){
    var m=document.createElement('div');m.className='modal open';
    m.innerHTML='<div class="modal-card"><h2>'+M.t('settings')+'</h2><div class="settings-grid"><label class="setting">'+M.t('theme')+'<select class="theme-select"><option value="system">'+M.t('system')+'</option><option value="light">'+M.t('light')+'</option><option value="dark">'+M.t('dark')+'</option><option value="high-contrast">'+M.t('contrast')+'</option></select></label><label class="setting">'+M.t('fontSize')+'<input type="number" min="12" max="24" step="1" value="'+M.settings.fontSize+'"></label><label class="setting">'+M.t('lineHeight')+'<input type="number" min="1.2" max="2.5" step=".05" value="'+M.settings.lineHeight+'"></label><label class="setting">'+M.t('documentWidth')+'<input type="number" min="520" max="1200" step="20" value="'+M.settings.docWidth+'"></label><label class="setting">'+M.t('language')+'<select class="language-select"><option value="en">'+M.t('english')+'</option><option value="ja">'+M.t('japanese')+'</option></select></label></div><p><button class="toolbar-btn" data-close>'+M.t('close')+'</button></p></div>';
    document.body.appendChild(m);m.addEventListener('click',function(e){if(e.target===m)m.remove();});m.querySelector('.modal-card').addEventListener('click',function(e){e.stopPropagation();});
    var theme=m.querySelector('.theme-select');theme.value=M.settings.theme;var ins=m.querySelectorAll('input');
    theme.onchange=function(){M.settings.theme=this.value;M.saveSettings();M.applySettings();M.redrawMermaid();};
    ins[0].onchange=function(){M.settings.fontSize=+this.value||16;M.saveSettings();M.applySettings();};ins[1].onchange=function(){M.settings.lineHeight=+this.value||1.85;M.saveSettings();M.applySettings();};ins[2].onchange=function(){M.settings.docWidth=+this.value||1000;M.saveSettings();M.applySettings();};
    var lang=m.querySelector('.language-select');lang.value=M.settings.language||'en';lang.onchange=function(){M.settings.language=this.value;M.saveSettings();m.remove();M.refreshText();if(currentMarkdownText)loadText(currentMarkdownText,currentMarkdownName);};
    m.querySelector('[data-close]').onclick=function(){m.remove();};
  }

  function normalize(s) { return String(s || '').replace(/\r\n?/g, '\n'); }

  // Approximate source locations are attached to rendered top-level blocks.
  // The mapping is deliberately line-based so it also works with the bundled
  // offline Markdown parser used by the browser version.
  function buildSourceMap(source) {
    var lines = normalize(source).split('\n'), map = [], i = 0;
    while (i < lines.length) {
      var raw = lines[i], trimmed = raw.trim();
      if (!trimmed) { i++; continue; }
      if (/^```/.test(trimmed) || /^~~~/.test(trimmed)) { var start=i+1, fence=trimmed.slice(0,3); i++; while(i<lines.length && !lines[i].trim().startsWith(fence)) i++; if(i<lines.length)i++; map.push({line:start,type:'code'}); continue; }
      if (/^#{1,6}\s+/.test(trimmed)) { map.push({line:i+1,type:'heading'}); i++; continue; }
      if (/^[-*+]\s+|^\d+[.)]\s+|^>\s?/.test(trimmed)) { var startList=i+1; while(i<lines.length && (lines[i].trim()==='' || /^[-*+]\s+|^\d+[.)]\s+|^>\s?/.test(lines[i].trim()))) i++; map.push({line:startList,type:'list'}); continue; }
      if (trimmed.indexOf('|') !== -1 && i+1<lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i+1])) { map.push({line:i+1,type:'table'}); i+=2; while(i<lines.length && lines[i].trim() && lines[i].indexOf('|')!==-1)i++; continue; }
      map.push({line:i+1,type:'paragraph'}); i++; while(i<lines.length && lines[i].trim() && !/^#{1,6}\s+/.test(lines[i].trim()) && !/^```/.test(lines[i].trim())) i++;
    }
    return map;
  }

  function installSourceNavigation(source) {
    var doc = document.querySelector('.doc'); if (!doc) return;
    var map = buildSourceMap(source), blocks = doc.querySelectorAll('h1,h2,h3,h4,h5,h6,p,blockquote,ul,ol,pre,.md-table-block,.mv-mermaid-placeholder');
    Array.prototype.forEach.call(blocks, function (el, idx) {
      var entry = map[Math.min(idx, map.length - 1)];
      if (entry) el.setAttribute('data-source-line', String(entry.line));
    });
    doc.ondblclick = function (e) {
      if (e.target.closest('button,input,textarea,select,a,.table-resize-handle,.table-right-resizer')) return;
      var el = e.target.closest('[data-source-line]');
      if (!el || !M.vscode) return;
      var line = Number(el.getAttribute('data-source-line')) || 1;
      M.vscode.postMessage({type:'openSource', line:line, column:1});
    };
  }

  async function loadText(text, name) {
    currentMarkdownText=text; currentMarkdownName=name;
    if (!text.trim()) { M.notify(M.t('empty')); return; }
    var main=document.querySelector('.main'), doc=document.querySelector('.doc'); main.setAttribute('aria-busy','true');
    try {
      doc.innerHTML=M.renderMarkdown(text); document.querySelector('.filename').textContent=name; document.getElementById('status').dataset.count=text.length.toLocaleString(); document.getElementById('status').textContent=text.length.toLocaleString()+M.t('chars');
      M.buildToc(doc); M.initTables(doc); M.renderMermaid(doc); installSourceNavigation(text);
      document.querySelectorAll('.code-copy').forEach(function(b){b.onclick=function(){M.copy(this.closest('.code-wrap').querySelector('code').innerText,M.t('codeCopied'));};});
      document.querySelectorAll('.code-wrap-toggle').forEach(function(b){b.onclick=function(){var w=this.closest('.code-wrap');w.classList.toggle('wrap-lines');this.setAttribute('aria-pressed',w.classList.contains('wrap-lines'));};});
      document.querySelectorAll('.code-collapse').forEach(function(b){b.onclick=function(){var w=this.closest('.code-wrap');w.classList.toggle('is-collapsed');this.setAttribute('aria-expanded',String(!w.classList.contains('is-collapsed')));};});
      window.scrollTo(0,0);
    } catch(e) { doc.innerHTML='<div class="empty-card"><h2>'+M.t('renderError')+'</h2><p>'+String(e.message||e)+'</p></div>'; M.notify(M.t('failed')); }
    finally { main.setAttribute('aria-busy','false'); }
  }

  shell();
  window.addEventListener('message', function(e){ var d=e.data||{}; if(d.type==='document') loadText(d.text,d.name); });
  if (M.vscode) M.vscode.postMessage({type:'ready'});
})(window.MarkdownViewer);
