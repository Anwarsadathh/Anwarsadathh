// Builds the static, hand-designed SVGs for the profile README (header, project
// cards, connect buttons, footer) in dark + light variants → assets/
// Run: node scripts/build-assets.mjs

import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "assets";
mkdirSync(OUT, { recursive: true });

const THEMES = {
  dark: {
    bg1: "#070b16", bg2: "#0f172a", card1: "#0c1324", card2: "#121c33", border: "#1e2a44", text: "#eef3fb",
    muted: "#8a97b0", dim: "#5c6a85", chip: "#16213a", chipText: "#c7d2e6", grid: "#ffffff", gridOp: 0.05,
    a1: "#22d3ee", a2: "#a78bfa", a3: "#34d399", orbOp: 0.35, term: "#0a0f1d", termBar: "#141d31",
  },
  light: {
    bg1: "#f8fbff", bg2: "#eef3ff", card1: "#ffffff", card2: "#f6f8fe", border: "#dfe6f3", text: "#0b1224",
    muted: "#55657f", dim: "#8795ad", chip: "#eef2fb", chipText: "#334155", grid: "#0f172a", gridOp: 0.05,
    a1: "#0891b2", a2: "#7c3aed", a3: "#059669", orbOp: 0.18, term: "#0b1224", termBar: "#18223a",
  },
};

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Ubuntu, Arial, sans-serif`;
const MONO = `'SF Mono', 'JetBrains Mono', Consolas, 'Liberation Mono', Menlo, monospace`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const baseStyle = `
  text{font-family:${FONT}}
  .mono{font-family:${MONO}}
  .fade{animation:fade .8s ease-out backwards}
  .up{animation:up .9s cubic-bezier(.2,.8,.2,1) backwards}
  @keyframes fade{from{opacity:0}}
  @keyframes up{from{opacity:0;transform:translateY(10px)}}
  @media (prefers-reduced-motion:reduce){*{animation:none!important}}`;

const defs = (t, id) => `
  <linearGradient id="${id}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
  <linearGradient id="${id}card" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.card1}"/><stop offset="1" stop-color="${t.card2}"/></linearGradient>
  <linearGradient id="${id}acc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.a1}"/><stop offset=".55" stop-color="${t.a2}"/><stop offset="1" stop-color="${t.a3}"/></linearGradient>
  <filter id="${id}blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
  <pattern id="${id}dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.1" fill="${t.grid}" fill-opacity="${t.gridOp * 2}"/></pattern>`;

const chip = (t, x, y, label, color, w) => {
  const width = w ?? label.length * 6.9 + 26;
  return {
    w: width,
    svg: `<rect x="${x}" y="${y}" width="${width}" height="26" rx="13" fill="${t.chip}" stroke="${t.border}"/>
<circle cx="${x + 13}" cy="${y + 13}" r="3.5" fill="${color}"/>
<text x="${x + 22}" y="${y + 17.5}" font-size="12" font-weight="600" fill="${t.chipText}">${esc(label)}</text>`,
  };
};

// ------------------------------------------------------------------ header
function header(t) {
  const W = 880, H = 300, id = "h";
  let chips = "", cx = 40;
  [["4+ yrs shipping", t.a1], ["20+ production apps", t.a2], ["800+ leads/day CRM", t.a3]].forEach(([l, c]) => {
    const ch = chip(t, cx, 222, l, c);
    chips += ch.svg;
    cx += ch.w + 8;
  });

  const lines = [
    { p: "$", c: "whoami", o: "anwar — software engineer, bengaluru", d: 0.6 },
    { p: "$", c: "cat stack.txt", o: "next.js · node · mongodb · redis · aws", d: 1.6 },
    { p: "$", c: "git push origin main", o: "✓ deployed to production", d: 2.6, ok: true },
  ];
  let term = "";
  lines.forEach((l, i) => {
    const y = 108 + i * 48;
    term += `<g class="fade" style="animation-delay:${l.d}s">
  <text x="548" y="${y}" font-size="12.5" class="mono" fill="${t.a3}">${l.p}<tspan fill="#e6edf7" dx="8">${esc(l.c)}</tspan></text>
</g>
<g class="fade" style="animation-delay:${l.d + 0.45}s">
  <text x="548" y="${y + 20}" font-size="12" class="mono" fill="${l.ok ? "#34d399" : "#8a97b0"}">${esc(l.o)}</text>
</g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="Anwar Sadath — Full Stack Engineer">
<defs>${defs(t, id)}
  <clipPath id="${id}clip"><rect width="${W}" height="${H}" rx="20"/></clipPath>
