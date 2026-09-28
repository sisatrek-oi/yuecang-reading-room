import {topic,sourceTopic,topics,getTopic,getCategories,getItems,inCategory} from './data.mjs';
import {parseRoute,routeURL} from './router.mjs';
import {searchRecords,themeCounts} from './search.mjs';
import {originalCatalog} from './original-catalog.mjs';

const $=s=>document.querySelector(s);
const main=$('#main'), detail=$('#detail-dialog');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={copy:'M8 8h12v12H8z M16 8V4H4v12h4',motion:'M5 12h3m3 0h3m3 0h3M12 5v3m0 8v3',search:'M20 20l-5-5m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0',left:'M15 5l-7 7 7 7',right:'M9 5l7 7-7 7',external:'M14 4h6v6m0-6L10 14M10 4H4v16h16v-6',folder:'M3 7V4h7l3 3h8v13H3z',book:'M12 5v16M12 5C8 2 4 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-4-1-7-2-10 1',close:'M6 6l12 12M18 6L6 18'};
const icon=(name,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name]}"/></svg>`;
const link=(target,label,cls='',extra='')=>`<a href="${routeURL({...target,topic:target.topic||route.topic||topic.id})}" class="${cls}" ${extra}>${label}</a>`;
let route=parseRoute(location.hash), cancelRail=()=>{}, toastTimer;
let currentTopic=getTopic(route.topic)||topic,categories=getCategories(currentTopic.id),items=getItems(currentTopic.id);
let room=null, previousPage=null;
let visibleItems=[], activeIndex=0;
let visibleResults=[];
const preference=matchMedia('(prefers-reduced-motion: reduce)');
let motionAllowed=true;
try{motionAllowed=localStorage.getItem('reading-room-motion')!=='off';}catch{}
function reduced(){return !motionAllowed||preference.matches;}
function updateMotion(){document.documentElement.dataset.motion=reduced()?'off':'on';}
updateMotion();
preference.addEventListener('change',()=>{updateMotion();renderHeader();syncRoom(false);});

function renderHeader(){
  const cat=categories.find(c=>c.id===route.category);
  const crumbs=route.page==='shelf'?'<span>我的书架</span>':`${link({},'书架')}<span class="sep">/</span>${route.page==='desk'?`<span>${escape(currentTopic.shortTitle||currentTopic.title)}</span>`:link({page:'desk'},escape(currentTopic.shortTitle||currentTopic.title))}${cat?`<span class="sep">/</span><span>${cat.title}</span>`:''}`;
  $('#header').innerHTML=`${link({},'<span class="brand-mark">藏</span><span><span class="brand-name">阅藏</span><span class="brand-en">THE READING ROOM</span></span>','brand','aria-label="阅藏，返回书架"')}<div class="header-right"><nav class="breadcrumbs" aria-label="当前位置">${crumbs}</nav><div class="header-tools"><button class="text-button" data-action="motion" aria-pressed="${!reduced()}" aria-label="${reduced()?'尝试开启动效':'关闭动效'}">${icon('motion')}<span class="motion-label">动效${reduced()?'关':'开'}</span></button><button class="text-button" data-action="share">${icon('copy')}复制链接</button></div></div>`;
}
function shelfView(){return `<section class="room-interface shelf-interface" aria-labelledby="shelf-title"><div class="room-caption"><p class="eyebrow">THE READING ROOM / 002</p><h1 id="shelf-title">藏在书里的历史</h1><p>取下一本书，走近一个主题。</p><div class="room-caption-rule"></div><span class="room-caption-small">当前开放 · 两本主题资料集</span></div>${topics.map(t=>link({page:'desk',topic:t.id},`<span class="hotspot-dot"></span><span>${escape(t.title)}</span><span class="hotspot-action">取下阅读 ↗</span>`,'world-hotspot book-hotspot',`data-world-anchor="${t.id}" aria-label="取下《${escape(t.title)}》，在书桌上展开"`)).join('')}<p class="room-instruction"><span class="instruction-line"></span> 点击书架上的主题书，开启阅读 <span class="instruction-line"></span></p><div class="renderer-fallback"><p>当前设备未能加载三维场景。</p>${topics.map(t=>link({page:'desk',topic:t.id},`打开${escape(t.shortTitle||t.title)}`,'secondary-link')).join('')}</div></section>`;}
function deskView(){return `<section class="room-interface desk-interface" aria-labelledby="desk-title"><div class="room-caption"><p class="eyebrow">ON YOUR DESK / ${escape(currentTopic.en)}</p><h1 id="desk-title">${currentTopic.id===sourceTopic.id?currentTopic.title.split('·').map(escape).join('·<br>'):escape(currentTopic.title)}</h1><p class="${currentTopic.id===sourceTopic.id?'theme-question':''}">${escape(currentTopic.subtitle)}</p>${link({},'← 合上书，回到书架','room-back')}</div><nav class="world-folder-links" aria-label="选择资料分类">${categories.map(c=>link({page:'category',category:c.id},`<span class="hotspot-dot"></span><span>${c.title}</span><span class="hotspot-action">↗</span>`,'world-hotspot folder-hotspot',`data-world-anchor="${c.id}" aria-label="打开${c.title}，${c.note}"`)).join('')}</nav><p class="room-instruction"><span class="instruction-line"></span> 点击桌上的档案夹，展开资料 <span class="instruction-line"></span></p><div class="renderer-fallback"><p>当前设备未能加载三维场景。请选择资料分类：</p>${categories.map(c=>link({page:'category',category:c.id},c.title,'secondary-link')).join('')}</div></section>`;}

