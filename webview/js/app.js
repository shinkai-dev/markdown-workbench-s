window.MarkdownViewer = window.MarkdownViewer || {}; (function (M) {
  M.vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
  if(M.vscode && document.body) document.body.classList.add('mv-preview-boot');
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
 function prepareSourceLineCache(lines){
   if(lines._mvMatchCache)return lines._mvMatchCache;
   var normalized=new Array(lines.length);
   var exact=Object.create(null);
   for(var i=0;i<lines.length;i++){
     var value=normalizeVisibleText(stripMarkdownForMatch(lines[i]));
     normalized[i]=value;
     if(value){
       if(!exact[value]) exact[value]=[];
       exact[value].push(i);
     }
   }
   var cache={normalized:normalized,exact:exact};
   try{Object.defineProperty(lines,'_mvMatchCache',{value:cache,configurable:true});}catch(ignore){lines._mvMatchCache=cache;}
   return cache;
 }
 function firstIndexAtOrAfter(list, from){
   var lo=0,hi=list.length;
   while(lo<hi){
     var mid=(lo+hi)>>1;
     if(list[mid]<from)lo=mid+1;else hi=mid;
   }
   return lo<list.length?list[lo]:-1;
 }
 function sourceLineMatches(line, visible, cachedValue){
   var a=cachedValue!==undefined?cachedValue:normalizeVisibleText(stripMarkdownForMatch(line));
   var b=normalizeVisibleText(visible);
   if(!a||!b)return false;
   return a===b || a.indexOf(b)===0 || b.indexOf(a)===0 || a.indexOf(b)>=0;
 }
 function findLineContaining(lines, anchor, from){
   var wanted=normalizeVisibleText(anchor);
   if(!wanted)return -1;
   var start=Math.max(0,from||0);
   var cache=prepareSourceLineCache(lines);
   var exactList=cache.exact[wanted];
   if(exactList){
     var exactHit=firstIndexAtOrAfter(exactList,start);
     if(exactHit>=0)return exactHit;
   }
   // Most blocks are found near the current cursor. Keep the fast path bounded
   // so a large document cannot make source-map construction quadratic merely
   // because an anchor is slightly different from its Markdown source.
   var nearEnd=Math.min(lines.length,start+(wanted.length>24?120:240));
   var prefix=wanted.length>=8?wanted.slice(0,Math.min(48,wanted.length)):'';
   for(var i=start;i<nearEnd;i++){
     var stripped=cache.normalized[i];
     if(!stripped)continue;
     if(sourceLineMatches(null,anchor,stripped))return i;
     if(prefix && (stripped.indexOf(prefix)>=0 || wanted.indexOf(stripped)>=0))return i;
   }
   // Do not fall back to a full-document scan here. That fallback made source
   // map construction effectively quadratic on large documents when an anchor
   // could not be matched by the normal path. Source blocks are processed in
   // source order, so an exact cached match or a bounded nearby match is enough
   // for normal Markdown. Keeping this path bounded prevents a large document
   // from freezing the Webview before the double-click handler is installed.
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
   return {lines:lines,map:map};
 }
 function buildSourceMapAsync(source,blocks,onProgress){
   // Large Markdown documents can contain thousands of preview blocks. Building
   // the source map synchronously makes the Webview main thread unresponsive
   // and, in turn, delays registration of the double-click handler. Process the
   // same mapping in small batches and yield to the browser between batches.
   var lines=normalizeSourceText(source).split('\n');
   var map=new Array(blocks.length);
   var cursor=0, index=0;
   var cache=prepareSourceLineCache(lines);
   var BATCH=40;
   return new Promise(function(resolve){
     function step(){
       var end=Math.min(blocks.length,index+BATCH);
       for(;index<end;index++){
         var el=blocks[index];
         var hit=findSourceLocationForBlock(el,lines,cursor);
         if(!hit){
           map[index]=null;
           continue;
         }
         map[index]={line:hit.line+1,column:hit.column||1,endLine:hit.endLine!=null?hit.endLine+1:null};
         cursor=Math.max(cursor,hit.next||hit.line+1);
       }
       if(typeof onProgress==='function')onProgress(index,blocks.length);
       if(index<blocks.length){
         setTimeout(step,0);
       }else{
         resolve({lines:lines,map:map,cache:cache});
       }
     }
     // Give the browser one paint opportunity before starting the first batch.
     setTimeout(step,0);
   });
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
 function markdownTableHeaderCells(table){
   var header=table&&table.tHead&&table.tHead.rows[0];
   if(!header)return [];
   return Array.prototype.map.call(header.cells,function(cell){
     var clone=cell.cloneNode(true);
     clone.querySelectorAll('.column-actions,.column-sort,.column-filter,.column-copy,.column-resizer').forEach(function(node){node.remove()});
     return tableCellSourceText(clone.textContent||'');
   });
 }
 function findMarkdownTableStart(lines,startLine,headerCells){
   var start=Math.max(0,startLine||0);
   for(var i=start;i<lines.length-1;i++){
     if(!isMarkdownTableLine(lines[i]) || isMarkdownTableSeparator(lines[i]))continue;
     if(!isMarkdownTableSeparator(lines[i+1]))continue;
     var cells=splitMarkdownTableCells(lines[i]);
     if(headerCells.length!==cells.length)continue;
     var same=true;
     for(var c=0;c<headerCells.length;c++){
       if(tableCellSourceText(cells[c])!==headerCells[c]){same=false;break}
     }
     if(same)return i;
   }
   return -1;
 }
 function mapTableCellTargets(tableBlock,lines,startLine){
   var table=tableBlock.querySelector('table');
   if(!table)return null;
   var header=table.tHead&&table.tHead.rows[0];
   var body=table.tBodies&&table.tBodies[0];
   var rows=[];
   if(header) rows.push(header);
   if(body) Array.prototype.forEach.call(body.rows,function(r){rows.push(r)});
   if(!rows.length)return null;

   // Never locate a table by a generic text search. A common header such as
   // "Name" or "Status" can appear in ordinary prose earlier in a large
   // document and would shift every cell mapping to the wrong source row.
   var headerCells=markdownTableHeaderCells(table);
   var lineIndex=findMarkdownTableStart(lines,startLine,headerCells);
   if(lineIndex<0)return null;
   var tableStart=lineIndex;

   for(var r=0;r<rows.length;r++){
     var row=rows[r];
     if(!row.cells.length)continue;
     if(r===0){
       // Header row is the line immediately before the separator.
     }else{
       lineIndex++;
       while(lineIndex<lines.length && (!isMarkdownTableLine(lines[lineIndex]) || isMarkdownTableSeparator(lines[lineIndex])))lineIndex++;
     }
     if(lineIndex>=lines.length)break;
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
       if(found<0 && c<cells.length)found=c;
       if(found>=0){
         used[found]=true;
         var rawLine=lines[lineIndex];
         var rawCell=cells[found];
         var needle=String(rawCell||'').trim();
         var col=1;
         if(needle){
           var pos=rawLine.indexOf(needle);
           if(pos>=0)col=pos+1;
         }
         row.setAttribute('data-source-line',String(lineIndex+1));
         row.setAttribute('data-source-column',String(col));
         cell.setAttribute('data-source-line',String(lineIndex+1));
         cell.setAttribute('data-source-column',String(col));
       }
     }
   }
   tableBlock.setAttribute('data-source-line',String(tableStart+1));
   tableBlock.setAttribute('data-source-column','1');
   return {line:tableStart,next:lineIndex+1};
 }
 function installSourceNavigation(source){
   if(!M.vscode)return Promise.resolve();
   var doc=document.querySelector('.doc'); if(!doc)return Promise.resolve();

   var sourceText=normalizeSourceText(source);
   var lines=sourceText.split('\n');
   var lineCache=prepareSourceLineCache(lines);
   var tableBlocks=Array.prototype.filter.call(
     doc.querySelectorAll('.md-table-block'),
     function(el){ return !!el; }
   );
   var resolving=false;

   // Build an eager, collision-safe index for headings. Duplicate titles are
   // resolved by heading level + normalized title + occurrence order.
   var headingSourceIndex=Object.create(null);
   for(var hi=0;hi<lines.length;hi++){
     var hm=lines[hi].match(/^\s{0,3}(#{1,10})[ \t]+(.+?)[ \t]*#*[ \t]*$/);
     if(!hm)continue;
     var hkey=hm[1].length+'\u0000'+normalizeVisibleText(hm[2]);
     if(!headingSourceIndex[hkey])headingSourceIndex[hkey]=[];
     headingSourceIndex[hkey].push(hi+1);
   }
   var headingSeen=Object.create(null);
   Array.prototype.forEach.call(doc.querySelectorAll('h1,h2,h3,h4,h5,h6'),function(heading){
     var hlevel=Number(heading.getAttribute('data-heading-level')) || Number(heading.tagName.slice(1));
     var hkey=hlevel+'\u0000'+normalizeVisibleText(heading.textContent||'');
     var hocc=headingSeen[hkey]||0;
     headingSeen[hkey]=hocc+1;
     var hmatches=headingSourceIndex[hkey]||[];
     if(hmatches[hocc]){
       heading.setAttribute('data-source-line',String(hmatches[hocc]));
       heading.setAttribute('data-source-column','1');
       heading.setAttribute('data-source-end-line',String(hmatches[hocc]));
     }
   });

   // Code blocks also receive an eager source coordinate. This is especially
   // important for four-space/tab-indented JavaScript/Python blocks because
   // their rendered text no longer contains the Markdown indentation marker.
   // Keep the mapping source-ordered so duplicate first code lines do not jump
   // back to the first occurrence in a large document.
   var codeCursor=0;
   Array.prototype.forEach.call(doc.querySelectorAll('.code-wrap'),function(codeWrap){
     var code=codeWrap.querySelector('code');
     var codeLines=String(code ? code.textContent : '').split('\n').filter(function(x){return x.trim()});
     if(!codeLines.length)return;
     var firstCodeLine=normalizeVisibleText(codeLines[0]);
     var hit=-1;
     var cache=prepareSourceLineCache(lines);
     var candidates=cache.exact[firstCodeLine]||[];
     for(var ci=0;ci<candidates.length;ci++){
       if(candidates[ci] < codeCursor)continue;
       var candidateLine=String(lines[candidates[ci]]||'');
       // A four-space/tab-indented block must really be an indented Markdown
       // code line, not an unrelated prose line containing the same text.
       if(/^(?:[ \t]{4,})(?!#)/.test(candidateLine)){
         hit=candidates[ci];
         break;
       }
       // Fenced code is also valid and may start without indentation.
       if(/^\s*(?:```|~~~)/.test(candidateLine)){
         hit=candidates[ci];
         break;
       }
     }
     if(hit<0){
       var near=codeCursor;
       while(near<lines.length){
         var normalized=cache.normalized[near];
         if(normalized===firstCodeLine && /^(?:[ \t]{4,})/.test(String(lines[near]||''))){hit=near;break;}
         near++;
       }
     }
     if(hit>=0){
       var start=hit;
       // For an indented code block, walk upward to its first contiguous code
       // line so double-clicking any part of the block opens the block start.
       while(start>codeCursor && /^(?:[ \t]{4,})/.test(String(lines[start-1]||'')) && String(lines[start-1]).trim()!=='') start--;
       codeWrap.setAttribute('data-source-line',String(start+1));
       codeWrap.setAttribute('data-source-column','1');
       codeWrap.setAttribute('data-source-end-line',String(Math.max(start,hit)+1));
       codeCursor=Math.max(codeCursor,hit+1);
     }
   });

   /*
    * Source navigation is intentionally lazy for ordinary Markdown blocks.
    * Building a source map for every paragraph/list item made large documents
    * expensive and, more importantly, delayed the source mapping of tables.
    *
    * Tables are different: table filtering/sorting and cell double-click are
    * core features, so only table blocks are mapped eagerly.  Ordinary
    * headings/paragraphs/lists/code/Mermaid blocks are resolved only when the
    * user double-clicks them.
    */
   function normalizedAnchorForElement(el){
     if(!el)return '';
     if(el.classList.contains('mermaid-block'))return String(el._mermaidSource||'').split('\n').filter(function(x){return x.trim()})[0]||'';
     if(el.classList.contains('code-wrap') || el.tagName==='PRE'){
       var code=el.querySelector('code');
       return String(code ? code.textContent : '').split('\n').filter(function(x){return x.trim()})[0]||'';
     }
     if(el.tagName==='LI')return directListItemText(el);
     if(el.tagName==='BLOCKQUOTE'){
       var firstText=el.querySelector('p'); return firstText ? firstText.textContent : el.textContent;
     }
     return el.textContent||'';
   }

   function headingSourceInfo(el, anchor){
     if(!el || !/^H[1-6]$/.test(el.tagName)) return null;
     var level=Number(el.getAttribute('data-heading-level')) || Number(el.tagName.slice(1));
     var wanted=normalizeVisibleText(anchor);
     if(!wanted)return null;
     var same=0;
     var headings=doc.querySelectorAll('h1,h2,h3,h4,h5,h6');
     for(var i=0;i<headings.length;i++){
       var cur=headings[i];
       var curLevel=Number(cur.getAttribute('data-heading-level')) || Number(cur.tagName.slice(1));
       if(curLevel!==level)continue;
       if(normalizeVisibleText(cur.textContent||'')!==wanted)continue;
       if(cur===el)return {level:level, occurrence:same};
       same++;
     }
     return null;
   }

   function findHeadingSourceLine(el, anchor){
     var info=headingSourceInfo(el,anchor);
     if(!info)return -1;
     var seen=0;
     var wanted=normalizeVisibleText(anchor);
     for(var i=0;i<lines.length;i++){
       var m=lines[i].match(/^\s{0,3}(#{1,10})[ \t]+(.+?)[ \t]*#*[ \t]*$/);
       if(!m || m[1].length!==info.level)continue;
       if(normalizeVisibleText(m[2])!==wanted)continue;
       if(seen===info.occurrence)return i;
       seen++;
     }
     return -1;
   }

   function sourceOccurrenceForElement(el, anchor){
     var wanted=normalizeVisibleText(anchor);
     if(!wanted)return 0;
     var count=0;
     var candidates=doc.querySelectorAll('h1,h2,h3,h4,h5,h6,p,blockquote,li,pre,.code-wrap,.mermaid-block,.mv-mermaid-placeholder');
     for(var i=0;i<candidates.length;i++){
       var cur=candidates[i];
       if(cur===el)break;
       if(/^H[1-6]$/.test(cur.tagName))continue;
       if(cur.tagName==='PRE' && cur.parentElement && cur.parentElement.classList.contains('code-wrap'))continue;
       if(normalizeVisibleText(normalizedAnchorForElement(cur))===wanted)count++;
     }
     return count;
   }

   function resolveElement(el){
     if(!el)return null;
     var existing=Number(el.getAttribute('data-source-line'))||0;
     if(existing)return {
       line:existing,
       column:Number(el.getAttribute('data-source-column'))||1,
       endLine:Number(el.getAttribute('data-source-end-line'))||existing
     };

     var anchor=normalizedAnchorForElement(el);
     if(!anchor)return null;

     var wanted=normalizeVisibleText(anchor);
     var lineIndex=findHeadingSourceLine(el,anchor);
     if(lineIndex<0){
       var occurrence=sourceOccurrenceForElement(el,anchor);
       var exact=lineCache.exact[wanted]||[];
       lineIndex=exact.length ? (exact[Math.min(occurrence,exact.length-1)] != null ? exact[Math.min(occurrence,exact.length-1)] : -1) : -1;
     }

     // For headings, a failed heading-specific lookup must not fall back to a
     // generic text search. Generic matching can jump to the first identical
     // title elsewhere in a long document.
     if(lineIndex<0 && /^H[1-6]$/.test(el.tagName))return null;

     if(lineIndex<0){
       lineIndex=findLineContaining(lines,anchor,0);
     }

     if(lineIndex<0)return null;

     var hit=findSourceLocationForBlock(el,lines,lineIndex);
     if(!hit)hit={line:lineIndex,column:1,next:lineIndex+1,endLine:lineIndex};

     var result={
       line:hit.line+1,
       column:hit.column||1,
       endLine:hit.endLine!=null ? hit.endLine+1 : null
     };
     el.setAttribute('data-source-line',String(result.line));
     el.setAttribute('data-source-column',String(result.column));
     if(result.endLine!=null)el.setAttribute('data-source-end-line',String(result.endLine));
     return result;
   }

   doc.ondblclick=function(e){
     var tableCell=e.target.closest && e.target.closest('.md-table-block td,.md-table-block th');
     if(tableCell){
       if(e.target.closest('button,input,textarea,select,.table-resize-handle,.table-right-resizer,.column-resizer'))return;
     }else if(e.target.closest('button,input,textarea,select,a,.table-resize-handle,.table-right-resizer')){
       return;
     }

     var el=tableCell || e.target.closest('[data-source-line]');
     if(!el){
       el=e.target.closest('h1,h2,h3,h4,h5,h6,p,blockquote,li,pre,.code-wrap,.mermaid-block,.mv-mermaid-placeholder');
     }
     if(!el || resolving)return;

     /*
      * Table cells already have exact source coordinates. Never replace that
      * mapping with the generic lazy resolver.
      */
     var inTable=!!el.closest('.md-table-block');
     var line=Number(el.getAttribute('data-source-line'))||0;
     var column=Number(el.getAttribute('data-source-column'))||1;

     // A table row keeps its source coordinate even after sorting/filtering.
     // Use that row-level mapping as a recovery path if a cell attribute was
     // lost by a DOM operation. This path is intentionally table-only so the
     // ordinary lazy resolver is not reintroduced for large documents.
     if(inTable && !line){
       var mappedRow=el.closest('tr');
       if(mappedRow){
         line=Number(mappedRow.getAttribute('data-source-line'))||0;
         column=Number(el.getAttribute('data-source-column'))||Number(mappedRow.getAttribute('data-source-column'))||1;
       }
     }

     if(!line){
       resolving=true;
       var oldTitle=document.title;
       try{
         document.body.classList.add('source-resolving');
         var result=resolveElement(el);
         if(!result){
           M.notify && M.notify('Markdownの位置を特定できませんでした');
           return;
         }
         line=result.line;
         column=result.column||1;
       }catch(err){
         try{console.warn('Markdown source navigation failed:',err);}catch(ignore){}
         M.notify && M.notify('Markdownの位置を特定できませんでした');
         return;
       }finally{
         resolving=false;
         document.body.classList.remove('source-resolving');
         document.title=oldTitle;
       }
     }

     if(!inTable){
       var endLine=Number(el.getAttribute('data-source-end-line'))||line;
       if(endLine>line){
         var brCount=0, range=null;
         try{
           if(document.caretRangeFromPoint) range=document.caretRangeFromPoint(e.clientX,e.clientY);
           else if(document.caretPositionFromPoint){
             var cp=document.caretPositionFromPoint(e.clientX,e.clientY);
             if(cp){range=document.createRange();range.setStart(cp.offsetNode,cp.offset);range.collapse(true);}
           }
         }catch(ignore2){}
         if(range && el.contains(range.startContainer)){
           var walker=document.createTreeWalker(el,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
           var node;
           while((node=walker.nextNode())){
             if(node===range.startContainer)break;
             if(node.nodeType===Node.ELEMENT_NODE && node.tagName==='BR')brCount++;
           }
           if(range.startContainer.nodeType===Node.ELEMENT_NODE){
             var child=range.startContainer.childNodes[range.startOffset-1];
             if(child && child.nodeType===Node.ELEMENT_NODE && child.tagName==='BR')brCount++;
           }
         }else{
           var brs=el.querySelectorAll('br');
           for(var bi=0;bi<brs.length;bi++)if(brs[bi].getBoundingClientRect().top<e.clientY)brCount++;
         }
         line=Math.min(endLine,line+brCount);
       }
     }
     if(line>0)M.vscode.postMessage({type:'openSource',line:line,column:column});
   };

   /*
    * Eagerly map only tables. Keep the source cursor between tables so repeated
    * header text still resolves to the correct table occurrence.
    */
   var tableCursor=0;
   for(var ti=0;ti<tableBlocks.length;ti++){
     var tableBlock=tableBlocks[ti];
     var tableHit=mapTableCellTargets(tableBlock,lines,tableCursor);
     if(!tableHit)continue;
     tableCursor=Math.max(tableCursor,tableHit.next||tableHit.line+1);
   }

   return Promise.resolve();
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
 var previewRenderComplete=false;
 var previewReadyTimer=0;
 var previewResizeObserver=null;
 var PREVIEW_MIN_WIDTH=520;
 function showLoadingOverlay(){
   var loading=document.querySelector('.loading');
   if(!loading){
     loading=document.createElement('div');
     loading.className='loading';
     loading.setAttribute('role','status');
     loading.setAttribute('aria-live','polite');
     loading.innerHTML='<div class="loading-card" aria-hidden="true"><span class="loading-dots"><span></span><span></span><span></span></span></div>';
     document.body.appendChild(loading);
   }
   loading.hidden=false;
   loading.setAttribute('aria-hidden','false');
   document.body.classList.add('mv-rendering');
   document.body.classList.remove('mv-preview-ready');
   return loading;
 }
 function getPreviewWidth(){
   var root=document.documentElement;
   var body=document.body;
   return Math.max(root ? root.clientWidth : 0, body ? body.clientWidth : 0, window.innerWidth || 0);
 }
 function stopPreviewReadyWait(){
   if(previewReadyTimer){clearTimeout(previewReadyTimer);previewReadyTimer=0;}
 }
 function activatePreviewWhenSized(){
   if(!M.vscode || !previewRenderComplete || document.visibilityState==='hidden')return;
   stopPreviewReadyWait();
   if(getPreviewWidth() < PREVIEW_MIN_WIDTH){
     document.body.classList.remove('mv-preview-ready');
     previewReadyTimer=setTimeout(activatePreviewWhenSized,80);
     return;
   }
   requestAnimationFrame(function(){
     requestAnimationFrame(function(){
       if(!M.vscode || !previewRenderComplete || document.visibilityState==='hidden')return;
       if(getPreviewWidth() < PREVIEW_MIN_WIDTH){activatePreviewWhenSized();return;}
       document.body.classList.remove('mv-preview-boot');
       document.body.classList.add('mv-preview-ready');
       var loading=document.querySelector('.loading');
       if(loading){loading.hidden=true;loading.setAttribute('aria-hidden','true');}
       document.body.classList.remove('mv-rendering');
     });
   });
 }
 function markPreviewRenderComplete(){
   previewRenderComplete=true;
   activatePreviewWhenSized();
 }
 function hideLoadingOverlay(){
   markPreviewRenderComplete();
 }
 function beginPreviewActivation(){
   if(!M.vscode)return;
   previewRenderComplete=false;
   stopPreviewReadyWait();
   document.body.classList.remove('mv-preview-ready');
   showLoadingOverlay();
 }
 function installPreviewResizeObserver(){
   if(!M.vscode || previewResizeObserver || typeof ResizeObserver==='undefined')return;
   previewResizeObserver=new ResizeObserver(function(){
     if(previewRenderComplete)activatePreviewWhenSized();
   });
   previewResizeObserver.observe(document.documentElement);
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
 var renderSequence=0;
 var activeRender=Promise.resolve();
 var renderedDocumentUri=null;
 async function loadText(text, name, documentUri) {
   if(M.vscode) beginPreviewActivation();
   var request=++renderSequence;
   activeRender=activeRender.catch(function(){}).then(async function(){
     if(request!==renderSequence)return;
     if (!String(text||'').trim()) { M.notify(M.t('empty')); if(M.vscode) hideLoadingOverlay(); return; }
     var main = document.querySelector('.main'), doc = document.querySelector('.doc');
     if(!main||!doc)return;
     var isSameDocument = !!(documentUri && renderedDocumentUri && documentUri === renderedDocumentUri);
     var previewState=isSameDocument ? capturePreviewState(doc) : null;
     main.setAttribute('aria-busy', 'true');
     showLoadingOverlay();
     try {
       // Let the persistent full-screen curtain paint before the expensive
       // Markdown/TOC/table work begins.
       await new Promise(function(resolve){
         if(window.requestAnimationFrame){
           requestAnimationFrame(function(){requestAnimationFrame(resolve);});
         } else setTimeout(resolve,32);
       });
       if(request!==renderSequence)return;
       doc.innerHTML = M.renderMarkdown(text);
       if (M.enhanceCodeBlocks) M.enhanceCodeBlocks(doc);
       document.querySelector('.filename').textContent = name;
       document.getElementById('status').textContent = text.length.toLocaleString() + '文字';
       M.buildToc(doc);
       M.initTables(doc);
       installSourceNavigation(text);
       restorePreviewState(doc,previewState);
       if(request!==renderSequence)return;
       await M.renderMermaid(doc);
       if(request!==renderSequence)return;
       M.refreshText();
       document.querySelectorAll('.code-copy').forEach(function (b) { b.onclick = function () { M.copy(this.closest('.code-wrap').querySelector('code').innerText, M.t('codeCopied')) } });
       document.querySelectorAll('.code-wrap-toggle').forEach(function (b) { b.onclick = function () { var w = this.closest('.code-wrap'); w.classList.toggle('wrap-lines'); this.setAttribute('aria-pressed', w.classList.contains('wrap-lines')) } });
       document.querySelectorAll('.code-collapse').forEach(function (b) { b.onclick = function () { var w = this.closest('.code-wrap'); w.classList.toggle('is-collapsed'); this.setAttribute('aria-expanded', String(!w.classList.contains('is-collapsed'))) } });
       if(!previewState)window.scrollTo(0, 0);
       renderedDocumentUri=documentUri||null;
     } catch (e) {
       if(request===renderSequence){
         doc.innerHTML = '<div class="empty-card"><h2>読み込み・描画エラー</h2><p>' + String(e.message || e) + '</p></div>';
         M.notify(M.t('failed'));
       }
     } finally {
       if(request===renderSequence){
         hideLoadingOverlay();
         main.setAttribute('aria-busy', 'false');
       }
     }
   });
   return activeRender;
 } M.loadText = loadText; shell(); M.refreshText();
 if(M.vscode){
   // The loading curtain is persistent in the DOM. Keeping it hidden/showing it
   // with the Webview's own visibility lifecycle avoids a race where the retained
   // old document gets one paint before a newly-created overlay can cover it.
   document.addEventListener('visibilitychange',function(){
     if(document.visibilityState==='hidden'){
       stopPreviewReadyWait();
       previewRenderComplete=false;
       document.body.classList.remove('mv-preview-ready');
       showLoadingOverlay();
     }else{
       beginPreviewActivation();
       M.vscode.postMessage({type:'viewActivated'});
     }
   });
   window.addEventListener('message',function(e){
     var msg=e.data||{};
     if(msg.type==='prepareRender'){
       showLoadingOverlay();
       // Acknowledge only after the curtain has been applied. The extension
       // waits for this acknowledgement before switching to the Markdown
       // source tab, so the retained preview can never paint uncovered first.
       if(M.vscode) M.vscode.postMessage({type:'renderPrepared',requestId:msg.requestId});
       return;
     }
     if(msg.type==='renderReady'){ hideLoadingOverlay(); return; }
     if(msg.type==='document') loadText(msg.text||'',msg.name||'Markdown',msg.uri||null);
   });
   installPreviewResizeObserver();
   showLoadingOverlay();
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
