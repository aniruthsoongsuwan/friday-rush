(() => {
  'use strict';
  const canvas=document.getElementById('office'),ctx=canvas.getContext('2d'),$=id=>document.getElementById(id);
  const W=1100,H=650,TARGET_WEEK=8,TARGET_WEEKEND=12;
  const items=[
    {id:'file',name:'แฟ้มรายงาน',icon:'📁',count:4},
    {id:'pen',name:'ปากกาเซ็น',icon:'🖊️',count:4},
    {id:'paper',name:'กระดาษ',icon:'📄',count:4},
    {id:'clip',name:'ที่เย็บกระดาษ',icon:'📎',count:4},
    {id:'coffee',name:'กาแฟ',icon:'☕',count:3},
    {id:'stamp',name:'ตราประทับ',icon:'🔖',count:3}
  ];
  const requests=[
    {item:'file',say:'แฟ้มรายงานด่วน!'}, {item:'pen',say:'ช่วยเซ็นตรงนี้ที!'},
    {item:'paper',say:'ขอกระดาษเพิ่มหน่อย!'}, {item:'clip',say:'เย็บชุดนี้ให้ทีจ้า!'},
    {item:'coffee',say:'กาแฟแก้วนั้นของฉันไหม?'}, {item:'stamp',say:'ประทับตราให้ที!'},
    {item:'file',say:'หัวหน้าขอแฟ้มเดี๋ยวนี้!'}, {item:'pen',say:'ลืมปากกาอีกแล้ว!'}
  ];
  const coworkers=['🧑🏻‍💼','👩🏽‍💼','👨🏼‍💼','👩🏻‍💻','🧑🏾‍💼','👨🏻‍💻','👩🏼‍💼'];
  const supplyX=[340,405,470,535,600,665];
  let dpr=1,workers=[],dragItem=null,dragPoint=null,phase='ready',clock=75,done=0,target=TARGET_WEEK,score=0,spawnAt=0,drawerCooldown=0,toastTimer=0,particles=[],lastTime=0,soundOn=true,audio=null,musicTimer=0;
  function fit(){const r=canvas.getBoundingClientRect();dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);draw();}
  function elapseText(t){const n=Math.max(0,Math.ceil(t));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
  function setupSound(){if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();}
  function sound(freq=420,duration=.1,wave='sine',vol=.05,end=null){if(!soundOn)return;setupSound();const o=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime;o.type=wave;o.frequency.setValueAtTime(freq,now);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(30,end),now+duration);g.gain.setValueAtTime(vol,now);g.gain.exponentialRampToValueAtTime(.001,now+duration);o.connect(g);g.connect(audio.destination);o.start(now);o.stop(now+duration);}
  function fanfare(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>sound(f,.24,'triangle',.075),i*145));}
  function notify(text){const b=$('banner');b.textContent=text;b.classList.add('show');toastTimer=1.25;}
  function updateHud(){
    $('clock').textContent=elapseText(clock);$('done').textContent=done;$('score').textContent=Math.floor(score);$('urgent').textContent=workers.filter(w=>w.state==='waiting'&&w.patience<5).length;
    const mood=$('mood');mood.classList.toggle('urgent',clock<18||phase==='weekend');
    mood.textContent=phase==='weekend'?'วันหยุดแล้ว แต่งานยังไม่จบ 🫠':clock<18?'อีกนิดเดียว! 5 โมงใกล้แล้ว ⏰':`วันศุกร์ยังพอมีหวัง ✨`;
  }
  function startGame(){setupSound();phase='friday';clock=75;done=0;target=TARGET_WEEK;score=0;workers=[];particles=[];dragItem=null;spawnAt=.8;drawerCooldown=0;items.forEach(v=>v.count=4);items.find(v=>v.id==='coffee').count=3;items.find(v=>v.id==='stamp').count=3;$('intro').classList.add('hidden');$('ending').classList.add('hidden');notify('ศุกร์แล้ว! ลากของบนโต๊ะไปให้เพื่อน 🏃');sound(600,.15,'triangle');musicStart();updateHud();}
  function addWorker(){
    if(workers.filter(w=>w.state==='waiting'||w.state==='walking').length>=4)return;
    const used=new Set(workers.filter(w=>w.state==='waiting'||w.state==='walking').map(w=>w.slot));let slot=0;while(used.has(slot)&&slot<4)slot++;
    if(slot>=4)return;
    const task=requests[Math.floor(Math.random()*requests.length)],fromLeft=Math.random()<.58;
    const positions=[{x:745,y:342},{x:915,y:342},{x:745,y:447},{x:915,y:447}];
    const spot=positions[slot];workers.push({id:Math.random(),slot,x:fromLeft?-50:1150,y:spot.y,targetX:spot.x,targetY:spot.y,dir:fromLeft?1:-1,state:'walking',task,patience:17+Math.random()*5,emoji:coworkers[Math.floor(Math.random()*coworkers.length)],color:['#fd9f7a','#83c3ee','#b49ae9','#f1d077','#78d6b0'][Math.floor(Math.random()*5)],bob:Math.random()*5,walkSpeed:180+Math.random()*45});
  }
  function resolveWorker(w,itemId){
    if(!w||w.state!=='waiting')return;const item=items.find(v=>v.id===itemId);if(!item)return;
    if(item.id!==w.task.item){w.patience=Math.max(0,w.patience-3);notify(`${w.emoji} ไม่ใช่อันนี้จ้า! ขอ ${items.find(i=>i.id===w.task.item).icon}`);sound(190,.16,'square',.04,105);return;}
    if(!item.count){notify(`ของ ${item.icon} หมด! แตะลังสำรองบนโต๊ะ 📦`);sound(160,.12,'square');return;}
    item.count--;done++;score+=100+Math.ceil(w.patience)*5;w.state='leaving';w.targetX=w.dir>0?1180:-80;updateHud();
    for(let i=0;i<12;i++)particles.push({x:w.x,y:w.y-42,vx:(Math.random()-.5)*150,vy:-50-Math.random()*140,life:.8,color:['#ffe06a','#f184a0','#92e7b1','#8cceff'][i%4],size:3+Math.random()*5});
    sound(720,.12,'sine',.07);setTimeout(()=>sound(950,.15,'triangle',.05),80);notify(['ส่งงานแล้ว! +คะแนน ✨','รับไปเลยครับ! งานเสร็จ!','หนึ่งงานผ่านไป! เย้!','ปิดจ๊อบ! คนต่อไปมาแล้ว!'][Math.floor(Math.random()*4)]);
    if(done>=target)endGame(phase==='friday'?'party':'weekendWin');
  }
  function endGame(result){phase='ended';clearInterval(musicTimer);musicTimer=0;workers=[];$('ending').classList.remove('hidden');if(result==='party'){$('endingEmoji').textContent='🎉🥳';$('endingTitle').textContent='ศุกร์แล้วโว้ย!';$('endingText').textContent=`เคลียร์ครบ ${TARGET_WEEK} งานทันเวลา! ได้เวลาเก็บโต๊ะแล้วไปฉลอง คะแนน ${Math.floor(score)} แต้ม`;fanfare();}else if(result==='weekendWin'){$('endingEmoji').textContent='🫠✅';$('endingTitle').textContent='ปิดงานวันอาทิตย์ทัน!';$('endingText').textContent=`ทำครบ ${TARGET_WEEKEND} งานแล้ว แต่ปาร์ตี้วันศุกร์เริ่มไปตั้งนาน คะแนน ${Math.floor(score)} แต้ม`;sound(430,.4,'triangle',.05,240);}else{$('endingEmoji').textContent='😵‍💫📅';$('endingTitle').textContent='เสาร์–อาทิตย์ก็ทำต่อ!';$('endingText').textContent=`วันศุกร์ทำได้ ${done}/${TARGET_WEEK} งาน งานด่วนยังเหลืออีกเพียบ พักก่อนแล้วค่อยลุยใหม่`;sound(230,.5,'sawtooth',.055,75);}updateHud();}
  function startWeekend(){phase='weekend';clock=50;target=TARGET_WEEKEND;workers=[];spawnAt=.35;dragItem=null;notify('เสาร์เช้า! มีคนส่งงานมาอีกแล้ว 😭');sound(280,.35,'sawtooth',.05,120);updateHud();}
  function finishClock(){if(phase==='friday')startWeekend();else if(phase==='weekend')endGame('lose');}
  function update(dt){
    if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('banner').classList.remove('show');}
    if(drawerCooldown>0)drawerCooldown=Math.max(0,drawerCooldown-dt);
    if(phase==='friday'||phase==='weekend'){
      clock-=dt;if(clock<=0){clock=0;finishClock();}
      spawnAt-=dt;if(spawnAt<=0&&workers.filter(w=>w.state==='waiting'||w.state==='walking').length<4){addWorker();spawnAt=(phase==='weekend'?2.2:3.35)+Math.random()*1.25;}
      for(let i=workers.length-1;i>=0;i--){const w=workers[i];w.bob+=dt*5;if(w.state==='walking'||w.state==='leaving'){
        const dx=w.targetX-w.x,dy=w.targetY-w.y,d=Math.hypot(dx,dy);if(d<w.walkSpeed*dt+2){w.x=w.targetX;w.y=w.targetY;w.state=w.state==='walking'?'waiting':'gone';}else{w.x+=dx/d*w.walkSpeed*dt;w.y+=dy/d*w.walkSpeed*dt;}
      }else if(w.state==='waiting'){w.patience-=dt;if(w.patience<=0){w.state='leaving';w.targetX=w.dir>0?1180:-80;score=Math.max(0,score-25);notify('เขารอไม่ไหวแล้ว! งานนี้โดนตามต่อวันหยุด 😰');sound(155,.2,'square',.04,80);}}
      if(w.state==='gone')workers.splice(i,1);
      }
      updateHud();
    }
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=160*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1);}
  }
  function roundRect(x,y,w,h,r,color,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
  function drawRoom(){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#dbe9ee');g.addColorStop(.62,'#e9e1d3');g.addColorStop(.63,'#aab39b');g.addColorStop(1,'#829077');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // Windows, city and office calendar.
    for(const x of [75,285,815]){roundRect(x,58,170,156,10,'#f7f5ea','#9daeba');ctx.fillStyle='#a7d7e4';ctx.fillRect(x+8,66,154,140);ctx.strokeStyle='#f7f5ea';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(x+85,66);ctx.lineTo(x+85,206);ctx.moveTo(x+8,137);ctx.lineTo(x+162,137);ctx.stroke();ctx.fillStyle='#7c9a9e';ctx.fillRect(x+18,151,25,45);ctx.fillRect(x+51,126,24,70);ctx.fillRect(x+99,142,22,54);ctx.fillRect(x+128,112,24,84);}
    roundRect(474,35,155,76,12,'#fff9ed','#bcad94');ctx.textAlign='center';ctx.fillStyle='#53606b';ctx.font='bold 12px Prompt, sans-serif';ctx.fillText('ปฏิทินงาน',551,58);ctx.fillStyle=phase==='weekend'?'#df5353':'#df5353';ctx.font='bold 27px Prompt, sans-serif';ctx.fillText(phase==='weekend'?'ส. • อา.':'ศุกร์!',551,91);
    // Wall clock.
    ctx.beginPath();ctx.arc(1010,92,35,0,Math.PI*2);ctx.fillStyle='#fffdf5';ctx.fill();ctx.strokeStyle='#8a9698';ctx.lineWidth=4;ctx.stroke();ctx.strokeStyle='#4c5a65';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(1010,92);ctx.lineTo(1010,70);ctx.moveTo(1010,92);ctx.lineTo(1025,100);ctx.stroke();
    // Floor and potted plant.
    ctx.fillStyle='#acb59d';ctx.fillRect(0,495,W,155);ctx.strokeStyle='#99a18b';ctx.lineWidth=1;for(let x=0;x<W;x+=55){ctx.beginPath();ctx.moveTo(x,495);ctx.lineTo(x,650);ctx.stroke();}for(let y=535;y<H;y+=45){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.font='48px sans-serif';ctx.fillText('🪴',1030,460);ctx.fillText('🗑️',94,476);ctx.fillText('📚',1012,284);
  }
  function drawDesk(){
    // Papers and clutter behind the employee.
    roundRect(335,405,430,140,12,'#f5f1e6','#8d7255');ctx.fillStyle='#514536';ctx.textAlign='center';ctx.font='13px Prompt, sans-serif';ctx.fillText('งานกองสูงกว่ากาแฟแล้ว…',550,427);
    ctx.font='13px Prompt, sans-serif';ctx.fillStyle='#534534';ctx.fillText('ลากของจากกองบนโต๊ะ → วางที่คนขอ',550,451);
    // Worker and laptop.
    ctx.font='70px sans-serif';ctx.fillText('🧑🏻‍💻',550,422);
    roundRect(483,434,138,61,9,'#28384d','#58687a');ctx.fillStyle='#8ed7eb';ctx.fillRect(494,443,116,43);ctx.fillStyle='#3b4654';ctx.fillRect(470,495,165,9);
    // Foreground desk front.
    ctx.beginPath();ctx.moveTo(275,507);ctx.lineTo(825,507);ctx.lineTo(790,612);ctx.lineTo(313,612);ctx.closePath();ctx.fillStyle='#a86e47';ctx.fill();ctx.strokeStyle='#754b35';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#c98f62';ctx.fillRect(290,510,520,16);
    // Supplies are tangible objects on the desk: drag one onto the coworker who asked for it.
    for(let i=0;i<items.length;i++){const it=items[i],x=supplyX[i];roundRect(x-29,458,58,52,9,dragItem===it.id?'#fff0b0':'#fff8e8',dragItem===it.id?'#ffcc50':'#7c684f');ctx.textAlign='center';ctx.fillStyle='#322c27';ctx.font='30px sans-serif';ctx.fillText(it.icon,x,493);roundRect(x+12,459,22,18,8,it.count?'#34543f':'#893e3a');ctx.fillStyle='#fff';ctx.font='bold 12px Prompt, sans-serif';ctx.fillText(String(it.count),x+23,472);}
    // A visible backup drawer replaces the old refill button.
    roundRect(26,505,145,91,12,drawerCooldown>0?'#666b70':'#8c6848','#ead0a5');ctx.textAlign='center';ctx.fillStyle='#fff5dc';ctx.font='36px sans-serif';ctx.fillText('📦',98,550);ctx.font='bold 12px Prompt, sans-serif';ctx.fillText(drawerCooldown>0?`รอ ${Math.ceil(drawerCooldown)} วิ`:'แตะลังเติมของ',98,578);
  }
  function drawWorker(w){
    ctx.save();ctx.translate(w.x,w.y+Math.sin(w.bob)*2);ctx.textAlign='center';
    // Draw a bright, readable coworker carrying the requested item on a tray.
    ctx.fillStyle='#0003';ctx.beginPath();ctx.ellipse(0,8,27,8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=w.color;ctx.beginPath();ctx.roundRect(-23,-44,46,46,13);ctx.fill();ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.stroke();
    ctx.strokeStyle='#f4c6a4';ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-19,-34);ctx.lineTo(-30,-20);ctx.moveTo(19,-34);ctx.lineTo(29,-24);ctx.stroke();
    ctx.fillStyle='#f2c8a5';ctx.beginPath();ctx.arc(0,-61,20,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#a7674b';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#46342e';ctx.beginPath();ctx.arc(0,-69,20,Math.PI,Math.PI*2);ctx.lineTo(17,-62);ctx.quadraticCurveTo(1,-68,-17,-57);ctx.closePath();ctx.fill();
    ctx.fillStyle='#302b29';ctx.beginPath();ctx.arc(-7,-61,2.2,0,Math.PI*2);ctx.arc(7,-61,2.2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#a95854';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-56,6,.2,Math.PI-.2);ctx.stroke();
    roundRect(-37,-22,74,9,4,'#f8fafc','#526271');ctx.fillStyle='#324252';ctx.fillRect(-30,-19,60,3);
    const trayItem=items.find(it=>it.id===w.task.item);ctx.font='31px sans-serif';ctx.fillText(trayItem.icon,0,-25);
    if(w.state==='waiting'){
      const left=w.patience,bubbleW=200,bubbleH=117,bx=Math.max(12,Math.min(W-bubbleW-12,w.x-bubbleW/2)),by=w.y-195;
      roundRect(bx,by,bubbleW,bubbleH,15,'#fffdf5','#33495b');roundRect(bx+7,by+7,bubbleW-14,27,9,'#dff4ff');
      ctx.fillStyle='#243447';ctx.font='bold 14px Prompt, sans-serif';ctx.fillText(w.task.say,bx+bubbleW/2,by+26);
      const requested=trayItem;ctx.beginPath();ctx.arc(bx+bubbleW/2,by+63,23,0,Math.PI*2);ctx.fillStyle='#ffdf82';ctx.fill();ctx.strokeStyle='#e6ad3b';ctx.lineWidth=2;ctx.stroke();ctx.font='29px sans-serif';ctx.fillText(requested.icon,bx+bubbleW/2,by+73);
      ctx.fillStyle='#3d4a58';ctx.font='bold 13px Prompt, sans-serif';ctx.fillText(`ขอ ${requested.name}`,bx+bubbleW/2,by+94);
      roundRect(bx+12,by+104,bubbleW-24,6,4,'#e3e5df');roundRect(bx+12,by+104,(bubbleW-24)*Math.max(0,left/22),6,4,left<5?'#ed6056':'#38ad72');
      ctx.strokeStyle='#ffd252';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-36,34,0,Math.PI*2);ctx.stroke();
    }else if(w.state==='walking'){
      ctx.font='bold 13px Prompt, sans-serif';ctx.fillStyle='#26384b';ctx.fillText('ถือของมาขอ…',0,-91);
    }
    ctx.restore();
  }
  function draw(){
    if(!canvas.width)return;ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);drawRoom();drawDesk();
    for(const w of workers)if(w.state!=='gone')drawWorker(w);
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life*1.4);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    if(phase==='weekend'){ctx.fillStyle='#da5940';ctx.font='bold 18px Prompt, sans-serif';ctx.textAlign='left';ctx.fillText('เวรเสาร์–อาทิตย์ 😵',30,42);}
    if(dragItem&&dragPoint){const it=items.find(v=>v.id===dragItem);ctx.globalAlpha=.88;ctx.textAlign='center';ctx.font='42px sans-serif';ctx.fillText(it.icon,dragPoint.x,dragPoint.y);ctx.globalAlpha=1;}
  }
  function frame(now){const dt=Math.min(.05,(now-lastTime)/1000||0);lastTime=now;update(dt);draw();requestAnimationFrame(frame);}
  function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
  function refillSupplies(){if(phase==='ready'||phase==='ended')return;if(drawerCooldown>0){notify(`ลังยังลงของไม่เสร็จ รอ ${Math.ceil(drawerCooldown)} วิ ⏳`);return;}for(const it of items)it.count=Math.min(8,it.count+3);drawerCooldown=8;notify('เปิดลังสำรอง! ของเต็มกองโต๊ะแล้ว 📦');sound(300,.12,'square');setTimeout(()=>sound(520,.12,'triangle'),100);}
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();const p=point(e);dragPoint=p;if(p.x<180&&p.y>495&&p.y<610){refillSupplies();dragPoint=null;return;}if(phase==='ready'||phase==='ended')return;for(let i=0;i<items.length;i++){if(Math.abs(p.x-supplyX[i])<31&&p.y>455&&p.y<515){const it=items[i];if(!it.count){notify(`${it.icon} หมดแล้ว! แตะลังสำรองมุมโต๊ะ 📦`);sound(160,.12,'square');dragPoint=null;return;}dragItem=it.id;canvas.setPointerCapture(e.pointerId);return;}}});
  canvas.addEventListener('pointermove',e=>{if(!dragItem)return;dragPoint=point(e);});
  canvas.addEventListener('pointerup',e=>{if(!dragItem){dragPoint=null;return;}const p=point(e),id=dragItem;dragItem=null;dragPoint=null;let closest=null,dist=90;for(const w of workers){if(w.state!=='waiting')continue;const d=Math.hypot(w.x-p.x,w.y-p.y);if(d<dist){dist=d;closest=w;}}if(closest)resolveWorker(closest,id);else if(p.x<190&&p.y>490)refillSupplies();else{notify('ลากของไปวางบนเพื่อนร่วมงานที่กำลังรออยู่นะ!');sound(250,.08,'triangle');}});
  canvas.addEventListener('pointercancel',()=>{dragItem=null;dragPoint=null;});
  $('startButton').addEventListener('click',startGame);$('againButton').addEventListener('click',startGame);
  $('soundButton').addEventListener('click',()=>{soundOn=!soundOn;$('soundButton').textContent=soundOn?'🔊 เสียงเปิด':'🔇 ปิดเสียง';$('soundButton').setAttribute('aria-pressed',String(soundOn));if(soundOn){sound(600,.12,'triangle');if(phase==='friday'||phase==='weekend')musicStart();}else clearInterval(musicTimer);});
  function musicStart(){clearInterval(musicTimer);if(!soundOn)return;const notes=[196,247,294,247,220,262,330,262];let i=0;musicTimer=setInterval(()=>{if(soundOn&&phase!=='ended')sound(notes[i++%notes.length],.17,'triangle',.012);},430);}
  fit();window.addEventListener('resize',fit);if(window.visualViewport)window.visualViewport.addEventListener('resize',fit);updateHud();requestAnimationFrame(frame);
})();
