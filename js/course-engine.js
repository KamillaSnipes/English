window.CourseUI = (function () {
/* ============ ДВИЖОК ============ */
var T = [], V = [];
var KEY="course-v1", S={};
try{ S=JSON.parse(localStorage.getItem(KEY)||"{}")||{}; }catch(e){ S={}; }
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} }
function el(t,c,x){ var n=document.createElement(t); if(c)n.className=c; if(x!=null)n.textContent=x; return n; }
var app, nav, navttl;

function solved(t){ var n=0; t.drill.forEach(function(_,i){ if(S["q:"+t.id+i]===true) n++; }); return n; }

function home(opts){
  opts = opts || {};
  nav.hidden=true; app.innerHTML="";
  var h=el("header");
  h.appendChild(el("div","kicker","Английский"));
  var t=el("h1"); t.innerHTML="Всё, что<br>мы прошли"; h.appendChild(t);
  h.appendChild(el("p","lead","Выбери тему. В каждой — правило и тренажёр. Ответов нигде не видно, проходить можно сколько угодно раз."));
  app.appendChild(h);

  if (opts.liveBanner) {
    var lb = el("div", "card");
    lb.style.marginTop = "12px";
    lb.style.borderColor = "var(--zest)";
    lb.appendChild(el("p", null, opts.liveBanner));
    app.appendChild(lb);
  }

  var m=el("div","menu");
  T.forEach(function(x,i){
    var b=el("button","item"); b.type="button";
    b.appendChild(el("b",null,(i+1)+". "+x.ttl));
    b.appendChild(el("span",null,x.sub));
    var bar=el("div","bar"), f=el("i");
    f.style.width=Math.round(solved(x)/(x.drill.length||1)*100)+"%";
    bar.appendChild(f); b.appendChild(bar);
    b.addEventListener("click",function(){ topic(x); });
    m.appendChild(b);
  });
  var vb=el("button","item vocab"); vb.type="button";
  vb.appendChild(el("b",null,"Словарь"));
  vb.appendChild(el("span",null,V.length+" слов со всего курса. Англ→рус и рус→англ."));
  vb.addEventListener("click",vocab);
  m.appendChild(vb);
  app.appendChild(m);
}

function block(b){
  if(b.t==="h"){ var h=el("h2",null,b.x); return h; }
  var c=el("div","card");
  if(b.t==="p"){ c.appendChild(el("p",null,b.x)); }
  if(b.t==="note"){ var p=el("p","note",b.x); c.appendChild(p); }
  if(b.t==="table"){
    var tb=el("table"), hr=el("tr");
    b.head.forEach(function(x){ hr.appendChild(el("th",null,x)); });
    tb.appendChild(hr);
    b.rows.forEach(function(r){ var x=el("tr"); r.forEach(function(v){ x.appendChild(el("td",null,v)); }); tb.appendChild(x); });
    c.appendChild(tb);
  }
  if(b.t==="list"){
    var u=el("ul","plain");
    b.rows.forEach(function(r){
      var li=el("li"); li.appendChild(el("span","en",r[0]));
      li.appendChild(document.createTextNode(" "));
      li.appendChild(el("span","ru","— "+r[1])); u.appendChild(li);
    });
    c.appendChild(u);
  }
  if(b.t==="vlist"){
    var tb2=el("table"), hr2=el("tr");
    ["Слово","Звучит","Перевод"].forEach(function(x){ hr2.appendChild(el("th",null,x)); });
    tb2.appendChild(hr2);
    b.rows.forEach(function(r){
      var x=el("tr");
      x.appendChild(el("td","en",r[0]));
      x.appendChild(el("td","tr",r[1]));
      x.appendChild(el("td","ru",r[2]));
      tb2.appendChild(x);
    });
    c.appendChild(tb2);
  }
  if(b.t==="pairs"){
    var tb3=el("table"), hr3=el("tr");
    hr3.appendChild(el("th",null,"Так нельзя")); hr3.appendChild(el("th",null,"Так правильно"));
    tb3.appendChild(hr3);
    b.rows.forEach(function(r){
      var x=el("tr");
      x.appendChild(el("td","no",r[0]));
      x.appendChild(el("td","yes",r[1]));
      tb3.appendChild(x);
    });
    c.appendChild(tb3);
  }
  return c;
}

