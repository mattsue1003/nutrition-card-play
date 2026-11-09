// A4 export: real PDF download (jsPDF) and editable PPTX (PptxGenJS).
// Cards are square-cut and touch each other so a paper trimmer can cut each line in one pass;
// only the inner frames and art boxes are rounded.
(()=>{
const PAGE={w:210,h:297,m:8};
const FONT='"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif';
const PPT_FONT='Microsoft JhengHei';
const C={ink:'192720',muted:'5F6E62',green:'2C684D',lime:'D5F073',dot:'A0C44F',frame:'CFD8CB',art:'E6EBE1',cut:'9AA598'};
const opts={per:6,shuffle:true,back:false,rules:true};
const imgCache=new Map();
const measure=document.createElement('canvas').getContext('2d');

function deckName(){return $('#deckName').value||'自訂卡組'}
function statLabel(){return $('#statLabel').value||'分'}
function gameRule(){return $('#gameRule').value||''}
function textW(t,mm,bold){measure.font=`${bold?800:500} 100px ${FONT}`;return measure.measureText(t).width/100*mm}
function fitSize(t,mm,maxW,bold,min=.55){let s=mm;while(s>mm*min&&textW(t,s,bold)>maxW)s*=.95;return s}

function loadImg(src){
  if(!src)return Promise.resolve(null);
  if(imgCache.has(src))return imgCache.get(src);
  const p=new Promise(res=>{const im=new Image();im.onload=()=>{const cv=document.createElement('canvas');cv.width=im.naturalWidth;cv.height=im.naturalHeight;const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);g.drawImage(im,0,0);let data=null;try{data=cv.toDataURL('image/jpeg',.9)}catch(e){}res({el:im,w:im.naturalWidth,h:im.naturalHeight,data})};im.onerror=()=>res(null);im.src=src});
  imgCache.set(src,p);return p;
}
async function preload(list){const out={};await Promise.all(list.map(async c=>{if(c.image)out[c.image]=await loadImg(c.image)}));return out}

function grid(per){const cols=2,rows=per/2,w=(PAGE.w-2*PAGE.m)/cols,h=(PAGE.h-2*PAGE.m)/rows;return{cols,rows,w,h}}
function cellXY(i,g,mirror){let col=i%g.cols;const row=Math.floor(i/g.cols);if(mirror)col=g.cols-1-col;return{x:PAGE.m+col*g.w,y:PAGE.m+row*g.h}}

function cutLines(g,ops){
  for(let c=0;c<=g.cols;c++){const x=PAGE.m+c*g.w;ops.push({t:'line',x1:x,y1:0,x2:x,y2:PAGE.h,lw:.25})}
  for(let r=0;r<=g.rows;r++){const y=PAGE.m+r*g.h;ops.push({t:'line',x1:0,y1:y,x2:PAGE.w,y2:y,lw:.25})}
}

function cardOps(c,x,y,w,h,big,imgs,ops){
  const P=big?7.5:6.5,inset=3;
  ops.push({t:'rect',x:x+inset,y:y+inset,w:w-2*inset,h:h-2*inset,r:3.5,stroke:C.frame,lw:.45});
  const kS=big?4.2:3.7,kY=y+P;
  ops.push({t:'text',x:x+P,y:kY,w:w-2*P-4,h:kS*1.3,text:deckName().toUpperCase(),size:kS,color:C.muted,bold:true});
  ops.push({t:'ellipse',x:x+w-P-2.6,y:kY+kS*.65-1.3,w:2.6,h:2.6,fill:C.dot});
  const innerW=w-2*P,vS=big?18:14,lS=big?5.6:4.6,nS0=big?9:7.6,noS=big?4.3:3.8;
  const val=String(c.value??''),lab=statLabel();
  const vW=val?textW(val,vS,true)+1+textW(lab,lS,true):0;
  const nameT=c.name||'未命名卡片',nS=fitSize(nameT,nS0,innerW-vW-3,true);
  const note=c.note||'',bottomH=Math.max(vS*1.15,nS*1.3+(note?noS*1.45:0));
  const bY=y+h-P-bottomH;
  const artY=kY+kS*1.3+2.5,artH=bY-2.5-artY;
  ops.push({t:'rect',x:x+P,y:artY,w:innerW,h:artH,r:3,stroke:C.art,lw:.3,fill:'FFFFFF'});
  const im=c.image&&imgs[c.image];
  if(im){const pad=2,bw=innerW-2*pad,bh=artH-2*pad,s=Math.min(bw/im.w,bh/im.h),iw=im.w*s,ih=im.h*s;ops.push({t:'img',src:c.image,x:x+P+pad+(bw-iw)/2,y:artY+pad+(bh-ih)/2,w:iw,h:ih})}
  else{const eS=Math.min(artH,innerW)*.42;ops.push({t:'text',x:x+P,y:artY+(artH-eS*1.3)/2,w:innerW,h:eS*1.3,text:c.emoji||'✦',size:eS,color:C.ink,align:'center'})}
  const nameY=note?bY+(bottomH-nS*1.3-noS*1.45)/2:bY+(bottomH-nS*1.3)/2;
  ops.push({t:'text',x:x+P,y:nameY,w:innerW-vW-2,h:nS*1.3,text:nameT,size:nS,color:C.ink,bold:true});
  if(note)ops.push({t:'text',x:x+P,y:nameY+nS*1.3,w:innerW-vW-2,h:noS*1.45,text:note,size:fitSize(note,noS,innerW-vW-2,false,.7),color:C.muted});
  if(val)ops.push({t:'runs',x:x+w-P-vW-4,y:bY+bottomH-vS*1.15,w:vW+4,h:vS*1.15,align:'right',runs:[{text:val,size:vS,color:C.green,bold:true},{text:' '+lab,size:lS,color:C.green,bold:true}]});
}

function backOps(x,y,w,h,ops){
  ops.push({t:'rect',x,y,w,h,fill:C.green});
  ops.push({t:'rect',x:x+4,y:y+4,w:w-8,h:h-8,r:4,stroke:C.lime,lw:.7});
  const s=Math.min(w,h)*.2;
  ops.push({t:'text',x,y:y+h/2-s*1.25,w,h:s*1.3,text:'✳',size:s,color:C.lime,align:'center',bold:true});
  const t=deckName(),ts=fitSize(t,Math.min(w,h)*.09,w-20,true);
  ops.push({t:'text',x,y:y+h/2+2,w,h:ts*1.4,text:t,size:ts,color:'FFFFFF',align:'center',bold:true});
  ops.push({t:'text',x,y:y+h/2+2+ts*1.5,w,h:4.5,text:`${statLabel()}配對卡`,size:3.6,color:C.lime,align:'center'});
}

function rulesOps(total,ops){
  const x=22,w=PAGE.w-44;
  ops.push({t:'rect',x:14,y:14,w:PAGE.w-28,h:PAGE.h-28,r:6,stroke:C.frame,lw:.5});
  ops.push({t:'text',x,y:30,w,h:6,text:'遊戲玩法說明',size:5,color:C.green,bold:true});
  const t=deckName();ops.push({t:'text',x,y:38,w,h:16,text:t,size:fitSize(t,13,w,true),color:C.ink,bold:true});
  ops.push({t:'text',x,y:58,w,h:6,text:`共 ${total} 張卡・每頁 ${opts.per} 張・卡上數值：${statLabel()}`,size:4.4,color:C.muted});
  ops.push({t:'rect',x,y:70,w,h:52,r:4,fill:'EEF3E7'});
  ops.push({t:'para',x:x+8,y:76,w:w-16,h:40,text:gameRule()||'寫下你的遊戲規則。',size:6.4,color:C.ink,bold:true});
  const steps=['1　沿灰色線裁切。卡片之間沒有空隙，裁紙機沿線一刀就能切開。','2　洗牌後照上方玩法開始玩，帶領者可以先示範一輪。','3　玩完可以聊聊：哪一張卡最讓你意外？平常常吃的有哪幾樣？'];
  ops.push({t:'text',x,y:134,w,h:7,text:'帶領步驟',size:5.4,color:C.green,bold:true});
  steps.forEach((s,i)=>ops.push({t:'para',x,y:145+i*17,w,h:15,text:s,size:4.6,color:C.ink}));
  ops.push({t:'text',x,y:224,w,h:7,text:'列印提醒',size:5.4,color:C.green,bold:true});
  ops.push({t:'para',x,y:235,w,h:30,text:'選 A4、「實際大小」或 100%。要印卡背時，選雙面列印「長邊翻頁」，卡背會對到正面同一張卡。建議用 200 磅以上的卡紙。',size:4.4,color:C.muted});
}

async function buildPages(forPreview){
  let list=cards.slice();
  if(!forPreview&&opts.shuffle)for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]]}
  const g=grid(opts.per),big=opts.per===4,pages=[];
  const imgs=await preload(forPreview?list.slice(0,opts.per):list);
  if(!forPreview&&opts.rules){const ops=[];rulesOps(list.length,ops);pages.push(ops);if(opts.back)pages.push([])}
  for(let i=0;i<list.length;i+=opts.per){
    const chunk=list.slice(i,i+opts.per),ops=[];
    chunk.forEach((c,k)=>{const p=cellXY(k,g);cardOps(c,p.x,p.y,g.w,g.h,big,imgs,ops)});
    cutLines(g,ops);pages.push(ops);
    if(forPreview)break;
    if(opts.back){const b=[];chunk.forEach((c,k)=>{const p=cellXY(k,g,true);backOps(p.x,p.y,g.w,g.h,b)});cutLines(g,b);pages.push(b)}
  }
  return{pages,imgs};
}
function pageCount(){const n=Math.ceil(cards.length/opts.per)*(opts.back?2:1);return n+(opts.rules?(opts.back?2:1):0)}

