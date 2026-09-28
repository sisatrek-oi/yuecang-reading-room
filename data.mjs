import {sourceEntries} from './source-catalog.mjs';
export const topic = { id:'long-march', title:'长征', en:'THE LONG MARCH', subtitle:'从文献与研究中，重新走近一段历史。' };
export const sourceTopic = {id:'mao-theory',title:'一脉相承·与时俱进',shortTitle:'一脉相承',coverLine:'与时俱进',en:'CONTINUITY & DEVELOPMENT',subtitle:'毛泽东思想与中国特色社会主义理论体系是什么关系？'};
export const topics=[topic,sourceTopic];
export const categories = [
  {id:'literature', title:'文献资料', en:'DOCUMENTS', number:'01', color:'ochre', desc:'从公开文献出发，追溯历史的线索。', note:'3 篇公开参考文章'},
  {id:'papers', title:'研究论文', en:'RESEARCH', number:'02', color:'olive', desc:'沿着问题与研究，展开另一种阅读。', note:'3 条文字示例 · 待收录'}
];
export const items = [
  {id:'commemoration-2016', category:'literature', title:'在纪念红军长征胜利80周年大会上的讲话', author:'习近平', source:'人民网 · 人民日报', date:'2016-10-22', kind:'纪念讲话', theme:'历史记忆', keywords:['长征精神','历史意义','纪念','胜利'], demo:false, art:'document', summary:'纪念红军长征胜利80周年的讲话，回顾长征的历史意义，并阐述长征精神。', body:'这份公开参考文献可作为了解长征历史意义与长征精神表述的入口。讲话日期为2016年10月21日，所链接网页的刊发日期为2016年10月22日。本页提供简短导读，全文请前往来源网站阅读。', url:'https://cpc.people.com.cn/n1/2016/1022/c64094-28798737.html', verified:'2026-09-24'},
  {id:'reunion-reference', category:'literature', title:'为什么说三大主力红军会师宣告了长征胜利结束？', author:'未在本原型摘录', source:'共产党员网', date:'2012-10-19', kind:'党史问答', theme:'历史进程', keywords:['三大主力','会师','会宁','将台堡','胜利结束'], demo:false, art:'document', summary:'围绕红军三大主力会师与长征结束的关系，提供进一步阅读的线索。', body:'阅读时可留意不同部队会师的地点和时间，区分会宁、将台堡等不同历史节点。本条是后世党史介绍，材料的刊发时间与所叙述事件发生时间分别理解。完整论述请查阅原文。', url:'https://www.12371.cn/2012/10/19/ARTI1350595776756879.shtml', verified:'2026-09-24'},
  {id:'turning-point-reference', category:'literature', title:'中国革命从这里转折——从通道转兵到遵义会议', author:'求是杂志社调研组', source:'共产党员网', date:'2021-04-16', kind:'调研文章', theme:'历史进程', keywords:['通道转兵','遵义会议','历史转折'], demo:false, art:'document', summary:'以通道转兵到遵义会议为线索，回望长征中的重要转折。', body:'这篇调研文章提供一个围绕历史转折展开阅读的入口。它属于后世研究与阐释材料，不能作为当时形成的档案原件。阅读原文时，可继续记录其中引用的史料及出处。', url:'https://www.12371.cn/2021/04/16/ARTI1618535655307143.shtml', verified:'2026-09-24'},
  ...['长征史研究','长征精神研究','历史记忆研究'].map((title,i)=>({id:`paper-demo-${i+1}`,category:'papers',title:`${title} · 收录示例`,author:'待填写',source:'尚未导入论文',date:'待填写',kind:'论文示例',theme:i===0?'历史进程':'历史记忆',demo:true,summary:'用于展示论文文字记录的排版与交互。接入资料后，将显示真实作者、期刊、摘要与原文。',body:'这是一个明确标注的演示条目，不对应已经收录的真实论文。后续可填写论文题名、作者、发表日期、期刊、DOI与摘要，并加入合法可访问的原文链接。',url:null}))
];
export const sourceCategories=[
  {id:'sources',title:'文献来源',en:'REFERENCES',number:'01',color:'ochre',desc:'原著录、正文位置与来源核对，逐条可查。',note:'29 条文献来源 · 部分待核'},
];
export const getTopic=id=>topics.find(x=>x.id===id);
export const getCategories=id=>id===sourceTopic.id?sourceCategories:categories;
export const getItems=id=>id===sourceTopic.id?sourceEntries:items;
export const inCategory = (id,topicId=topic.id) => getItems(topicId).filter(item=>item.category===id);
