/* 課程共用互動 —— 語法高亮、語法解剖、目錄、任務清單、測驗、計算器 */
(function(){
"use strict";

/* ---------- 工具 ---------- */
var esc = function(s){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); };
function store(k, v){
  try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }
  catch(e){ return null; }
}

/* ---------- 深淺色 ---------- */
var tBtn = document.getElementById("themeBtn");
var saved = store("lesson-theme") || store("l1-theme");   /* l1-theme 是舊的鍵名，沿用既有設定 */
if (saved === "dark" || saved === "light") document.documentElement.setAttribute("data-theme", saved);
if (tBtn) tBtn.addEventListener("click", function(){
  var cur = document.documentElement.getAttribute("data-theme");
  if (!cur) cur = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  var next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  store("lesson-theme", next);
});

/* ---------- 行動版選單 ---------- */
var sb = document.getElementById("sidebar"), scrim = document.getElementById("scrim");
var menuBtn = document.getElementById("menuBtn");
function closeSb(){ if (sb) sb.classList.remove("open"); if (scrim) scrim.classList.remove("on"); }
if (menuBtn && sb) menuBtn.addEventListener("click", function(){
  sb.classList.toggle("open"); if (scrim) scrim.classList.toggle("on");
});
if (scrim) scrim.addEventListener("click", closeSb);