// ---- canvas renderer (PDF + preview) ----
function hex(c){return '#'+c}
function rr(g,x,y,w,h,r){g.beginPath();if(r){g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}else g.rect(x,y,w,h)}
function wrapLines(g,text,maxW){const out=[];for(const para of text.split('\n')){let line='';for(const ch of para){if(g.measureText(line+ch).width>maxW&&line){out.push(line);line=ch}else line+=ch}out.push(line)}return out}
function drawPage(g,ops,k,imgs){
  g.fillStyle='#fff';g.fillRect(0,0,PAGE.w*k,PAGE.h*k);
  for(const o of ops){
    if(o.t==='rect'){rr(g,o.x*k,o.y*k,o.w*k,o.h*k,(o.r||0)*k);if(o.fill){g.fillStyle=hex(o.fill);g.fill()}if(o.stroke){g.strokeStyle=hex(o.stroke);g.lineWidth=o.lw*k;g.stroke()}}
    else if(o.t==='line'){g.strokeStyle=hex(C.cut);g.lineWidth=o.lw*k;g.beginPath();g.moveTo(o.x1*k,o.y1*k);g.lineTo(o.x2*k,o.y2*k);g.stroke()}
    else if(o.t==='ellipse'){g.fillStyle=hex(o.fill);g.beginPath();g.ellipse((o.x+o.w/2)*k,(o.y+o.h/2)*k,o.w/2*k,o.h/2*k,0,0,7);g.fill()}
    else if(o.t==='img'){const im=imgs[o.src];if(im)g.drawImage(im.el,o.x*k,o.y*k,o.w*k,o.h*k)}
    else if(o.t==='text'){g.font=`${o.bold?800:500} ${o.size*k}px ${FONT}`;g.fillStyle=hex(o.color);g.textBaseline='middle';g.textAlign=o.align||'left';const tx=o.align==='center'?(o.x+o.w/2):o.align==='right'?o.x+o.w:o.x;g.fillText(o.text,tx*k,(o.y+o.h/2)*k)}
    else if(o.t==='para'){g.font=`${o.bold?800:500} ${o.size*k}px ${FONT}`;g.fillStyle=hex(o.color);g.textBaseline='top';g.textAlign='left';wrapLines(g,o.text,o.w*k).forEach((l,i)=>g.fillText(l,o.x*k,(o.y+i*o.size*1.5)*k))}
    else if(o.t==='runs'){g.textBaseline='alphabetic';g.textAlign='left';let cx=(o.x+o.w)*k;const base=(o.y+o.h*.82)*k;for(const r of o.runs.slice().reverse()){g.font=`${r.bold?800:500} ${r.size*k}px ${FONT}`;cx-=g.measureText(r.text).width;g.fillStyle=hex(r.color);g.fillText(r.text,cx,base)}}
  }
}