function topic(t){
  nav.hidden=false; navttl.textContent=t.ttl; app.innerHTML=""; window.scrollTo(0,0);
  var h=el("header");
  h.appendChild(el("div","kicker","Тема"));
  h.appendChild(el("h1",null,t.ttl));
  app.appendChild(h);

  var tabs=el("div","tabs");
  var b1=el("button","tab","Правило"), b2=el("button","tab","Тренажёр"), b3=el("button","tab","Домашка");
  b1.type="button"; b2.type="button"; b3.type="button";
  tabs.appendChild(b1); tabs.appendChild(b2);
  if(t.hw && t.hw.length) tabs.appendChild(b3);
  app.appendChild(tabs);

  var meter=el("div","meter"), tr=el("div","track"), fl=el("div","fill"), nm=el("div","num");
  fl.id="fl"; tr.appendChild(fl); meter.appendChild(tr); meter.appendChild(nm); app.appendChild(meter);

  var body=el("div"); app.appendChild(body);

  function upd(){
    var n=solved(t);
    var total = t.drill.length || 1;
    fl.style.width=Math.round(n/total*100)+"%";
    nm.textContent=n+" / "+t.drill.length;
  }

  function selTab(x){ b1.setAttribute("aria-selected",String(x==="r")); b2.setAttribute("aria-selected",String(x==="d")); b3.setAttribute("aria-selected",String(x==="h")); }
  function showRule(){
    selTab("r");
    meter.style.display="none"; body.innerHTML="";
    var s=el("section");
    t.rule.forEach(function(b){ s.appendChild(block(b)); });
    body.appendChild(s); window.scrollTo(0,0);
  }
  function showHw(){
    selTab("h");
    meter.style.display="none"; body.innerHTML="";
    var s=el("section"), c=el("div","card"), ol=document.createElement("ol");
    ol.style.margin="0"; ol.style.paddingLeft="20px";
    t.hw.forEach(function(x){ var li=document.createElement("li"); li.style.padding="7px 0"; li.textContent=x; ol.appendChild(li); });
    c.appendChild(ol); s.appendChild(c);
    body.appendChild(s); window.scrollTo(0,0);
  }
  function showDrill(){
    selTab("d");
    meter.style.display="flex"; body.innerHTML="";
    var s=el("section"), c=el("div","card");
    t.drill.forEach(function(q,i){ c.appendChild(item(t.id,i,q,upd)); });
    s.appendChild(c);
    var r=el("button","btn ghost","Начать заново"); r.type="button";
    r.style.marginTop="14px";
    r.addEventListener("click",function(){
      t.drill.forEach(function(_,i){ delete S["q:"+t.id+i]; }); save(); showDrill(); upd();
    });
    s.appendChild(r);
    body.appendChild(s); upd(); window.scrollTo(0,0);
  }
  b1.addEventListener("click",showRule); b2.addEventListener("click",showDrill); b3.addEventListener("click",showHw);
  showRule(); upd();
}