function card(result,i){
  const {item,matchedIn}=result;
  const matchNote=route.query?.trim()&&matchedIn.length?`<p class="match-note">匹配于 ${escape(matchedIn.join(' · '))}</p>`:'';
  const keywords=item.keywords?.length?`<div class="card-keywords" aria-label="整理词">${item.keywords.map(word=>`<span>${escape(word)}</span>`).join('')}</div>`:'';
  const bibliography=item.bibliography?`<p class="card-bibliography">${escape(item.bibliography)}</p>`:`<p class="card-bibliography">${escape(item.author)} · ${escape(item.source)}</p>`;
  return `<article class="material-card text-record${i===0?' active':''}" data-item="${item.id}">${link({page:'item',item:item.id,query:route.query,group:route.group},`<div class="card-topline"><span>${item.number?`文献 [${item.number}]`:item.demo?'文字示例 / SAMPLE':escape(item.kind)}</span><span>${String(i+1).padStart(2,'0')}</span></div><h2>${escape(item.title)}</h2>${bibliography}<p class="card-summary">${escape(item.summary)}</p>${keywords}${matchNote}<div class="card-bottom"><span>${item.number?escape(item.verified):item.demo?'资料待收录':escape(item.date)}</span><span class="open-label">查看文字记录 <span class="arrow">↗</span></span></div>`,'card-open',`aria-label="查看${escape(item.title)}详情" draggable="false"`)}</article>`;
}
function archiveView(){
  const category=categories.find(c=>c.id===route.category);
  const query=(route.query||'').trim();
  const results=searchRecords(inCategory(category.id,currentTopic.id),query);
  const counts=themeCounts(results);
  const group=['literature','sources'].includes(category.id)&&counts.has(route.group)?route.group:'';
  visibleResults=group?results.filter(({item})=>item.theme===group):results;
  visibleItems=visibleResults.map(({item})=>item);
  const literature=['literature','sources'].includes(category.id);
  const suggestions=category.id==='sources'?['毛泽东','邓小平','待核','统计公报']:['会师','遵义会议','长征精神','会宁'];
  const searchTools=literature?`<div class="search-tools"><div class="suggested-searches"><span>试试检索</span>${suggestions.map(word=>link({page:'category',category:category.id,query:word},word,query===word?'active':'')).join('')}</div><p>${category.id==='sources'?'检索标题、作者、原著录、主题与核对说明；原文请从资料详情的出处链接访问，全文不参与站内检索。':'检索本站收录的标题、整理词、来源、导读与本站说明；原文全文尚未导入。'}</p></div><nav class="theme-groups" aria-label="按主题整理结果"><span>按主题整理</span>${link({page:'category',category:category.id,query},`全部 <small>${results.length}</small>`,!group?'active':'',!group?'aria-current="true"':'')}${[...counts].map(([theme,count])=>link({page:'category',category:category.id,query,group:theme},`${escape(theme)} <small>${count}</small>`,group===theme?'active':'',group===theme?'aria-current="true"':'')).join('')}</nav>`:'';
  const helpChip=category.id==='sources'?'<span class="verified-chip">29 条文献来源 · 公开展示</span>':literature?'<span class="verified-chip">公开参考文献</span>':'<span class="demo-chip">文字示例 · 待接入真实论文</span>';
  const records=`<div class="archive-help"><span>${helpChip} <span class="results-count" role="status">${visibleItems.length} 份${query?'匹配':''}资料${group?` · ${escape(group)}`:''}</span></span><span class="hint-drag">拖动圆盘、滚动鼠标或按左右键切换</span></div></div>${visibleItems.length?`<div class="rail-wrap"><div class="carousel-platter" aria-hidden="true"></div><div class="card-rail" tabindex="0" role="region" aria-roledescription="文字资料圆盘" aria-label="文字资料圆盘，使用左右方向键旋转，回车打开正前方资料">${visibleResults.map(card).join('')}</div></div><div class="rail-controls"><button class="icon-button" data-action="previous" aria-label="上一条资料">${icon('left')}</button><span class="card-position" aria-live="polite"><strong>01</strong> / ${String(visibleItems.length).padStart(2,'0')}</span><button class="icon-button" data-action="next" aria-label="下一条资料">${icon('right')}</button></div>`:`<div class="empty-state"><p class="eyebrow">NO MATCHING RECORDS</p><h2>暂时没有找到匹配的文字资料。</h2><p>试试更短的关键词，或返回全部资料。</p>${link({page:'category',category:category.id},'查看全部资料','secondary-link')}</div>`}`;
  return `<section class="archive-view text-archive" aria-labelledby="archive-title"><div class="archive-top"><div class="archive-topline">${link({page:'desk'},'← 返回书桌','back-link')}<p class="eyebrow">${escape(currentTopic.shortTitle||currentTopic.title)} / TEXT CATALOGUE</p></div><div class="archive-title">${icon('folder','mini-folder')}<div><h1 id="archive-title">${category.title}</h1><p class="archive-description">${category.desc}</p></div></div><div class="archive-nav"><nav class="category-tabs" aria-label="资料分类">${categories.map(c=>link({page:'category',category:c.id},`${c.title}<small>${inCategory(c.id,currentTopic.id).length}</small>`,c.id===category.id?'active':'',c.id===category.id?'aria-current="page"':'')).join('')}</nav><form class="search-form" role="search"><label class="sr-only" for="search">搜索当前分类</label><input id="search" name="q" type="search" value="${escape(route.query||'')}" placeholder="${literature?'搜索文献关键词…':'检索文字资料…'}" maxlength="150"><button type="submit" aria-label="搜索">${icon('search')}</button></form></div>${searchTools}${records}</section>`;
}
function originalReader(item){
  const record=originalCatalog[item.id];
  if(!record)return '';
  const availability=record.status==='local'?'原文已导入':record.status==='related'?'篇章全文已导入 · 所引书版待补':record.status==='external'?'原文请见来源站':'原件待补';
  const action=record.path?`<button class="primary-link" type="button" data-action="read-original">${record.format==='pdf'?'展开 PDF 原件':'在本站阅读原文'}</button>`:'';
  const source=record.sourceUrl&&(record.status==='external'||record.sourceUrl!==item.url)?`<a class="secondary-link" href="${escape(record.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看对应来源 ${icon('external')}</a>`:'';
  const attachment=record.attachmentPath?`<a class="secondary-link" href="${escape(record.attachmentPath)}" download>下载官方 DOCX 附件</a>`:'';
  return `<section class="original-block" aria-label="原文阅读"><div class="original-heading"><span class="${record.path?'verified-chip':'demo-chip'}">${availability}</span>${record.characters?`<span>${record.characters.toLocaleString('zh-CN')} 字</span>`:''}</div><p class="original-provenance">${escape(record.note)}</p><div class="original-actions">${action}${attachment}${source}</div><div class="original-reading" id="original-reading" hidden></div></section>`;
}
async function openOriginal(){
  const item=items.find(x=>x.id===route.item);
  const record=originalCatalog[item?.id];
  const panel=detail.querySelector('#original-reading');
  if(!record?.path||!panel)return;
  if(!panel.hidden){panel.hidden=true;return;}
  panel.hidden=false;
  if(panel.dataset.loaded==='true')return;
  if(record.format==='pdf'){
    panel.innerHTML=`<iframe class="original-pdf" title="[${item.number}] ${escape(item.title)} 原件" src="${record.path}#toolbar=1"></iframe><p><a href="${record.path}" target="_blank" rel="noopener noreferrer">在新标签页打开 PDF</a></p>`;
    panel.dataset.loaded='true';
    panel.scrollIntoView({block:'nearest',behavior:reduced()?'instant':'smooth'});
    return;
  }
  panel.textContent='正在读取已保存的原文…';
  try{
    const response=await fetch(record.path);
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const content=await response.json();
    if(route.item!==item.id||!panel.isConnected)return;
    panel.innerHTML=`<div class="original-scroll"><p class="original-scroll-meta">来源保存于 ${escape(content.capturedOn)} · ${content.paragraphs.length} 段 · 原网页见出处链接</p>${content.paragraphs.map(paragraph=>`<p>${escape(paragraph)}</p>`).join('')}</div>`;
    panel.dataset.loaded='true';
    panel.scrollIntoView({block:'nearest',behavior:reduced()?'instant':'smooth'});
  }catch{
    panel.textContent='暂时无法读取本地原文，请通过出处链接查看。';
  }
}
function detailView(){
  const item=items.find(x=>x.id===route.item);
  if(item.number){
    const citations=item.citedParagraphs.join('、');
    detail.innerHTML=`<div class="detail-shell text-detail"><section class="detail-content"><button class="icon-button detail-close" data-action="close-detail" aria-label="关闭资料详情">${icon('close')}</button><p><span class="demo-chip">${escape(item.verified)}</span></p><h2 id="detail-title">${escape(item.title)}</h2><dl class="detail-meta"><dt>原著录</dt><dd>${escape(item.bibliography)}</dd><dt>主题组</dt><dd>${escape(item.theme)}</dd><dt>正文引用</dt><dd>${item.citationCount} 个段落 · 提取段落 ${escape(citations)}</dd></dl><p class="detail-body"><strong>来源/书目核对：</strong>${escape(item.body)}</p><p class="detail-body"><strong>正文论据：</strong>${escape(item.claimStatus)}。${escape(item.claimNote)}</p><div class="detail-actions">${item.url?`<a href="${escape(item.url)}" target="_blank" rel="noopener noreferrer" class="primary-link">原尾注链接 ${icon('external')}</a>`:'<span class="missing-source">原尾注未附网址</span>'}${item.alternativeUrl?`<a href="${escape(item.alternativeUrl)}" target="_blank" rel="noopener noreferrer" class="secondary-link">补充核对入口 ${icon('external')}</a>`:''}<button class="secondary-link" data-action="share">复制资料链接</button></div>${originalReader(item)}<p class="source-note">核对日期：2026-09-26。原尾注保留原貌；补充入口是核对依据或建议新引文，并不自动替换原著录。</p></section></div>`;
    if(!detail.open)detail.showModal();
    document.body.classList.add('detail-modal-open');
    return;
  }
  detail.innerHTML=`<div class="detail-shell text-detail"><section class="detail-content"><button class="icon-button detail-close" data-action="close-detail" aria-label="关闭资料详情">${icon('close')}</button><p><span class="${item.demo?'demo-chip':'verified-chip'}">${item.demo?'演示条目 · 非真实资料':escape(item.kind)}</span></p><h2 id="detail-title">${escape(item.title)}</h2><dl class="detail-meta"><dt>作者 / 编者</dt><dd>${escape(item.author)}</dd><dt>来源</dt><dd>${escape(item.source)}</dd><dt>发表日期</dt><dd>${escape(item.date)}</dd></dl><p class="detail-body">${escape(item.body)}</p><div class="detail-actions">${item.url?`<a href="${escape(item.url)}" target="_blank" rel="noopener noreferrer" class="primary-link">打开原文 ${icon('external')}</a>`:'<span class="missing-source">原文待补充</span>'}<button class="secondary-link" data-action="share">复制资料链接</button></div><p class="source-note">${item.demo?'接入真实文件后，此处将显示原文和出处。':`来源核验：${item.verified} · 外部原文将在新标签页打开。`}</p></section></div>`;
  if(!detail.open) detail.showModal();
  document.body.classList.add('detail-modal-open');
}
function render(){
  if(route.legacyImage){
    route={page:'category',topic:route.topic,category:route.category};
    history.replaceState(null,'',routeURL(route));
  }
  currentTopic=getTopic(route.topic)||topic;categories=getCategories(currentTopic.id);items=getItems(currentTopic.id);
  if(route.page!=='shelf')room?.setTopic(currentTopic.id);
  cancelRail();
  if(detail.open)detail.close();
  document.body.classList.remove('detail-modal-open');
  const spatial=['shelf','desk'].includes(route.page);
  document.body.classList.toggle('room-mode',spatial);
  document.body.classList.toggle('archive-mode',['category','item'].includes(route.page));
  renderHeader();
  main.innerHTML=route.page==='shelf'?shelfView():route.page==='desk'?deskView():['category','item'].includes(route.page)?archiveView():`<section class="invalid-page"><p class="eyebrow">A MISSING PAGE</p><h1>这份资料，暂时不在书架上。</h1><p class="muted">链接可能不完整，或资料尚未收录。</p>${link({},'回到书架','primary-link')}</section>`;
  $('#footer').innerHTML=`<span><span class="footer-dot"></span>阅藏 · 主题资料书房</span><span class="footer-right">${route.topic===sourceTopic.id?'29 条文献来源 · 公开展示':'3 篇参考文献 · 研究论文为文字示例'}</span>`;
  document.title=route.page==='shelf'?'阅藏 · 主题资料书房':route.page==='desk'?`${currentTopic.title} · 阅藏`:route.page==='item'?`${items.find(x=>x.id===route.item).title} · 阅藏`:route.page==='category'?`${categories.find(x=>x.id===route.category).title} · ${currentTopic.title} · 阅藏`:'未找到资料 · 阅藏';
  if(['category','item'].includes(route.page)&&visibleItems.length&&$('.card-rail'))setupRail();
  if(route.page==='item')detailView();
  syncRoom(previousPage!==null&&previousPage!==route.page&&!reduced());
  previousPage=route.page;
}
function syncRoom(animate=false){
  room?.setView(['shelf','desk'].includes(route.page)?route.page:'archive',{animate,category:route.category});
}
function setupRail(){
  const rail=$('.card-rail'),cards=[...rail.querySelectorAll('.material-card')];
  const platter=$('.carousel-platter');
  let drag=null,preventClick=false,unlockTimer,disposed=false,lastWheel=0;
  const railCategory=route.category;
  activeIndex=Math.max(0,visibleItems.findIndex(x=>x.id===route.focus));
  const wrappedDistance=(index,center)=>{
    let distance=index-center;
    if(distance>cards.length/2)distance-=cards.length;
    if(distance<-cards.length/2)distance+=cards.length;
    return distance;
  };
  function update(index,write=true){
    if(disposed)return;
    activeIndex=(index%cards.length+cards.length)%cards.length;
    const narrow=rail.clientWidth<700;
    const radius=Math.min(440,rail.clientWidth*(narrow?.83:.41));
    const depth=narrow?315:510;
    const limit=narrow?1:2;
    cards.forEach((card,i)=>{
      const step=wrappedDistance(i,activeIndex);
      const nearby=Math.abs(step)<=limit;
      const angle=step*(narrow?49:42)*Math.PI/180;
      card.classList.toggle('active',step===0);
      card.classList.toggle('offstage',!nearby);
      card.style.setProperty('--carousel-x',`${Math.round(Math.sin(angle)*radius)}px`);
      card.style.setProperty('--carousel-y',`${Math.round((1-Math.cos(angle))*19)}px`);
      card.style.setProperty('--carousel-z',`${Math.round((Math.cos(angle)-1)*depth)}px`);
      card.style.setProperty('--carousel-angle',`${Math.round(-step*(narrow?29:26))}deg`);
      card.style.setProperty('--carousel-opacity',step===0?'1':Math.abs(step)===1?'.84':'.5');
      card.style.zIndex=String(50-Math.abs(step));
      card.inert=!nearby;
      card.setAttribute('aria-hidden',nearby?'false':'true');
      card.querySelector('.card-open').tabIndex=step===0?0:-1;
    });
    platter.style.setProperty('--disc-turn',`${-activeIndex*14}deg`);
    $('.card-position').innerHTML=`<strong>${String(activeIndex+1).padStart(2,'0')}</strong> / ${String(cards.length).padStart(2,'0')}`;
    $('[data-action="previous"]').disabled=cards.length===1;
    $('[data-action="next"]').disabled=cards.length===1;
    const address=parseRoute(location.hash);
    if(write&&route.page==='category'&&address.page==='category'&&address.topic===route.topic&&address.category===railCategory){
      route.focus=visibleItems[activeIndex].id;
      history.replaceState(null,'',routeURL(route));
    }
  }
  const go=index=>{if(cards.length>1)update(index);};
  rail._go=go;
  rail.addEventListener('keydown',e=>{
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
      e.preventDefault();go(activeIndex+(e.key==='ArrowRight'?1:-1));
    }else if(e.key==='Enter'&&e.target===rail){
      e.preventDefault();cards[activeIndex].querySelector('.card-open').click();
    }
  });
  rail.addEventListener('wheel',e=>{
    if(cards.length<2||e.ctrlKey||Math.max(Math.abs(e.deltaY),Math.abs(e.deltaX))<5)return;
    e.preventDefault();
    if(performance.now()-lastWheel<180)return;
    lastWheel=performance.now();
    go(activeIndex+((Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)>0?1:-1));
  },{passive:false});
  rail.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    drag={x:e.clientX,y:e.clientY,id:e.pointerId};
  });
  const move=e=>{
    if(!drag||e.pointerId!==drag.id)return;
    if(Math.abs(e.clientX-drag.x)>8){preventClick=true;rail.classList.add('dragging');}
  };
  const up=e=>{
    if(!drag||e.pointerId!==drag.id)return;
    const delta=e.clientX-drag.x;
    if(Math.abs(delta)>42&&Math.abs(delta)>Math.abs(e.clientY-drag.y)){
      go(activeIndex-(Math.sign(delta)*Math.min(3,Math.max(1,Math.round(Math.abs(delta)/160)))));
      preventClick=true;
    }
    drag=null;rail.classList.remove('dragging');
    clearTimeout(unlockTimer);
    unlockTimer=setTimeout(()=>{preventClick=false;},180);
  };
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
  rail.addEventListener('click',e=>{
    if(preventClick){e.preventDefault();e.stopPropagation();preventClick=false;return;}
    const card=e.target.closest('.material-card');
    if(card&&!card.classList.contains('active')){
      e.preventDefault();e.stopPropagation();go(cards.indexOf(card));
    }
  },true);
  rail.addEventListener('dragstart',e=>e.preventDefault());
  const resize=()=>update(activeIndex,false);
  window.addEventListener('resize',resize);
  update(activeIndex,false);
  cancelRail=()=>{disposed=true;clearTimeout(unlockTimer);window.removeEventListener('resize',resize);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);};
}
function navigate(target){const hash=routeURL({...target,topic:target.topic||route.topic||topic.id});if(location.hash!==hash)location.hash=hash;}
function closeDetail(){navigate({page:'category',category:route.category,query:route.query,group:route.group,focus:route.item});}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2800);}
async function share(){
  const url=location.href;
  try{await navigator.clipboard.writeText(url);toast('链接已复制');}
  catch{$('#share-url').value=url;$('#share-dialog').showModal();$('#share-url').focus();$('#share-url').select();}
}
document.addEventListener('click',e=>{
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(action==='share')share();
  if(action==='read-original')openOriginal();
  if(action==='close-detail')closeDetail();
  if(action==='previous')$('.card-rail')?._go(activeIndex-1);
  if(action==='next')$('.card-rail')?._go(activeIndex+1);
  if(action==='motion'){
    motionAllowed=!motionAllowed;
    if(preference.matches&&motionAllowed)toast('系统已启用减少动态效果，将继续使用静态转场');
    try{localStorage.setItem('reading-room-motion',motionAllowed?'on':'off');}catch{}
    updateMotion();renderHeader();syncRoom(false);
  }
  if(e.target.closest('.share-close'))$('#share-dialog').close();
  if(e.target.closest('.skip-link')){e.preventDefault();main.focus();}
});
document.addEventListener('submit',e=>{if(e.target.matches('.search-form')){e.preventDefault();navigate({page:'category',category:route.category,query:new FormData(e.target).get('q').trim()});}});
detail.addEventListener('cancel',e=>{e.preventDefault();closeDetail();});
detail.addEventListener('click',e=>{if(e.target===detail){const r=detail.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDetail();}});
window.addEventListener('hashchange',()=>{route=parseRoute(location.hash);render();if(route.page!=='item')main.focus({preventScroll:true});});
render();

// Load the renderer separately: content links remain usable if WebGL is unavailable.
import('./world.mjs').then(({ReadingRoom})=>{
  room=new ReadingRoom($('#room-canvas'),{reduced,onActivate:action=>{
    if(action.startsWith('book:'))return navigate({page:'desk',topic:action.slice(5)});
    navigate({page:'category',category:action});
  }});
  room.setTopic(currentTopic.id);
  syncRoom(false);
  document.body.classList.add('renderer-ready');
  $('#room-loading').hidden=true;
}).catch(error=>{
  console.error('3D room could not initialize:',error);
  document.body.classList.add('renderer-failed');
  $('#room-loading').hidden=true;
});
