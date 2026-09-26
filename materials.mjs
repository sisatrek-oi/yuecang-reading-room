import * as THREE from 'three';

// Procedural material maps are original textures, not historical imagery.
let seed=497;
const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
export function canvasTexture(width,height,draw){
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  draw(canvas.getContext('2d'),width,height);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=8;
  return texture;
}
export function woodMap(light=false){
  return canvasTexture(1024,1024,(ctx,w,h)=>{
    const base=light?[115,82,51]:[73,46,28];
    ctx.fillStyle=`rgb(${base})`;ctx.fillRect(0,0,w,h);
    for(let i=0;i<1900;i++){
      const y=rand()*h,alpha=.006+rand()*.043;
      ctx.strokeStyle=rand()>.44?`rgba(20,9,2,${alpha})`:`rgba(229,177,110,${alpha*.6})`;
      ctx.lineWidth=.3+rand()*.8;ctx.beginPath();
      const wave=rand()*5,freq=rand()*.009;
      for(let x=0;x<=w;x+=12){const yy=y+Math.sin(x*freq+i)*wave; x===0?ctx.moveTo(x,yy):ctx.lineTo(x,yy);}
      ctx.stroke();
    }
    for(let i=0;i<14;i++){
      const y=rand()*h;ctx.fillStyle='rgba(22,10,3,.06)';ctx.fillRect(0,y,w,rand()*15);
    }
  });
}
export function noiseMap(base='#808080',cloth=false){
  return canvasTexture(256,256,(ctx,w,h)=>{
    ctx.fillStyle=base;ctx.fillRect(0,0,w,h);
    for(let i=0;i<18000;i++){
      ctx.fillStyle=rand()>.5?'rgba(255,255,255,.055)':'rgba(0,0,0,.08)';
      ctx.fillRect(rand()*w,rand()*h,1,cloth?3:1);
    }
    if(cloth){ctx.strokeStyle='rgba(0,0,0,.07)';ctx.lineWidth=.6;for(let x=0;x<w;x+=3){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}}
  });
}
export function bookFace(title='长征',color='#662e28',hero=false,coverLine=''){
  return canvasTexture(768,1024,(ctx,w,h)=>{
    ctx.fillStyle=color;ctx.fillRect(0,0,w,h);
    for(let i=0;i<60000;i++){
      ctx.fillStyle=rand()>.5?'rgba(255,226,178,.035)':'rgba(0,0,0,.085)';
      ctx.fillRect(rand()*w,rand()*h,rand()*2+.5,rand()*2+.5);
    }
    const shade=ctx.createLinearGradient(0,0,100,0);shade.addColorStop(0,'#0007');shade.addColorStop(.35,'#0001');shade.addColorStop(.62,'#fff1');shade.addColorStop(.75,'#0003');shade.addColorStop(1,'#0000');
    ctx.fillStyle=shade;ctx.fillRect(0,0,110,h);
    ctx.strokeStyle='#c6a16b';ctx.lineWidth=2;ctx.strokeRect(47,43,w-85,h-84);ctx.strokeStyle='#bb915d88';ctx.lineWidth=1;ctx.strokeRect(56,52,w-103,h-102);
    ctx.textAlign='center';ctx.fillStyle='#d8bc84';ctx.font='20px "PingFang SC",sans-serif';ctx.fillText('阅 藏  ·  主 题 资 料 集',w/2+12,143);
    ctx.font=`${hero?144:100}px "Songti SC",serif`;ctx.fillText(title,w/2+10,394);
    ctx.font=coverLine?'42px "Songti SC",serif':'19px Georgia,serif';ctx.fillText(coverLine|| (hero?'T H E  L O N G  M A R C H':'THE READING ROOM'),w/2+10,480);
    ctx.strokeStyle='#b9935e';ctx.lineWidth=1.5;
    const paths=[[[75,820],[157,744],[212,780],[325,616],[369,687],[424,563],[494,690],[527,661],[603,776],[690,741]],[[75,870],[167,825],[244,774],[290,817],[366,737],[416,793],[496,721],[592,824],[696,809]],[[325,616],[300,676],[330,663],[369,687]],[[424,563],[400,642],[423,620],[452,664]]];
    paths.forEach(points=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();});
    ctx.font='17px "PingFang SC",sans-serif';ctx.fillText(coverLine?'文 献 来 源  ·  29 条':hero?'文 献  /  研 究  /  影 像':'待 收 录',w/2+10,948);
  });
}
export function spineMap(title,color='#586047'){
  return canvasTexture(128,768,(ctx,w,h)=>{
    ctx.fillStyle=color;ctx.fillRect(0,0,w,h);
    const g=ctx.createLinearGradient(0,0,w,0);g.addColorStop(0,'#0007');g.addColorStop(.2,'#fff1');g.addColorStop(.85,'#0000');g.addColorStop(1,'#0006');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#d5b775aa';ctx.lineWidth=2;
    [38,49,655,666].forEach(y=>{ctx.beginPath();ctx.moveTo(8,y);ctx.lineTo(120,y);ctx.stroke();});
    ctx.fillStyle='#d6bd8a';ctx.textAlign='center';ctx.font='38px "Songti SC",serif';
    [...title].forEach((c,i)=>ctx.fillText(c,64,175+i*58));
    ctx.font='17px serif';ctx.fillText('阅藏',64,598);
  });
}
export function pageEdges(){
  return canvasTexture(256,256,(ctx,w,h)=>{
    ctx.fillStyle='#d8cdb4';ctx.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=2){ctx.strokeStyle=rand()>.4?'#c2b59a':'#efe7d6';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y+rand()*1.5);ctx.stroke();}
  });
}
export function innerPage(left=false,entry){
  return canvasTexture(768,1024,(ctx,w,h)=>{
    ctx.fillStyle='#f2e7cf';ctx.fillRect(0,0,w,h);
    for(let i=0;i<16000;i++){ctx.fillStyle='rgba(106,76,40,.03)';ctx.fillRect(rand()*w,rand()*h,2,2);}
    ctx.fillStyle='#8b6a45';ctx.font='20px Georgia,serif';ctx.textAlign='center';ctx.fillText(left?'COLLECTION 001':entry?.en||'THE LONG MARCH',w/2,150);
    ctx.fillStyle='#65372b';ctx.font='100px "Songti SC",serif';ctx.fillText(left?entry?.shortTitle||entry?.title||'长征':'本卷目录',w/2,350);
    ctx.strokeStyle='#b49a70';ctx.beginPath();ctx.moveTo(285,410);ctx.lineTo(483,410);ctx.stroke();
    ctx.font='26px "Songti SC",serif';ctx.fillStyle='#8a795e';
    const lines=left?entry?.id==='mao-theory'?['追溯每一条文献出处。','29 条来源 · 初步核对']:['循着资料，走近历史。','文献 · 研究 · 影像']:entry?.id==='mao-theory'?['01   文献来源','原著录 · 位置 · 核对']:['01   文献资料','02   研究论文','03   影像资料'];
    lines.forEach((l,i)=>ctx.fillText(l,w/2,510+i*72));
    ctx.font='19px Georgia,serif';ctx.fillText(left?'— 01 —':'— 02 —',w/2,935);
  });
}
export function folderFace(category,index){
  const colors=['#c7a76e','#8b9272','#aa7561'];
  return canvasTexture(768,512,(ctx,w,h)=>{
    ctx.fillStyle=colors[index];ctx.fillRect(0,0,w,h);
    for(let i=0;i<18000;i++){ctx.fillStyle=rand()>.5?'#ffffff06':'#00000007';ctx.fillRect(rand()*w,rand()*h,1,2);}
    ctx.strokeStyle='#51402d33';ctx.lineWidth=2;ctx.strokeRect(30,32,w-60,h-65);
    ctx.fillStyle='#f3e6cc';ctx.fillRect(77,145,420,184);
    ctx.fillStyle='#493b2b';ctx.textAlign='left';ctx.font='54px "Songti SC",serif';ctx.fillText(category.title,109,225);
    ctx.fillStyle='#74634a';ctx.font='18px Georgia,serif';ctx.fillText(category.en,111,278);
    ctx.fillStyle='#493b2b';ctx.font='70px Georgia,serif';ctx.fillText(category.number,564,252);
    ctx.font='17px "PingFang SC",sans-serif';ctx.fillText(index===0?'公 开 参 考 文 献':'演 示 条 目  ·  待 收 录',82,439);
  });
}
export function contactMap(){return canvasTexture(128,128,(ctx,w,h)=>{const g=ctx.createRadialGradient(w/2,h/2,2,w/2,h/2,w/2);g.addColorStop(0,'rgba(20,10,4,.55)');g.addColorStop(.3,'rgba(20,10,4,.3)');g.addColorStop(1,'rgba(20,10,4,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);});}