// ---- pptx renderer (editable text boxes) ----
const IN=v=>v/25.4,PT=mm=>Math.round(mm*2.835*10)/10;
function drawSlide(pptx,s,ops,imgs){
  for(const o of ops){
    if(o.t==='rect')s.addShape(o.r?pptx.ShapeType.roundRect:pptx.ShapeType.rect,{x:IN(o.x),y:IN(o.y),w:IN(o.w),h:IN(o.h),rectRadius:o.r?IN(o.r):undefined,fill:o.fill?{color:o.fill}:{type:'none'},line:o.stroke?{color:o.stroke,width:PT(o.lw)}:{type:'none'}});
    else if(o.t==='line')s.addShape(pptx.ShapeType.line,{x:IN(o.x1),y:IN(o.y1),w:IN(o.x2-o.x1),h:IN(o.y2-o.y1),line:{color:C.cut,width:PT(o.lw)}});
    else if(o.t==='ellipse')s.addShape(pptx.ShapeType.ellipse,{x:IN(o.x),y:IN(o.y),w:IN(o.w),h:IN(o.h),fill:{color:o.fill},line:{type:'none'}});
    else if(o.t==='img'){const im=imgs[o.src];if(im&&im.data)s.addImage({data:im.data,x:IN(o.x),y:IN(o.y),w:IN(o.w),h:IN(o.h)})}
    else if(o.t==='text'||o.t==='para')s.addText(o.text,{x:IN(o.x),y:IN(o.y),w:IN(o.w),h:IN(o.h),fontSize:PT(o.size),fontFace:PPT_FONT,color:o.color,bold:!!o.bold,align:o.align||'left',valign:o.t==='para'?'top':'middle',margin:0,lineSpacingMultiple:o.t==='para'?1.3:undefined,wrap:o.t==='para'});
    else if(o.t==='runs')s.addText(o.runs.map(r=>({text:r.text,options:{fontSize:PT(r.size),bold:r.bold,color:r.color,fontFace:PPT_FONT}})),{x:IN(o.x),y:IN(o.y),w:IN(o.w),h:IN(o.h),align:'right',valign:'bottom',margin:0,wrap:false});
  }
}

