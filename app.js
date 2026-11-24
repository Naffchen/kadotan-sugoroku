import { ACTIVITIES, CHOICES } from "./content.js";
import { createGame, move, completeActivity, nextTurn, continueGame, finishGame, undo } from "./game-engine.js";
import { icon } from "./icons.js";
import { createSoundEffects } from "./sound-effects.js";

const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const SETTINGS_KEY = "kadotan-coop-settings-v1";
const GAME_KEY = "kadotan-coop-game-v1";
const SELECT_KEY = "kadotan-coop-selections-v1";
const STEP_DURATION_MS = 1500;
const ROLL_PREVIEW_MS = 900;
const tileColors = [
  ["#e1d2ff","#6540ac"],["#ffc8df","#ad356b"],["#bfeebd","#237643"],
  ["#c5e9ff","#226b9c"],["#ffe08a","#9a5900"],["#e0ceff","#7143b0"],
  ["#bfeebd","#237643"],["#b9edee","#146e7b"],["#e0ceff","#7143b0"],["#ffe56b","#8a5b00"]
];
const defaultSettings = () => ({ edits:{}, videoUrl:"", effectsEnabled:true });
function readJson(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function validWebUrl(value) { if (!value) return false; try { return new URL(value).protocol === "https:"; } catch { return false; } }
function normalizeSettings(saved) {
  const base = defaultSettings();
  if (!saved || typeof saved !== "object") return base;
  if (saved.edits && typeof saved.edits === "object") {
    for (const a of ACTIVITIES) {
      const entry = saved.edits[a.id];
      if (entry && typeof entry === "object") base.edits[a.id] = {
        title:typeof entry.title === "string" ? entry.title.slice(0,50) : "",
        studentText:typeof entry.studentText === "string" ? entry.studentText.slice(0,200) : "",
        teacherHint:typeof entry.teacherHint === "string" ? entry.teacherHint.slice(0,1200) : ""
      };
    }
  }
  if (validWebUrl(saved.videoUrl)) base.videoUrl = saved.videoUrl;
  base.effectsEnabled = saved.effectsEnabled !== false;
  return base;
}
const savedSettings = readJson(SETTINGS_KEY);
let settings = normalizeSettings(savedSettings);
const sounds = createSoundEffects();
sounds.setEnabled(settings.effectsEnabled);
let game = createGame(6);
const savedGame = readJson(GAME_KEY);
if (savedGame?.playerCount === 6) { try { finishGame(savedGame); game = savedGame; } catch {} }
let selections = readJson(SELECT_KEY);
if (!selections || typeof selections !== "object" || Array.isArray(selections)) selections = {};
let removedLegacyPartners = false;
for (const entry of Object.values(selections)) {
  if (entry && typeof entry === "object" && Object.hasOwn(entry,"partner")) {
    delete entry.partner; removedLegacyPartners = true;
  }
}
try {
  if (savedSettings && (Object.hasOwn(savedSettings,"players") || Object.hasOwn(savedSettings,"sound"))) localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));
  if (removedLegacyPartners) localStorage.setItem(SELECT_KEY,JSON.stringify(selections));
} catch {}
let busy = false, animatedPosition = null, movementProgress = null, modal = null, previewSelection = {};
let settingsDraft = null, settingsTab = "activities", editId = 1, toastTimer, lastDialogFocus, soundRequest = 0;
const activityDialog = $("activity-dialog"), teacherDialog = $("teacher-dialog");