</defs>
<style>${baseStyle}
  .orb1{animation:o1 14s ease-in-out infinite alternate}
  .orb2{animation:o2 17s ease-in-out infinite alternate}
  .orb3{animation:o3 12s ease-in-out infinite alternate}
  @keyframes o1{to{transform:translate(90px,40px)}}
  @keyframes o2{to{transform:translate(-110px,-30px)}}
  @keyframes o3{to{transform:translate(60px,-50px)}}
  .cursor{animation:blink 1s steps(1) infinite}
  @keyframes blink{50%{opacity:0}}
  .pulse{animation:pulse 2s ease-out infinite;transform-box:fill-box;transform-origin:center}
  @keyframes pulse{0%{opacity:.7;transform:scale(1)}100%{opacity:0;transform:scale(2.6)}}
</style>
<g clip-path="url(#${id}clip)">
  <rect width="${W}" height="${H}" fill="url(#${id}bg)"/>
  <g filter="url(#${id}blur)" opacity="${t.orbOp}">
    <circle class="orb1" cx="160" cy="40" r="120" fill="${t.a1}"/>
    <circle class="orb2" cx="720" cy="260" r="140" fill="${t.a2}"/>
    <circle class="orb3" cx="470" cy="330" r="90" fill="${t.a3}"/>
  </g>
  <rect width="${W}" height="${H}" fill="url(#${id}dots)"/>
</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="20" stroke="${t.border}"/>

<g class="up" style="animation-delay:.05s">
  <rect x="40" y="38" width="196" height="26" rx="13" fill="${t.chip}" stroke="${t.border}"/>
  <circle class="pulse" cx="55" cy="51" r="4" fill="${t.a3}"/>
  <circle cx="55" cy="51" r="4" fill="${t.a3}"/>
  <text x="67" y="55.5" font-size="12" font-weight="600" fill="${t.chipText}">Bengaluru, India · Open to roles</text>
</g>
<g class="up" style="animation-delay:.15s">
  <text x="38" y="124" font-size="52" font-weight="800" fill="${t.text}" letter-spacing="-1.5">Anwar Sadath</text>
</g>
<g class="up" style="animation-delay:.3s">
  <text x="40" y="162" font-size="22" font-weight="700" fill="url(#${id}acc)">Full Stack Engineer</text>
</g>
<g class="up" style="animation-delay:.45s">
  <text x="40" y="194" font-size="14" fill="${t.muted}">I build multi-tenant SaaS, CRMs and marketplaces that ship — and scale.</text>
</g>
<g class="up" style="animation-delay:.6s">${chips}</g>

<g class="up" style="animation-delay:.25s">
  <rect x="530" y="40" width="312" height="220" rx="14" fill="${t.term}" stroke="${t.border}"/>
  <path d="M530 54a14 14 0 0 1 14-14h284a14 14 0 0 1 14 14v18H530z" fill="${t.termBar}"/>
  <circle cx="548" cy="56" r="5" fill="#ff5f57"/><circle cx="564" cy="56" r="5" fill="#febc2e"/><circle cx="580" cy="56" r="5" fill="#28c840"/>
  <text x="686" y="60" text-anchor="middle" font-size="11" class="mono" fill="#5c6a85">~/anwar — zsh</text>
</g>
${term}
<g class="fade" style="animation-delay:3.4s"><text x="548" y="246" font-size="12.5" class="mono" fill="${t.a3}">$</text><rect class="cursor" x="562" y="236" width="8" height="14" fill="#e6edf7"/></g>
</svg>`;
}

// ------------------------------------------------------------------ project cards
const PROJECTS = [
  {
    file: "project-crm", w: 880, h: 190,
    tag: "FLAGSHIP · PRODUCTION", title: "Multi-tenant Admissions CRM",
    desc: [
      "One deployment serving an institution's sales team and 500+ partner agencies — tenant isolation",
      "via a Mongoose plugin, 5-role RBAC, rules-based lead routing and two-way WhatsApp / SMS / RCS.",
    ],
    stack: ["Next.js", "TypeScript", "Node.js", "MongoDB", "Redis queues"],
    metrics: [["800+", "leads / day"], ["1,100+", "users"], ["100k+", "records"]],
    link: "private · ThinkerNational",
  },
  {
    file: "project-learnscape", w: 432, h: 196,
    tag: "EDTECH · LIVE", title: "LearnScape Edu",
    desc: ["College discovery for 500+ colleges with search,", "filters, comparison and an AI support assistant."],
    stack: ["Next.js", "Express", "MongoDB", "Nginx"],
    link: "learnscapeedu.com ↗",
  },
  {
    file: "project-skillprofile", w: 432, h: 196,
    tag: "SAAS · LIVE", title: "SkillProfile.in",
    desc: ["157-question career assessment with scoring,", "Razorpay payments and automated PDF reports."],
    stack: ["Next.js", "Node.js", "MongoDB", "Razorpay"],
    link: "skillprofile.in ↗",
  },
];

function projectCard(p, t, idx) {
  const id = "p" + idx;
  const { w: W, h: H } = p;
  const accent = [t.a1, t.a2, t.a3][idx % 3];
  let stack = "", sx = 28;
  const sy = p.metrics ? H - 44 : H - 48;
  p.stack.forEach((s) => {
    const cw = s.length * 7 + 22;
    stack += `<rect x="${sx}" y="${sy}" width="${cw}" height="24" rx="7" fill="${t.chip}" stroke="${t.border}"/>
