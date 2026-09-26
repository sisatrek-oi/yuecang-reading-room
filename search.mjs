const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('zh-CN');

export function searchRecords(records,rawQuery='') {
  const terms=[...new Set(normalize(rawQuery).split(/[\s,，、;；]+/).filter(Boolean))];
  return records.map((item,index)=>{
    if(!terms.length)return {item,matchedIn:[],score:0,index};
    const fields=[
      ['关键词',(item.keywords||[]).join(' '),6],
      ['标题',item.title,5],
      ['主题',item.theme,4],
      ['导读',item.summary,3],
      ['来源',`${item.source||''} ${item.author||''} ${item.kind||''}`,2],
      ['原著录',item.bibliography||'',2],
      ['本站说明',item.body,1],
    ];
    const matches=terms.map(term=>fields.filter(([,value])=>normalize(value).includes(term)));
    if(matches.some(group=>!group.length))return null;
    return {item,matchedIn:[...new Set(matches.flat().map(([label])=>label))],score:matches.reduce((sum,group)=>sum+Math.max(...group.map(([,value,weight])=>weight)),0),index};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||a.index-b.index);
}

export function themeCounts(results){
  const counts=new Map();
  for(const {item} of results)counts.set(item.theme,(counts.get(item.theme)||0)+1);
  return counts;
}
