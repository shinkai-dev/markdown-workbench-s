window.MarkdownViewer = window.MarkdownViewer || {}; (function (M) {
  M.vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
  var I18N = {
    ja: {settings:'表示設定', toc:'目次', openSidebar:'サイドバーを開く', searchToc:'目次を検索', open:'開く', notLoaded:'未読込', loading:'Markdownファイルを開くか、ここへドラッグ＆ドロップしてください', emptyTitle:'Markdown Viewer', emptyText:'Markdownファイルを開くか、ここへドラッグ＆ドロップしてください。', theme:'テーマ', system:'システム', light:'ライト', dark:'ダーク', contrast:'ハイコントラスト', fontSize:'文字サイズ', lineHeight:'行間', documentWidth:'本文幅', language:'言語', english:'English', japanese:'日本語', close:'閉じる', widthMinus:'本文−', widthPlus:'本文＋', empty:'Markdownドキュメントは空です。', rendering:'描画中…', renderError:'読み込み・描画エラー', failed:'処理に失敗しました', codeCopied:'コードをコピーしました', clipboardUnavailable:'クリップボードを利用できません', codeCopy:'コピー', codeWrap:'折り返し', codeCollapse:'折りたたみ', codeExpand:'展開', copyColumn:'列をコピー', tableFirstColumn:'先頭列固定', tableFirstRow:'先頭行固定', tableBoth:'両方固定', tableResetColumns:'列幅リセット', tableResetSize:'表サイズリセット', tableCopy:'コピー', tableCsv:'CSV', columnActions:'列の操作', filterColumn:'絞り込み', filterAllClear:'すべて解除', sortAscending:'昇順', sortDescending:'降順', sortClear:'並べ替え解除', filterTitle:'「{title}」を絞り込み', filterInput:'文字を入力', filterSpecial:'特殊条件', filterValues:'値', filterApply:'適用', filterReset:'解除', emptyValue:'空白', nonEmptyValue:'空白以外', filteringSummary:'{active}列で絞り込み中 · {shown} / {total} 行', tableFiltered:'表を絞り込みました', columnFilterCleared:'列の絞り込みを解除しました', allTableFiltersCleared:'表の絞り込みをすべて解除しました', sortCleared:'表の並べ替えを解除しました', sortedAscending:'昇順に並べ替えました', sortedDescending:'降順に並べ替えました', columnCopied:'列をコピーしました', tableCopied:'表をコピーしました', csvSaved:'CSVを保存しました', csvSaveFailed:'CSV保存に失敗しました', tableWidthChanged:'表の横幅を変更しました', tableSizeChanged:'表サイズを変更しました', columnWidthResize:'列幅を変更', mermaidZoom:'倍率', mermaidZoomOut:'縮小', mermaidZoomIn:'拡大', mermaidSource:'ソースも表示', mermaidOpen:'図だけ表示', popupBlocked:'新しいタブを開けませんでした。ポップアップを許可してください。', mermaidDiagram:'Mermaid図'},
    en: {settings:'Display Settings', toc:'Table of Contents', openSidebar:'Open sidebar', searchToc:'Search TOC', open:'Open', notLoaded:'Not loaded', loading:'Open a local Markdown file or drag and drop it here.', emptyTitle:'Markdown Viewer', emptyText:'Open a Markdown file or drag and drop it here.', theme:'Theme', system:'System', light:'Light', dark:'Dark', contrast:'High Contrast', fontSize:'Font size', lineHeight:'Line height', documentWidth:'Document width', language:'Language', english:'English', japanese:'Japanese', close:'Close', widthMinus:'Width −', widthPlus:'Width +', empty:'The Markdown document is empty.', rendering:'Rendering…', renderError:'Load/render error', failed:'Operation failed.', codeCopied:'Code copied.', clipboardUnavailable:'Clipboard is unavailable.', codeCopy:'Copy', codeWrap:'Wrap', codeCollapse:'Collapse', codeExpand:'Expand', copyColumn:'Copy column', tableFirstColumn:'Freeze first column', tableFirstRow:'Freeze header row', tableBoth:'Freeze both', tableResetColumns:'Reset column widths', tableResetSize:'Reset table size', tableCopy:'Copy', tableCsv:'CSV', columnActions:'Column actions', filterColumn:'Filter', filterAllClear:'Clear all', sortAscending:'Sort ascending', sortDescending:'Sort descending', sortClear:'Clear sort', filterTitle:'Filter “{title}”', filterInput:'Enter text', filterSpecial:'Special conditions', filterValues:'Values', filterApply:'Apply', filterReset:'Clear', emptyValue:'Blank', nonEmptyValue:'Non-blank', filteringSummary:'Filtering {active} column(s) · {shown} / {total} rows', tableFiltered:'Table filtered', columnFilterCleared:'Column filter cleared', allTableFiltersCleared:'All table filters cleared', sortCleared:'Sort cleared', sortedAscending:'Sorted ascending', sortedDescending:'Sorted descending', columnCopied:'Column copied', tableCopied:'Table copied', csvSaved:'CSV saved', csvSaveFailed:'Failed to save CSV', tableWidthChanged:'Table width changed', tableSizeChanged:'Table size changed', columnWidthResize:'Resize column width', mermaidZoom:'Zoom', mermaidZoomOut:'Zoom out', mermaidZoomIn:'Zoom in', mermaidSource:'Show source', mermaidOpen:'Open diagram', popupBlocked:'The new tab could not be opened. Please allow pop-ups.', mermaidDiagram:'Mermaid diagram'}
  };
  M.t = function(key){ var lang = M.settings && M.settings.language === 'en' ? 'en' : 'ja'; return (I18N[lang] && I18N[lang][key]) || I18N.ja[key] || key; };
  M.updateSidebarButton=function(){
    var b=document.getElementById('toc-btn'),w=document.querySelector('.workspace');
    if(!b||!w)return;
    var open=!w.classList.contains('sidebar-collapsed');
    b.textContent=open?'×':'☰';
    b.title=open?M.t('close'):M.t('openSidebar')||'Open sidebar';
    b.setAttribute('aria-label',b.title);
    b.setAttribute('aria-expanded',String(open));
  };
  M.toggleSidebar=function(){
    var w=document.querySelector('.workspace'); if(!w)return;
    w.classList.toggle('sidebar-collapsed');
    M.settings.tocOpen=!w.classList.contains('sidebar-collapsed');
    M.saveSettings(); M.updateSidebarButton();
  };
  M.refreshText = function(){
    var map = {'open-btn':'open','settings-btn':'settings','width-minus':'widthMinus','width-plus':'widthPlus'};
    Object.keys(map).forEach(function(id){ var e=document.getElementById(id); if(e)e.textContent=M.t(map[id]); });
    var search=document.querySelector('.toc-search'); if(search){search.placeholder=M.t('searchToc');search.setAttribute('aria-label',M.t('searchToc'));}
    var status=document.getElementById('status'); var fn=document.querySelector('.filename');
    if(status && fn && (fn.textContent===I18N.ja.notLoaded || fn.textContent===I18N.en.notLoaded)) status.textContent=M.t('loading');
    if(M.refreshTableText) M.refreshTableText();
    if(M.refreshMermaidText) M.refreshMermaidText(); if(M.refreshCodeText) M.refreshCodeText();
  };
 M.notify = function (s) { var t = document.getElementById('toast'); t.textContent = s; t.classList.add('show'); clearTimeout(t._x); t._x = setTimeout(function () { t.classList.remove('show') }, 2200) }; M.copy = function (text, msg) { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { M.notify(msg || 'コピーしました') }).catch(function () { fallback(text, msg) }); else fallback(text, msg); function fallback(x, m) { try { var a = document.createElement('textarea'); a.value = x; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); M.notify(m || 'コピーしました') } catch (e) { M.notify(M.t('clipboardUnavailable')) } } }; function shell() {
   var app=document.getElementById('app');
   var title=M.vscode?'Markdown Workbench S':'Markdown Viewer';
   var openButton=M.vscode?'':'<button class="icon-btn hide-small" id="open-btn">'+M.t('open')+'</button>';
   app.innerHTML='<div class="app-shell"><header class="topbar"><button class="icon-btn sidebar-toggle" id="toc-btn" aria-expanded="false">☰</button><strong class="brand">'+title+'</strong><span class="filename">'+M.t('notLoaded')+'</span><div class="top-actions">'+openButton+'<button class="icon-btn" id="settings-btn">'+M.t('settings')+'</button></div></header><div class="workspace"><aside class="sidebar"><div class="sidebar-head"><h2 id="toc-title">'+M.t('toc')+'</h2></div><input class="toc-search" placeholder="'+M.t('searchToc')+'" aria-label="'+M.t('searchToc')+'"><ol class="toc"></ol></aside><main class="main"><div class="reading-toolbar"><span id="status">'+M.t('loading')+'</span><span class="spacer"></span><button class="toolbar-btn" id="width-minus">'+M.t('widthMinus')+'</button><button class="toolbar-btn" id="width-plus">'+M.t('widthPlus')+'</button></div><article class="doc"><div class="empty"><div class="empty-card"><h1>'+M.t('emptyTitle')+'</h1><p>'+M.t('emptyText')+'</p></div></div></article></main></div></div>';
   document.getElementById('settings-btn').onclick=settings;
   document.getElementById('toc-btn').onclick=M.toggleSidebar;
   document.getElementById('width-minus').onclick=function(){M.settings.docWidth=Math.max(520,M.settings.docWidth-60);M.saveSettings();M.applySettings();};
   document.getElementById('width-plus').onclick=function(){M.settings.docWidth=Math.min(1400,M.settings.docWidth+60);M.saveSettings();M.applySettings();};
   if(M.settings.tocOpen!==true) { M.settings.tocOpen=false; M.saveSettings(); } var workspace=document.querySelector('.workspace'); workspace.classList.toggle('sidebar-collapsed', !M.settings.tocOpen);
   M.updateSidebarButton(); M.applySettings();
 }

 function settings() { var m=document.createElement('div'); m.className='modal open'; m.innerHTML='<div class="modal-card"><h2>'+M.t('settings')+'</h2><div class="settings-grid"><label class="setting">'+M.t('theme')+'<select class="theme-select"><option value="system">'+M.t('system')+'</option><option value="light">'+M.t('light')+'</option><option value="dark">'+M.t('dark')+'</option><option value="high-contrast">'+M.t('contrast')+'</option></select></label><label class="setting">'+M.t('fontSize')+'<input type="number" min="12" max="24" step="1" value="'+M.settings.fontSize+'"></label><label class="setting">'+M.t('lineHeight')+'<input type="number" min="1.2" max="2.5" step=".05" value="'+M.settings.lineHeight+'"></label><label class="setting">'+M.t('documentWidth')+'<input type="number" min="520" max="1200" step="20" value="'+M.settings.docWidth+'"></label><label class="setting">'+M.t('language')+'<select class="language-select"><option value="ja">'+M.t('japanese')+'</option><option value="en">'+M.t('english')+'</option></select></label></div><p><button class="toolbar-btn" data-close>'+M.t('close')+'</button></p></div>'; document.body.appendChild(m); m.addEventListener('click',function(e){if(e.target===m)m.remove()}); m.querySelector('.modal-card').addEventListener('click',function(e){e.stopPropagation()}); var theme=m.querySelector('.theme-select'); theme.value=M.settings.theme; var ins=m.querySelectorAll('input'); theme.onchange=function(){M.settings.theme=this.value;M.saveSettings();M.applySettings();M.redrawMermaid()}; ins[0].onchange=function(){M.settings.fontSize=+this.value||16;M.saveSettings();M.applySettings()}; ins[1].onchange=function(){M.settings.lineHeight=+this.value||1.85;M.saveSettings();M.applySettings()}; ins[2].onchange=function(){M.settings.docWidth=+this.value||1000;M.saveSettings();M.applySettings()}; var lang=m.querySelector('.language-select'); lang.value=M.settings.language||'ja'; lang.onchange=function(){M.settings.language=this.value;M.saveSettings();m.remove();M.refreshText();M.updateSidebarButton()}; m.querySelector('[data-close]').onclick=function(){m.remove()}; }

 function normalizeSourceText(text){return String(text||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');}
 function buildSourceMap(source){
   var lines=normalizeSourceText(source).split('\n'), map=[], i=0;
   while(i<lines.length){
     var raw=lines[i], trimmed=raw.trim();
     if(!trimmed){i++;continue;}
     if(/^```/.test(trimmed)||/^~~~/.test(trimmed)){
       var start=i+1,fence=trimmed.slice(0,3);i++;
       while(i<lines.length&&!lines[i].trim().startsWith(fence))i++;
       if(i<lines.length)i++; map.push({line:start,type:'code'});continue;
     }
     if(/^#{1,6}\s+/.test(trimmed)){map.push({line:i+1,type:'heading'});i++;continue;}
     if(/^[-*+]\s+|^\d+[.)]\s+|^>\s?/.test(trimmed)){
       var ls=i+1; while(i<lines.length&&(lines[i].trim()===''||/^[-*+]\s+|^\d+[.)]\s+|^>\s?/.test(lines[i].trim())))i++;
       map.push({line:ls,type:'list'});continue;
     }
     if(trimmed.indexOf('|')!==-1&&i+1<lines.length&&/^\s*\|?\s*:?-{3,}/.test(lines[i+1])){
       map.push({line:i+1,type:'table'});i+=2;while(i<lines.length&&lines[i].trim()&&lines[i].indexOf('|')!==-1)i++;continue;
     }
     map.push({line:i+1,type:'paragraph'});i++;
     while(i<lines.length&&lines[i].trim()&&!/^#{1,6}\s+/.test(lines[i].trim())&&!/^```/.test(lines[i].trim()))i++;
   }
   return map;
 }
 function installSourceNavigation(source){
   if(!M.vscode)return;
   var doc=document.querySelector('.doc'); if(!doc)return;
   var map=buildSourceMap(source);
   var blocks=doc.querySelectorAll('h1,h2,h3,h4,h5,h6,p,blockquote,ul,ol,pre,.md-table-block,.mermaid-block,.mv-mermaid-placeholder');
   Array.prototype.forEach.call(blocks,function(el,idx){var entry=map[Math.min(idx,map.length-1)];if(entry)el.setAttribute('data-source-line',String(entry.line));});
   doc.ondblclick=function(e){
     if(e.target.closest('button,input,textarea,select,a,.table-resize-handle,.table-right-resizer'))return;
     var el=e.target.closest('[data-source-line]'); if(!el)return;
     var line=Number(el.getAttribute('data-source-line'))||1;
     M.vscode.postMessage({type:'openSource',line:line,column:1});
   };
 }
 async function loadText(text, name) { if (!text.trim()) { M.notify(M.t('empty')); return } var main = document.querySelector('.main'), doc = document.querySelector('.doc'); main.setAttribute('aria-busy', 'true'); var loading = document.createElement('div'); loading.className = 'loading'; loading.innerHTML = '<div>'+M.t('rendering')+'</div>'; document.body.appendChild(loading); try { doc.innerHTML = M.renderMarkdown(text); if (M.enhanceCodeBlocks) M.enhanceCodeBlocks(doc); document.querySelector('.filename').textContent = name; document.getElementById('status').textContent = text.length.toLocaleString() + '文字'; M.buildToc(doc); M.initTables(doc); M.renderMermaid(doc); installSourceNavigation(text); M.refreshText(); document.querySelectorAll('.code-copy').forEach(function (b) { b.onclick = function () { M.copy(this.closest('.code-wrap').querySelector('code').innerText, M.t('codeCopied')) } }); document.querySelectorAll('.code-wrap-toggle').forEach(function (b) { b.onclick = function () { var w = this.closest('.code-wrap'); w.classList.toggle('wrap-lines'); this.setAttribute('aria-pressed', w.classList.contains('wrap-lines')) } }); document.querySelectorAll('.code-collapse').forEach(function (b) { b.onclick = function () { var w = this.closest('.code-wrap'); w.classList.toggle('is-collapsed'); this.setAttribute('aria-expanded', String(!w.classList.contains('is-collapsed'))) } }); window.scrollTo(0, 0) } catch (e) { doc.innerHTML = '<div class="empty-card"><h2>読み込み・描画エラー</h2><p>' + String(e.message || e) + '</p></div>'; M.notify(M.t('failed')) } finally { loading.remove(); main.setAttribute('aria-busy', 'false') } } M.loadText = loadText; shell(); M.refreshText();
 if(M.vscode){
   window.addEventListener('message',function(e){
     var msg=e.data||{};
     if(msg.type==='document') loadText(msg.text||'',msg.name||'Markdown');
   });
   M.vscode.postMessage({type:'ready'});
 } else {
   var fi = document.getElementById('file-input');
   if(fi) fi.addEventListener('change', async function () { try { var f=await M.readFile(this.files[0]); await loadText(f.text,f.name) } catch(e){ M.notify(e.message||'ファイル読み込み失敗') } this.value=''; });
   var overlay=document.getElementById('drop-overlay');
   if(overlay){
     ['dragenter','dragover'].forEach(function(x){document.addEventListener(x,function(e){e.preventDefault();overlay.hidden=false})});
     ['dragleave','drop'].forEach(function(x){document.addEventListener(x,function(e){e.preventDefault();if(x==='drop'){overlay.hidden=true;var f=e.dataTransfer.files[0];M.readFile(f).then(function(v){loadText(v.text,v.name)}).catch(function(err){M.notify(err.message||'不正なファイルです')})}else if(!e.relatedTarget)overlay.hidden=true})});
   }
 }
 })(window.MarkdownViewer);