function loadScript(src,test){return test()?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('load'));document.head.append(s)})}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
function fileBase(){return `${deckName()}_A4每頁${opts.per}張`.replace(/[\\/:*?"<>|]/g,'')}
async function busy(btn,label,fn){if(!cards.length){toast('先新增幾張卡片再下載');return}const old=btn.textContent;btn.disabled=true;btn.textContent=label;try{await fn()}catch(e){console.error(e);toast('下載失敗，請檢查網路後再試一次')}finally{btn.disabled=false;btn.textContent=old}}

$('#pdfBtn').onclick=()=>busy($('#pdfBtn'),'製作 PDF 中…',async()=>{
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',()=>window.jspdf);
  const{pages,imgs}=await buildPages(false),k=8,cv=document.createElement('canvas');cv.width=PAGE.w*k;cv.height=PAGE.h*k;const g=cv.getContext('2d');
  const pdf=new jspdf.jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
  pages.forEach((ops,i)=>{if(i)pdf.addPage();drawPage(g,ops,k,imgs);pdf.addImage(cv.toDataURL('image/jpeg',.9),'JPEG',0,0,PAGE.w,PAGE.h,undefined,'FAST')});
  download(pdf.output('blob'),fileBase()+'.pdf');toast(`PDF 已下載，共 ${pages.length} 頁`);
});
$('#pptBtn').onclick=()=>busy($('#pptBtn'),'製作 PPT 中…',async()=>{
  await loadScript('https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',()=>window.PptxGenJS);
  const{pages,imgs}=await buildPages(false),pptx=new PptxGenJS();
  pptx.defineLayout({name:'A4P',width:IN(PAGE.w),height:IN(PAGE.h)});pptx.layout='A4P';pptx.title=deckName();
  pages.forEach(ops=>{const s=pptx.addSlide();s.background={color:'FFFFFF'};drawSlide(pptx,s,ops,imgs)});
  await pptx.writeFile({fileName:fileBase()+'.pptx'});toast('PPT 已下載，打開後點文字就能改');
});

document.querySelectorAll('#perPage button').forEach(b=>b.onclick=()=>{opts.per=+b.dataset.per;document.querySelectorAll('#perPage button').forEach(x=>x.classList.toggle('on',x===b));saveOpts();refresh()});
[['optShuffle','shuffle'],['optBack','back'],['optRules','rules']].forEach(([id,key])=>{$('#'+id).onchange=e=>{opts[key]=e.target.checked;saveOpts();refresh()}});
function saveOpts(){try{localStorage.setItem('cardforge-export',JSON.stringify(opts))}catch(e){}}
try{Object.assign(opts,JSON.parse(localStorage.getItem('cardforge-export'))||{});if(![4,6].includes(opts.per))opts.per=6}catch(e){}
document.querySelectorAll('#perPage button').forEach(x=>x.classList.toggle('on',+x.dataset.per===opts.per));
$('#optShuffle').checked=opts.shuffle;$('#optBack').checked=opts.back;$('#optRules').checked=opts.rules;

let timer,seq=0;
function refresh(){
  $('#pageCount').textContent=pageCount();$('#pageInfo').textContent=`共 ${pageCount()} 頁${opts.back?'（含卡背）':''}`;
  $('#exportSummary').textContent=`A4 直式 · 每頁 ${opts.per} 張 · ${cards.length} 張卡`;
  clearTimeout(timer);timer=setTimeout(async()=>{const my=++seq;const{pages,imgs}=await buildPages(true);if(my!==seq)return;const cv=$('#sheetCanvas'),k=cv.width/PAGE.w;drawPage(cv.getContext('2d'),pages[0]||[],k,imgs)},250);
}
window.__refreshExport=refresh;refresh();
})();