function item(tid,i,q,upd){
  var id="q:"+tid+i, box=el("div","q"), p=el("p","qt");
  p.innerHTML=(q.q||"").replace("___","<u></u>");
  if(q.ru) p.appendChild(el("span","qru",q.ru));
  box.appendChild(p);
  var hint=el("p","hint");

  if(q.t==="c"){
    var o=el("div","opts");
    q.o.forEach(function(x,j){
      var b=el("button","opt",x); b.type="button";
      b.addEventListener("click",function(){
        if(b.disabled) return;
        if(j===q.k){
          b.classList.add("right"); hint.className="hint ok"; hint.textContent="Верно";
          Array.prototype.forEach.call(o.children,function(y){ y.disabled=true; });
          S[id]=true; save(); upd();
        } else {
          b.classList.add("wrong"); b.disabled=true;
          hint.className="hint bad"; hint.textContent="Не то. Попробуй ещё раз.";
        }
      });
      o.appendChild(b);
    });
    if(S[id]===true){
      o.children[q.k].classList.add("right");
      Array.prototype.forEach.call(o.children,function(y){ y.disabled=true; });
      hint.className="hint ok"; hint.textContent="Верно";
    }
    box.appendChild(o);
  } else {
    var row=el("div","type"), inp=el("input"), btn=el("button","btn","Проверить");
    inp.type="text"; inp.placeholder="напиши здесь"; inp.autocapitalize="none"; inp.spellcheck=false; btn.type="button";
    function norm(v){ return v.trim().toLowerCase().replace(/[’`]/g,"'").replace(/\s+/g," "); }
    function go(){
      var v=norm(inp.value); if(!v) return;
      var ok=q.a.some(function(a){ return norm(a)===v; });
      if(ok){
        inp.className="right"; inp.disabled=true; btn.disabled=true;
        hint.className="hint ok"; hint.textContent="Верно";
        S[id]=true; save(); upd();
      } else { inp.className="wrong"; hint.className="hint bad"; hint.textContent="Пока нет. Загляни в правило."; }
    }
    btn.addEventListener("click",go);
    inp.addEventListener("keydown",function(e){ if(e.key==="Enter") go(); });
    if(S[id]===true){ inp.value=q.a[0]; inp.className="right"; inp.disabled=true; btn.disabled=true; hint.className="hint ok"; hint.textContent="Верно"; }
    row.appendChild(inp); row.appendChild(btn); box.appendChild(row);
  }
  box.appendChild(hint);
  return box;
}

/* ---- словарь ---- */
function vocab(){
  nav.hidden=false; navttl.textContent="Словарь"; app.innerHTML=""; window.scrollTo(0,0);
  var dir=S.vdir||"er", pool=V.slice(), cur=null, score=0, seen=0;

  var h=el("header");
  h.appendChild(el("div","kicker","Словарь"));
  h.appendChild(el("h1",null,"Слова"));
  app.appendChild(h);

  var head=el("div","vhead");
  var c1=el("button","chip","англ → рус"), c2=el("button","chip","рус → англ");
  c1.type="button"; c2.type="button";
  head.appendChild(c1); head.appendChild(c2); app.appendChild(head);

  var stat=el("p","lead"); app.appendChild(stat);
  var card=el("div","card"); app.appendChild(card);

  function setDir(d){
    dir=d; S.vdir=d; save();
    c1.setAttribute("aria-pressed",String(d==="er"));
    c2.setAttribute("aria-pressed",String(d==="re"));
    score=0; seen=0; next();
  }
  c1.addEventListener("click",function(){ setDir("er"); });
  c2.addEventListener("click",function(){ setDir("re"); });

  function pick(n,not){
    var out=[], guard=0;
    while(out.length<n&&guard<400){
      guard++;
      var w=pool[Math.floor(Math.random()*pool.length)];
      if(w===not) continue;
      if(out.indexOf(w)>=0) continue;
      out.push(w);
    }
    return out;
  }

  function next(){
    cur=pool[Math.floor(Math.random()*pool.length)];
    card.innerHTML="";
    stat.textContent="Правильно: "+score+" из "+seen;

    var w=el("div","word", dir==="er"?cur.e:cur.r);
    card.appendChild(w);
    if(dir==="er") card.appendChild(el("div","wtr",cur.t));

    var opts=pick(3,cur); opts.push(cur);
    opts.sort(function(){ return Math.random()-.5; });

    var g=el("div","vgrid"), done=false;
    opts.forEach(function(o){
      var b=el("button","opt", dir==="er"?o.r:o.e); b.type="button";
      b.addEventListener("click",function(){
        if(done) return;
        seen++;
        if(o===cur){
          b.classList.add("right"); score++; done=true;
          Array.prototype.forEach.call(g.children,function(y){ y.disabled=true; });
          setTimeout(next,600);
        } else {
          b.classList.add("wrong"); b.disabled=true;
        }
      });
      g.appendChild(b);
    });
    card.appendChild(g);
  }
  setDir(dir);
}

var backBound = false;
var backHandler = null;
function init(options) {
  options = options || {};
  T = options.topics || [];
  V = options.vocab || [];
  app = document.getElementById("app");
  nav = document.getElementById("nav");
  navttl = document.getElementById("navttl");
  if (options.onBack) backHandler = options.onBack;
  if (!backBound) {
    backBound = true;
    document.getElementById("back").addEventListener("click", function () {
      if (backHandler) backHandler();
      else home({});
    });
  }
}

return { init: init, home: home, topic: topic, vocab: vocab };
})();