<text x="${sx + cw / 2}" y="${sy + 16}" text-anchor="middle" font-size="11.5" font-weight="600" class="mono" fill="${t.chipText}">${esc(s)}</text>`;
    sx += cw + 6;
  });
  let metrics = "";
  if (p.metrics) {
    p.metrics.forEach(([v, l], i) => {
      const mx = W - 300 + i * 100;
      metrics += `<g class="up" style="animation-delay:${0.35 + i * 0.12}s">
  <text x="${mx}" y="${H - 34}" font-size="26" font-weight="800" fill="url(#${id}acc)">${esc(v)}</text>
  <text x="${mx}" y="${H - 16}" font-size="11" font-weight="600" fill="${t.muted}">${esc(l)}</text></g>`;
    });
  }
  const desc = p.desc.map((d, i) => `<text x="28" y="${104 + i * 20}" font-size="13.5" fill="${t.muted}">${esc(d)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="${esc(p.title)}">
<defs>${defs(t, id)}
  <radialGradient id="${id}glow" cx="1" cy="0" r="0.9"><stop offset="0" stop-color="${accent}" stop-opacity=".22"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
</defs>
<style>${baseStyle}</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="url(#${id}card)" stroke="${t.border}"/>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="url(#${id}glow)"/>
<rect x="28" y="0" width="56" height="3" rx="1.5" fill="${accent}"/>
<g class="up">
  <text x="28" y="40" font-size="10.5" font-weight="700" letter-spacing="1.8" fill="${accent}">${esc(p.tag)}</text>
  <text x="${W - 28}" y="40" text-anchor="end" font-size="12" font-weight="600" fill="${t.muted}">${esc(p.link)}</text>
  <text x="28" y="74" font-size="23" font-weight="800" fill="${t.text}" letter-spacing="-.4">${esc(p.title)}</text>
</g>
<g class="up" style="animation-delay:.12s">${desc}</g>
<g class="up" style="animation-delay:.24s">${stack}</g>
${metrics}
</svg>`;
}

// ------------------------------------------------------------------ connect buttons
const BUTTONS = [
  {
    file: "btn-linkedin", label: "LinkedIn", sub: "in/anwar-sadath", color: "#0a66c2",
    icon: (c) => `<rect x="0" y="0" width="20" height="20" rx="4" fill="${c}"/><text x="10" y="15" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">in</text>`,
  },
  {
    file: "btn-email", label: "Email", sub: "anwaranu633@gmail.com", color: "#ea4335",
    icon: (c) => `<rect x="0" y="3" width="20" height="14" rx="3" stroke="${c}" stroke-width="2"/><path d="M1 5l9 6 9-6" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    file: "btn-portfolio", label: "Portfolio", sub: "anwarsadath.vercel.app", color: null,
    icon: (c) => `<circle cx="10" cy="10" r="9" stroke="${c}" stroke-width="2"/><ellipse cx="10" cy="10" rx="4" ry="9" stroke="${c}" stroke-width="1.6"/><path d="M1 10h18" stroke="${c}" stroke-width="1.6"/>`,
  },
];

function button(b, t, idx) {
  const W = 284, H = 64, id = "b" + idx;
  const c = b.color || t.a1;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="${esc(b.label)}">
<defs>${defs(t, id)}</defs>
<style>${baseStyle}</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="14" fill="url(#${id}card)" stroke="${t.border}"/>
<rect x="18" y="16" width="32" height="32" rx="9" fill="${c}" fill-opacity=".14"/>
<g transform="translate(24 22)">${b.icon(c)}</g>
<text x="64" y="29" font-size="14.5" font-weight="700" fill="${t.text}">${esc(b.label)}</text>
<text x="64" y="47" font-size="12" fill="${t.muted}">${esc(b.sub)}</text>
<path d="M${W - 34} 26l6 6-6 6" stroke="${t.dim}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}


// ------------------------------------------------------------------ about card
function about(t) {
  const W = 880, H = 276, id = "a";
  const facts = [
    ["ROLE", "Software Engineer @ ThinkerNational", t.a1],
    ["BASED IN", "Bengaluru, India", t.a2],
    ["EXPERIENCE", "4+ yrs building · 2+ yrs full-time", t.a3],
    ["FOCUS", "Multi-tenant SaaS · CRMs · EdTech", t.a1],
    ["CURRENTLY", "Scaling a CRM to 800+ leads/day", t.a2],
    ["EXPLORING", "LLM APIs · agentic workflows", t.a3],
  ];
  const fx = 470, fy = 42, rowH = 36;
  let rows = "";
  facts.forEach(([k, v, c], i) => {
    const y = fy + i * rowH;
    rows += `<g class="up" style="animation-delay:${0.15 + i * 0.07}s">
  <rect x="${fx}" y="${y}" width="3" height="26" rx="1.5" fill="${c}"/>
  <text x="${fx + 16}" y="${y + 10}" font-size="9.5" font-weight="700" letter-spacing="1.6" fill="${t.dim}">${k}</text>
  <text x="${fx + 16}" y="${y + 25}" font-size="13.5" font-weight="600" fill="${t.text}">${esc(v)}</text>
</g>`;
  });
  const para = [
    "I'm a full stack engineer who likes turning messy",
    "business workflows into fast, reliable products.",
    "Lately that means multi-tenant CRMs with strict",
    "data isolation, lead pipelines on Redis queues and",
    "WhatsApp / SMS integrations used by 1,100+ people.",
  ];
  const loves = ["clean data models", "fast queries", "boring deploys"];
  let lx = 36, chips = "";
  loves.forEach((l, i) => { const c = chip(t, lx, 222, l, [t.a1, t.a2, t.a3][i]); chips += c.svg; lx += c.w + 8; });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="About Anwar Sadath">
<defs>${defs(t, id)}
  <radialGradient id="${id}glow" cx="0" cy="0" r="0.8"><stop offset="0" stop-color="${t.a2}" stop-opacity=".16"/><stop offset="1" stop-color="${t.a2}" stop-opacity="0"/></radialGradient>
</defs>
<style>${baseStyle}</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="url(#${id}card)" stroke="${t.border}"/>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="url(#${id}glow)"/>
<g class="up">
  <text x="36" y="58" font-size="26" font-weight="800" fill="${t.text}" letter-spacing="-.5">Hi, I'm <tspan fill="url(#${id}acc)">Anwar</tspan></text>
</g>
<g class="up" style="animation-delay:.1s">${para.map((l, i) => `<text x="36" y="${92 + i * 22}" font-size="14" fill="${t.muted}">${esc(l)}</text>`).join("")}</g>
<g class="up" style="animation-delay:.25s">${chips}</g>
<line x1="440" y1="36" x2="440" y2="${H - 36}" stroke="${t.border}"/>
${rows}
</svg>`;
}

