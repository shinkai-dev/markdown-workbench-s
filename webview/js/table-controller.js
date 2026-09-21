window.MarkdownViewer=window.MarkdownViewer||{};(function(M){
function cleanCellText(cell){
  var clone=cell.cloneNode(true);
  clone.querySelectorAll('.column-actions,.column-sort,.column-filter,.column-copy,.column-resizer').forEach(function(el){el.remove()});
  return clone.innerText.replace(/\u00a0/g,' ').trim();
}
function rowsForExport(tbody){return Array.from(tbody.rows).filter(function(r){return !r.hidden})}
function tableTSV(table){
  var rows=Array.from(table.rows);
  return rows.map(function(r){return Array.from(r.cells).map(cleanCellText).join('\t')}).join('\n');
}
function columnTSV(table,index){
  var tbody=table.tBodies[0];
  var head=table.tHead&&table.tHead.rows[0]&&table.tHead.rows[0].cells[index];
  var values=[];
  if(head) values.push(cleanCellText(head));
  rowsForExport(tbody).forEach(function(r){if(r.cells[index])values.push(cleanCellText(r.cells[index]))});
  return values.join('\n');
}
function csv(table){
  return Array.from(table.rows).map(function(r){return Array.from(r.cells).map(function(c){return '"'+cleanCellText(c).replace(/"/g,'""')+'"'}).join(',')}).join('\r\n')
}
function numericValue(v){var s=String(v||'').trim().replace(/,/g,'').replace(/%$/,'');if(!s)return null;if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)){var n=Number(s);return Number.isFinite(n)?n:null}return null}
function compareValues(a,b){var na=numericValue(a),nb=numericValue(b);if(na!==null&&nb!==null)return na-nb;if(na!==null&&nb===null)return -1;if(na===null&&nb!==null)return 1;return String(a||'').localeCompare(String(b||''),'ja',{numeric:true,sensitivity:'base'})}
M.refreshTableText = function(){
 document.querySelectorAll('.md-table-block').forEach(function(block){
   var actions=block.querySelectorAll('[data-action]');
   actions.forEach(function(btn){
     var a=btn.dataset.action;
     var label={'toggle-column':M.t('tableFirstColumn'),'toggle-header':M.t('tableFirstRow'),'toggle-both':M.t('tableBoth'),'reset-columns':M.t('tableResetColumns'),'reset-size':M.t('tableResetSize'),'copy-table':M.t('tableCopy'),'export-csv':M.t('tableCsv')}[a];
     if(label) btn.textContent=(btn.classList.contains('is-active')?'✓ ':'')+label;
   });
   var clear=block.querySelector('.filter-clear'); if(clear) clear.textContent=M.t('filterAllClear');
   block.querySelectorAll('.column-actions').forEach(function(actions){actions.setAttribute('aria-label',M.t('columnActions'))});
   block.querySelectorAll('.column-sort').forEach(function(b){var active=b.getAttribute('aria-pressed')==='true';var th=b.closest('th');var title=th?cleanCellText(th):'';b.title=active?(b.textContent==='↓'?M.t('sortDescending'):M.t('sortClear')):M.t('sortAscending');b.setAttribute('aria-label',title+' '+b.title)});
   block.querySelectorAll('.column-filter').forEach(function(b){var th=b.closest('th');var title=th?cleanCellText(th):'';b.title=M.t('filterColumn');b.setAttribute('aria-label',title+' '+b.title)});
   block.querySelectorAll('.column-copy').forEach(function(b){var th=b.closest('th');var title=th?cleanCellText(th):'';b.title=M.t('copyColumn');b.setAttribute('aria-label',title+' '+b.title)});
 });
 var pop=document.querySelector('.table-filter-popover');
 if(pop){
   var titleEl=pop.querySelector('.filter-title');
   if(titleEl){var raw=titleEl.dataset.columnTitle||titleEl.textContent.replace(/(で絞り込み|Filter )$/,'');titleEl.textContent=M.t('filterTitle').replace('{title}',raw);titleEl.dataset.columnTitle=raw;}
   var input=pop.querySelector('.filter-input');if(input)input.placeholder=M.t('filterInput');
   var st=pop.querySelector('.filter-special-title');if(st)st.textContent=M.t('filterSpecial');
   var vt=pop.querySelector('.filter-values-title');if(vt)vt.textContent=M.t('filterValues');
   var ap=pop.querySelector('.filter-apply');if(ap)ap.textContent=M.t('filterApply');
   var rs=pop.querySelector('.filter-reset');if(rs)rs.textContent=M.t('filterReset');
   var badges=pop.querySelectorAll('.filter-special-badge');if(badges.length>=2){badges[0].textContent=M.t('emptyValue');badges[1].textContent=M.t('nonEmptyValue');}
 }
};

function init(block){
 var scroll=block.querySelector('.table-scroll'),table=block.querySelector('table');
 var heads=Array.from(table.querySelectorAll('thead th'));
 var tbody=table.tBodies[0];
 var cols=[];
 var initialWidths=[];
 function textWidth(text){
   var value=String(text||'').replace(/\s+/g,' ').trim();
   if(!value)return 0;
   var canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
   if(!ctx)return Math.min(420,Math.max(48,value.length*8));
   ctx.font='600 13px '+getComputedStyle(document.body).fontFamily;
   var max=0;
   value.split(/\r?\n/).forEach(function(line){max=Math.max(max,ctx.measureText(line).width)});
   return max;
 }
 function preferredWidth(index){
   var count=heads.length;
   var maxByColumns=count<=2?420:count<=4?300:count<=7?220:160;
   var maxContent=0;
   var headerText=cleanCellText(heads[index]);
   maxContent=Math.max(maxContent,textWidth(headerText)+24);
   Array.from(tbody.rows).slice(0,80).forEach(function(row){
     if(row.cells[index])maxContent=Math.max(maxContent,textWidth(cleanCellText(row.cells[index]))+28);
   });
   return Math.min(maxByColumns,Math.max(96,Math.ceil(maxContent)));
 }
 heads.forEach(function(th,index){initialWidths[index]=preferredWidth(index)});
 heads.forEach(function(th,index){var c=document.createElement('col');c.style.width=initialWidths[index]+'px';cols.push(c)});
 var cg=document.createElement('colgroup');cols.forEach(function(c){cg.appendChild(c)});table.insertBefore(cg,table.firstChild);
 function resetColumns(){initialWidths=[];heads.forEach(function(th,index){initialWidths[index]=preferredWidth(index);cols[index].style.width=initialWidths[index]+'px';th.classList.remove('mv-column-user-resized','mv-column-compact','mv-column-vertical')})}
 var filters=heads.map(function(){return {text:'',values:[]}}),sortState={index:-1,direction:0};
 var originalRows=Array.from(tbody.rows);
 var filterBar=document.createElement('div');filterBar.className='table-filter-status';filterBar.setAttribute('aria-live','polite');filterBar.hidden=true;
 filterBar.innerHTML='<span class="filter-summary"></span><button type="button" class="toolbar-btn filter-clear">'+M.t('filterAllClear')+'</button>';
 block.querySelector('.table-toolbar').after(filterBar);
 filterBar.querySelector('.filter-clear').addEventListener('click',function(){filters.forEach(function(f){f.text='';f.values=[]});applyFilters();M.notify(M.t('allTableFiltersCleared'))});
 function visibleRows(){return Array.from(tbody.rows).filter(function(r){return !r.hidden}).length}
 function applyFilters(){
   Array.from(tbody.rows).forEach(function(row){var ok=filters.every(function(f,i){if(f.text){var t=(row.cells[i]&&cleanCellText(row.cells[i])||'').toLocaleLowerCase();if(t.indexOf(f.text.toLocaleLowerCase())<0)return false}if(f.values.length){var v=(row.cells[i]&&cleanCellText(row.cells[i])||'').trim();var matches=f.values.some(function(x){return x==='__MV_EMPTY__'?v==='':x==='__MV_NONEMPTY__'?v!=='':x===v});if(!matches)return false}return true});row.hidden=!ok});
   var active=filters.filter(function(f){return f.text||f.values.length});filterBar.hidden=!active.length;
   if(active.length){var n=visibleRows(),total=tbody.rows.length;filterBar.querySelector('.filter-summary').textContent=M.t('filteringSummary').replace('{active}',active.length).replace('{shown}',n).replace('{total}',total);}
   heads.forEach(function(th,i){var on=!!(filters[i].text||filters[i].values.length);th.classList.toggle('is-filtered',on);var b=th.querySelector('.column-filter');if(b){b.setAttribute('aria-pressed',String(on));b.textContent=on?'●':'⌕'}});
 }
 function updateSortUI(){heads.forEach(function(th,i){var b=th.querySelector('.column-sort');var active=sortState.index===i&&sortState.direction!==0;th.classList.toggle('is-sorted',active);th.setAttribute('aria-sort',active?(sortState.direction===1?'ascending':'descending'):'none');if(b){b.setAttribute('aria-pressed',String(active));b.textContent=active?(sortState.direction===1?'↑':'↓'):'↕';b.title=active?(sortState.direction===1?M.t('sortDescending'):M.t('sortClear')):M.t('sortAscending')}})}
 function sortBy(index){
   var next=sortState.index===index?sortState.direction+1:1;if(next>2)next=0;
   sortState={index:index,direction:next};
   var rows=Array.from(tbody.rows);
   if(next===0){originalRows.forEach(function(r){tbody.appendChild(r)})}
   else {rows.sort(function(a,b){var av=a.cells[index]?cleanCellText(a.cells[index]):'';var bv=b.cells[index]?cleanCellText(b.cells[index]):'';var c=compareValues(av,bv);return c*(next===1?1:-1)});rows.forEach(function(r){tbody.appendChild(r)})}
   updateSortUI();applyFilters();M.notify(next===0?(M.t('sortCleared')):(next===1?(M.t('sortedAscending')):(M.t('sortedDescending'))));
 }
 function openFilter(i,button){
   document.querySelectorAll('.table-filter-popover').forEach(function(x){x.remove()});
   var pop=document.createElement('div');pop.className='table-filter-popover';
   var vals=Array.from(new Set(Array.from(tbody.rows).map(function(r){return (r.cells[i]&&cleanCellText(r.cells[i])||'').trim()}).filter(Boolean))).sort(function(a,b){return a.localeCompare(b,'ja')});
   var f=filters[i],title=cleanCellText(heads[i])||'列';
   pop.innerHTML='<div class="filter-title" data-column-title="'+title.replace(/"/g,'&quot;')+'">'+M.t('filterTitle').replace('{title}',title)+'</div><input class="filter-input" type="search" placeholder="'+M.t('filterInput')+'"><div class="filter-special-title">'+M.t('filterSpecial')+'</div><div class="filter-special"></div><div class="filter-values-title">'+M.t('filterValues')+'</div><div class="filter-values"></div><div class="filter-actions"><button type="button" class="toolbar-btn filter-apply">'+M.t('filterApply')+'</button><button type="button" class="toolbar-btn filter-reset">'+M.t('filterReset')+'</button></div>';
   var input=pop.querySelector('.filter-input');input.value=f.text;var values=pop.querySelector('.filter-values');var special=pop.querySelector('.filter-special');
   [['__MV_EMPTY__',M.t('emptyValue')],['__MV_NONEMPTY__',M.t('nonEmptyValue')]].forEach(function(item){var label=document.createElement('label');label.className='filter-value filter-special-option';var cb=document.createElement('input');cb.type='checkbox';cb.value=item[0];cb.checked=f.values.indexOf(item[0])>=0;var badge=document.createElement('span');badge.className='filter-special-badge';badge.textContent=item[1];label.appendChild(cb);label.appendChild(badge);special.appendChild(label)});
   vals.forEach(function(v){var label=document.createElement('label');label.className='filter-value';var cb=document.createElement('input');cb.type='checkbox';cb.value=v;cb.checked=f.values.indexOf(v)>=0;label.appendChild(cb);label.appendChild(document.createTextNode(v));values.appendChild(label)});
   document.body.appendChild(pop);var br=button.getBoundingClientRect();pop.style.left=Math.min(window.innerWidth-pop.offsetWidth-8,Math.max(8,br.left))+'px';pop.style.top=Math.min(window.innerHeight-pop.offsetHeight-8,br.bottom+6)+'px';
   var closeOutside=function(ev){if(!pop.contains(ev.target)&&ev.target!==button){pop.remove();document.removeEventListener('pointerdown',closeOutside,true)}};
   pop.querySelector('.filter-apply').onclick=function(){filters[i].text=input.value.trim();filters[i].values=Array.from(values.querySelectorAll('input:checked')).map(function(x){return x.value});pop.remove();document.removeEventListener('pointerdown',closeOutside,true);applyFilters();M.notify(M.t('tableFiltered'))};
   pop.querySelector('.filter-reset').onclick=function(){filters[i]={text:'',values:[]};pop.remove();document.removeEventListener('pointerdown',closeOutside,true);applyFilters();M.notify(M.t('columnFilterCleared'))};
   setTimeout(function(){document.addEventListener('pointerdown',closeOutside,true);input.focus()},0);
 }
 function sync(){var c=scroll.classList.contains('is-sticky-column'),h=scroll.classList.contains('is-sticky-header');[['toggle-column',c],['toggle-header',h],['toggle-both',c&&h]].forEach(function(x){var b=block.querySelector('[data-action="'+x[0]+'"]');b.classList.toggle('is-active',x[1]);b.setAttribute('aria-pressed',String(x[1]));b.textContent=(x[1]?'✓ ':'')+({'toggle-column':M.t('tableFirstColumn'),'toggle-header':M.t('tableFirstRow'),'toggle-both':M.t('tableBoth')}[x[0]])})}
 block.querySelectorAll('[data-action]').forEach(function(btn){btn.addEventListener('click',function(){var a=btn.dataset.action;if(a==='toggle-column')scroll.classList.toggle('is-sticky-column');else if(a==='toggle-header')scroll.classList.toggle('is-sticky-header');else if(a==='toggle-both'){var both=scroll.classList.contains('is-sticky-column')&&scroll.classList.contains('is-sticky-header');scroll.classList.toggle('is-sticky-column',!both);scroll.classList.toggle('is-sticky-header',!both)}if(a==='reset-columns')resetColumns();if(a==='reset-size'){block.classList.remove('table-sized');block.style.removeProperty('--table-width');block.style.removeProperty('--table-height')}if(a==='toggle-column'||a==='toggle-header'||a==='toggle-both')sync()})});sync();
 heads.forEach(function(th,idx){
   // Keep the header label in its own box so the action controls never overlap it.
   var titleWrap=document.createElement('span');titleWrap.className='column-title';
   while(th.firstChild) titleWrap.appendChild(th.firstChild);
   th.appendChild(titleWrap);
   var actions=document.createElement('span');actions.className='column-actions';actions.setAttribute('aria-label',M.t('columnActions'));th.appendChild(actions);
   var sort=document.createElement('button');sort.type='button';sort.className='column-sort';sort.title=M.t('sortAscending');sort.setAttribute('aria-label',cleanCellText(th)+' '+M.t('sortAscending'));sort.setAttribute('aria-pressed','false');sort.textContent='↕';actions.appendChild(sort);sort.addEventListener('click',function(ev){ev.stopPropagation();sortBy(idx)});
   var fb=document.createElement('button');fb.type='button';fb.className='column-filter';fb.title=M.t('filterColumn');fb.setAttribute('aria-label',cleanCellText(th)+' '+M.t('filterColumn'));fb.setAttribute('aria-pressed','false');fb.textContent='⌕';actions.appendChild(fb);fb.addEventListener('click',function(ev){ev.stopPropagation();openFilter(idx,fb)});
   var cc=document.createElement('button');cc.type='button';cc.className='column-copy';cc.title=M.t('copyColumn');cc.setAttribute('aria-label',cleanCellText(th)+' '+M.t('copyColumn'));cc.textContent='⧉';actions.appendChild(cc);cc.addEventListener('click',function(ev){ev.stopPropagation();M.copy(columnTSV(table,idx),M.t('columnCopied'))});
   var r=document.createElement('span');r.className='column-resizer';r.tabIndex=0;r.setAttribute('role','separator');r.setAttribute('aria-label',M.t('columnWidthResize'));r.dataset.columnIndex=String(idx);th.appendChild(r);
   function setColumnWidth(w){
     w=Math.min(1200,Math.max(48,Math.round(w)));
     cols[idx].style.width=w+'px';
     th.classList.add('mv-column-user-resized');
     syncColumnActionLayout();
   }
   var startX,startW;
   r.addEventListener('pointerdown',function(ev){
     ev.preventDefault();ev.stopPropagation();
     r.setPointerCapture(ev.pointerId);
     startX=ev.clientX;startW=parseFloat(cols[idx].style.width)||cols[idx].getBoundingClientRect().width;
     function move(e){setColumnWidth(startW+e.clientX-startX)}
     function up(){r.removeEventListener('pointermove',move);r.removeEventListener('pointerup',up)}
     r.addEventListener('pointermove',move);r.addEventListener('pointerup',up);
   });
   r.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();var w=parseFloat(cols[idx].style.width)||cols[idx].getBoundingClientRect().width;setColumnWidth(w+(e.key==='ArrowRight'?20:-20))}});
 });
 // Actions are horizontal by default for every column. They are switched to
 // vertical only after that specific column has been explicitly narrowed by
 // the user. Because the normal action group is absolutely positioned in CSS,
 // it no longer prevents any column from being narrowed in the first place.
 function syncColumnActionLayout(){
   heads.forEach(function(th,index){
     /* The col element is the single source of truth. Never infer the state
        from TH geometry: fixed-layout tables can redistribute intrinsic cell
        content and make neighbouring THs report misleading widths. */
     var w=parseFloat(cols[index] && cols[index].style.width);
     if(!Number.isFinite(w)) w=th.getBoundingClientRect().width;
     var userResized=th.classList.contains('mv-column-user-resized');
     th.classList.toggle('mv-column-compact',userResized && w<150);
     th.classList.toggle('mv-column-vertical',userResized && w<110);
   });
 }
 syncColumnActionLayout();
 updateSortUI();
 var copy=block.querySelector('[data-action="copy-table"]');copy.addEventListener('click',function(){M.copy(tableTSV(table),M.t('tableCopied'))});
 block.querySelector('[data-action="export-csv"]').addEventListener('click',function(){try{var a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\uFEFF'+csv(table)],{type:'text/csv;charset=utf-8'}));a.download='table.csv';a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},500);M.notify(M.t('csvSaved'))}catch(e){M.notify(M.t('csvSaveFailed'))}});
 var rightHandle=block.querySelector('.table-right-resizer'),handle=block.querySelector('.table-resize-handle'),sx,sy,sw,sh;
 rightHandle.addEventListener('pointerdown',function(ev){ev.preventDefault();rightHandle.setPointerCapture(ev.pointerId);sx=ev.clientX;sw=block.getBoundingClientRect().width;block.classList.add('table-sized');function mv(e){var maxW=block.parentElement.clientWidth;block.style.setProperty('--table-width',Math.min(maxW,Math.max(320,sw+e.clientX-sx))+'px')}function up(){rightHandle.removeEventListener('pointermove',mv);rightHandle.removeEventListener('pointerup',up);M.notify(M.t('tableWidthChanged'))}rightHandle.addEventListener('pointermove',mv);rightHandle.addEventListener('pointerup',up)});
 handle.addEventListener('pointerdown',function(ev){ev.preventDefault();handle.setPointerCapture(ev.pointerId);sx=ev.clientX;sy=ev.clientY;sw=block.getBoundingClientRect().width;sh=scroll.getBoundingClientRect().height;block.classList.add('table-sized');function mv(e){var parent=block.parentElement;var maxW=Math.max(320,parent.clientWidth);block.style.setProperty('--table-width',Math.min(maxW,Math.max(320,sw+e.clientX-sx))+'px');block.style.setProperty('--table-height',Math.min(window.innerHeight*.8,Math.max(160,sh+e.clientY-sy))+'px')}function up(){handle.removeEventListener('pointermove',mv);handle.removeEventListener('pointerup',up);M.notify(M.t('tableSizeChanged'))}handle.addEventListener('pointermove',mv);handle.addEventListener('pointerup',up)});
}
M.initTables=function(root){root.querySelectorAll('.md-table-block').forEach(init)}
})(window.MarkdownViewer);