/* ---------- 語法高亮 ---------- */
var PY = [
  ["com", /#[^\n]*/y],
  ["str", /(?:[fFrRbB]{0,2})(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/y],
  ["dec", /@[A-Za-z_][\w.]*/y],
  ["kw",  /\b(?:import|from|as|def|class|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|with|try|except|finally|raise|async|await|yield|lambda|pass|break|continue|global|nonlocal|assert|del)\b/y],
  ["bi",  /\b(?:print|len|range|str|int|float|bool|list|dict|set|tuple|type|open|sum|min|max|next|input|enumerate|zip|sorted|isinstance|Exception|RuntimeError|ValueError|AttributeError|KeyError)\b/y],
  ["num", /\b\d[\d_]*\.?\d*(?:[eE][-+]?\d+)?\b/y],
  ["fn",  /\b[A-Za-z_]\w*(?=\s*\()/y],
  ["op",  /[-+*/%=<>!&|^~:,.()[\]{}]/y]
];
var BASH = [
  ["com", /#[^\n]*/y],
  ["str", /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/y],
  ["kw",  /\b(?:uv|git|brew|curl|cd|printf|echo|ollama|export|python|pytest|sh)\b/y],
  ["dec", /(?:^|\s)(--?[A-Za-z][\w-]*)/y],
  ["num", /\b\d[\d.]*\b/y],
  ["op",  /[|&>;<]/y]
];
var SQL = [
  ["com", /--[^\n]*/y],
  ["str", /'(?:''|[^'])*'/y],
  ["kw",  /\b(?:CREATE|TABLE|INDEX|EXTENSION|IF|NOT|EXISTS|SELECT|FROM|WHERE|ORDER|BY|LIMIT|INSERT|INTO|VALUES|USING|ON|AS|AND|OR|DROP|DEFAULT|PRIMARY|KEY|NULL|WITH|SET|UPDATE|DELETE|JOIN|GROUP|HAVING)\b/iy],
  ["bi",  /\b(?:vector|bigserial|text|int|timestamptz|real|boolean|now|hnsw|ivfflat|vector_cosine_ops|vector_l2_ops|vector_ip_ops|vector_l1_ops)\b/iy],
  ["num", /\b\d+\b/y],
  ["op",  /<=>|<->|<#>|<\+>|[(),;.*=]/y]
];
var YAML = [
  ["com", /#[^\n]*/y],
  ["str", /"(?:\\.|[^"\\])*"|'(?:[^'])*'/y],
  ["fn",  /^[ \t]*[A-Za-z_][\w.-]*(?=:)/my],
  ["op",  /^[ \t]*-(?=\s)/my],
  ["num", /\b\d+\b/y],
  ["kw",  /\b(?:true|false|null)\b/y]
];
var JSONR = [
  ["str", /"(?:\\.|[^"\\])*"(?=\s*:)/y],
  ["fn",  /"(?:\\.|[^"\\])*"/y],
  ["kw",  /\b(?:true|false|null)\b/y],
  ["num", /-?\b\d[\d.]*(?:[eE][-+]?\d+)?\b/y],
  ["op",  /[{}[\],:]/y]
];
function pickRules(lang){
  return lang === "python" ? PY
       : lang === "bash"   ? BASH
       : lang === "json"   ? JSONR
       : lang === "sql"    ? SQL
       : lang === "yaml"   ? YAML
       : null;
}
function hl(code, rules){
  var out = "", i = 0, n = code.length;
  while (i < n){
    var hit = false;
    for (var r = 0; r < rules.length; r++){
      var cls = rules[r][0], re = rules[r][1];
      re.lastIndex = i;
      var m = re.exec(code);
      if (m && m.index === i && m[0].length){
        out += '<span class="t-' + cls + '">' + esc(m[0]) + "</span>";
        i += m[0].length; hit = true; break;
      }
    }
    if (!hit){ out += esc(code[i]); i++; }
  }
  return out;
}

/* ---------- 程式碼區塊：高亮 + 工具列 + 複製 ---------- */
Array.prototype.forEach.call(document.querySelectorAll(".cb"), function(cb){
  var pre = cb.querySelector("pre"), codeEl = cb.querySelector("code");
  if (!pre || !codeEl) return;
  var lang = cb.getAttribute("data-lang") || "text";
  var raw = codeEl.textContent;

  /* anno 區塊的高亮交給下面的 anno 迴圈處理 —— 它需要在高亮前插入標記 */
  var rules = pickRules(lang);
  if (rules && !cb.hasAttribute("data-anno")) codeEl.innerHTML = hl(raw, rules);

  var bar = document.createElement("div");
  bar.className = "cb-bar";
  var file = cb.getAttribute("data-file");
  bar.innerHTML = '<span class="cb-lang">' + esc(lang) + "</span>" +
                  (file ? '<span class="cb-file">' + esc(file) + "</span>" : "") +
                  '<span class="sp"></span>';
  var btn = document.createElement("button");
  btn.className = "cb-copy"; btn.type = "button"; btn.textContent = "複製";
  btn.addEventListener("click", function(){
    var done = function(){
      btn.textContent = "已複製"; btn.classList.add("done");
      setTimeout(function(){ btn.textContent = "複製"; btn.classList.remove("done"); }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(raw).then(done, function(){ btn.textContent = "複製失敗"; });
    } else {
      var ta = document.createElement("textarea");
      ta.value = raw; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch(e){ btn.textContent = "複製失敗"; }
      document.body.removeChild(ta);
    }
  });
  bar.appendChild(btn);
  cb.insertBefore(bar, pre);
});

/* ---------- 語法解剖：標記 ↔ 說明連動 ---------- */
/* 每個 .note 用 data-line 指定它對應程式碼的第幾行（1-based）。
   做法：先在原始文字的行尾插入哨符 \u0001，高亮之後再把哨符換成標記 —— 
   這樣標記一定落在 span 邊界外，不會破壞高亮產生的 HTML 結構。 */
Array.prototype.forEach.call(document.querySelectorAll(".anno"), function(anno){
  var cb = anno.querySelector(".cb");
  var codeEl = anno.querySelector("pre code");
  var notes = anno.querySelectorAll(".note");
  if (!cb || !codeEl || !notes.length) return;

  var lang = cb.getAttribute("data-lang") || "text";
  var rules = pickRules(lang);

  var pairs = [];
  Array.prototype.forEach.call(notes, function(nd, i){
    var ln = parseInt(nd.getAttribute("data-line"), 10);
    if (ln > 0) pairs.push({ line: ln, note: i + 1 });
  });
  if (!pairs.length) return;
  pairs.sort(function(a, b){ return a.line - b.line; });   /* 哨符要依文件順序取用 */

  var lines = codeEl.textContent.split("\n");
  pairs.forEach(function(pr){
    if (pr.line >= 1 && pr.line <= lines.length) lines[pr.line - 1] += "\u0001";
  });

  var marked = lines.join("\n");
  var out = rules ? hl(marked, rules) : esc(marked);
  var k = 0;
  out = out.replace(/\u0001/g, function(){
    var pr = pairs[k++];
    return pr ? '<span class="pin" data-pin="' + pr.note + '" data-n="' + pr.note + '"></span>' : "";
  });
  codeEl.innerHTML = out;

  function activate(n){
    Array.prototype.forEach.call(anno.querySelectorAll(".pin"), function(pin){
      pin.classList.toggle("on", pin.getAttribute("data-pin") === String(n));
    });
    Array.prototype.forEach.call(notes, function(nd, idx){
      nd.classList.toggle("on", idx + 1 === n);
    });
  }
  Array.prototype.forEach.call(anno.querySelectorAll(".pin"), function(pin){
    pin.addEventListener("click", function(){ activate(Number(pin.getAttribute("data-pin"))); });
  });
  Array.prototype.forEach.call(notes, function(nd, idx){
    nd.style.cursor = "pointer";
    nd.addEventListener("click", function(){ activate(idx + 1); });
  });
});

/* ---------- 目錄 + scroll-spy ---------- */
var toc = document.getElementById("toc");
var heads = toc ? document.querySelectorAll("h2[id], h3[id]") : [];
var links = [];

function goTo(el){
  var top = el.getBoundingClientRect().top + window.scrollY - 16;
  /* 近距離用平滑捲動（有助於定位），遠距離直接跳 ——
     這份文件很長，跨章節平滑捲動要一兩秒，反而難用。 */
  var smooth = Math.abs(top - window.scrollY) < 2000;
  try { window.scrollTo({ top: top, behavior: smooth ? "smooth" : "auto" }); }
  catch (e) { window.scrollTo(0, top); }          /* 舊瀏覽器沒有 options 形式 */
  try { history.replaceState(null, "", "#" + el.id); } catch (e) {}  /* data: URL 會擋，忽略 */
}
Array.prototype.forEach.call(heads, function(h){
  var li = document.createElement("li");
  if (h.tagName === "H3") li.className = "sub";
  var a = document.createElement("a");
  a.href = "#" + h.id;
  var numEl = h.querySelector(".num");
  a.textContent = numEl ? numEl.textContent + " " + h.textContent.slice(numEl.textContent.length) : h.textContent;
  /* 不依賴瀏覽器的錨點跳轉：從 file:// 或 data: 開啟時它會被當成換頁而失效，
     這裡自己捲動，各種開啟方式都一致。 */
  a.addEventListener("click", function(ev){
    ev.preventDefault();
    closeSb();
    goTo(h);
  });
  li.appendChild(a); toc.appendChild(li);
  links.push({ a: a, el: h });
});
var spy = function(){
  var y = window.scrollY + 90, cur = links[0];
  for (var i = 0; i < links.length; i++){ if (links[i].el.offsetTop <= y) cur = links[i]; }
  links.forEach(function(l){ l.a.classList.toggle("active", l === cur); });
};
var ticking = false;
window.addEventListener("scroll", function(){
  if (ticking) return; ticking = true;
  requestAnimationFrame(function(){ spy(); ticking = false; });
}, { passive: true });
spy();

/* ---------- 任務清單 ---------- */
function wireTasks(wrapId, barId, pcId, key, legacyKey){
  var wrap = document.getElementById(wrapId);
  if (!wrap) return;
  var boxes = wrap.querySelectorAll('input[type="checkbox"]');
  var bar = document.getElementById(barId), pc = document.getElementById(pcId);
  var savedState = {};
  /* 鍵名改過，舊鍵的進度還讀得回來 */
  var rawState = store(key) || (legacyKey ? store(legacyKey) : null);
  try { savedState = JSON.parse(rawState || "{}") || {}; } catch(e){ savedState = {}; }

  function render(){
    var done = 0;
    Array.prototype.forEach.call(boxes, function(b){
      b.closest(".task").classList.toggle("done", b.checked);
      if (b.checked) done++;
    });
    bar.style.width = (boxes.length ? (done / boxes.length * 100) : 0) + "%";
    pc.textContent = done + " / " + boxes.length;
  }
  Array.prototype.forEach.call(boxes, function(b){
    if (savedState[b.id]) b.checked = true;
    b.addEventListener("change", function(){
      savedState[b.id] = b.checked;
      store(key, JSON.stringify(savedState));
      render();
    });
  });
  render();
}
/* 內文裡指向章節的連結（例如「見 §4」）同樣自己接管 */
Array.prototype.forEach.call(document.querySelectorAll('.main a[href^="#"]'), function(a){
  a.addEventListener("click", function(ev){
    var target = document.getElementById(a.getAttribute("href").slice(1));
    if (!target) return;
    ev.preventDefault();
    goTo(target);
  });
});

/* 鍵名帶上檔名，各課的進度才不會互相覆蓋 */
var PAGE = (location.pathname.split("/").pop() || "lesson").replace(/\.html$/, "");
var LEGACY = PAGE === "01-llm-api-basics";    /* 第 1 課原本用 l1-* 當鍵名 */
wireTasks("tasks", "taskBar", "taskPc", PAGE + "-tasks", LEGACY ? "l1-tasks" : null);
wireTasks("tasks2", "taskBar2", "taskPc2", PAGE + "-bonus", LEGACY ? "l1-bonus" : null);

/* ---------- 測驗 ---------- */
Array.prototype.forEach.call(document.querySelectorAll("#quiz .q"), function(q){
  var btn = q.querySelector(".q-btn"), ans = q.querySelector(".q-a");
  btn.addEventListener("click", function(){
    var on = ans.classList.toggle("on");
    btn.textContent = on ? "收起答案" : "看答案";
  });
});

/* ---------- 成本計算器 ---------- */
(function(){
  var ids = ["c-model","c-in","c-out","c-n"];
  var el = {}; ids.forEach(function(i){ el[i] = document.getElementById(i); });
  if (!el["c-model"]) return;
  var out = {};
  ["o-it","o-ip","o-ic","o-ot","o-op","o-oc","o-total","o-each","o-n"].forEach(function(i){
    out[i] = document.getElementById(i);
  });
  var fmt = function(n, d){ return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); };

  function calc(){
    var parts = el["c-model"].value.split(",");
    var pin = parseFloat(parts[0]), pout = parseFloat(parts[1]);
    var ti = Math.max(0, parseFloat(el["c-in"].value) || 0);
    var to = Math.max(0, parseFloat(el["c-out"].value) || 0);
    var n  = Math.max(1, parseFloat(el["c-n"].value) || 1);

    var inTok = ti * n, outTok = to * n;
    var inCost = inTok / 1e6 * pin, outCost = outTok / 1e6 * pout;
    var total = inCost + outCost;

    out["o-it"].textContent = fmt(inTok, 0);
    out["o-ot"].textContent = fmt(outTok, 0);
    out["o-ip"].textContent = "$" + fmt(pin, 2);
    out["o-op"].textContent = "$" + fmt(pout, 2);
    out["o-ic"].textContent = "$" + fmt(inCost, 4);
    out["o-oc"].textContent = "$" + fmt(outCost, 4);
    out["o-n"].textContent  = fmt(n, 0);
    out["o-total"].textContent = "$" + fmt(total, 2);
    out["o-each"].textContent  = "$" + fmt(total / n, 6);
  }
  ids.forEach(function(i){
    el[i].addEventListener("input", calc);
    el[i].addEventListener("change", calc);
  });
  calc();
})();

})();
