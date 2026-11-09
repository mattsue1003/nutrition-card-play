// Gameplay demo: four players around a wooden table, cards scattered face down,
// each player flips one card per turn. Two scripted modes: slap (快手拍拍) and sum (克數加加看).
(()=>{
const stage=document.getElementById('stage');if(!stage)return;
const caption=document.getElementById('caption'),stepsEl=document.getElementById('ruleSteps');
const PLAYERS=[{name:'阿明',color:'#3d7bd9',x:50,y:93},{name:'小美',color:'#e2664f',x:6.5,y:50},{name:'阿雪',color:'#8a64c9',x:50,y:7},{name:'阿坤',color:'#d9921c',x:93.5,y:50}];
const DECK=[['雞蛋',6,'egg'],['毛豆',11,'edamame-pods'],['牛奶',8,'milk'],['鮭魚',25,'salmon'],['嫩豆腐',8,'silken-tofu'],['蝦仁',20,'shrimp'],['雞胸肉',31,'chicken-breast'],['毛豆',11,'edamame-pods'],['天貝',19,'tempeh'],['起司',7,'cheese'],['鮭魚',25,'salmon'],['雞蛋',6,'egg'],['鮪魚',24,'tuna'],['牛肉',26,'beef'],['黑豆',8,'black-beans']];
// table slot for each deck card, so the flip order hops around the table
const SLOT=[6,12,2,9,14,0,11,4,8,13,1,10,3,5,7];
// match events happen right after these flips: [new card, earlier face-up card]
const MATCH={4:2,7:1,10:3,11:0};
const MODES={
  slap:{steps:['牌背朝上，散在整張桌上','四個人輪流，一人翻一張','翻到兩張一樣（克數相同），大家快拍','一人只能拍一張，拍到的兩人各得 1 分','分數最多的人獲勝'],unit:'分',
    events:{4:{hits:[3,1],late:2},7:{hits:[0,2]},10:{hits:[1,3],late:0},11:{hits:[1,2]}}},
  sum:{steps:['牌背朝上，散在整張桌上','四個人輪流，一人翻一張','翻到兩張一樣，把兩張的克數加起來','最先講對答案的人，拿走這兩張','拿到最多卡片的人獲勝'],unit:'張',
    events:{4:{tries:[[2,15],[3,16]]},7:{tries:[[0,22]]},10:{tries:[[1,40],[3,50]]},11:{tries:[[1,12]]}}}
};
let mode='slap',slow=false,paused=false,token=0,scores=[0,0,0,0];
const els={cards:[],seats:[],hands:[]};

function slots(){const out=[];for(let r=0;r<3;r++)for(let c=0;c<5;c++){const i=r*5+c,j=Math.sin(i*12.9898)*43758.5453;const f=j-Math.floor(j);out.push({x:25+c*12.5+(f-.5)*4,y:30+r*20+((f*7)%1-.5)*5,r:(f-.5)*26})}return out}
function build(){
  stage.innerHTML='<div class="table"><div class="table-top"></div></div>';
  const S=slots();
  els.cards=DECK.map((d,i)=>{const s=S[SLOT[i]],el=document.createElement('div');el.className='dcard';el.style.left=s.x+'%';el.style.top=s.y+'%';el.style.setProperty('--r',s.r+'deg');el.dataset.x=s.x;el.dataset.y=s.y;
    el.innerHTML=`<div class="dinner"><div class="dface dback"><i>✳</i></div><div class="dface dfront"><img src="images/foods/${d[2]}.jpg" alt=""><b>${d[0]}</b><em>${d[1]}<small>克</small></em></div></div>`;stage.append(el);return el});
  els.seats=PLAYERS.map((p,i)=>{const el=document.createElement('div');el.className='seat seat-'+i;el.style.left=p.x+'%';el.style.top=p.y+'%';el.style.setProperty('--c',p.color);el.innerHTML=`<span class="avatar">${p.name.slice(-1)}</span><span class="pname">${p.name}</span><span class="score">0 ${MODES[mode].unit}</span>`;stage.append(el);return el});
  els.hands=PLAYERS.map((p,i)=>{const el=document.createElement('div');el.className='hand';el.style.setProperty('--c',p.color);el.innerHTML='<span>✋</span>';home(el,i);stage.append(el);return el});
  scores=[0,0,0,0];
}
function home(h,i){const p=PLAYERS[i];h.style.left=(50+(p.x-50)*.78)+'%';h.style.top=(50+(p.y-50)*.74)+'%';h.classList.remove('out','slap')}
function cardXY(c){return{x:+els.cards[c].dataset.x,y:+els.cards[c].dataset.y}}

class Stop extends Error{}
async function sleep(ms,t){const end=()=>ms*(slow?1.7:1);let left=end();while(left>0){if(t!==token)throw new Stop();await new Promise(r=>setTimeout(r,50));if(!paused)left-=50}if(t!==token)throw new Stop()}
function say(html,step){caption.innerHTML=html;if(step!=null)[...stepsEl.children].forEach((li,i)=>li.classList.toggle('now',i===step))}
function bubble(p,text,cls=''){const b=document.createElement('div'),P=PLAYERS[p];b.className='bubble '+cls;b.textContent=text;b.style.left=(50+(P.x-50)*.62)+'%';b.style.top=(50+(P.y-50)*.6)+'%';b.style.setProperty('--c',P.color);stage.append(b);return b}
function pop(p,text){const s=els.seats[p],b=document.createElement('div');b.className='plus';b.textContent=text;s.append(b);setTimeout(()=>b.remove(),1400)}
function setScore(p){els.seats[p].querySelector('.score').textContent=`${scores[p]} ${MODES[mode].unit}`;els.seats[p].classList.add('bump');setTimeout(()=>els.seats[p].classList.remove('bump'),500)}
async function reach(p,c,t,cls='out'){const h=els.hands[p],xy=cardXY(c);h.style.left=xy.x+'%';h.style.top=xy.y+'%';h.classList.add(cls);await sleep(420,t)}
function toSeat(c,p,k){const el=els.cards[c],P=PLAYERS[p];el.classList.remove('glow');el.classList.add('taken');el.style.left=(50+(P.x-50)*.86+(k?2.4:-2.4)*(P.y===50?0:1))+'%';el.style.top=(50+(P.y-50)*.86+(k?2.4:-2.4)*(P.y===50?1:0))+'%'}

async function run(t){
  const M=MODES[mode];stepsEl.innerHTML=M.steps.map(s=>`<li>${s}</li>`).join('');
  build();stage.classList.toggle('slow',slow);
  say('四個人圍著桌子坐，牌背朝上散在整張桌上。',0);await sleep(2200,t);

  for(let i=0;i<12;i++){
    const p=i%4,d=DECK[i];
    els.seats.forEach((s,k)=>s.classList.toggle('turn',k===p));
    say(`輪到 <b style="color:${PLAYERS[p].color}">${PLAYERS[p].name}</b> 翻一張牌`,1);await sleep(650,t);
    await reach(p,i,t);els.cards[i].classList.add('up','lift');home(els.hands[p],p);await sleep(500,t);
    say(`${PLAYERS[p].name} 翻到 <b>${d[0]}</b>，蛋白質 <b>${d[1]} 克</b>`,1);await sleep(950,t);els.cards[i].classList.remove('lift');

    if(MATCH[i]===undefined)continue;
    const a=MATCH[i],b=i,ev=M.events[i],same=DECK[a][0]===DECK[b][0];
    els.seats.forEach(s=>s.classList.remove('turn'));
    els.cards[a].classList.add('glow');els.cards[b].classList.add('glow');
    say(`<b class="hot">一樣！</b>${same?`兩張都是${d[0]}`:`${DECK[a][0]}和${d[0]}都是 ${d[1]} 克`}`,2);await sleep(1100,t);
    if(mode==='slap'){
      say('<b class="hot">快拍！</b>一人只能拍一張',3);
      await Promise.all([reach(ev.hits[0],a,t,'slap'),sleep(120,t).then(()=>reach(ev.hits[1],b,t,'slap'))]);
      if(ev.late!=null){await reach(ev.late,b,t,'out');const lb=bubble(ev.late,'慢了一步！','soft');setTimeout(()=>lb.remove(),1300);await sleep(500,t);home(els.hands[ev.late],ev.late)}
      await sleep(600,t);
      say(`<b style="color:${PLAYERS[ev.hits[0]].color}">${PLAYERS[ev.hits[0]].name}</b> 和 <b style="color:${PLAYERS[ev.hits[1]].color}">${PLAYERS[ev.hits[1]].name}</b> 各拍到一張，各得 1 分`,3);
      ev.hits.forEach((p,k)=>{home(els.hands[p],p);toSeat(k?b:a,p,k);scores[p]++;pop(p,'+1 分');setScore(p)});
    }else{
      say(`把克數加起來：<b>${DECK[a][1]} ＋ ${DECK[b][1]} ＝ ？</b>`,2);await sleep(1300,t);
      for(const [p,ans] of ev.tries){
        const right=ans===DECK[a][1]+DECK[b][1],bb=bubble(p,ans+'！',right?'ok':'no');
        await sleep(700,t);bb.classList.add(right?'right':'wrong');bb.textContent=ans+(right?' ✓':' ✗');
        if(!right){say(`${PLAYERS[p].name} 說 ${ans}，答錯了`,3);await sleep(900,t);bb.remove();continue}
        say(`<b style="color:${PLAYERS[p].color}">${PLAYERS[p].name}</b> 最先講對 <b>${DECK[a][1]} ＋ ${DECK[b][1]} ＝ ${ans}</b>，拿走這兩張`,3);
        await sleep(700,t);bb.remove();toSeat(a,p,0);toSeat(b,p,1);scores[p]+=2;pop(p,'+2 張');setScore(p);
      }
    }

    await sleep(1700,t);
  }
  els.seats.forEach(s=>s.classList.remove('turn'));
  const best=Math.max(...scores),w=scores.indexOf(best);
  say(`遊戲結束！<b style="color:${PLAYERS[w].color}">${PLAYERS[w].name}</b> ${best} ${M.unit}，${mode==='slap'?'分數最多':'卡片最多'}獲勝`,4);
  els.seats[w].classList.add('winner');
  const end=document.createElement('div');end.className='demo-end';
  end.innerHTML=`<div class="crown">🏆</div><b>${PLAYERS[w].name} 獲勝</b><span>${PLAYERS.map((p,i)=>`${p.name} ${scores[i]}`).join('・')}</span><div><button data-again>再看一次</button><button data-other>看${mode==='slap'?'玩法二':'玩法一'}</button></div>`;
  stage.append(end);
  end.querySelector('[data-again]').onclick=()=>start();
  end.querySelector('[data-other]').onclick=()=>setMode(mode==='slap'?'sum':'slap');
}
function start(){token++;paused=false;syncCtrl();run(token).catch(e=>{if(!(e instanceof Stop))console.error(e)})}
function setMode(m){mode=m;document.querySelectorAll('#modeTabs button').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));start()}
function syncCtrl(){document.getElementById('demoPlay').textContent=paused?'▶　繼續':'❚❚　暫停';document.getElementById('demoSlow').classList.toggle('on',slow)}
document.querySelectorAll('#modeTabs button').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
document.getElementById('demoPlay').onclick=()=>{paused=!paused;stage.classList.toggle('paused',paused);syncCtrl()};
document.getElementById('demoRestart').onclick=()=>start();
document.getElementById('demoSlow').onclick=()=>{slow=!slow;stage.classList.toggle('slow',slow);syncCtrl()};
new ResizeObserver(()=>stage.style.setProperty('--u',stage.clientWidth/100+'px')).observe(stage);
start();
})();
