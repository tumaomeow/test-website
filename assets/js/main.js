/* ==========================================================================
   ESP32 开发者指南 · 交互脚本
   无依赖、离线可用。模块顺序：工具 → 主题 → 导航 → 滚动 → 代码 → 选型
   ========================================================================== */

(function () {
  "use strict";

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------ 工具函数 ------------------------------ */

  var toastEl = $("#toast");
  var toastTimer = null;
  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 1900);
  }

  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { /* 隐私模式或 file:// 下可能不可用，忽略 */ }
    return null;
  }

  function copyText(text) {
    var done = function () { toast("已复制到剪贴板"); };
    var fallback = function () {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); }
      catch (e) { toast("复制失败，请手动选择代码"); }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  /* ------------------------------- 主题 -------------------------------- */

  var root = document.documentElement;
  var savedTheme = store("esp32-theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    root.setAttribute("data-theme", savedTheme);
  } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    root.setAttribute("data-theme", "light");
  }

  var themeToggle = $("#theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      store("esp32-theme", next);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", next === "dark" ? "#070a12" : "#f4f6fb");
    });
  }

  /* ------------------------------- 导航 -------------------------------- */

  var nav = $("#primary-nav");
  var navToggle = $("#nav-toggle");
  var header = $("#site-header");

  function closeNav() {
    if (!nav || !navToggle) return;
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("a", nav).forEach(function (link) { link.addEventListener("click", closeNav); });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeNav();
  });
  document.addEventListener("click", function (e) {
    if (!nav || !nav.classList.contains("is-open")) return;
    if (nav.contains(e.target) || (navToggle && navToggle.contains(e.target))) return;
    closeNav();
  });

  /* ---------------------------- 滚动相关 ------------------------------- */

  var progress = $("#scroll-progress");
  var toTop = $("#to-top");
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
    if (header) header.classList.toggle("is-stuck", y > 12);
    if (toTop) toTop.classList.toggle("is-visible", y > 700);
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* 导航高亮（滚动监听） */
  var navLinks = $$("#primary-nav a");
  var sections = navLinks
    .map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); })
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* 滚动显现 */
  var revealItems = $$(".reveal");
  if (!reduceMotion && "IntersectionObserver" in window) {
    var revealer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        entry.target.style.transitionDelay = Math.min(i * 70, 280) + "ms";
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    revealItems.forEach(function (el) { revealer.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* 数字滚动 */
  var counters = $$("[data-count]");
  function runCounter(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduceMotion) { el.textContent = prefix + target + suffix; return; }
    var start = performance.now();
    var duration = 1300;
    (function step(now) {
      var t = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (t < 1) window.requestAnimationFrame(step);
    })(start);
  }
  if (counters.length) {
    if ("IntersectionObserver" in window) {
      var counterObs = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { counterObs.observe(el); });
    } else {
      counters.forEach(runCounter);
    }
  }

  /* ----------------------------- 代码高亮 ------------------------------ */

  var CPP_KEYWORDS = [
    "void", "int", "long", "short", "char", "float", "double", "bool", "const", "static",
    "unsigned", "signed", "struct", "class", "enum", "typedef", "union", "extern", "volatile",
    "if", "else", "for", "while", "do", "switch", "case", "default", "break", "continue",
    "return", "goto", "sizeof", "true", "false", "nullptr", "new", "delete", "namespace", "using",
    "template", "public", "private", "protected", "try", "catch", "throw", "auto"
  ];
  var PY_KEYWORDS = [
    "import", "from", "as", "def", "class", "if", "elif", "else", "while", "for", "in",
    "not", "and", "or", "is", "None", "True", "False", "return", "break", "continue",
    "pass", "try", "except", "finally", "with", "lambda", "global", "assert", "del", "raise", "yield"
  ];
  var KEYWORDS = CPP_KEYWORDS.concat(PY_KEYWORDS).reduce(function (acc, k) {
    acc[k] = true; return acc;
  }, {});

  var TOKEN_RE = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[ \t]*[A-Za-z_]\w*[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:ULL|UL|U|L|f|u|l)?)\b|\b([A-Za-z_]\w*)\b/g;

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function highlight(code) {
    var out = "";
    var last = 0;
    var m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(code)) !== null) {
      out += escapeHtml(code.slice(last, m.index));
      var cls = null;
      if (m[1]) cls = "tok-c";
      else if (m[2]) cls = "tok-s";
      else if (m[3]) cls = "tok-n";
      else if (m[4]) {
        cls = KEYWORDS[m[4]] ? "tok-k" : (code.charAt(m.index + m[0].length) === "(" ? "tok-f" : null);
      }
      out += cls ? '<span class="' + cls + '">' + escapeHtml(m[0]) + "</span>" : escapeHtml(m[0]);
      last = m.index + m[0].length;
    }
    out += escapeHtml(code.slice(last));
    return out;
  }

  var panes = $("#code-panes");
  var sources = $$(".code-source");
  if (panes && sources.length) {
    sources.forEach(function (src) {
      var pane = document.createElement("div");
      pane.className = "code-pane";
      pane.id = src.id + "-pane";   // 注意：不能与 <script> 源码同 id，否则 getElementById 会取错
      pane.setAttribute("role", "tabpanel");
      var pre = document.createElement("pre");
      var code = document.createElement("code");
      code.innerHTML = highlight(src.textContent.replace(/^\n+/, "").replace(/\s+$/, ""));
      pre.appendChild(code);
      pane.appendChild(pre);
      panes.appendChild(pane);
    });

    var tabs = $$(".code-tab");
    var fileLabel = $("#code-file");
    var langLabel = $("#code-lang");
    var activeId = tabs[0].getAttribute("data-target");

    function activateTab(tab) {
      var id = tab.getAttribute("data-target");
      activeId = id;
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      $$(".code-pane", panes).forEach(function (p) {
        p.classList.toggle("is-active", p.id === id + "-pane");
      });
      var src = document.getElementById(id);
      if (src && fileLabel) fileLabel.textContent = src.getAttribute("data-file") || "";
      if (src && langLabel) langLabel.textContent = src.getAttribute("data-lang") || "";
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () { activateTab(tab); });
      tab.addEventListener("keydown", function (e) {
        var i = tabs.indexOf(tab);
        var next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (next) { e.preventDefault(); next.focus(); activateTab(next); }
      });
    });

    activateTab(tabs[0]);

    var copyBtn = $("#copy-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var src = document.getElementById(activeId);
        if (!src) return;
        copyText(src.textContent.replace(/^\n+/, "").replace(/\s+$/, ""));
        copyBtn.classList.add("is-done");
        setTimeout(function () { copyBtn.classList.remove("is-done"); }, 1600);
      });
    }
  }

  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      copyText(btn.getAttribute("data-copy"));
    });
  });

  /* --------------------------- 芯片家族选择 ---------------------------- */

  var CHIPS = {
    esp32: {
      title: "ESP32",
      sub: "家族里资历最老、生态最成熟的一颗。至今仍是学习嵌入式与验证原型时的默认选择。",
      pills: [["内核", "Xtensa LX6 双核 240 MHz"], ["无线", "Wi-Fi 4 + 蓝牙 4.2 双模"], ["模拟", "18 路 ADC · 2 路 DAC"], ["封装", "QFN 5×5 mm"]],
      good: ["例程与教程数量最多，几乎任何问题都能搜到答案", "模拟外设最全：真 DAC、10 路触摸、霍尔传感器", "同时有经典蓝牙与 BLE，可做音频与 HID 设备", "开发板便宜且选择极多，入门成本最低"],
      bad: ["GPIO 只有 34 路，比 S3 少", "没有 USB OTG，依赖外置 USB 桥接芯片", "不支持 Wi-Fi 6、5 GHz 与 Thread", "早期芯片存在硅勘误，量产前需核对勘误表"]
    },
    s3: {
      title: "ESP32-S3",
      sub: "面向 AIoT 的升级款：加入向量指令、USB OTG 与摄像头 / LCD 接口，是目前做视觉与语音项目的首选。",
      pills: [["内核", "Xtensa LX7 双核 240 MHz + 向量指令"], ["无线", "Wi-Fi 4 + BLE 5.0"], ["内存", "512 KB SRAM，可选 PSRAM"], ["接口", "USB OTG · LCD · DVP 摄像头"]],
      good: ["ESP-DL 与 ESP-SR 官方 AI / 语音框架的主战场", "45 路 GPIO，比经典款多出三分之一", "原生 USB，免驱动烧录，还能模拟 HID 与 U 盘", "支持外扩 PSRAM，跑屏幕与图像不再捉襟见肘"],
      bad: ["只有 BLE，没有经典蓝牙", "没有 DAC 与霍尔传感器", "依旧不带 Wi-Fi 6 与 Thread", "价格高于 ESP32 与 C3"]
    },
    c3: {
      title: "ESP32-C3",
      sub: "用 RISC-V 重做的低成本方案，一颗芯片同时提供 Wi-Fi 与 BLE，是「够用就好」的典型代表。",
      pills: [["内核", "RISC-V 单核 160 MHz"], ["无线", "Wi-Fi 4 + BLE 5.0"], ["GPIO", "22 路"], ["封装", "QFN32 5×5 mm"]],
      good: ["成本最低的 Wi-Fi + BLE 双模方案", "原生 USB 串口，免驱烧录", "体积小，适合可穿戴与大批量产品", "安全启动、Flash 加密等安全能力齐备"],
      bad: ["只有 22 路 GPIO，扩展能力有限", "不支持经典蓝牙、DAC 与摄像头接口", "单核 160 MHz，算力明显弱于 S3", "中文资料相对经典款少一些"]
    },
    c6: {
      title: "ESP32-C6",
      sub: "家族里的「协议全才」：Wi-Fi 6、BLE 5.3 与 802.15.4 三合一，一套芯片就能通吃 Matter 生态。",
      pills: [["内核", "RISC-V 高性能核 + 低功耗核"], ["无线", "Wi-Fi 6 · BLE 5.3 · Thread / Zigbee"], ["内存", "512 KB SRAM + 16 KB LP SRAM"], ["特性", "TWT 目标唤醒时间"]],
      good: ["同时支持 Wi-Fi、Thread 与 Zigbee，网关与终端都合适", "Wi-Fi 6 的 TWT 与 LP 核显著降低待机功耗", "官方 ESP-Matter 与 Zigbee SDK 已经就绪", "内置 USB Serial / JTAG，无需外置桥接芯片"],
      bad: ["只有 2.4 GHz，不含 5 GHz 频段", "没有经典蓝牙与 DAC", "生态与例程数量不及经典 ESP32"]
    },
    c5: {
      title: "ESP32-C5",
      sub: "少见的双频物联网芯片：2.4 GHz 与 5 GHz 都支持，同时具备 Wi-Fi 6 与 802.15.4 能力。",
      pills: [["内核", "RISC-V 单核 240 MHz"], ["无线", "Wi-Fi 6 双频 2.4 + 5 GHz · BLE 5 · 802.15.4"], ["内存", "384 KB SRAM"], ["GPIO", "28 路"]],
      good: ["5 GHz 干扰更少、吞吐更高，适合拥挤的智能家居环境", "同时具备 Thread / Zigbee 能力", "面向路由器、网关与视频类产品"],
      bad: ["推出时间较晚，中文资料与第三方库仍在积累", "5 GHz 穿墙能力弱于 2.4 GHz，部署时需规划", "无经典蓝牙与 DAC"]
    },
    h2: {
      title: "ESP32-H2",
      sub: "一颗刻意「不带 Wi-Fi」的芯片，专为 Thread / Zigbee 低功耗节点而生。",
      pills: [["内核", "RISC-V 单核 96 MHz"], ["无线", "BLE 5.3 + 802.15.4"], ["内存", "320 KB SRAM"], ["定位", "低功耗无线节点"]],
      good: ["做纯 Thread / Zigbee 节点时，功耗与成本都优于大而全的芯片", "可作为 C6、S3 的无线协处理器使用", "支持 Matter over Thread", "内置安全启动与硬件加密"],
      bad: ["完全没有 Wi-Fi，需要自备网关", "算力有限，不适合跑复杂逻辑或图形界面", "生态偏窄，例程相对少"]
    },
    p4: {
      title: "ESP32-P4",
      sub: "家族里的高性能大哥：双核 400 MHz、MIPI 接口与最高 32 MB PSRAM 支持，用来做带屏的人机界面与多媒体。",
      pills: [["内核", "RISC-V 双核 400 MHz + LP 核"], ["接口", "MIPI-CSI / MIPI-DSI · USB 2.0 HS"], ["内存", "768 KB SRAM，最高 32 MB PSRAM"], ["无线", "需外挂 C6 等协处理器"]],
      good: ["能驱动高分辨率 MIPI 屏幕与摄像头，适合 HMI、门禁面板、显示终端", "性能接近入门级应用处理器", "可与 C6 搭配形成「主控 + 无线」架构"],
      bad: ["自身没有 Wi-Fi 与蓝牙", "功耗与价格都高于其他型号", "工具链与生态仍在完善中"]
    }
  };

  var cardWrap = $("#chip-cards");
  var detail = $("#chip-detail");

  function renderChip(key) {
    var data = CHIPS[key];
    if (!data || !detail) return;
    detail.classList.remove("is-swapping");
    void detail.offsetWidth;
    detail.classList.add("is-swapping");

    var pills = data.pills.map(function (p) {
      return '<span class="cd-pill"><b>' + p[0] + "</b>" + p[1] + "</span>";
    }).join("");
    var good = data.good.map(function (g) { return "<li>" + g + "</li>"; }).join("");
    var bad = data.bad.map(function (b) { return "<li>" + b + "</li>"; }).join("");

    detail.innerHTML =
      '<div class="cd-main">' +
        "<h3>" + data.title + "</h3>" +
        '<p class="cd-sub">' + data.sub + "</p>" +
        "<div>" + pills + "</div>" +
      "</div>" +
      '<div class="cd-lists">' +
        "<div><h4>适合它的理由</h4><ul>" + good + "</ul></div>" +
        '<div class="no-go"><h4>需要留意</h4><ul>' + bad + "</ul></div>" +
      "</div>";
  }

  if (cardWrap && detail) {
    var cards = $$(".chip-card", cardWrap);
    var rows = $$("#compare-table tbody tr");

    function selectChip(key, scrollToTable) {
      cards.forEach(function (c) { c.classList.toggle("is-active", c.getAttribute("data-chip") === key); });
      rows.forEach(function (r) { r.classList.toggle("is-active", r.getAttribute("data-chip") === key); });
      renderChip(key);
      if (scrollToTable) {
        var table = $("#compare-table");
        if (table) table.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      }
    }

    cards.forEach(function (card) {
      card.addEventListener("click", function () { selectChip(card.getAttribute("data-chip"), false); });
    });
    rows.forEach(function (row) {
      row.addEventListener("click", function () { selectChip(row.getAttribute("data-chip"), false); });
    });

    selectChip("esp32", false);
  }

  /* ------------------------------- 其他 -------------------------------- */

  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  console.log("%c ESP32 指南 %c 页面已就绪 · 离线可用 ",
    "background:#ff4d2d;color:#fff;border-radius:4px 0 0 4px;padding:2px 6px;font-weight:700",
    "background:#0b1020;color:#22d3ee;border-radius:0 4px 4px 0;padding:2px 6px");
})();
