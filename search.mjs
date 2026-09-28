const normalize=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('zh-CN');
export const searchTerms=rawQuery=>[...new Set(normalize(rawQuery).split(/[\s,，、;；]+/).filter(Boolean))];

export function highlightSegments(value,rawQuery='') {
  const source=String(value??'');
  const terms=searchTerms(rawQuery);
  if(!source||!terms.length)return [{text:source,matched:false}];
  let normalized='';
  const offsets=[];
  for(let start=0;start<source.length;){
    const character=String.fromCodePoint(source.codePointAt(start));
    const end=start+character.length;
    const folded=normalize(character);
    normalized+=folded;
    for(let i=0;i<folded.length;i++)offsets.push({start,end});
    start=end;
  }
  const ranges=[];
  for(const term of terms){
    for(let index=normalized.indexOf(term);index!==-1;index=normalized.indexOf(term,index+1)){
      ranges.push([offsets[index].start,offsets[index+term.length-1].end]);
    }
  }
  if(!ranges.length)return [{text:source,matched:false}];
  ranges.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const merged=[];
  for(const [start,end] of ranges){
    const last=merged.at(-1);
    if(last&&start<=last[1])last[1]=Math.max(last[1],end);
    else merged.push([start,end]);
  }
  const segments=[];
  let cursor=0;
  for(const [start,end] of merged){
    if(start>cursor)segments.push({text:source.slice(cursor,start),matched:false});
    segments.push({text:source.slice(start,end),matched:true});
    cursor=end;
  }
  if(cursor<source.length)segments.push({text:source.slice(cursor),matched:false});
  return segments;
}

export function searchRecords(records,rawQuery='') {
  const terms=searchTerms(rawQuery);
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
