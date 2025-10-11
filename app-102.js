// v3: scoring fix (unstarted expeditions = 0 pts), keep v2 features.
const SUITS = ['C','H','S','D'];
const SUIT_SYM = {C:'♣', H:'♥', S:'♠', D:'♦'};
const SUIT_COLOR = {C:'black', S:'black', H:'red', D:'red'};
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const isWager = r => (r==='J'||r==='Q'||r==='K');
const rankValue = r => (r==='A'?1:(r==='J'||r==='Q'||r==='K'?null:parseInt(r,10)));

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=(Math.random()* (i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }
function buildDeck(){
  const deck=[];
  for(const s of SUITS) for(const r of RANKS) deck.push({suit:s, rank:r, value: rankValue(r), wager:isWager(r)});
  return shuffle(deck);
}

const state = {
  deck: [],
  discards: {C:[], H:[], S:[], D:[]},
  player: { hand:[], expeditions: initExps() },
  ai: { hand:[], expeditions: initExps() },
  turn: 'player',
  selectedIndex: null,
  phase: 'play',
  gameOver:false,
  finalPlacements:null,

};

function initExps(){ const e={}; for(const s of SUITS) e[s]={wagers:0, numbers:[]}; return e; }

function deal(){
  // Full reset
  state.gameOver = false;
  state.finalPlacements = null;
  state.finalTurns = null;
  state.selectedIndex = null;
  state.turn = 'player';
  state.phase = 'play';
  state.deck = buildDeck();
  state.discards = {C:[],H:[],S:[],D:[]};
  state.player.expeditions = initExps();
  state.ai.expeditions = initExps();
  state.player.hand=[]; state.ai.hand=[];
  state.phase='play'; state.turn='player'; state.gameOver=false;
  for(let i=0;i<7;i++){ state.player.hand.push(state.deck.pop()); state.ai.hand.push(state.deck.pop()); }
  renderAll('Uusi peli: sinä aloitat.');
}

function canPlayTo(exp, card){
  if(card.wager) return exp.numbers.length===0;
  if(exp.numbers.length===0) return true;
  return card.value>exp.numbers[exp.numbers.length-1];
}
function playTo(exp, card){ if(card.wager) exp.wagers++; else exp.numbers.push(card.value); }
function discard(card){ state.discards[card.suit].push(card); }
function drawFromDeck(who){
  if(state.deck.length===0) return null;
  const c = state.deck.pop();
  who.hand.push(c);
  if(state.deck.length===0 && state.finalPlacements==null){
    state.finalPlacements = 2;
    const st = document.getElementById('status');
    if(st) st.textContent = 'Pakka loppui – molemmille yksi vuoro (ei nostoja).';
  }
  return c;
}

  
function drawFromDiscard(who, suit){
  const pile = state.discards[suit];
  if (!pile || pile.length === 0) return null;
  const c = pile.pop();
  who.hand.push(c);
  return c;
}

function handToBadges(hand){
  return hand.map((c,i)=>{
    const cls=['card'];
    if(c.wager){ cls.push('wager'); cls.push(SUIT_COLOR[c.suit]); } else cls.push(SUIT_COLOR[c.suit]);
    const label = `${c.rank}${SUIT_SYM[c.suit]}`;
    return `<button class="${cls.join(' ')}" data-idx="${i}">${label}</button>`;
  }).join('');
}

const el = {
  date: document.getElementById('date'),
  deckCount: document.getElementById('deckCount'),
  hand: document.getElementById('playerHand'),
  status: document.getElementById('status'),
  selected: document.getElementById('selectedCard'),
  drawDeck: document.getElementById('drawDeck'),
  drawPileBtns: [...document.querySelectorAll('.drawPile')],
  discards: {C: document.getElementById('pileC'), H: document.getElementById('pileH'), S: document.getElementById('pileS'), D: document.getElementById('pileD')},
  top: {C: document.getElementById('topC'), H: document.getElementById('topH'), S: document.getElementById('topS'), D: document.getElementById('topD')},
  expeditionsPlayer: document.getElementById('expeditionsPlayer'),
  expeditionsAI: document.getElementById('expeditionsAI'),
  discardBtn: document.getElementById('discardBtn'),
  playBtn: document.getElementById('playBtn'),
  cancelSelect: document.getElementById('cancelSelect'),
  newGame: document.getElementById('newGameBtn'),
};

function renderDiscardPiles(){
  for(const s of SUITS){
    const pile = state.discards[s];
    el.discards[s].textContent = pile.length;
    const top = pile.length ? pile[pile.length-1] : null;
    const target = el.top[s];
    if(!top){
      target.className = 'topCard';
      target.textContent = '';
    }else{
      const color = SUIT_COLOR[top.suit]==='red' ? 'red' : 'black';
      target.className = `topCard ${color}`;
      target.textContent = top.wager ? top.rank : `${top.rank}${SUIT_SYM[top.suit]}`;
    }
  }
}

function renderExpeditions(){
  const col = (owner) => SUITS.map(s=>{
    const ex = owner.expeditions[s];
    const wd = ex.wagers;
    const nums = ex.numbers;
    const suitClass = SUIT_COLOR[s]==='red'?'red':'black';
    const wbadges = Array(wd).fill(0).map(_=>`<span class="badge wager">×</span>`).join('');
    const nbadges = nums.map(v=>`<span class="badge ${suitClass}">${v}</span>`).join('');
    return `<div class="expCol">
      <div class="expHeader"><span class="suit ${suitClass}">${SUIT_SYM[s]}</span><span>${owner===state.player?'Sinä':'AI'}</span></div>
      <div class="lanes"><div class="lane">${wbadges}</div><div class="lane">${nbadges}</div></div>
    </div>`;
  }).join('');
  if(el.expeditionsAI) el.expeditionsAI.innerHTML = col(state.ai);
  if(el.expeditionsPlayer) el.expeditionsPlayer.innerHTML = col(state.player);
}

function renderAll(msg){
  el.deckCount.textContent = state.deck.length;
  if(el.aiHand){ el.aiHand.innerHTML = state.ai.hand.map(_=>`<div class="card back"></div>`).join(''); }
  el.hand.innerHTML = handToBadges(state.player.hand);
  [...el.hand.querySelectorAll('.card')].forEach(btn=>{
    const idx=+btn.dataset.idx;
    btn.classList.toggle('sel', idx===state.selectedIndex);
    btn.onclick = ()=> selectPlayerCard(idx);
  });
  el.drawDeck.disabled = !(state.phase==='draw' && state.turn==='player' && state.deck.length>0) || (state.finalPlacements!=null);
  el.drawPileBtns.forEach(b=>{
    const suit=b.dataset.suit, has=state.discards[suit].length>0;
    b.disabled = !(state.phase==='draw' && state.turn==='player' && has) || (state.finalPlacements!=null);
    b.onclick = ()=> playerDrawDiscard(suit);
  });
  renderDiscardPiles();
  renderExpeditions();
  el.selected.textContent = state.selectedIndex==null ? '–' : prettyCard(state.player.hand[state.selectedIndex]);
  const canPlay = (()=>{
    if(!(state.turn==='player' && state.phase==='play' && state.selectedIndex!=null)) return false;
    const card = state.player.hand[state.selectedIndex];
    const exp = state.player.expeditions[card.suit];
    return canPlayTo(exp, card);
  })();
  el.playBtn.disabled = !canPlay;
  el.discardBtn.disabled = !(state.turn==='player' && state.phase==='play' && state.selectedIndex!=null);
  el.cancelSelect.onclick = ()=>{ state.selectedIndex=null; renderAll('Peruttu.'); };
  el.discardBtn.onclick = ()=> playerDiscard();
  el.playBtn.onclick = ()=> playerPlaySelected();
  if(msg) el.status.textContent = msg;
}

function prettyCard(c){ return `${c.rank}${SUIT_SYM[c.suit]}${c.wager?'':''}`; }
function selectPlayerCard(idx){
  if(state.gameOver) return; // estä valinta pelin päätyttyä
  if(!(state.turn==='player' && state.phase==='play')) return; // valinta vain oman pelivuoron pelivaiheessa
  state.selectedIndex = (idx===state.selectedIndex) ? null : idx;
  renderAll();
}

function playerPlaySelected(){ if(state.gameOver) return;
  const idx=state.selectedIndex; if(idx==null) return;
  const card=state.player.hand[idx];
  const exp=state.player.expeditions[card.suit];
  if(!canPlayTo(exp,card)) return renderAll('Ei kelpaa tähän retkeen.');
  state.player.hand.splice(idx,1); playTo(exp,card); state.selectedIndex=null;
  if(state.finalPlacements!=null){ renderAll(`Pelasit ${prettyCard(card)}.`); if(spendFinalPlacement()) return; state.turn='ai'; state.phase='play'; setTimeout(aiTurn,300); return; }
  state.phase='draw';
  renderAll(`Pelasit ${prettyCard(card)} → nosta.`);
}

function playerDiscard(){ if(state.gameOver) return;
  const idx=state.selectedIndex; if(idx==null) return;
  const card=state.player.hand[idx]; state.player.hand.splice(idx,1); discard(card); state.selectedIndex=null;
  if(state.finalPlacements!=null){ renderAll(`Hylkäsit ${prettyCard(card)}.`); if(spendFinalPlacement()) return; state.turn='ai'; state.phase='play'; setTimeout(aiTurn,300); return; }
  state.phase='draw';
  renderAll(`Hylkäsit ${prettyCard(card)} → nosta.`);
}

function playerDrawDeck(){ if(state.gameOver) return; if(state.finalPlacements!=null) return; if(state.finalPlacements!=null) return;
  if(!(state.phase==='draw' && state.turn==='player')) return; if(state.deck.length===0) return;
  drawFromDeck(state.player);   state.phase='play'; state.turn='ai'; renderAll('Nostit pakasta. AI:n vuoro.'); setTimeout(aiTurn,400);
}
function playerDrawDiscard(suit){ if(state.gameOver) return; if(state.finalPlacements!=null) return; if(state.finalPlacements!=null) return;
  if(!(state.phase==='draw' && state.turn==='player')) return; if(state.discards[suit].length===0) return;
  drawFromDiscard(state.player, suit);   state.phase='play'; state.turn='ai'; renderAll(`Nostit poistosta ${SUIT_SYM[suit]}. AI:n vuoro.`); setTimeout(aiTurn,400);
}
document.getElementById('drawDeck').onclick = playerDrawDeck;

function scoreExp(exp){
  // FIX: if no numbers played, score = 0 (no -20 penalty)
  if(exp.numbers.length===0) return 0;
  const sum = exp.numbers.reduce((a,b)=>a+b,0);
  let pts = sum - 20; let mult=1;
  if(exp.wagers===1) mult=2; else if(exp.wagers===2) mult=3; else if(exp.wagers>=3) mult=4;
  if(exp.numbers.length>=8) pts += 20;
  return pts*mult;
}
function totalScore(owner){ return SUITS.map(s=>scoreExp(owner.expeditions[s])).reduce((a,b)=>a+b,0); }

/* removed tickFinalTurns */

function endGame(){
const p=totalScore(state.player), a=totalScore(state.ai);
  state.gameOver=true;
  document.getElementById('status').innerHTML = `Pakka loppui. <b>Pisteet:</b> Sinä ${p
}
 – AI ${a}. ` + (p>a?'Voitit!':'Hävisit.');
  document.getElementById('drawDeck').disabled=true;
  document.querySelectorAll('.drawPile,#playBtn,#discardBtn').forEach(b=>b.disabled=true);
  return true;
}

/* ===== AI ===== */
const AI_PARAMS = {
  START_BASE: 4,
  SMALL_START_PENALTY: 16,
  SUPPORT_MIN: 3,

  PLAY_PROGRESS_BONUS: 11,
  CHAIN_BONUS: 7,
  SAFE_HIGH_PLAY_THRESHOLD: 20,
  HIGH_CARD_GAP_PENALTY: 12,
  GAP_PENALTY_PER_STEP: 4,
  JUMP_PENALTY_CAP: 30,					   
  EARLY_HIGH_CARD_PENALTY: 8,

  WAGER_PLAY_BONUS: 8,
  WAGER_MIN_HIGH_SUPPORT: 3,
  WAGER_MARGIN: 12,

  DISCARD_BASE_PENALTY: 8,
  DISCARD_OWN_SUIT_PENALTY: 5,
  DISCARD_FEED_OPP_PENALTY: 7,
  DISCARD_HIGH_CARD_EXTRA: 4,

  TAKE_IMMEDIATE_PLAY_BONUS: 10,
  TAKE_CHAIN_TOP_BONUS: 6,
  TAKE_BLOCK_OPP_BONUS: 4,
  BLIND_DRAW_VALUE: 9,

  LATE_GAME_DECK_THRESHOLD: 9,
  LATE_GAME_PLAY_PUSH: 5,
  LATE_GAME_DISCARD_PENALTY: 3,

  OPP_STARTED_WEIGHT: 3,
  FOCUS_STARTED_BONUS: 10,
};

function aiFocusSuits(){
  // Priorisoi maat tuen, aloitusten ja ketjupotentiaalin perusteella
  const hand = state.ai.hand || [];
  const scores = {C:0,H:0,S:0,D:0};
  const exp = state.ai.expeditions || {};

  function chainCount(values){
    values.sort((a,b)=>a-b);
    let c=0; for(let i=0;i<values.length-1;i++) if(values[i]+1===values[i+1]) c++;
    return c;
  }

  for(const s of SUITS){
    const mine = hand.filter(c=>c.suit===s && !c.wager).map(c=>c.value);
    const myExp = exp[s];
    const last = myExp.numbers.length ? myExp.numbers[myExp.numbers.length-1] : null;
    const support = mine.filter(v => last==null || v>last).length;
    const chains = chainCount(mine.slice());
    let sc = 0;
    if(myExp.numbers.length>0) sc += AI_PARAMS.FOCUS_STARTED_BONUS; // aloitettu retki
    sc += support*2 + chains*2;
    scores[s]=sc;
  }

  return SUITS.slice().sort((a,b)=>scores[b]-scores[a]);
}


function aiChoosePlay(){
  const hand = state.ai.hand || [];
  const myExped = state.ai.expeditions || {};
  const oppExped = state.player.expeditions || {};
  const isLate = (state.deck?.length||0) <= (AI_PARAMS?.LATE_GAME_DECK_THRESHOLD ?? 8);

  const SUIT_LIST = (typeof SUITS !== 'undefined' && Array.isArray(SUITS) && SUITS.length)
    ? SUITS.slice()
    : Object.keys(myExped);

  function isStarted(ex){ return !!(ex && Array.isArray(ex.numbers) && ex.numbers.length); }
  function lastOf(ex){ return (isStarted(ex)) ? ex.numbers[ex.numbers.length-1] : null; }
  function sumOf(ex){ return (ex && Array.isArray(ex.numbers)) ? ex.numbers.reduce((a,b)=>a+b,0) : 0; }
  function estimateRemainingAIPlays(){ const N = state.deck ? state.deck.length : 0; return (N<=0) ? 1 : 2 + Math.floor(Math.max(0,N-1)/2); }

  function handNumsOver(suit, minExclusive){
    const arr = [];
    for(let i=0;i<hand.length;i++){
      const c = hand[i];
      if (c.suit===suit && !c.wager && (minExclusive==null || c.value>minExclusive)) arr.push({c, index:i});
    }
    arr.sort((a,b)=>a.c.value - b.c.value);
    return arr;
  }
  function has9and10InHand(suit){
    let has9=false, has10=false;
    for(const c of hand){ if(c.suit===suit && !c.wager){ if(c.value===9) has9=true; if(c.value===10) has10=true; } }
    return has9 && has10;
  }
  function minCardsToReach(sumNow, sortedAscVals, target){
    if (sumNow >= target) return 0;
    let need = target - sumNow, acc=0, k=0;
    for (let i=sortedAscVals.length-1;i>=0;i--){ acc += sortedAscVals[i]; k++; if (acc >= need) return k; }
    return Infinity;
  }
  function opponentTakenSet(suit){
    const ex = oppExped[suit];
    const set = new Set();
    if (ex && Array.isArray(ex.numbers)) for (const v of ex.numbers) set.add(v);
    return set;
  }
  // Toteutuvuus ≥20 ottaen huomioon vastustajan pelaamat numerot
  function feasible20(suit){
    const ex = myExped[suit] || {numbers:[]};
    const myLast = lastOf(ex);
    const sumNow = sumOf(ex);
    const taken = opponentTakenSet(suit);

    const handAscObjs = handNumsOver(suit, myLast).filter(x=>!taken.has(x.c.value));
    const handAsc = handAscObjs.map(x=>x.c.value);

    const rest = [];
    for (let v=2; v<=10; v++){
      if (v <= (myLast??-Infinity)) continue;
      if (taken.has(v)) continue;
      if (!handAsc.includes(v)) rest.push(v);
    }
    rest.sort((a,b)=>a-b);

    const handMax = sumNow + handAsc.reduce((a,b)=>a+b,0);
    const maxPossible = handMax + rest.reduce((a,b)=>a+b,0);

    const needFromHand = minCardsToReach(sumNow, handAsc, 20);
    const needWithRest = minCardsToReach(sumNow, [...handAsc, ...rest].sort((a,b)=>a-b), 20);
    return { feasible: maxPossible >= 20, sumNow, handAsc, needFromHand, needWithRest };
  }
  function mayPlayFirstWager(suit){
    const f = feasible20(suit); if (!f.feasible) return false;
    const rem = estimateRemainingAIPlays();
    if (f.sumNow + f.handAsc.reduce((a,b)=>a+b,0) >= 20) return true;
    const top2 = f.handAsc.slice(-2);
    const near = f.sumNow + top2.reduce((a,b)=>a+b,0) >= 17;
    if (near && Number.isFinite(f.needWithRest) && rem >= f.needWithRest) return true;
    return false;
  }
  function mayPlaySecondWager(suit){
    const f = feasible20(suit); if (!f.feasible) return false;
    return (f.sumNow + f.handAsc.reduce((a,b)=>a+b,0) >= 20);
  }
  function activeOpenCount(){
    let n=0; for (const s of SUIT_LIST){ const ex = myExped[s]; if (isStarted(ex) && sumOf(ex) < 20) n++; } return n;
  }
  function canPlayToExp(ex, card){
    if (card.wager) return !isStarted(ex);
    const lo = lastOf(ex); return (lo==null) ? true : (card.value > lo);
  }

  // --- 1) Kädellä varma ≥20 (prioriteetti) ---
  const strongPlays = [];
  const activeCnt = activeOpenCount();
  for (const s of SUIT_LIST){
    const ex = myExped[s] || {numbers:[]};
    const started = isStarted(ex);
    const f = feasible20(s);
    if (!f.feasible) continue;

    const allow8 = has9and10InHand(s);
    const handAscObjs = handNumsOver(s, lastOf(ex)).filter(x=>!opponentTakenSet(s).has(x.c.value));
    const openableAsc = started ? handAscObjs
      : handAscObjs.filter(o => (o.c.value < 8) || (o.c.value===8 && allow8)); // 9/10 ei avaa; 8 vain jos 9&10 kädessä

    const handSure = (f.sumNow + f.handAsc.reduce((a,b)=>a+b,0) >= 20);
    if (handSure && openableAsc.length){
      const wagIdx = (!started) ? hand.findIndex(c=>c.suit===s && c.wager) : -1;
      if (!started && wagIdx>=0){
        strongPlays.push({index: wagIdx, suit:s});
      } else {
        strongPlays.push({index: openableAsc[0].index, suit:s});
      }
    }
  }
  if (strongPlays.length){
    strongPlays.sort((a,b)=>{
      const sA=a.suit, sB=b.suit;
      const sumA=sumOf(myExped[sA]||{numbers:[]});
      const sumB=sumOf(myExped[sB]||{numbers:[]});
      if (sumB!==sumA) return sumB-sumA;
      const lastA=lastOf(myExped[sA]||{numbers:[]});
      const lastB=lastOf(myExped[sB]||{numbers:[]});
      const vA=hand[a.index].value??0, vB=hand[b.index].value??0;
      const chainA=(lastA!=null && vA===lastA+1)?1:0;
      const chainB=(lastB!=null && vB===lastB+1)?1:0;
      if (chainB!==chainA) return chainB-chainA;
      // GAP penalty: pienempi hyppy parempi
      const gapA = (lastA!=null) ? Math.max(0, vA - lastA - 1) : 0;
      const gapB = (lastB!=null) ? Math.max(0, vB - lastB - 1) : 0;
      if (gapA!==gapB) return gapA - gapB;
      return vA - vB;
	  });
    // Estä varhainen 10 ellei vie heti >20
    for (const cand of strongPlays){
      const c = hand[cand.index];
      const ex = myExped[cand.suit] || {numbers:[]};
      const sumNow = sumOf(ex);
      if (!c.wager && c.value===10){
        const early = (ex.numbers.length <= 1);
        const makesPositive = (sumNow + 10 > 20);
        if (early && !makesPositive && !isLate) continue;
      }
      return { kind:'play', index:cand.index, suit:cand.suit };
    }
  }

  // --- 2) Jatka olemassa olevia (feasible true) ---
  const extendPlays = [];
  for (const s of SUIT_LIST){
    const ex = myExped[s] || {numbers:[]};
    if (!isStarted(ex)) continue;
    const f = feasible20(s);
    if (!f.feasible) continue;

    const nums = handNumsOver(s, lastOf(ex)).filter(x=>!opponentTakenSet(s).has(x.c.value));
    if (!nums.length) continue;

    const sumNow = f.sumNow;
    const first = nums[0];
    if (first.c.value===10 && !(sumNow + 10 > 20)){
      const chain = nums.find(x=>x.c.value === (lastOf(ex)??0)+1 && x.c.value!==10);
      if (chain){ extendPlays.push({index: chain.index, suit:s}); }
      else {
        const next = nums.find(x=>x.c.value!==10);
        if (next) extendPlays.push({index: next.index, suit:s});
      }
    } else {
      extendPlays.push({index: first.index, suit:s});
    }
  }
  if (extendPlays.length){
    extendPlays.sort((a,b)=>{
      const sA=a.suit, sB=b.suit;
      const sumA=sumOf(myExped[sA]||{numbers:[]});
      const sumB=sumOf(myExped[sB]||{numbers:[]});
      if (sumB!==sumA) return sumB-sumA;
      const lastA=lastOf(myExped[sA]||{numbers:[]});
      const lastB=lastOf(myExped[sB]||{numbers:[]});
      const vA=hand[a.index].value??0, vB=hand[b.index].value??0;
      const chainA=(lastA!=null && vA===lastA+1)?1:0;
      const chainB=(lastB!=null && vB===lastB+1)?1:0;
      if (chainB!==chainA) return chainB-chainA;
      // GAP penalty: pienempi hyppy parempi
      const gapA = (lastA!=null) ? Math.max(0, vA - lastA - 1) : 0;
      const gapB = (lastB!=null) ? Math.max(0, vB - lastB - 1) : 0;
      if (gapA!==gapB) return gapA - gapB;
      return vA - vB;			 
    });
    return { kind:'play', index: extendPlays[0].index, suit: extendPlays[0].suit };
  }

  // --- 2b) Damage control: mahdoton ≥20 -> pelaa korkein omaan retkeen (älä hylkää 10:tä)
  const damagePlays = [];
  for (const s of SUIT_LIST){
    const ex = myExped[s] || {numbers:[]};
    if (!isStarted(ex)) continue;
    const f = feasible20(s);
    if (f.feasible) continue;
    const nums = handNumsOver(s, lastOf(ex));
    if (!nums.length) continue;
    damagePlays.push({index: nums[nums.length-1].index, suit:s});
  }
  if (damagePlays.length){
    return { kind:'play', index: damagePlays[0].index, suit: damagePlays[0].suit };
  }

  // --- 3) Avaus (max 2 aktiivista, mutta sallittu kolmas jos EI jatkosiirtoa nyt ja kädellä varma ≥20) ---
  // Onko jatkosiirtoa olemassa kahteen avoimeen nyt?
  let hasExtendNow = false;
  for (const s of SUIT_LIST){
    const ex = myExped[s] || {numbers:[]};
    if (!isStarted(ex)) continue;
    const lo = lastOf(ex);
    if (hand.some(c=>c.suit===s && !c.wager && (lo==null || c.value>lo))){ hasExtendNow = true; break; }
  }

  const openPlays = [];
  for (const s of SUIT_LIST){
    const ex = myExped[s] || {numbers:[]};
    if (isStarted(ex)) continue;

    const f = feasible20(s);
    if (!f.feasible) continue;

    const allow8 = has9and10InHand(s);

    const activeCntNow = activeOpenCount();
    if (activeCntNow >= 2){
      // sallitaan kolmas avaus JOS ei jatkosiirtoa nyt JA kädellä varma ≥20
      const handSure = (f.sumNow + f.handAsc.reduce((a,b)=>a+b,0) >= 20);
      if (!( !hasExtendNow && handSure )) continue;
    } else if (isLate){
      // loppupelissä avaus vain jos kädellä varma ≥20
      const handSure = (f.sumNow + f.handAsc.reduce((a,b)=>a+b,0) >= 20);
      if (!handSure) continue;
    }

    const wagIdx = hand.findIndex(c=>c.suit===s && c.wager);
    if (wagIdx>=0){
      const wagersPlayed = ex?.wagers ?? 0;
      if (wagersPlayed >= 1){ if (mayPlaySecondWager(s)) openPlays.push({index: wagIdx, suit:s}); }
      else { if (mayPlayFirstWager(s)) openPlays.push({index: wagIdx, suit:s}); }
    }


    let bestIdx = -1, bestVal = 99;
    for (let i=0;i<hand.length;i++){
      const c = hand[i];
      if (c.suit!==s || c.wager) continue;
      if (c.value===9 || c.value===10) continue;
      if (c.value===8 && !allow8) continue;
      if (c.value < bestVal){ bestVal=c.value; bestIdx=i; }
    }
    if (bestIdx>=0){
      const rem = estimateRemainingAIPlays();
      const handSure = (f.sumNow + f.handAsc.reduce((a,b)=>a+b,0) >= 20);
      const MIN_OPEN_LATE = AI_PARAMS?.LATE_MIN_OPEN_VALUE ?? 5;
      if (isLate && !handSure){
        if (!(Number.isFinite(f.needWithRest) && rem >= f.needWithRest)){
          // skip opening this suit in late game due to insufficient remaining plays
        } else if (bestVal < MIN_OPEN_LATE){
          // too small opening value in late game
        } else {
          openPlays.push({index: bestIdx, suit:s});
        }
      } else {
        openPlays.push({index: bestIdx, suit:s});
      }
    }

  }
  if (openPlays.length){
    // valitse paras jatkopotentiaalilla
    openPlays.sort((a,b)=>{
      const sA=a.suit, sB=b.suit;
      const valsA = hand.filter(c=>c.suit===sA && !c.wager && hand.indexOf(c)!==a.index).map(c=>c.value).sort((x,y)=>x-y);
      const valsB = hand.filter(c=>c.suit===sB && !c.wager && hand.indexOf(c)!==b.index).map(c=>c.value).sort((x,y)=>x-y);
      const sumA = valsA.reduce((u,v)=>u+v,0);
      const sumB = valsB.reduce((u,v)=>u+v,0);
      return sumB - sumA;
    });
    return { kind:'play', index: openPlays[0].index, suit: openPlays[0].suit };
  }

  // --- 4) Viimeinen vaihtoehto: yksinkertainen discard (placeholder) ---
return aiChooseDiscard();
}

function aiChooseDiscard(){
  const hand = state.ai.hand || [];
  const myExped = state.ai.expeditions || {};
  const oppExped = state.player.expeditions || {};
  const isLate = (state.deck?.length||0) <= (AI_PARAMS?.LATE_GAME_DECK_THRESHOLD ?? 8);

  const SUIT_LIST = (typeof SUITS !== 'undefined' && Array.isArray(SUITS) && SUITS.length)
    ? SUITS.slice()
    : Object.keys(myExped);

  // --- apurit ---
  function isStarted(ex){ return !!(ex && Array.isArray(ex.numbers) && ex.numbers.length); }
  function lastOf(ex){ return (isStarted(ex)) ? ex.numbers[ex.numbers.length-1] : null; }
  function sumOf(ex){ return (ex && Array.isArray(ex.numbers)) ? ex.numbers.reduce((a,b)=>a+b,0) : 0; }

  function handAscVals(suit, minExclusive){
    const vals = [];
    for (const c of hand){
      if (c.suit===suit && !c.wager && (minExclusive==null || c.value>minExclusive)) vals.push(c.value);
    }
    vals.sort((a,b)=>a-b);
    return vals;
  }
  function opponentTakenSet(suit){
    const ex = oppExped[suit];
    const set = new Set();
    if (ex && Array.isArray(ex.numbers)) for (const v of ex.numbers) set.add(v);
    return set;
  }
  function minCardsToReach(sumNow, sortedAscVals, target){
    if (sumNow>=target) return 0;
    let need=target-sumNow, acc=0, k=0;
    for (let i=sortedAscVals.length-1;i>=0;i--){ acc+=sortedAscVals[i]; k++; if (acc>=need) return k; }
    return Infinity;
  }
  // toteutuvuus ≥20 (vastustaja huomioiden)
  function feasible20(suit){
    const ex = myExped[suit] || {numbers:[]};
    const myLast = lastOf(ex);
    const sumNow = sumOf(ex);
    const taken = opponentTakenSet(suit);

    const hVals = handAscVals(suit, myLast).filter(v=>!taken.has(v)); // käsi
    const rest = [];
    for (let v=2; v<=10; v++){
      if (v <= (myLast??-Infinity)) continue;
      if (taken.has(v)) continue;
      if (!hVals.includes(v)) rest.push(v);
    }
    const maxPossible = sumNow + hVals.reduce((a,b)=>a+b,0) + rest.reduce((a,b)=>a+b,0);
    const needFromHand = minCardsToReach(sumNow, hVals, 20);
    return {
      feasible: maxPossible >= 20,
      handSure: (sumNow + hVals.reduce((a,b)=>a+b,0) >= 20),
      needFromHand
    };
  }
  // “ruokin vastustajaa” -mittari
  function feedRisk(card){
    const s = card.suit; const opp = oppExped[s];
    if (!opp || !Array.isArray(opp.numbers)) return 0;
    const last = opp.numbers.length ? opp.numbers[opp.numbers.length-1] : null;
    if (card.wager){
      // wager voi auttaa avaamaan – pieni riski
      return (opp.numbers.length===0) ? 1 : 0;
    }
    if (last==null) return 0;
    if (card.value <= last) return 0;
    // heti jatkoksi tai korkea hyödyllinen
    let r = 1;
    if (card.value === last+1) r += 1;
    if (card.value >= 8) r += 1;
    return r;
  }

  // --- kerää bucketit prioriteettijärjestyksessä ---
  const bucketWager = [];        // turhat wagerit
  const bucketUnplayable = [];   // numerot joita ei voi pelata (<= last)
  const bucketHopeless = [];     // numerot maasta, jossa ≥20 mahdoton
  const bucketOthers = [];       // muut numerot

  for (let i=0;i<hand.length;i++){
    const c = hand[i];
    const s = c.suit;
    const ex = myExped[s] || {numbers:[]};
    const last = lastOf(ex);

    const f = feasible20(s);
    const risk = feedRisk(c);

    if (c.wager){
      const startedWithNumbers = isStarted(ex); // wageria ei voi enää pelata
      const uselessLate = isLate && !f.handSure; // loppupelissä ei varmaa ≥20-avausta kädellä
      if (startedWithNumbers || !f.feasible || uselessLate){
        bucketWager.push({i, c, risk});
        continue;
      }
      // muuten pidä wager toistaiseksi
      continue;
    }

    // numerokortit
    if (isStarted(ex) && c.value <= last){
      bucketUnplayable.push({i, c, risk});
      continue;
    }

    if (!f.feasible){
      bucketHopeless.push({i, c, risk});
      continue;
    }

    bucketOthers.push({i, c, risk});
  }

  function pick(list, {preferSmall=true, avoidHighLate=true}={}){
    if (!list.length) return null;
    // 1) yritä löytää 0-riskin kortti
    const zero = list.filter(x=>x.risk===0);
    const pool = zero.length ? zero : list; // jos ei nollaa, hyväksy riskillinen
    // 2) välttävästi: loppupelissä vältä 8–10 jos on vaihtoehtoja
    let filtered = pool;
    if (avoidHighLate && isLate){
      const nonHigh = pool.filter(x=>!x.c.wager && x.c.value<=7);
      if (nonHigh.length) filtered = nonHigh;
    }
    // 3) pienin arvo ensin
    filtered.sort((a,b)=>{
      const av = a.c.wager ? -1 : a.c.value;
      const bv = b.c.wager ? -1 : b.c.value;
      if (preferSmall){
        if (av!==bv) return av-bv;
      } else {
        if (av!==bv) return bv-av;
      }
      // tiebreak: pienempi risk
      if (a.risk!==b.risk) return a.risk-b.risk;
      // tiebreak: suit-ord
      return SUIT_LIST.indexOf(a.c.suit) - SUIT_LIST.indexOf(b.c.suit);
    });
    return filtered[0];
  }

  // --- valitse bucket-järjestyksessä ---
  let pickCand =
    pick(bucketWager, {preferSmall:true, avoidHighLate:false}) ||
    pick(bucketUnplayable) ||
    pick(bucketHopeless) ||
    pick(bucketOthers);

  if (!pickCand){
    // fallback: mikä tahansa (mieluiten pienin arvo ja matalin risk)
    const any = hand.map((c,i)=>({i,c,risk:feedRisk(c)}));
    pickCand = pick(any) || {i:0, c:hand[0]};
  }

  return { kind:'discard', index: pickCand.i, suit: hand[pickCand.i]?.suit };
}



function aiChooseDraw(){
  const myExped   = state?.ai?.expeditions    || {};
  const oppExped  = state?.player?.expeditions|| {};
  const discards  = state?.discards           || {};
  const hand      = state?.ai?.hand           || [];
  const deckSize  = (state?.deck?.length ?? 0);

  function isSameCard(a, b){
    if (!a || !b) return false;
    if (a.uid && b.uid) return a.uid === b.uid;
    if (a === b) return true;
    return (a.suit === b.suit && a.value === b.value && !!a.wager === !!b.wager);
  }
  function isFreshSelfDiscardTop(s, top){
    const jd = state?.ai?.justDiscarded;
    if (!jd || !top) return false;
    if (jd.suit !== s) return false;
    if (isSameCard(top, jd.cardRef)) return true;
    return (top.value === jd.value) && (!!top.wager === jd.wager);
  }

  const SUIT_LIST = (typeof SUITS !== 'undefined' && Array.isArray(SUITS) && SUITS.length)
    ? SUITS.slice()
    : Object.keys(discards);

  function topDiscard(s){ const pile = discards[s]||[]; return pile.length ? pile[pile.length-1] : null; }
  function lastOf(exp){ return (exp && Array.isArray(exp.numbers) && exp.numbers.length) ? exp.numbers[exp.numbers.length-1] : null; }
  function playedSum(exp){ return (exp && Array.isArray(exp.numbers)) ? exp.numbers.reduce((a,b)=>a+b,0) : 0; }
  function handValsForSuit(s, minExclusive){
    return [...new Set(hand.filter(c=>c.suit===s && !c.wager && (minExclusive==null || c.value>minExclusive)).map(c=>c.value))]
           .sort((a,b)=>a-b);
  }
  function minCardsToReach(sumNow, sortedAscVals, target){
    if (sumNow >= target) return 0;
    let need = target - sumNow, acc = 0, taken = 0;
    for (const v of sortedAscVals.slice().reverse()){ acc += v; taken++; if (acc >= need) return taken; }
    return Infinity;
  }
  function canReachNonNegativeStarted(s, includeExtraValue){
    const ex = myExped[s]; const last = lastOf(ex); const sum0 = playedSum(ex);
    const vals = handValsForSuit(s, last);
    const merged = (includeExtraValue!=null && includeExtraValue>last) ? [...new Set([...vals, includeExtraValue])].sort((a,b)=>a-b) : vals;
    return Number.isFinite(minCardsToReach(sum0, merged, 20));
  }
  function canReachStrictPositiveUnstartedFromHand(s){
    const ex = myExped[s]; const last = lastOf(ex); const sum0 = playedSum(ex);
    const vals = handValsForSuit(s, last);
    return Number.isFinite(minCardsToReach(sum0, vals, 21));
  }
  function computeNeededN(){
    let N=0;
    for (const s of SUIT_LIST){
      const ex = myExped[s]; const last = lastOf(ex); const sum0 = playedSum(ex);
      const vals = handValsForSuit(s, last);
      const need = minCardsToReach(sum0, vals, 20);
      if (Number.isFinite(need)) N += need;
    }
    return N;
  }
  function haveTimeToPlayNeededCards(K){
    if (K<=0) return true;
    if (Number.isFinite(state?.turnsLeftAI)) return state.turnsLeftAI >= K;
    if (Number.isFinite(state?.turnsLeft))   return state.turnsLeft   >= K;
    const approxAITurns = Math.ceil(deckSize/2);
    return approxAITurns >= K;
  }

  const isFinalRound = deckSize === 0 && (state?.finalRoundActive===true || state?.roundPhase==='final' || state?.turnsLeft===1);
  if (isFinalRound) return { kind:'none', reason:'final_round_no_draw' };

  const Nneeded = computeNeededN();
  const mustSaveDeck = (deckSize < 2*Nneeded) && !haveTimeToPlayNeededCards(Nneeded);

  if (mustSaveDeck){
    let candidate = null;
    for (const s of SUIT_LIST){
      const top = topDiscard(s); if (!top || top.wager) continue;
      const last = lastOf(myExped[s]);
      if (last==null || top.value>last){ candidate = {kind:'discard', suit:s}; break; }
    }
    if (!candidate){
      for (const s of SUIT_LIST){
        const top = topDiscard(s); if (!top || top.wager) continue;
        const last = lastOf(myExped[s]); if (last!=null && top.value<=last) continue;
        candidate = {kind:'discard', suit:s}; break;
      }
    }
    if (!candidate){
      for (const s of SUIT_LIST){
        const top = topDiscard(s); if (top && top.wager){ candidate = {kind:'discard', suit:s}; break; }
      }
    }
    return candidate || { kind:'deck' };
  }

  const discardOptions = [];
  for (const s of SUIT_LIST){
    const top = topDiscard(s);
    if (!top) continue;
    if (isFreshSelfDiscardTop(s, top)) continue;

    const ex = myExped[s];
    const last = lastOf(ex);
    const oppLast = lastOf(oppExped[s]);
    const started = Array.isArray(ex?.numbers) && ex.numbers.length>0;

    if (top.wager){
      if (started) continue; // ei wageria aloitetulle retkelle
      const sum0 = playedSum(ex);
      const vals = handValsForSuit(s, last);
      const needTo21 = minCardsToReach(sum0, vals, 21);
      if (Number.isFinite(needTo21) && haveTimeToPlayNeededCards(needTo21 + 1)){
        discardOptions.push({ suit:s, top, reason:'wager_allowed' });
      }
      continue;
    }

    if (!started){
      if (canReachStrictPositiveUnstartedFromHand(s)){
        discardOptions.push({ suit:s, top, reason:'unstarted_can_positive_from_hand' });
      }
    } else {
      if (top.value <= last) continue; // ei koskaan ≤ last
      const okNonNeg = canReachNonNegativeStarted(s, top.value);
      let ok = okNonNeg;
      if (!ok){
        if (top.value>6 && !(oppLast!=null && oppLast>6)){ ok = true; }
      }
      if (ok){
        discardOptions.push({ suit:s, top, reason: okNonNeg ? 'started_reaches_nonneg' : 'tempo_play_gt6' });
      }
    }
  }

  if (discardOptions.length){
    const priority = { 'tempo_play_gt6':3, 'started_reaches_nonneg':2, 'unstarted_can_positive_from_hand':1, 'wager_allowed':0 };
    discardOptions.sort((a,b)=>{
      const pa=(priority[a.reason]??0), pb=(priority[b.reason]??0);
      if (pb!==pa) return pb-pa;
      const va=a.top.wager?-1:a.top.value, vb=b.top.wager?-1:b.top.value;
      if (vb!==va) return vb-va;
      return SUIT_LIST.indexOf(a.suit)-SUIT_LIST.indexOf(b.suit);
    });
    return { kind:'discard', suit: discardOptions[0].suit };
  }

  return { kind:'deck' };
}



function spendFinalPlacement(){ if(state.finalPlacements!=null){ state.finalPlacements--; if(state.finalPlacements<=0){ endGame(); return true; } } return false; }

function aiTurn(){
  if(state.gameOver) return;

  // 1) Choose play/discard
  const play = aiChoosePlay();
  if(play.kind==='play'){
    const card = state.ai.hand.splice(play.index,1)[0];
    if (canPlayTo(state.ai.expeditions[play.suit], card)) {
      playTo(state.ai.expeditions[play.suit], card);
      renderAll(`AI pelasi ${prettyCard(card)} retkeen ${SUIT_SYM[play.suit]}.`);
    } else {
      // turvakaide: jos syystä tai toisesta laiton - hylkää
      // merkitse juuri hylätty, jotta ei oteta takaisin samassa vuorossa
      state.ai.justDiscarded = { suit: card.suit, uid: card.uid ?? null, cardRef: card, value: card.value, wager: !!card.wager };
      discard(card);
      renderAll(`AI hylkäsi ${prettyCard(card)} pinoon ${SUIT_SYM[card.suit]} (turvakaide).`);
    }
  } else {
    const card = state.ai.hand.splice(play.index,1)[0];
    // merkitse juuri hylätty, jotta ei oteta takaisin samassa vuorossa
    state.ai.justDiscarded = { suit: card.suit, uid: card.uid ?? null, cardRef: card, value: card.value, wager: !!card.wager };
    discard(card);
    renderAll(`AI hylkäsi ${prettyCard(card)} pinoon ${SUIT_SYM[card.suit]}.`);
  }

  // 2) End-game "final placements": ei nostoja
  if (state.finalPlacements != null){
    // AI kuluttaa oman sijoituksensa
    state.finalPlacements--;
    if (state.finalPlacements <= 0){ endGame(); return; }
    state.turn='player'; state.phase='play';
    renderAll('AI pelasi. Pelaa yksi kortti – ei nostoja.');
    return;
  }

// 3) Normal draw phase
const draw = aiChooseDraw();
if (draw.kind === 'discard') {
  const ok = drawFromDiscard(state.ai, draw.suit);
  if (ok) {
     renderAll(`AI nosti poistosta ${prettyCard(ok)}.`);
  } else {
    // Fallback pakkaan jos pino olikin tyhjä
    drawFromDeck(state.ai);
    renderAll('AI nosti pakasta (fallback).');
  }
} else {
  drawFromDeck(state.ai);
  renderAll('AI nosti pakasta.');
}

  // Nollaa 'justDiscarded' vuoron lopussa
  state.ai.justDiscarded = null;


  // 4) Hand back to player
  state.turn='player'; state.phase='play';
  appendStatusInline('Sinun vuorosi.');
  renderAll();
}


/* events */
document.getElementById('newGameBtn').addEventListener('click', deal);
(function(){ const d=new Date(); const fmt=new Intl.DateTimeFormat('fi-FI',{day:'2-digit',month:'2-digit',year:'numeric'}); document.getElementById('date').textContent=fmt.format(d); })();
deal();


// === inline status append helper (no line break) ===
function appendStatusInline(msg){
  try{
    var el = (typeof statusEl!=='undefined' && statusEl) ? statusEl : document.getElementById('status');
    if(!el) return;
    el.innerHTML = (el.innerHTML ? el.innerHTML + ' — ' : '') + msg;
  }catch(e){ /* no-op */ }
}

