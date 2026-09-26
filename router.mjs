import {topic,getTopic,getCategories,getItems} from './data.mjs';
export function parseRoute(hash='') {
  try {
    const raw=hash.replace(/^#/, '') || '/';
    const url=new URL(raw,'https://reading-room.invalid');
    const parts=url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const query=url.searchParams.get('q') || '';
    const group=url.searchParams.get('group') || '';
    const focus=url.searchParams.get('focus') || '';
    if (!parts.length) return {page:'shelf'};
    if(parts[0]!=='topics'||!getTopic(parts[1])) return {page:'missing'};
    const topicId=parts[1],categories=getCategories(topicId),items=getItems(topicId);
    if(parts.length===2) return {page:'desk',topic:topicId};
    if(parts.length===4&&parts[2]==='items') {
      const item=items.find(x=>x.id===parts[3]);
      return item?{page:'item',topic:topicId,item:item.id,category:item.category,focus:item.id,query,group}:{page:'missing'};
    }
    if(parts.length===3&&categories.some(x=>x.id===parts[2])) {
      const validFocus=items.some(x=>x.id===focus&&x.category===parts[2])?focus:'';
      return {page:'category',topic:topicId,category:parts[2],focus:validFocus,query,group};
    }
    return {page:'missing'};
  } catch { return {page:'missing'}; }
}
export function routeURL({page='shelf',topic:topicId=topic.id,category,item,focus,query,group}={}) {
  let path='/';
  if(page==='desk') path=`/topics/${encodeURIComponent(topicId)}`;
  if(page==='category') path=`/topics/${encodeURIComponent(topicId)}/${encodeURIComponent(category)}`;
  if(page==='item') path=`/topics/${encodeURIComponent(topicId)}/items/${encodeURIComponent(item)}`;
  const params=new URLSearchParams();
  if(query) params.set('q',query);
  if(group&&['category','item'].includes(page)) params.set('group',group);
  if(focus&&page==='category') params.set('focus',focus);
  return '#'+path+(params.size?'?'+params.toString():'');
}