function activity(id) {
  const base = ACTIVITIES[id-1] || ACTIVITIES[0], edit = settings.edits[id] || {};
  return { ...base, title:edit.title || base.title, shortTitle:edit.title || base.shortTitle, studentText:edit.studentText || base.studentText, teacherHint:edit.teacherHint || base.teacherHint };
}
function tileStyle(id) { const c=tileColors[id-1]; return "--tile-bg:"+c[0]+";--tile-ink:"+c[1]; }
function pawnMarkup() {
  return '<span class="board-pawn" aria-hidden="true"><span class="pawn-shadow"></span><span class="pawn-stand"></span><img class="pawn-character" src="./assets/kadotan.png" alt="" width="90" height="120"></span>';
}
function saveProgress() {
  try { localStorage.setItem(GAME_KEY,JSON.stringify(game)); localStorage.setItem(SELECT_KEY,JSON.stringify(selections)); } catch {}
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings)); return true; }
  catch { toast("この端末に保存できませんでした。今回の画面には反映しました。"); return false; }
}
function toast(message) {
  $("toast").textContent = message; $("toast").classList.add("visible");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $("toast").classList.remove("visible"),3200);
}
function announce(message) { $("announcer").textContent = message; }
function playActionSound(effect) {
  void sounds.unlock().then(ready => { if (ready && !document.hidden) effect(); });
}
function closeActivity() { activityDialog.close(); modal=null; }
function closeTeacher() { teacherDialog.close(); settingsDraft=null; }
function openActivityDialog() {
  if (!activityDialog.open) { lastDialogFocus=document.activeElement; activityDialog.showModal(); }
}
function render() {
  const pos=animatedPosition ?? game.position;
  $("lap-badge").textContent=game.lap+"しゅうめ";
  $("start-marker").classList.toggle("active",pos===0);
  $("board-heading").textContent=busy&&movementProgress ? "みんなで かぞえよう！" : game.phase==="ended" ? "みんなで できたね！" : game.continueToGoal ? "ゴールまで いっしょに！" : "いっしょに やってみよう！";
  $("board").setAttribute("aria-busy",String(busy));
  const visited = new Set(game.turns.filter(t=>t.completed).map(t=>t.to));
  $("board").innerHTML=ACTIVITIES.map(a => {
    const item=activity(a.id), col=a.id<=5?a.id:11-a.id, row=a.id<=5?1:2;
    let path="";
    if (a.id<5) path='<span class="path-turn" aria-hidden="true">›</span>';
    if (a.id===5) path='<span class="path-down" aria-hidden="true">⌄</span>';
    if (a.id>6 && a.id<=10) path='<span class="path-turn" aria-hidden="true">‹</span>';
    const current=pos===a.id;
    const stepping=current && busy && movementProgress?.count>0;
    return '<button class="square '+a.category+(current?' active':'')+(stepping?' stepping':'')+(visited.has(a.id)?' visited':'')+'" style="'+tileStyle(a.id)+';--col:'+col+';--row:'+row+'" data-square="'+a.id+'" aria-label="'+a.id+'マス目 '+escapeHtml(item.title)+(current?'、カドタンのこま、いまここ':'、活動の紹介')+'" '+(current?'aria-current="step"':'')+(busy?' aria-disabled="true" tabindex="-1"':'')+'>'+
      (current?'<span class="here-marker">いま ここ</span>':'')+
      '<span class="square-top"><span class="square-num">'+a.id+'</span><span class="square-kind">'+(a.category==="pair"?"ともだちと":a.category==="goal"?"みんなで！":"みんなで")+'</span></span>'+
      '<span class="square-picture"><span class="square-symbol">'+(a.id===10?'<img src="./assets/kadotan.png" alt="" width="77" height="83">':icon(a.icon,70))+'</span>'+(current?pawnMarkup():'')+'</span>'+
      '<span class="square-title">'+escapeHtml(item.shortTitle).replace(/^ふたりで/, 'ふたりで<wbr>').replace(/^ボール/, 'ボール<wbr>')+'</span>'+path+'</button>';
  }).join("");
  let turnEyebrow="みんなで すすめよう", turnPerson="サイコロを ふろう", turnMessage="でた めを おしてね";
  if (game.phase==="activity") { turnPerson="やってみよう！";turnMessage="とまった マスの かつどうを しよう"; }
  if (game.phase==="turnDone") { turnPerson="できたね！";turnMessage="つぎの ひとに サイコロを どうぞ"; }
  if (game.phase==="checkpoint") { turnEyebrow="みんな できたね";turnPerson="6かい おわったよ";turnMessage="つづけるか、先生が えらぼう"; }
  if (game.phase==="ended") { turnEyebrow="きょうの すごろく";turnPerson="みんなで できた！";turnMessage="いっしょに あそんで くれて ありがとう"; }
  if (busy && movementProgress) { turnEyebrow="こまを すすめるよ";turnPerson="みんなで かぞえよう";turnMessage="カドタンと いっしょに！"; }
  $("turn-panel").innerHTML='<p class="turn-eyebrow"><i class="turn-pip"></i>'+turnEyebrow+'</p><p class="turn-person">'+escapeHtml(turnPerson)+'</p><p class="turn-message">'+turnMessage+'</p>';
  if (busy && movementProgress) {
    const {count,total,die}=movementProgress;
    const label=count?"みんなで かぞえよう":die+"が でたよ";
    const caption=count?(total<die&&count===total?"ゴールで とまるよ":count+"マスめ"):total<die?"ゴールまで "+total+"マス！":"カドタンを みてね";
    $("dice-panel").innerHTML='<div class="move-counter" role="status"><span class="move-count-label">'+label+'</span><span class="move-count-number">'+(count?count+'<span> / '+total+'</span>':die)+'</span><span class="move-count-caption">'+caption+'</span></div>';
  } else if (game.phase==="ready") {
    $("dice-panel").innerHTML='<p class="dice-label"><span class="dice-label-icon">'+icon("dice",34)+'</span><span>'+(busy?"サイコロを ふっているよ":"でた めを おしてね")+'</span></p><div class="dice-options">'+[1,2,3].map(n=>'<button class="die-button" data-roll="'+n+'" aria-label="'+n+'がでた、'+n+'マス進む" '+(busy?'disabled':'')+'><span class="die-pips" aria-hidden="true">'+Array(n).fill("<i></i>").join("")+'</span><span>'+n+'</span></button>').join("")+'</div><button class="random-button" id="random-roll" '+(busy?'disabled':'')+'>'+icon("dice",20)+'画面の サイコロで ふる</button>';
  } else if (game.phase==="activity") {
    const die=game.turns.at(-1)?.die;
    $("dice-panel").innerHTML='<p class="roll-result"><strong>'+die+'</strong>が でたよ</p><button class="primary-button wide" id="open-activity" '+(busy?'disabled':'')+'>'+icon("play",19)+(busy?"こまを すすめているよ":"かつどうを ひらく")+'</button>';
  } else if (game.phase==="turnDone") {
    $("dice-panel").innerHTML='<button class="primary-button wide" id="next-turn">つぎの ひとへ</button><p class="panel-note">'+(game.position===10?(game.lap+1)+"しゅうめに すすむよ":"サイコロを わたそう")+'</p>';
  } else if (game.phase==="checkpoint") {
    $("dice-panel").innerHTML='<p class="dice-label">みんな 1かいずつ できたね</p><button class="primary-button wide" id="open-checkpoint">おわりかたを えらぶ</button>';
  } else {
    $("dice-panel").innerHTML='<p class="dice-label">'+game.completedTurns+'かいの かつどうを したよ</p><button class="primary-button wide" id="open-ending">みんなで できた！</button>';
  }
  $("kadotan-message").innerHTML=busy&&movementProgress?"1マスずつ<br>ゆっくり かぞえよう！":game.phase==="ended"?"みんなで できたね！<br>また いっしょに あそぼう":pos===10?"バンザイ！<br>みんなで ゴール！":game.phase==="activity"?"ともだちと<br>やってみよう！":"みんなの ちからで<br>ゴールを めざそう！";
  $("undo-button").innerHTML=icon("undo",19)+"1て もどる";
  $("undo-button").disabled=busy||game.history.length===0;
  $("restart-button").disabled=busy;
  $("finish-button").disabled=busy||game.phase==="ended";
  $("help-button").disabled=busy;
  $("settings-button").disabled=busy;
  renderSoundButton();
}
function renderSoundButton() {
  const label="効果音 "+(settings.effectsEnabled?"オン":"オフ");
  $("sound-button").innerHTML=icon(settings.effectsEnabled?"volume":"muted",24);
  $("sound-button").setAttribute("aria-pressed",String(settings.effectsEnabled));
  $("sound-button").setAttribute("aria-label",label);
  $("sound-button").title=label;
}
const delay = (ms) => new Promise(resolve=>setTimeout(resolve,ms));
async function roll(value, random=false) {
  if (busy || game.phase!=="ready" || activityDialog.open || teacherDialog.open) return;
  void sounds.unlock();
  busy=true; render();
  if (random && !matchMedia("(prefers-reduced-motion: reduce)").matches) await delay(420);
  try {
    const before=game;game=move(game,value);selections[game.rollIndex]={};saveProgress();
    const base=game.movement.wrapped?0:before.position;
    animatedPosition=base;
    movementProgress={count:0,total:game.movement.steps,die:value};
    render();
    announce(value+"がでたよ。いっしょにかぞえよう。");
    await delay(ROLL_PREVIEW_MS);
    for(let p=base+1;p<=game.position;p++){
      animatedPosition=p;movementProgress.count=p-base;render();
      announce(movementProgress.count+"。"+p+"マス目。");
      sounds.playStep(movementProgress.count);
      await delay(STEP_DURATION_MS);
    }
    animatedPosition=null;movementProgress=null;busy=false;render();
    announce(value+"が出ました。"+game.position+"マス目、"+activity(game.position).title);
    showActivity(game.position,false);
    if (game.position===10) sounds.playGoal();
  } catch { busy=false;animatedPosition=null;movementProgress=null;render();toast("もう一度、1・2・3のどれかを押してください。"); }
}
function goNext() {
  if (busy || game.phase!=="turnDone") return;
  game=nextTurn(game);saveProgress();render();
  announce("つぎのひとが、サイコロをふってみよう。");
}
function getSelection() {
  if (modal?.preview) return previewSelection;
  if (!selections[game.rollIndex] || typeof selections[game.rollIndex]!=="object") selections[game.rollIndex]={};
  return selections[game.rollIndex];
}
function showActivity(id,preview=false) {
  modal={type:"activity",id,preview};previewSelection={};renderActivity();openActivityDialog();
}
function chooseButton(type,item,selected,extra="") {
  const value=String(item.id);
  const picture=item.hex?'<span class="color-swatch" style="background:'+item.hex+'"></span>':item.emoji?'<span class="choice-emoji" aria-hidden="true">'+item.emoji+'</span>':"";
  const label=value==="original"?'オリジナル<wbr>ポーズ':escapeHtml(item.label);
  return '<button class="choice-button'+(value==="original"?' original-pose-option':'')+(String(selected)===value?' selected':'')+'" data-choice="'+type+'" data-value="'+escapeHtml(value)+'" aria-pressed="'+(String(selected)===value)+'">'+picture+extra+'<span>'+label+'</span></button>';
}
function posePicture(id) {
  const arms = id==="head" ? "M22 33 14 21 23 13M42 33 50 21 41 13" : id==="side" ? "M23 33H5M41 33h18" : "M23 32 13 40 25 45M41 32l10 8-12 5";
  return '<svg class="pose-card-picture" width="58" height="58" viewBox="0 0 64 72" aria-hidden="true"><g stroke="#53765e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="14" r="8" fill="#e8c6a2"/><path d="M23 29h18v22H23z" fill="#b5d2ad"/><path d="'+arms+'" fill="none"/><path d="M27 52v15M37 52v15" fill="none"/></g></svg>';
}
function selectionView(item,sel) {
  let html=item.category==="pair"?'<p class="partner-prompt">'+icon("people",30)+'<span>いっしょに やる ともだちを えらぼう</span></p>':"";
  if (item.icon==="pose") {
    const round=item.id===1?(sel.poseRound||1):1;
    const pair=item.id===2;
    const poses=CHOICES.poses;
    html+='<section class="choice-section"><h3 class="choice-heading">どの ポーズに する？'+(item.id===1?'<span class="pose-progress"><button data-pose-round="1" class="'+(round===1?"active":"")+'">1かいめ</button><button data-pose-round="2" class="'+(round===2?"active":"")+'">2かいめ</button></span>':'')+'</h3><p class="pose-choice-note">じぶんで かんがえた ポーズでも OK！</p><div class="choice-grid pose-choices">'+poses.map(p=>chooseButton("pose"+round,{id:p.id,label:p.label},sel["pose"+round],p.id==="original"?icon("star",58):posePicture(p.id))).join("")+'</div></section>';
    const p=poses.find(x=>x.id===sel["pose"+round]);
    if(p?.id==="original")html+='<div class="selection-result pose-original-result">'+icon("star",48)+'<span>じぶんだけの ポーズを みせよう！<br><small>'+(pair?'ともだちは まねしてね':'みんなで まねしてね')+'</small></span></div>';
    else if(p)html+='<div class="selection-result">'+posePicture(p.id)+'<span>'+escapeHtml(p.label)+'<br><small>まねしてね！</small></span></div>';
  }
  if(item.icon==="color") {
    html+='<section class="choice-section"><h3 class="choice-heading">いろを ひとつ えらぼう<span class="choice-hint">1かい やるよ</span></h3><div class="choice-grid">'+CHOICES.colors.map(c=>chooseButton("color",c,sel.color)).join("")+'</div></section>';
    const color=CHOICES.colors.find(c=>c.id===sel.color);
    if(color)html+='<div class="selection-result"><span class="large-swatch" style="background:'+color.hex+'"></span><span>'+escapeHtml(color.label)+'を さがして<br>みんなで タッチ！</span></div>';
  }
  if(item.icon==="animal") {
    html+='<section class="choice-section"><h3 class="choice-heading">どの どうぶつに する？</h3><div class="choice-grid">'+CHOICES.animals.map(a=>chooseButton("animal",a,sel.animal)).join("")+'</div></section>';
    const animal=CHOICES.animals.find(a=>a.id===sel.animal);
    if(animal)html+='<div class="selection-result"><span class="choice-emoji" aria-hidden="true">'+animal.emoji+'</span>みんなで '+escapeHtml(animal.label)+'に なろう！</div>';
  }
  if(item.icon==="question") {
    html+='<section class="choice-section"><h3 class="choice-heading">なにを きく？</h3><div class="choice-grid three">'+CHOICES.questionTopics.map(t=>chooseButton("topic",{id:t.id,label:t.label,emoji:t.id==="food"?"🍙":t.id==="animal"?"🐰":"🎨"},sel.topic)).join("")+'</div><button class="other-answer'+(sel.topic==="free"?" selected":"")+'" data-choice="topic" data-value="free">じぶんで しつもんを かんがえる</button></section>';
    const topic=CHOICES.questionTopics.find(t=>t.id===sel.topic);
    if(topic) {
      html+='<section class="choice-section"><p class="topic-question">'+escapeHtml(topic.question)+'</p><h3 class="choice-heading">ともだちに こたえてもらおう</h3><div class="choice-grid">'+topic.answers.map(a=>chooseButton("answer",a,sel.answer)).join("")+'</div><button class="other-answer" data-choice="answer" data-value="other">ほかにも すきな ものが あるよ</button>';
      const answer=topic.answers.find(a=>a.id===sel.answer);
      if(answer)html+='<div class="selection-result">'+escapeHtml(answer.label)+'が すきなんだね！</div>';
      else if(sel.answer==="other")html+='<div class="selection-result">ことばや みぶりで つたえてね</div>';
      html+='</section>';
    } else if(sel.topic==="free") html+='<div class="selection-result"><span>ともだちに きいてみよう！<br>こたえを ゆっくり まってね</span></div>';
  }
  if(item.icon==="carry") html+='<div class="selection-result"><span>えらんだ ともだちと<br>いっしょに はこぼう！</span></div>';
  if(item.icon==="ball") html+='<div class="ball-reminder"><span>'+icon("ball",66)+'</span><div><strong>ともだちへ「どうぞ」</strong><p>ひとまわりして もどってきたら できた！</p></div></div>';
  return html;
}
function confetti() {
  const colors=["#ffce32","#40ba81","#f269a3","#4aa5f5","#9c6ce7"];
  return Array.from({length:15},(_,i)=>'<i class="confetti" style="--confetti-left:'+(5+i*6.3)+'%;--confetti-delay:'+(i%4*.11)+'s;--confetti-color:'+colors[i%4]+'"></i>').join("");
}
function renderActivity() {
  if(!modal || modal.type!=="activity") return;
  const item=activity(modal.id),sel=getSelection(),preview=modal.preview,oldScroll=activityDialog.scrollTop;
  activityDialog.classList.toggle("goal-dialog",item.category==="goal");
  const badge=preview?"マスの しょうかい":item.category==="pair"?"ともだちと やってみよう":"みんなで やってみよう";
  const top='<div class="dialog-top"><span class="dialog-badge">'+icon(item.category==="pair"?"people":"star",19)+badge+' · '+item.id+'マスめ</span><button class="close-button" data-action="close-activity" aria-label="ボードにもどる">'+icon("close",18)+'</button></div>';
  if(item.category==="goal") {
    const heading=settings.edits[item.id]?.title?escapeHtml(item.title):"ゴール！<br>みんなで バンザイ！";
    const goalText=settings.edits[item.id]?.studentText?escapeHtml(item.studentText):"いっしょに ゴールできたね！";
    activityDialog.innerHTML=top+'<div class="celebration">'+confetti()+'<img class="celebration-img" src="./assets/kadotan.png" alt="バンザイするカドタン" width="145" height="188"><h2 id="activity-title">'+heading+'</h2><p>'+goalText+'</p>'+
      (!preview && game.completedTurns<5?'<div class="success-note">つぎの ひとから '+(game.lap+1)+'しゅうめに すすむよ</div>':'')+
      '<details class="teacher-hint"><summary>先生のヒント</summary><p>'+escapeHtml(item.teacherHint)+'</p></details>'+
      '<div class="celebration-actions"><button class="primary-button" data-action="'+(preview?"close-activity":"activity-complete")+'">'+(preview?"ボードに もどる":"バンザイした！")+'</button></div></div>';
  } else {
    activityDialog.innerHTML=top+'<div class="activity-content"><div class="activity-heading"><div class="activity-emblem" style="'+tileStyle(item.id)+'">'+icon(item.icon,62)+'</div><div><h2 id="activity-title">'+escapeHtml(item.title)+'</h2><p class="activity-intro">'+escapeHtml(item.studentText)+'</p></div></div><ol class="activity-steps">'+item.steps.map((s,i)=>'<li><span class="step-number">'+(i+1)+'</span><span>'+escapeHtml(s)+'</span></li>').join("")+'</ol>'+selectionView(item,sel)+
      '<details class="teacher-hint"><summary>先生のヒント・準備物</summary><p>'+escapeHtml(item.teacherHint)+'</p><p class="materials">準備物：'+escapeHtml(item.materials.join("、")||"なし")+'</p><p>カードは必要なときに使います。言葉や身振りで選んだ場合も、そのまま活動を進められます。</p></details></div><div class="activity-footer"><button class="primary-button" data-action="'+(preview?"close-activity":"activity-complete")+'">'+(preview?"ボードに もどる":"かつどう おわり")+'</button></div>';
  }
  activityDialog.scrollTop=oldScroll;
}
function finishActivity() {
  if (game.phase!=="activity" || modal?.preview) return;
  playActionSound(()=>sounds.playComplete());
  game=completeActivity(game);saveProgress();closeActivity();render();
  if (game.phase==="checkpoint") showCheckpoint();
  else if(game.phase==="ended") showEnding();
  else announce("活動が終わりました。次の人へ進めます。");
}
function showCheckpoint() {
  modal={type:"checkpoint"};activityDialog.classList.remove("goal-dialog");
  activityDialog.innerHTML='<div class="dialog-top"><span class="dialog-badge">先生が えらんでね</span><button class="close-button" data-action="close-activity" aria-label="ボードにもどる">'+icon("close",18)+'</button></div><div class="celebration"><img class="celebration-img" src="./assets/kadotan.png" alt="カドタン" width="145" height="188"><h2 id="activity-title">みんな 1かいずつ<br>できたね！</h2><p>じかんに あわせて<br>おしまいにするか、つづけるか えらぼう。</p><div class="celebration-actions"><button class="primary-button" data-action="finish-game">'+icon("hands",24)+'はくしゅして おしまい</button><button class="secondary-button" data-action="continue-game">'+(game.position===10?"もう1しゅう つづける":"ゴールまで つづける")+'</button></div></div>';
  openActivityDialog();
}
function showEnding() {
  modal={type:"ending"};activityDialog.classList.add("goal-dialog");
  const titles=[...new Set(game.turns.filter(t=>t.completed).map(t=>activity(t.to).shortTitle))];
  activityDialog.innerHTML='<div class="dialog-top"><span class="dialog-badge">きょうの すごろく おしまい</span><button class="close-button" data-action="close-activity" aria-label="ボードにもどる">'+icon("close",18)+'</button></div><div class="celebration">'+confetti()+'<img class="celebration-img" src="./assets/kadotan.png" alt="カドタンもバンザイ" width="145" height="188"><h2 id="activity-title">みんなで できた！</h2><p>ともだちと いっしょに がんばったね。<br>みんなで はくしゅ！</p>'+(titles.length?'<div class="recap-chips">'+titles.map(t=>'<span>'+escapeHtml(t)+'</span>').join("")+'</div>':'')+'<div class="celebration-actions">'+(settings.videoUrl?'<a class="primary-button button-link" href="'+escapeHtml(settings.videoUrl)+'" target="_blank" rel="noopener noreferrer">'+icon("play",20)+'たいそうを はじめる</a>':'')+'<button class="secondary-button" data-action="close-activity">ボードに もどる</button><button class="secondary-button" data-action="restart">もういちど あそぶ</button></div></div>';
  openActivityDialog();
}
function endGame() { game=finishGame(game);saveProgress();closeActivity();render();showEnding();playActionSound(()=>sounds.playGoal()); }
function resetGame() { sounds.stop();game=createGame(6);selections={};saveProgress();if(activityDialog.open)closeActivity();if(teacherDialog.open)closeTeacher();render();announce("スタートにもどったよ。はじめからあそべるよ。");toast("はじめから あそべるよ"); }
function confirmAction(title,message,action,buttonText) {
  teacherDialog.innerHTML='<div class="confirmation"><h2 id="teacher-title">'+escapeHtml(title)+'</h2><p>'+escapeHtml(message)+'</p><div class="confirmation-buttons"><button class="secondary-button" data-teacher-action="close">もどる</button><button class="primary-button" data-teacher-action="'+action+'">'+escapeHtml(buttonText)+'</button></div></div>';
  if(!teacherDialog.open) teacherDialog.showModal();
}
function openHelp() {
  teacherDialog.innerHTML='<div class="teacher-header"><h2 id="teacher-title">つかいかた</h2><button class="close-button" data-teacher-action="close" aria-label="閉じる">'+icon("close",18)+'</button></div><div class="teacher-content"><ol class="help-list"><li><strong>6人で、ひとつのこまを進めます。</strong><br>順番は黒板の顔カードで確認します。アプリへの名前の入力は不要です。</li><li><strong>サイコロの目は1・2・3。</strong><br>実物のサイコロを振り、出た目のボタンを押します。画面のサイコロも使えます。</li><li><strong>止まったマスの活動をします。</strong><br>代表はサイコロを振った人。友達と取り組むマスでは、声をかけたり指さしたりして相手を選びます。</li><li><strong>活動が終わったら、次の人へ。</strong><br>「かつどう おわり」を押し、ボードの「つぎの ひとへ」で進めます。</li><li><strong>ゴールでは必ず一度止まり、みんなでバンザイ！</strong><br>余った数は持ち越しません。次の人の番で次の周へ進みます。</li><li><strong>6回の活動が終わったら、先生が選びます。</strong><br>黒板の顔カードで全員が1回ずつできたか確認します。時間がなければ拍手でおしまい。時間があれば、次のゴールまで続けられます。</li></ol><div class="help-callout">右上の「大きく表示」で全画面にできます。<br>スピーカーボタンで効果音をオン・オフにできます。移動中も切り替えられます。<br>マスを押すと活動の紹介を見られます。こまは移動しません。<br>「1て もどる」で、直前のサイコロを振る前に戻せます。<br>マスの設定とすごろくの途中経過は、このブラウザーに保存されます。</div></div><div class="settings-footer"><span></span><button class="primary-button" data-teacher-action="close">わかった</button></div>';
  teacherDialog.showModal();
}
function openSettings() {
  settingsDraft=JSON.parse(JSON.stringify(settings));settingsTab="activities";editId=1;
  renderSettings();teacherDialog.showModal();
}
function renderSettings() {
  let content="";
  if(settingsTab==="activities") {
    const base=ACTIVITIES[editId-1],edit=settingsDraft.edits[editId]||{};
    content='<div class="field"><label for="edit-square">編集するマス</label><select id="edit-square">'+ACTIVITIES.map(a=>'<option value="'+a.id+'" '+(a.id===editId?"selected":"")+'>'+a.id+'：'+escapeHtml(settingsDraft.edits[a.id]?.title||a.title)+'</option>').join("")+'</select></div><div class="settings-card"><div class="field"><label for="edit-title">マスの名前</label><input id="edit-title" data-edit-field="title" maxlength="50" value="'+escapeHtml(edit.title||base.title)+'"></div><div class="field"><label for="edit-student">大きく表示する活動のことば</label><textarea id="edit-student" data-edit-field="studentText" maxlength="200">'+escapeHtml(edit.studentText||base.studentText)+'</textarea></div><div class="field"><label for="edit-hint">先生のヒント</label><textarea id="edit-hint" data-edit-field="teacherHint" maxlength="1200">'+escapeHtml(edit.teacherHint||base.teacherHint)+'</textarea></div></div><p class="field-help">カードの種類と活動の手順は、今回決めた内容を使います。10番はゴールのままです。</p>';
  } else {
    content='<div class="field"><label for="video-url">体操の動画URL（任意）</label><input id="video-url" type="url" placeholder="https://www.youtube.com/watch?v=…" value="'+escapeHtml(settingsDraft.videoUrl)+'"><p class="field-help">設定すると、おしまいの画面に「たいそうを はじめる」ボタンが出ます。</p></div><div class="settings-card"><h3 class="settings-card-title">PowerPointから開く</h3><p class="teacher-intro">スライドの図形に、このアプリのURLをリンクとして設定できます。</p><button class="secondary-button" data-teacher-action="copy-url">アプリのURLをコピー</button></div>';
  }
  teacherDialog.innerHTML='<div class="teacher-header"><h2 id="teacher-title">先生の設定</h2><button class="close-button" data-teacher-action="close" aria-label="設定を閉じる">'+icon("close",18)+'</button></div><div class="teacher-content"><div class="settings-tabs" role="tablist" aria-label="設定の種類">'+[["activities","マスの内容"],["links","体操・リンク"]].map(t=>'<button role="tab" aria-selected="'+(settingsTab===t[0])+'" data-settings-tab="'+t[0]+'" class="'+(settingsTab===t[0]?"active":"")+'">'+t[1]+'</button>').join("")+'</div>'+content+'</div><div class="settings-footer"><button class="text-button" data-teacher-action="defaults">設定を初期に戻す</button><button class="primary-button" data-teacher-action="save">変更を保存</button></div>';
}
function collectSettings() {
  if(!settingsDraft)return;
  if(settingsTab==="activities") {
    settingsDraft.edits[editId] ||= {};
    teacherDialog.querySelectorAll("[data-edit-field]").forEach(input=>settingsDraft.edits[editId][input.dataset.editField]=input.value);
  }
  if(settingsTab==="links")settingsDraft.videoUrl=$("video-url").value.trim();
}
function commitSettings() {
  settings=normalizeSettings(settingsDraft);
  sounds.setEnabled(settings.effectsEnabled);
  const ok=saveSettings();
  closeTeacher();render();
  if(ok)toast("設定を保存しました");
}

