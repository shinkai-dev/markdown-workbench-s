window.MarkdownViewer=window.MarkdownViewer||{};(function(M){
function csv(table){return Array.from(table.rows).map(function(r){return Array.from(r.cells).map(function(c){return '"'+c.innerText.replace(/"/g,'""')+'"'}).join(',')}).join('\r\n')}
function numericValue(v){var s=String(v||'').trim().replace(/,/g,'').replace(/%$/,'');if(!s)return null;if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)){var n=Number(s);return Number.isFinite(n)?n:null}return null}
function compareValues(a,b){var na=numericValue(a),nb=numericValue(b);if(na!==null&&nb!==null)return na-nb;if(na!==null&&nb===null)return -1;if(na===null&&nb!==null)return 1;return String(a||'').localeCompare(String(b||''),'en',{numeric:true,sensitivity:'base'})}
function init(block){
 var scroll=block.querySelector('.table-scroll'),table=block.querySelector('table');
 var heads=Array.from(table.querySelectorAll('thead th'));
 var cols=heads.map(function(th){var c=document.createElement('col');c.style.width=Math.max(80,Math.ceil(th.getBoundingClientRect().width))+'px';return c});
 var cg=document.createElement('colgroup');cols.forEach(function(c){cg.appendChild(c)});table.insertBefore(cg,table.firstChild);
 var filters=heads.map(function(){return {text:'',values:[]}}),sortState={index:-1,direction:0};
 var tbody=table.tBodies[0],originalRows=Array.from(tbody.rows);
 var filterBar=document.createElement('div');filterBar.className='table-filter-status';filterBar.setAttribute('aria-live','polite');filterBar.hidden=true;
 filterBar.innerHTML='<span class="filter-summary"></span><button type="button" class="toolbar-btn filter-clear">'+M.t('clearAll')+'</button>';
 block.querySelector('.table-toolbar').after(filterBar);
 function visibleRows(){return Array.from(tbody.rows).filter(function(r){return !r.hidden}).length}
 function applyFilters(){
   Array.from(tbody.rows).forEach(function(row){var ok=filters.every(function(f,i){if(f.text){var t=(row.cells[i]&&row.cells[i].innerText||'').toLocaleLowerCase();if(t.indexOf(f.text.toLocaleLowerCase())<0)return false}if(f.values.length){var v=(row.cells[i]&&row.cells[i].innerText||'').trim();if(f.values.indexOf(v)<0)return false}return true});row.hidden=!ok});
   var active=filters.filter(function(f){return f.text||f.values.length});filterBar.hidden=!active.length;
   if(active.length){var n=visibleRows(),total=tbody.rows.length;filterBar.querySelector('.filter-summary').textContent=active.length+' '+M.t('columnFiltersActive')+' · '+n+' / '+total+' '+M.t('rows');}
   heads.forEach(function(th,i){var on=!!(filters[i].text||filters[i].values.length);th.classList.toggle('is-filtered',on);var b=th.querySelector('.column-filter');if(b){b.setAttribute('aria-pressed',String(on));b.textContent=on?'●':'⌕'}});
 }
 function updateSortUI(){heads.forEach(function(th,i){var b=th.querySelector('.column-sort');var active=sortState.index===i&&sortState.direction!==0;th.classList.toggle('is-sorted',active);th.setAttribute('aria-sort',active?(sortState.direction===1?'ascending':'descending'):'none');if(b){b.setAttribute('aria-pressed',String(active));b.textContent=active?(sortState.direction===1?'↑':'↓'):'↕';b.title=active?(sortState.direction===1?M.t('sortDesc'):M.t('clearSort')):M.t('sortAsc')}})}
 function sortBy(index){
   var next=sortState.index===index?sortState.direction+1:1;if(next>2)next=0;
   sortState={index:index,direction:next};
   var rows=Array.from(tbody.rows);
   if(next===0){originalRows.forEach(function(r){tbody.appendChild(r)})}
   else {rows.sort(function(a,b){var av=a.cells[index]?a.cells[index].innerText.trim():'';var bv=b.cells[index]?b.cells[index].innerText.trim():'';var c=compareValues(av,bv);return c*(next===1?1:-1)});rows.forEach(function(r){tbody.appendChild(r)})}
   updateSortUI();applyFilters();M.notify(next===0?M.t('sortCleared'):(next===1?M.t('sortedAsc'):M.t('sortedDesc')));
 }
 function openFilter(i,button){
   document.querySelectorAll('.table-filter-popover').forEach(function(x){x.remove()});
   var pop=document.createElement('div');pop.className='table-filter-popover';
   var vals=Array.from(new Set(Array.from(tbody.rows).map(function(r){return (r.cells[i]&&r.cells[i].innerText||'').trim()}).filter(Boolean))).sort(function(a,b){return a.localeCompare(b,'en')});
   var f=filters[i];var title=heads[i].innerText.replace(/[⌕●↕↑↓]/g,'').trim()||M.t('column');
   pop.innerHTML='<div class="filter-title">'+title+' '+M.t('filter')+'</div><input class="filter-input" type="search" placeholder="'+M.t('searchKeywords')+'"><div class="filter-values"></div><div class="filter-actions"><button type="button" class="toolbar-btn filter-apply">'+M.t('apply')+'</button><button type="button" class="toolbar-btn filter-reset">'+M.t('clear')+'</button></div>';
   var input=pop.querySelector('.filter-input');input.value=f.text;var values=pop.querySelector('.filter-values');vals.forEach(function(v){var label=document.createElement('label');label.className='filter-value';var cb=document.createElement('input');cb.type='checkbox';cb.value=v;cb.checked=f.values.indexOf(v)>=0;label.appendChild(cb);label.appendChild(document.createTextNode(v));values.appendChild(label)});
   document.body.appendChild(pop);var br=button.getBoundingClientRect();pop.style.left=Math.min(window.innerWidth-pop.offsetWidth-8,Math.max(8,br.left))+'px';pop.style.top=Math.min(window.innerHeight-pop.offsetHeight-8,br.bottom+6)+'px';
   pop.querySelector('.filter-apply').onclick=function(){filters[i].text=input.value.trim();filters[i].values=Array.from(values.querySelectorAll('input:checked')).map(function(x){return x.value});pop.remove();document.removeEventListener('pointerdown',closeOutside,true);applyFilters();M.notify(M.t('tableFiltered'))};
   pop.querySelector('.filter-reset').onclick=function(){filters[i]={text:'',values:[]};pop.remove();document.removeEventListener('pointerdown',closeOutside,true);applyFilters();M.notify(M.t('filterCleared'))};
   var closeOutside=function(ev){if(!pop.contains(ev.target)&&ev.target!==button){pop.remove();document.removeEventListener('pointerdown',closeOutside,true)}};setTimeout(function(){document.addEventListener('pointerdown',closeOutside,true);input.focus()},0);
 }
 function sync(){var c=scroll.classList.contains('is-sticky-column'),h=scroll.classList.contains('is-sticky-header');[['toggle-column',c],['toggle-header',h],['toggle-both',c&&h]].forEach(function(x){var b=block.querySelector('[data-action="'+x[0]+'"]');b.classList.toggle('is-active',x[1]);b.setAttribute('aria-pressed',String(x[1]));b.textContent=(x[1]?'✓ ':'')+({'toggle-column':M.t('freezeColumn'),'toggle-header':M.t('freezeHeader'),'toggle-both':M.t('freezeBoth')}[x[0]])})}
 block.querySelectorAll('[data-action]').forEach(function(btn){btn.addEventListener('click',function(){var a=btn.dataset.action;if(a==='toggle-column')scroll.classList.toggle('is-sticky-column');else if(a==='toggle-header')scroll.classList.toggle('is-sticky-header');else if(a==='toggle-both'){var both=scroll.classList.contains('is-sticky-column')&&scroll.classList.contains('is-sticky-header');scroll.classList.toggle('is-sticky-column',!both);scroll.classList.toggle('is-sticky-header',!both)}if(a==='reset-columns')cols.forEach(function(c){c.style.width=''});if(a==='reset-size'){block.classList.remove('table-sized');block.style.removeProperty('--table-width');block.style.removeProperty('--table-height')}if(a==='toggle-column'||a==='toggle-header'||a==='toggle-both')sync()})});sync();
 filterBar.querySelector('.filter-clear').onclick=function(){filters=filters.map(function(){return {text:'',values:[]}});applyFilters();M.notify(M.t('filtersCleared'))};
 heads.forEach(function(th,idx){
   var sort=document.createElement('button');sort.type='button';sort.className='column-sort';sort.title=M.t('sortAsc');sort.setAttribute('aria-label',th.innerText.trim()+' — sort ascending');sort.setAttribute('aria-pressed','false');sort.textContent='↕';th.appendChild(sort);sort.addEventListener('click',function(ev){ev.stopPropagation();sortBy(idx)});
   var r=document.createElement('span');r.className='column-resizer';r.tabIndex=0;r.setAttribute('role','separator');r.setAttribute('aria-label',M.t('resizeColumn'));th.appendChild(r);
   var fb=document.createElement('button');fb.type='button';fb.className='column-filter';fb.title=M.t('filterColumn');fb.setAttribute('aria-label',M.t('filterColumn'));fb.setAttribute('aria-pressed','false');fb.textContent='⌕';th.appendChild(fb);fb.addEventListener('click',function(ev){ev.stopPropagation();openFilter(idx,fb)});
   var startX,startW;r.addEventListener('pointerdown',function(ev){ev.preventDefault();r.setPointerCapture(ev.pointerId);startX=ev.clientX;startW=cols[idx].getBoundingClientRect().width;function move(e){cols[idx].style.width=Math.min(1200,Math.max(80,startW+e.clientX-startX))+'px'}function up(){r.removeEventListener('pointermove',move);r.removeEventListener('pointerup',up)}r.addEventListener('pointermove',move);r.addEventListener('pointerup',up)});r.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();var w=cols[idx].getBoundingClientRect().width+(e.key==='ArrowRight'?20:-20);cols[idx].style.width=Math.min(1200,Math.max(80,w))+'px'}})
 });updateSortUI();
 var copy=block.querySelector('[data-action="copy-table"]');copy.addEventListener('click',function(){var txt=Array.from(table.rows).map(function(r){return Array.from(r.cells).map(function(c){return c.innerText}).join('\t')}).join('\n');M.copy(txt,M.t('tableCopied'))});
 block.querySelector('[data-action="export-csv"]').addEventListener('click',function(){try{var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv(table)],{type:'text/csv;charset=utf-8'}));a.download='table.csv';a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},500);M.notify(M.t('csvSaved'))}catch(e){M.notify(M.t('csvFailed'))}});
 var rightHandle=block.querySelector('.table-right-resizer'),handle=block.querySelector('.table-resize-handle'),sx,sy,sw,sh;
 rightHandle.addEventListener('pointerdown',function(ev){ev.preventDefault();rightHandle.setPointerCapture(ev.pointerId);sx=ev.clientX;sw=block.getBoundingClientRect().width;block.classList.add('table-sized');function mv(e){var maxW=block.parentElement.clientWidth;block.style.setProperty('--table-width',Math.min(maxW,Math.max(320,sw+e.clientX-sx))+'px')}function up(){rightHandle.removeEventListener('pointermove',mv);rightHandle.removeEventListener('pointerup',up);M.notify(M.t('widthChanged'))}rightHandle.addEventListener('pointermove',mv);rightHandle.addEventListener('pointerup',up)});
 handle.addEventListener('pointerdown',function(ev){ev.preventDefault();handle.setPointerCapture(ev.pointerId);sx=ev.clientX;sy=ev.clientY;sw=block.getBoundingClientRect().width;sh=scroll.getBoundingClientRect().height;block.classList.add('table-sized');function mv(e){var parent=block.parentElement;var maxW=Math.max(320,parent.clientWidth);block.style.setProperty('--table-width',Math.min(maxW,Math.max(320,sw+e.clientX-sx))+'px');block.style.setProperty('--table-height',Math.min(window.innerHeight*.8,Math.max(160,sh+e.clientY-sy))+'px')}function up(){handle.removeEventListener('pointermove',mv);handle.removeEventListener('pointerup',up);M.notify(M.t('sizeChanged'))}handle.addEventListener('pointermove',mv);handle.addEventListener('pointerup',up)});
}
M.initTables=function(root){root.querySelectorAll('.md-table-block').forEach(init)}
})(window.MarkdownViewer);
