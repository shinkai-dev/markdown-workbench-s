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
   var initialContent = M.vscode ? '' : '<div class="empty"><div class="empty-card"><h1>'+M.t('emptyTitle')+'</h1><p>'+M.t('emptyText')+'</p></div></div>';
   var initialStatus = M.vscode ? '' : M.t('loading');
   var initialFilename = M.vscode ? '' : M.t('notLoaded');
   app.innerHTML='<div class="app-shell"><header class="topbar"><button class="icon-btn sidebar-toggle" id="toc-btn" aria-expanded="false">☰</button><strong class="brand">'+title+'</strong><span class="filename">'+initialFilename+'</span><div class="top-actions">'+openButton+'<button class="icon-btn" id="settings-btn">'+M.t('settings')+'</button></div></header><div class="workspace"><aside class="sidebar"><div class="sidebar-head"><h2 id="toc-title">'+M.t('toc')+'</h2></div><input class="toc-search" placeholder="'+M.t('searchToc')+'" aria-label="'+M.t('searchToc')+'"><ol class="toc"></ol></aside><main class="main"><div class="reading-toolbar"><span id="status">'+initialStatus+'</span><span class="spacer"></span><button class="toolbar-btn" id="width-minus">'+M.t('widthMinus')+'</button><button class="toolbar-btn" id="width-plus">'+M.t('widthPlus')+'</button></div><article class="doc">'+initialContent+'</article></main></div></div>';
   document.getElementById('settings-btn').onclick=settings;
   document.getElementById('toc-btn').onclick=M.toggleSidebar;
   document.getElementById('width-minus').onclick=function(){M.settings.docWidth=Math.max(520,M.settings.docWidth-60);M.saveSettings();M.applySettings();};
   document.getElementById('width-plus').onclick=function(){M.settings.docWidth=Math.min(1400,M.settings.docWidth+60);M.saveSettings();M.applySettings();};
   if(M.settings.tocOpen!==true) { M.settings.tocOpen=false; M.saveSettings(); } var workspace=document.querySelector('.workspace'); workspace.classList.toggle('sidebar-collapsed', !M.settings.tocOpen);
   M.updateSidebarButton(); M.applySettings();
 }

 function settings() { var m=document.createElement('div'); m.className='modal open'; m.innerHTML='<div class="modal-card"><h2>'+M.t('settings')+'</h2><div class="settings-grid"><label class="setting">'+M.t('theme')+'<select class="theme-select"><option value="system">'+M.t('system')+'</option><option value="light">'+M.t('light')+'</option><option value="dark">'+M.t('dark')+'</option><option value="high-contrast">'+M.t('contrast')+'</option></select></label><label class="setting">'+M.t('fontSize')+'<input type="number" min="12" max="24" step="1" value="'+M.settings.fontSize+'"></label><label class="setting">'+M.t('lineHeight')+'<input type="number" min="1.2" max="2.5" step=".05" value="'+M.settings.lineHeight+'"></label><label class="setting">'+M.t('documentWidth')+'<input type="number" min="520" max="1200" step="20" value="'+M.settings.docWidth+'"></label><label class="setting">'+M.t('language')+'<select class="language-select"><option value="ja">'+M.t('japanese')+'</option><option value="en">'+M.t('english')+'</option></select></label></div><p><button class="toolbar-btn" data-close>'+M.t('close')+'</button></p></div>'; document.body.appendChild(m); m.addEventListener('click',function(e){if(e.target===m)m.remove()}); m.querySelector('.modal-card').addEventListener('click',function(e){e.stopPropagation()}); var theme=m.querySelector('.theme-select'); theme.value=M.settings.theme; var ins=m.querySelectorAll('input'); theme.onchange=function(){M.settings.theme=this.value;M.saveSettings();M.applySettings();M.redrawMermaid()}; ins[0].onchange=function(){M.settings.fontSize=+this.value||16;M.saveSettings();M.applySettings()}; ins[1].onchange=function(){M.settings.lineHeight=+this.value||1.85;M.saveSettings();M.applySettings()}; ins[2].onchange=function(){M.settings.docWidth=+this.value||1000;M.saveSettings();M.applySettings()}; var lang=m.querySelector('.language-select'); lang.value=M.settings.language||'ja'; lang.onchange=function(){M.settings.language=this.value;M.saveSettings();m.remove();M.refreshText();M.updateSidebarButton()}; m.querySelector('[data-close]').onclick=function(){m.remove()}; }

 function normalizeSourceText(text){return String(text||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');}
 function normalizeVisibleText(text){
   return String(text||'')
     .replace(/\u00a0/g,' ')
     .replace(/[ \t]+/g,' ')
     .replace(/\s+/g,' ')
     .trim()
     .toLowerCase();
 }
 function stripMarkdownForMatch(text){
   return String(text||'')
     .replace(/^\s{0,3}(?:#{1,10})\s+/,'')
     .replace(/^\s*[-+*]\s+/,'')
     .replace(/^\s*\d+[.)]\s+/,'')
     .replace(/^\s*>\s?/,'')
     .replace(/!\[([^\]]*)\]\([^)]*\)/g,'$1')
     .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
     .replace(/`([^`]+)`/g,'$1')
     .replace(/[*_~]/g,'')
     .replace(/<[^>]+>/g,'')
     .trim();
 }
 function sourceLineMatches(line, visible){
   var a=normalizeVisibleText(stripMarkdownForMatch(line));
   var b=normalizeVisibleText(visible);
   if(!a||!b)return false;
   return a===b || a.indexOf(b)===0 || b.indexOf(a)===0 || a.indexOf(b)>=0;
 }
 function findLineContaining(lines, anchor, from){
   var wanted=normalizeVisibleText(anchor);
   if(!wanted)return -1;
   var limit=Math.min(lines.length, wanted.length>24 ? 120 : lines.length);
   for(var i=Math.max(0,from||0);i<lines.length;i++){
     if(sourceLineMatches(lines[i],anchor))return i;
     var stripped=normalizeVisibleText(stripMarkdownForMatch(lines[i]));
     if(stripped && wanted.length>=8 && (stripped.indexOf(wanted.slice(0,Math.min(48,wanted.length)))>=0 || wanted.indexOf(stripped)>=0))return i;
   }
   return -1;
 }
 function directListItemText(el){
   var parts=[];
   for(var i=0;i<el.childNodes.length;i++){
     var n=el.childNodes[i];
     if(n.nodeType===3) parts.push(n.nodeValue||'');
     else if(n.nodeType===1 && n.tagName!=='UL' && n.tagName!=='OL') parts.push(n.textContent||'');
   }
   return parts.join(' ').replace(/\s+/g,' ').trim();
 }
 function findSourceLocationForBlock(el, lines, from){
   var start=Math.max(0,from||0), i, anchor='';
   if(el.classList.contains('mermaid-block')){
     anchor=el._mermaidSource || '';
     var first=String(anchor).split('\n').filter(function(x){return x.trim()})[0]||'';
     i=findLineContaining(lines,first,start);
     if(i>=0){
       for(var m=i;m>=start;m--){if(/^\s*```\s*mermaid\b/i.test(lines[m])||/^\s*~~~\s*mermaid\b/i.test(lines[m])){i=m;break;}}
       return {line:i,column:1,next:i+1};
     }
   }
   if(el.classList.contains('code-wrap') || el.tagName==='PRE'){
     var code=el.querySelector('code');
     var codeLines=String(code ? code.textContent : '').split('\n').filter(function(x){return x.trim()});
     var codeFirst=codeLines[0]||'';
     i=findLineContaining(lines,codeFirst,start);
     if(i>=0){
       for(var c=i;c>=start;c--){if(/^\s*(?:```|~~~)/.test(lines[c])){i=c;break;}}
       return {line:i,column:1,next:i+1};
     }
   }
   if(el.classList.contains('md-table-block')){
     // Table headers contain the interactive sort/filter/copy controls added
     // by table-controller.js. Using th.textContent here therefore includes
     // labels such as "Filter" and "Copy column", so the source row could
     // not be found and no cell received a source mapping. Use only the
     // actual header text when locating the Markdown table.
     var th=el.querySelector('thead th');
     var headerClone=th ? th.cloneNode(true) : null;
     if(headerClone){
       headerClone.querySelectorAll('.column-actions,.column-sort,.column-filter,.column-copy,.column-resizer').forEach(function(node){node.remove()});
       anchor=headerClone.textContent||'';
     }
     if(!anchor){
       var td=el.querySelector('tbody td');
       anchor=td ? td.textContent : '';
     }
     i=findLineContaining(lines,anchor,start);
     if(i>=0)return {line:i,column:1,next:i+1};
   }
   if(el.tagName==='LI'){
     // Map each rendered list item to its own Markdown source line. Do not use
     // textContent here because nested UL/OL text would make a parent item
     // contain all descendants and cause nested clicks to resolve to the parent.
     anchor=directListItemText(el);
   }else if(/^H[1-6]$/.test(el.tagName)){
     anchor=el.textContent||'';
   }else if(el.tagName==='BLOCKQUOTE'){
     var firstText=el.querySelector('p'); anchor=firstText?firstText.textContent:el.textContent;
   }else if(el.tagName==='P'){
     anchor=el.textContent||'';
   }
   if(anchor){
     var firstVisible=String(anchor).split(/\n/).map(function(x){return x.trim()}).filter(Boolean)[0]||anchor;
     i=findLineContaining(lines,firstVisible,start);
     if(i>=0){
       // Paragraphs can contain multiple Markdown source lines but marked
       // renders them as one <p> with <br> elements when breaks=true. Keep
       // the complete source-line range on the block so a double-click can
       // resolve the actual clicked line instead of always returning to the
       // paragraph's first line.
       if(el.tagName==='P'){
         var end=i+1;
         while(end<lines.length && String(lines[end]).trim()!=='' &&
               !/^\s{0,3}(?:#{1,10})[ \t]+/.test(lines[end]) &&
               !/^\s*[-+*]\s+/.test(lines[end]) &&
               !/^\s*\d+[.)]\s+/.test(lines[end]) &&
               !/^\s*```/.test(lines[end]) &&
               !/^\s*~~~/.test(lines[end]) &&
               !/^\s*\|/.test(lines[end])){
           end++;
         }
         return {line:i,column:1,next:end+1,endLine:end};
       }
       return {line:i,column:1,next:i+1,endLine:i};
     }
   }
   return null;
 }
 function buildSourceMap(source,blocks){
   var lines=normalizeSourceText(source).split('\n'), map=[], cursor=0;
   Array.prototype.forEach.call(blocks,function(el){
     var hit=findSourceLocationForBlock(el,lines,cursor);
     if(!hit){
       // Do not fall back to the old index-based mapping. Once one block is
       // missed, index mapping makes every following block drift further away.
       // Instead, keep the cursor and leave this block unmapped.
       map.push(null);
       return;
     }
     map.push({line:hit.line+1,column:hit.column||1,endLine:hit.endLine!=null?hit.endLine+1:null});
     cursor=Math.max(cursor,hit.next||hit.line+1);
   });
   return map;
 }
 function splitMarkdownTableCells(line){
   var text=String(line||'').trim();
   if(text.charAt(0)==='|') text=text.slice(1);
   if(text.charAt(text.length-1)==='|') text=text.slice(0,-1);
   var cells=[],buf='',escaped=false;
   for(var i=0;i<text.length;i++){
     var ch=text.charAt(i);
     if(escaped){buf+=ch;escaped=false;continue}
     if(ch==='\\'){buf+=ch;escaped=true;continue}
     if(ch==='|'){cells.push(buf.trim());buf='';continue}
     buf+=ch;
   }
   cells.push(buf.trim());
   return cells;
 }
 function tableCellSourceText(cell){
   return normalizeVisibleText(stripMarkdownForMatch(String(cell||'').replace(/\\([|])/g,'$1')));
 }
 function isMarkdownTableLine(line){
   var cells=splitMarkdownTableCells(line);
   return cells.length>=2 && /\|/.test(line);
 }
 function isMarkdownTableSeparator(line){
   var cells=splitMarkdownTableCells(line);
   return cells.length>=2 && cells.every(function(c){return /^:?-{3,}:?$/.test(c.replace(/\s/g,''))});
 }
 function mapTableCellTargets(tableBlock,lines,startLine){
   var table=tableBlock.querySelector('table');
   if(!table)return;
   var header=table.tHead&&table.tHead.rows[0];
   var body=table.tBodies&&table.tBodies[0];
   var rows=[];
   if(header) rows.push(header);
   if(body) Array.prototype.forEach.call(body.rows,function(r){rows.push(r)});
   if(!rows.length)return;
   var lineIndex=Math.max(0,startLine||0);
   while(lineIndex<lines.length && !isMarkdownTableLine(lines[lineIndex])) lineIndex++;
   if(lineIndex>=lines.length)return;
   var sourceRow=0;
   for(var r=0;r<rows.length;r++){
     var row=rows[r];
     if(!row.cells.length)continue;
     while(lineIndex<lines.length && !isMarkdownTableLine(lines[lineIndex])) lineIndex++;
     if(lineIndex>=lines.length)break;
     if(isMarkdownTableSeparator(lines[lineIndex])){lineIndex++; if(lineIndex>=lines.length)break;}
     var cells=splitMarkdownTableCells(lines[lineIndex]);
     var used={};
     for(var c=0;c<row.cells.length;c++){
       var cell=row.cells[c];
       var wanted=tableCellSourceText(cell.textContent||'');
       var found=-1;
       for(var sc=0;sc<cells.length;sc++){
         if(used[sc])continue;
         if(tableCellSourceText(cells[sc])===wanted){found=sc;break}
       }
       if(found<0 && c<cells.length) found=c;
       if(found>=0){
         used[found]=true;
         var rawLine=lines[lineIndex];
         var rawCell=cells[found];
         var needle=String(rawCell||'').trim();
         var col=1;
         if(needle){
           var pos=rawLine.indexOf(needle);
           if(pos>=0) col=pos+1;
         }
         cell.setAttribute('data-source-line',String(lineIndex+1));
         cell.setAttribute('data-source-column',String(col));
       }
     }
     lineIndex++;
     sourceRow++;
   }
 }
 function installSourceNavigation(source){
   if(!M.vscode)return;
   var doc=document.querySelector('.doc'); if(!doc)return;
   // Use list items themselves as navigation targets. Mapping the parent UL/OL
   // would make every nested item resolve to the first item in the list.
   var blocks=Array.prototype.filter.call(doc.querySelectorAll('h1,h2,h3,h4,h5,h6,p,blockquote,li,pre,.code-wrap,.md-table-block,.mermaid-block,.mv-mermaid-placeholder'),function(el){
     // A code wrapper owns its PRE, so map the wrapper only.
     if(el.tagName==='PRE' && el.parentElement && el.parentElement.classList.contains('code-wrap')) return false;
     return true;
   });
   var map=buildSourceMap(source,blocks);
   var lines=normalizeSourceText(source).split('\n');
   Array.prototype.forEach.call(blocks,function(el,idx){
     var entry=map[idx];
     if(entry){
       el.setAttribute('data-source-line',String(entry.line));
       el.setAttribute('data-source-column',String(entry.column||1));
       if(entry.endLine!=null) el.setAttribute('data-source-end-line',String(entry.endLine));
       else el.removeAttribute('data-source-end-line');
     }else{
       el.removeAttribute('data-source-end-line');
       el.removeAttribute('data-source-line');
       el.removeAttribute('data-source-column');
     }
   });
   Array.prototype.forEach.call(doc.querySelectorAll('.md-table-block[data-source-line]'),function(tableBlock){
     var tableLine=Number(tableBlock.getAttribute('data-source-line'))||1;
     mapTableCellTargets(tableBlock,lines,tableLine-1);
   });
   doc.ondblclick=function(e){
     if(e.target.closest('button,input,textarea,select,a,.table-resize-handle,.table-right-resizer'))return;
     var el=e.target.closest('[data-source-line]'); if(!el)return;
     var line=Number(el.getAttribute('data-source-line'))||1;
     var column=Number(el.getAttribute('data-source-column'))||1;

     // Tables deliberately keep their existing cell-level source mapping.
     // Do not alter this path: table filtering/sorting/double-click navigation
     // has its own exact mapping and must remain untouched.
     if(!el.classList.contains('md-table-block') && !el.closest('.md-table-block')){
       var endLine=Number(el.getAttribute('data-source-end-line'))||line;
       if(endLine>line){
         // marked with breaks=true emits <br> for source newlines inside a
         // paragraph. Count only BRs before the clicked point within this
         // block, including BRs nested inside inline elements.
         var brCount=0;
         // e.target is normally the enclosing <p> for plain text, so using
         // it as the comparison node cannot tell which rendered line was
         // double-clicked. Resolve the caret at the actual mouse position
         // first, then count only the <br> elements before that caret.
         var range=null;
         try {
           if(document.caretRangeFromPoint) {
             range=document.caretRangeFromPoint(e.clientX,e.clientY);
           } else if(document.caretPositionFromPoint) {
             var cp=document.caretPositionFromPoint(e.clientX,e.clientY);
             if(cp){
               range=document.createRange();
               range.setStart(cp.offsetNode,cp.offset);
               range.collapse(true);
             }
           }
         } catch(ignore) {}
         if(range && el.contains(range.startContainer)){
           var walker=document.createTreeWalker(el,NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
           var node;
           while((node=walker.nextNode())){
             if(node===range.startContainer) break;
             if(node.nodeType===Node.ELEMENT_NODE && node.tagName==='BR') brCount++;
           }
           // If the caret itself is immediately after a BR, the walker stops
           // at the text node after it and the preceding BR has already been
           // counted. For a caret directly inside the element, count BRs in
           // preceding siblings as well.
           if(range.startContainer.nodeType===Node.ELEMENT_NODE){
             var child=range.startContainer.childNodes[range.startOffset-1];
             if(child && child.nodeType===Node.ELEMENT_NODE && child.tagName==='BR') brCount++;
           }
         } else {
           // Conservative fallback for browsers without caret APIs. This is
           // deliberately restricted to paragraphs and never touches tables.
           var brs=el.querySelectorAll('br');
           for(var bi=0;bi<brs.length;bi++){
             if(brs[bi].getBoundingClientRect().top < e.clientY) brCount++;
           }
         }
         line=Math.min(endLine,line+brCount);
       }
     }
     M.vscode.postMessage({type:'openSource',line:line,column:column});
   };
 }
 function capturePreviewState(doc){
   var hasRenderedContent=!!(doc&&doc.querySelector('.md-table-block,.mermaid-block,.code-wrap,h1,h2,h3,h4,h5,h6,p,ul,ol,blockquote'));
   if(!hasRenderedContent)return null;
   return {
     scrollX:window.scrollX||0,
     scrollY:window.scrollY||0,
     tableStates:M.captureTableStates?M.captureTableStates(doc):[],
     codeStates:Array.prototype.map.call(doc.querySelectorAll('.code-wrap'),function(w){return {wrap:w.classList.contains('wrap-lines'),collapsed:w.classList.contains('is-collapsed')}}),
     sidebarOpen:M.settings.tocOpen===true
   };
 }
 function restorePreviewState(doc,state){
   if(!state)return;
   if(M.restoreTableStates)M.restoreTableStates(doc,state.tableStates||[]);
   Array.prototype.forEach.call(doc.querySelectorAll('.code-wrap'),function(w,i){var st=state.codeStates&&state.codeStates[i];if(!st)return;w.classList.toggle('wrap-lines',!!st.wrap);w.classList.toggle('is-collapsed',!!st.collapsed);var b=w.querySelector('.code-wrap-toggle');if(b)b.setAttribute('aria-pressed',String(!!st.wrap));var c=w.querySelector('.code-collapse');if(c){c.setAttribute('aria-expanded',String(!st.collapsed));c.textContent=st.collapsed?M.t('codeExpand'):M.t('codeCollapse')}});
   var w=document.querySelector('.workspace');if(w){w.classList.toggle('sidebar-collapsed',state.sidebarOpen!==true);M.updateSidebarButton();}
   var restoreScroll=function(){window.scrollTo(state.scrollX||0,state.scrollY||0)};
   requestAnimationFrame(restoreScroll);
   setTimeout(restoreScroll,60);
   setTimeout(restoreScroll,180);
 }
 async function loadText(text, name) { if (!text.trim()) { M.notify(M.t('empty')); return } var main = document.querySelector('.main'), doc = document.querySelector('.doc'); var previewState=capturePreviewState(doc); main.setAttribute('aria-busy', 'true'); var loading = document.createElement('div'); loading.className = 'loading'; loading.innerHTML = '<div>'+M.t('rendering')+'</div>'; document.body.appendChild(loading); try { doc.innerHTML = M.renderMarkdown(text); if (M.enhanceCodeBlocks) M.enhanceCodeBlocks(doc); document.querySelector('.filename').textContent = name; document.getElementById('status').textContent = text.length.toLocaleString() + '文字'; M.buildToc(doc); M.initTables(doc); installSourceNavigation(text); restorePreviewState(doc,previewState); M.renderMermaid(doc); M.refreshText(); document.querySelectorAll('.code-copy').forEach(function (b) { b.onclick = function () { M.copy(this.closest('.code-wrap').querySelector('code').innerText, M.t('codeCopied')) } }); document.querySelectorAll('.code-wrap-toggle').forEach(function (b) { b.onclick = function () { var w = this.closest('.code-wrap'); w.classList.toggle('wrap-lines'); this.setAttribute('aria-pressed', w.classList.contains('wrap-lines')) } }); document.querySelectorAll('.code-collapse').forEach(function (b) { b.onclick = function () { var w = this.closest('.code-wrap'); w.classList.toggle('is-collapsed'); this.setAttribute('aria-expanded', String(!w.classList.contains('is-collapsed'))) } }); if(!previewState)window.scrollTo(0, 0) } catch (e) { doc.innerHTML = '<div class="empty-card"><h2>読み込み・描画エラー</h2><p>' + String(e.message || e) + '</p></div>'; M.notify(M.t('failed')) } finally { loading.remove(); main.setAttribute('aria-busy', 'false') } } M.loadText = loadText; shell(); M.refreshText();
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