$("help-button").innerHTML=icon("info",24);
$("settings-icon").innerHTML=icon("gear",19);
function updateFullscreenButton() {
  const label=document.fullscreenElement?"もとに戻す":"大きく表示";
  $("fullscreen-button").innerHTML=icon("expand",25)+'<span>'+label+'</span>';
  $("fullscreen-button").setAttribute("aria-label",label);
  $("fullscreen-button").title=label;
}
updateFullscreenButton();
document.addEventListener("fullscreenchange",updateFullscreenButton);
$("board").addEventListener("click",e=>{
  const tile=e.target.closest("[data-square]");
  if(tile&&!busy) {
    const id=Number(tile.dataset.square);
    showActivity(id,!(game.phase==="activity"&&id===game.position));
  }
});
$("dice-panel").addEventListener("click",e=>{
  const button=e.target.closest("button");if(!button||button.disabled)return;
  if(button.dataset.roll)roll(Number(button.dataset.roll));
  else if(button.id==="random-roll") {
    const values=new Uint32Array(1);crypto.getRandomValues(values);
    roll(Math.floor(values[0]/4294967296*3)+1,true);
  } else if(button.id==="next-turn")goNext();
  else if(button.id==="open-activity")showActivity(game.position,false);
  else if(button.id==="open-checkpoint")showCheckpoint();
  else if(button.id==="open-ending")showEnding();
});
activityDialog.addEventListener("click",e=>{
  const button=e.target.closest("button");if(!button)return;
  if(button.dataset.choice) {
    const sel=getSelection();
    if(button.dataset.choice==="topic")delete sel.answer;
    sel[button.dataset.choice]=button.dataset.value;
    if(!modal.preview)saveProgress();
    const type=button.dataset.choice,value=button.dataset.value;renderActivity();
    activityDialog.querySelector('[data-choice="'+type+'"][data-value="'+CSS.escape(value)+'"]')?.focus({preventScroll:true});
    return;
  }
  if(button.dataset.poseRound) {
    getSelection().poseRound=Number(button.dataset.poseRound);if(!modal.preview)saveProgress();renderActivity();return;
  }
  switch(button.dataset.action) {
    case "close-activity":closeActivity();break;
    case "activity-complete":finishActivity();break;
    case "finish-game":endGame();break;
    case "continue-game":game=continueGame(game);saveProgress();closeActivity();render();break;
    case "restart":resetGame();break;
  }
});
activityDialog.addEventListener("cancel",()=>{modal=null;});
activityDialog.addEventListener("close",()=>{lastDialogFocus?.focus?.({preventScroll:true});});
$("help-button").addEventListener("click",openHelp);
$("settings-button").addEventListener("click",openSettings);
$("sound-button").addEventListener("click",async()=>{
  const request=++soundRequest;
  settings.effectsEnabled=!settings.effectsEnabled;sounds.setEnabled(settings.effectsEnabled);saveSettings();renderSoundButton();
  if(settings.effectsEnabled) {
    const ready=await sounds.unlock();
    if(request!==soundRequest || !settings.effectsEnabled || document.hidden) return;
    if(ready){sounds.playStep(1);toast("効果音 オン");}
    else toast("このブラウザーでは効果音を使えません。音なしで遊べます。");
  } else toast("効果音 オフ");
});
$("fullscreen-button").addEventListener("click",async()=>{
  try {
    if(document.fullscreenElement)await document.exitFullscreen();
    else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
    else toast("ブラウザーの全画面表示をお使いください。");
  } catch { toast("ブラウザーの全画面表示をお使いください。"); }
});
$("undo-button").addEventListener("click",()=>{
  if(busy||!game.history.length)return;
  game=undo(game);saveProgress();render();toast("ひとつ前の サイコロの前に もどったよ");
});
$("restart-button").addEventListener("click",()=>confirmAction("はじめから あそぶ？","こまをスタートに戻し、周回と活動の回数をリセットします。マスの内容と動画URLの設定は残ります。","restart","はじめから"));
$("finish-button").addEventListener("click",()=>confirmAction("ここで おしまいにする？",game.completedTurns<6?"まだ全員の番が終わっていません。今の場所で活動を終えますか？":"みんなで拍手をして、今の場所で活動を終えます。","finish","おしまいにする"));
teacherDialog.addEventListener("change",e=>{
  if(e.target.id==="edit-square"){collectSettings();editId=Number(e.target.value);renderSettings();}
});
teacherDialog.addEventListener("click",async e=>{
  const button=e.target.closest("button");if(!button)return;
  if(button.dataset.settingsTab){collectSettings();settingsTab=button.dataset.settingsTab;renderSettings();return;}
  switch(button.dataset.teacherAction) {
    case "close":closeTeacher();break;
    case "save":{
      collectSettings();
      if(settingsDraft.videoUrl && !validWebUrl(settingsDraft.videoUrl)){toast("https:// で始まる動画のURLを入力してください。");return;}
      commitSettings();
      break;
    }
    case "restart":closeTeacher();resetGame();break;
    case "finish":closeTeacher();endGame();break;
    case "defaults":settingsDraft=defaultSettings();renderSettings();toast("初期の設定に戻しました。「変更を保存」で確定します。");break;
    case "copy-url":
      try{await navigator.clipboard.writeText(new URL(".",location.href).href);toast("URLをコピーしました");}
      catch{toast("ブラウザーのアドレス欄からURLをコピーしてください。");}
      break;
  }
});
teacherDialog.addEventListener("cancel",()=>{settingsDraft=null;});
document.addEventListener("keydown",e=>{
  if(activityDialog.open||teacherDialog.open||e.altKey||e.ctrlKey||e.metaKey||e.target.matches("input,textarea,select"))return;
  if(/^[123]$/.test(e.key)){e.preventDefault();roll(Number(e.key));}
});
window.addEventListener("pagehide",saveProgress);
render();
if(game.rollIndex>0 && game.phase!=="ended")toast("前回の つづきから あそべるよ");