// ------------------------------------------------------------------ footer
function footer(t) {
  const W = 880, H = 120, id = "f";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="Thanks for visiting">
<defs>${defs(t, id)}</defs>
<style>${baseStyle}
  .w1{animation:w 9s linear infinite}.w2{animation:w 13s linear infinite reverse}
  @keyframes w{to{transform:translateX(-440px)}}
</style>
<g opacity=".55">
  <path class="w1" d="M0 70 Q110 40 220 70 T440 70 T660 70 T880 70 T1100 70 T1320 70 V120 H0Z" fill="${t.a1}" fill-opacity=".18"/>
  <path class="w2" d="M0 84 Q110 104 220 84 T440 84 T660 84 T880 84 T1100 84 T1320 84 V120 H0Z" fill="${t.a2}" fill-opacity=".18"/>
</g>
<text x="${W / 2}" y="42" text-anchor="middle" font-size="16" font-weight="700" fill="${t.text}">Thanks for stopping by — let's build something great.</text>
</svg>`;
}

// ------------------------------------------------------------------ write
for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(`${OUT}/header-${name}.svg`, header(t));
  writeFileSync(`${OUT}/footer-${name}.svg`, footer(t));
  writeFileSync(`${OUT}/about-${name}.svg`, about(t));
  PROJECTS.forEach((p, i) => writeFileSync(`${OUT}/${p.file}-${name}.svg`, projectCard(p, t, i)));
  BUTTONS.forEach((b, i) => writeFileSync(`${OUT}/${b.file}-${name}.svg`, button(b, t, i)));
}
console.log("assets written");
