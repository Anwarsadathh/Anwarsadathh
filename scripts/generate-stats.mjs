// Generates accurate GitHub stats SVGs straight from GitHub's GraphQL API.
// Numbers come from the same contribution calendar GitHub shows on the profile,
// so they match exactly (private contributions included when the token allows).
//
// Usage:  GH_TOKEN=xxx GH_USER=Anwarsadathh node scripts/generate-stats.mjs [outDir]
//         node scripts/generate-stats.mjs dist --mock   (preview with sample data)

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "dist";
const MOCK = process.argv.includes("--mock");
const USER = process.env.GH_USER || "Anwarsadathh";
const TOKEN = process.env.GH_TOKEN;
const EXCLUDE_LANGS = (process.env.EXCLUDE_LANGS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

// ---------------------------------------------------------------- data

async function gql(query, variables = {}) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": "profile-stats" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

async function fetchData() {
  const base = await gql(
    `query($login:String!){ user(login:$login){
        name createdAt
        followers { totalCount }
        pullRequests { totalCount }
        issues { totalCount }
        contributionsCollection { contributionYears }
      } }`,
    { login: USER }
  );
  const u = base.user;

  // repositories (paginated) for stars + languages
  let repos = [], cursor = null;
  do {
    const d = await gql(
      `query($login:String!,$after:String){ user(login:$login){
          repositories(first:100, after:$after, ownerAffiliations:OWNER, isFork:false){
            totalCount pageInfo{ hasNextPage endCursor }
            nodes{ stargazerCount languages(first:10, orderBy:{field:SIZE,direction:DESC}){ edges{ size node{ name color } } } }
          } } }`,
      { login: USER, after: cursor }
    );
    const r = d.user.repositories;
    repos = repos.concat(r.nodes);
    cursor = r.pageInfo.hasNextPage ? r.pageInfo.endCursor : null;
    u.repoCount = r.totalCount;
  } while (cursor);

  // every contribution year → calendar days + per-type totals
  const totals = { commits: 0, prs: 0, reviews: 0, issues: 0, restricted: 0, all: 0 };
  const days = [];
  for (const year of u.contributionsCollection.contributionYears) {
    const from = `${year}-01-01T00:00:00Z`, to = `${year}-12-31T23:59:59Z`;
    const d = await gql(
      `query($login:String!,$from:DateTime!,$to:DateTime!){ user(login:$login){
          contributionsCollection(from:$from,to:$to){
            totalCommitContributions totalPullRequestContributions totalPullRequestReviewContributions
            totalIssueContributions restrictedContributionsCount
            contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount } } }
          } } }`,
      { login: USER, from, to }
    );
    const c = d.user.contributionsCollection;
    totals.commits += c.totalCommitContributions;
    totals.prs += c.totalPullRequestContributions;
    totals.reviews += c.totalPullRequestReviewContributions;
    totals.issues += c.totalIssueContributions;
    totals.restricted += c.restrictedContributionsCount;
    totals.all += c.contributionCalendar.totalContributions;
    for (const w of c.contributionCalendar.weeks) for (const day of w.contributionDays) days.push(day);
  }

  const langMap = new Map();
  for (const r of repos)
    for (const e of r.languages.edges) {
      if (EXCLUDE_LANGS.includes(e.node.name.toLowerCase())) continue;
      const cur = langMap.get(e.node.name) || { name: e.node.name, color: e.node.color || "#8b949e", size: 0 };
      cur.size += e.size;
      langMap.set(e.node.name, cur);
    }

  return {
    createdAt: u.createdAt,
    followers: u.followers.totalCount,
    repos: u.repoCount,
    stars: repos.reduce((s, r) => s + r.stargazerCount, 0),
    totals,
    days,
    langs: [...langMap.values()],
  };
}

function mockData() {
  const days = [];
  const start = new Date("2022-08-06T00:00:00Z");
  const today = new Date();
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    const r = rnd();
    days.push({ date: d.toISOString().slice(0, 10), contributionCount: r < 0.35 ? 0 : Math.floor(r * 9) });
  }
  const all = days.reduce((s, d) => s + d.contributionCount, 0);
  return {
    createdAt: "2022-08-06T00:00:00Z", followers: 12, repos: 48, stars: 9,
    totals: { commits: Math.round(all * 0.86), prs: 41, reviews: 17, issues: 6, restricted: 0, all },
    days,
    langs: [
      { name: "TypeScript", color: "#3178c6", size: 420 }, { name: "JavaScript", color: "#f1e05a", size: 380 },
      { name: "Handlebars", color: "#f7931e", size: 300 }, { name: "CSS", color: "#563d7c", size: 150 },
      { name: "HTML", color: "#e34c26", size: 40 }, { name: "SCSS", color: "#c6538c", size: 25 }, { name: "EJS", color: "#a91e50", size: 7 },
    ],
  };
}

// ---------------------------------------------------------------- analysis

function analyse(data) {
  const days = [...data.days].sort((a, b) => a.date.localeCompare(b.date));
  const todayStr = new Date().toISOString().slice(0, 10);
  const past = days.filter((d) => d.date <= todayStr);

  // longest streak
  let longest = { len: 0, start: null, end: null }, run = 0, runStart = null;
  for (const d of past) {
    if (d.contributionCount > 0) {
      if (run === 0) runStart = d.date;
      run++;
      if (run > longest.len) longest = { len: run, start: runStart, end: d.date };
    } else run = 0;
  }
  // current streak (today may still be empty — that doesn't break the streak yet)
  let i = past.length - 1;
  if (i >= 0 && past[i].contributionCount === 0 && past[i].date === todayStr) i--;
  let current = { len: 0, start: null, end: null };
  for (; i >= 0 && past[i].contributionCount > 0; i--) {
    current.len++;
    current.start = past[i].date;
    if (!current.end) current.end = past[i].date;
  }

  // last 365 days + 12 monthly buckets
  const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const lastYear = past.filter((d) => d.date > yearAgo).reduce((s, d) => s + d.contributionCount, 0);
  const now = new Date();
  const months = [];
  for (let m = 11; m >= 0; m--) {
    const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 1));
    const key = dt.toISOString().slice(0, 7);
    months.push({
      key,
      label: dt.toLocaleString("en", { month: "short", timeZone: "UTC" }),
      count: past.filter((d) => d.date.startsWith(key)).reduce((s, d) => s + d.contributionCount, 0),
    });
  }
  const firstActive = past.find((d) => d.contributionCount > 0)?.date || data.createdAt.slice(0, 10);
  const bestDay = past.reduce((b, d) => (d.contributionCount > b.contributionCount ? d : b), { contributionCount: 0, date: "" });

  const totalSize = data.langs.reduce((s, l) => s + l.size, 0) || 1;
  const sorted = [...data.langs].sort((a, b) => b.size - a.size);
  const top = sorted.slice(0, 7).map((l) => ({ ...l, pct: (l.size / totalSize) * 100 }));
  const rest = sorted.slice(7).reduce((s, l) => s + l.size, 0);
  if (rest > 0) top.push({ name: "Other", color: "#6b7280", pct: (rest / totalSize) * 100 });

  return { ...data, current, longest, lastYear, months, firstActive, bestDay, langsTop: top };
}

// ---------------------------------------------------------------- rendering

const THEMES = {
  dark: {
    bg1: "#0b1120", bg2: "#111a2e", border: "#1e2a44", text: "#e6edf7", muted: "#8a97b0", faint: "#1a2540",
    tile: "#0f1729", tileBorder: "#1c2842", a1: "#22d3ee", a2: "#a78bfa", a3: "#34d399", grid: "#17223a",
    barLo: "#0e7490", barHi: "#67e8f9", barNowLo: "#059669", barNowHi: "#6ee7b7", track: "#121b2f",
  },
  light: {
    bg1: "#ffffff", bg2: "#f5f8ff", border: "#dfe6f3", text: "#0f172a", muted: "#5b6b86", faint: "#e8eef9",
    tile: "#ffffff", tileBorder: "#e3e9f5", a1: "#0891b2", a2: "#7c3aed", a3: "#059669", grid: "#edf1f8",
    barLo: "#0891b2", barHi: "#67e8f9", barNowLo: "#059669", barNowHi: "#34d399", track: "#eef3fa",
  },
};

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Ubuntu, Arial, sans-serif`;
const MONO = `'SF Mono', 'JetBrains Mono', Consolas, 'Liberation Mono', Menlo, monospace`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (n) => n.toLocaleString("en-US");
const fmtDate = (s, withYear = true) =>
  s ? new Date(s + "T00:00:00Z").toLocaleString("en", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" }) : "—";

// simple inline icons (16x16 paths, octicons-style)
const ICONS = {
  commit: "M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z",
  pr: "M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z",
  review: "M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z",
  issue: "M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z",
  repo: "M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z",
  star: "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z",
  flame: "M9.533.753V.752c.217 2.385 1.463 3.626 2.653 4.81C13.37 6.74 14.498 7.863 14.498 10c0 3.197-2.293 6-6.5 6-4.206 0-6.5-2.803-6.5-6 0-1.472.648-2.753 1.44-3.63.34-.377.953-.188 1.07.308.124.52.297 1.011.535 1.42.117.2.43.155.483-.07.345-1.476.905-3.24 2.072-4.483 1.12-1.192 2.508-2.004 4.003-2.773.358-.184.863.062.933.494Z",
};

function svgShell(t, w, h, body, id) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img" aria-labelledby="${id}-t">
<title id="${id}-t">GitHub stats for ${esc(USER)}</title>
<defs>
  <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
  <linearGradient id="${id}-acc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.a1}"/><stop offset="0.55" stop-color="${t.a2}"/><stop offset="1" stop-color="${t.a3}"/></linearGradient>
  <linearGradient id="${id}-bar" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${t.barLo}"/><stop offset="1" stop-color="${t.barHi}"/></linearGradient>
  <linearGradient id="${id}-now" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${t.barNowLo}"/><stop offset="1" stop-color="${t.barNowHi}"/></linearGradient>
  <radialGradient id="${id}-glow" cx="0.12" cy="0" r="0.7"><stop offset="0" stop-color="${t.a1}" stop-opacity="0.14"/><stop offset="1" stop-color="${t.a1}" stop-opacity="0"/></radialGradient>
</defs>
<style>
  text{font-family:${FONT}}
  .mono{font-family:${MONO}}
  .fade{animation:fade .7s ease-out backwards}
  .grow{transform-box:fill-box;transform-origin:50% 100%;animation:grow .9s cubic-bezier(.2,.8,.2,1) backwards}
  .ring{animation:ring 1.4s cubic-bezier(.2,.8,.2,1) backwards}
  @keyframes fade{from{opacity:0}}
  @keyframes grow{from{transform:scaleY(0)}}
  @media (prefers-reduced-motion:reduce){.fade,.grow,.ring{animation:none}}
  @keyframes ring{from{stroke-dashoffset:var(--c)}}
</style>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="16" fill="url(#${id}-bg)" stroke="${t.border}"/>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="16" fill="url(#${id}-glow)"/>
${body}
</svg>`;
}

function ring(t, cx, cy, value, max, label, sub, color, delay) {
  const r = 34, c = 2 * Math.PI * r;
  const frac = Math.max(0.04, Math.min(1, max ? value / max : 0));
  return `<g class="fade" style="animation-delay:${delay}s">
  <circle cx="${cx}" cy="${cy}" r="${r}" stroke="${t.faint}" stroke-width="7"/>
  <circle class="ring" cx="${cx}" cy="${cy}" r="${r}" stroke="${color}" stroke-width="7" stroke-linecap="round"
    stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - frac)).toFixed(1)}" style="--c:${c.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>
  <text x="${cx}" y="${cy + 2}" text-anchor="middle" font-size="24" font-weight="800" fill="${t.text}">${fmt(value)}</text>
  <text x="${cx}" y="${cy + 17}" text-anchor="middle" font-size="9.5" font-weight="600" fill="${t.muted}" letter-spacing="1">DAYS</text>
  <text x="${cx}" y="${cy + 58}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${t.text}">${esc(label)}</text>
  <text x="${cx}" y="${cy + 75}" text-anchor="middle" font-size="11" fill="${t.muted}">${esc(sub)}</text>
</g>`;
}

function renderOverview(s, t, id) {
  const W = 880, H = 430;
  let b = "";

  // hero number
  b += `<g class="fade" style="animation-delay:.05s">
  <text x="36" y="52" font-size="11.5" font-weight="700" fill="${t.muted}" letter-spacing="2.2">TOTAL CONTRIBUTIONS</text>
  <text x="34" y="112" font-size="64" font-weight="800" fill="url(#${id}-acc)" letter-spacing="-2">${fmt(s.totals.all)}</text>
  <text x="36" y="140" font-size="13.5" fill="${t.muted}">since <tspan fill="${t.text}" font-weight="600">${fmtDate(s.firstActive)}</tspan>  ·  <tspan fill="${t.text}" font-weight="600">${fmt(s.lastYear)}</tspan> in the last 12 months</text>
</g>`;

  // streak rings
  const max = Math.max(s.longest.len, 1);
  const curSub = s.current.len ? `${fmtDate(s.current.start, false)} – ${fmtDate(s.current.end, false)}` : "start one today";
  const longSub = s.longest.len ? `${fmtDate(s.longest.start, false)} – ${fmtDate(s.longest.end, false)}` : "—";
  b += ring(t, 610, 72, s.current.len, max, "Current streak", curSub, t.a3, 0.2);
  b += ring(t, 780, 72, s.longest.len, max, "Longest streak", longSub, t.a2, 0.3);

  // divider
  b += `<line x1="36" y1="178" x2="${W - 36}" y2="178" stroke="${t.border}"/>`;

  // monthly bars
  const cx0 = 36, cw = W - 72, chartTop = 214, chartH = 92;
  const maxM = Math.max(...s.months.map((m) => m.count), 1);
  const slot = cw / s.months.length, bw = Math.min(38, slot - 18);
  b += `<text x="36" y="203" font-size="11.5" font-weight="700" fill="${t.muted}" letter-spacing="2.2">LAST 12 MONTHS</text>`;
  b += `<text x="${W - 36}" y="203" text-anchor="end" font-size="11.5" fill="${t.muted}">best day <tspan fill="${t.text}" font-weight="700">${fmt(s.bestDay.contributionCount)}</tspan> · ${fmtDate(s.bestDay.date)}</text>`;
  for (let g = 1; g <= 3; g++) {
    const y = chartTop + (chartH * g) / 3;
    b += `<line x1="${cx0}" y1="${y}" x2="${cx0 + cw}" y2="${y}" stroke="${t.grid}" stroke-dasharray="3 5"/>`;
  }
  s.months.forEach((m, i) => {
    const h = Math.max(3, (m.count / maxM) * (chartH - 14));
    const x = cx0 + i * slot + (slot - bw) / 2, y = chartTop + chartH - h;
    const cur = i === s.months.length - 1;
    b += `<rect x="${x.toFixed(1)}" y="${chartTop}" width="${bw.toFixed(1)}" height="${chartH}" rx="6" fill="${t.track}"/>`;
    b += `<rect class="grow" style="animation-delay:${0.35 + i * 0.05}s" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="6" fill="url(#${id}-${cur ? "now" : "bar"})"/>`;
    b += `<text class="fade" style="animation-delay:${0.6 + i * 0.05}s" x="${(x + bw / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="700" fill="${t.text}">${m.count ? fmt(m.count) : ""}</text>`;
    b += `<text x="${(x + bw / 2).toFixed(1)}" y="${chartTop + chartH + 18}" text-anchor="middle" font-size="11" font-weight="${cur ? 700 : 400}" fill="${cur ? t.a3 : t.muted}">${m.label}</text>`;
  });

  // tiles
  const tiles = [
    ["commit", "Commits", s.totals.commits, t.a1],
    ["pr", "Pull requests", s.totals.prs, t.a2],
    ["review", "Code reviews", s.totals.reviews, t.a3],
    ["issue", "Issues", s.totals.issues, t.a1],
    ["repo", "Repositories", s.repos, t.a2],
    ["star", "Stars earned", s.stars, t.a3],
  ];
  const ty = 348, gap = 10, tw = (cw - gap * (tiles.length - 1)) / tiles.length, th = 58;
  tiles.forEach(([ic, label, val, col], i) => {
    const x = cx0 + i * (tw + gap);
    b += `<g class="fade" style="animation-delay:${0.9 + i * 0.07}s">
  <rect x="${x.toFixed(1)}" y="${ty}" width="${tw.toFixed(1)}" height="${th}" rx="11" fill="${t.tile}" stroke="${t.tileBorder}"/>
  <g transform="translate(${(x + 14).toFixed(1)} ${ty + 13}) scale(0.8)"><path d="${ICONS[ic]}" fill="${col}"/></g>
  <text x="${(x + 33).toFixed(1)}" y="${ty + 23.5}" font-size="11" font-weight="600" fill="${t.muted}">${label}</text>
  <text x="${(x + 14).toFixed(1)}" y="${ty + 46}" font-size="19" font-weight="800" fill="${t.text}">${fmt(val)}</text>
</g>`;
  });

  b += `<text x="${W - 36}" y="${H - 8}" text-anchor="end" font-size="9.5" fill="${t.muted}" opacity="0.7">updated ${new Date().toISOString().slice(0, 10)} · all-time, all years</text>`;
  return svgShell(t, W, H, b, id);
}

function renderLangs(s, t, id) {
  const W = 880, langs = s.langsTop;
  const rows = Math.ceil(langs.length / 4);
  const H = 118 + rows * 28;
  let b = `<text x="36" y="44" font-size="11.5" font-weight="700" fill="${t.muted}" letter-spacing="2.2">MOST USED LANGUAGES</text>
<text x="${W - 36}" y="44" text-anchor="end" font-size="11.5" fill="${t.muted}">by code size across ${fmt(s.repos)} repositories</text>`;
  const bx = 36, bw = W - 72, by = 62, bh = 14;
  b += `<clipPath id="${id}-clip"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="7"/></clipPath><g clip-path="url(#${id}-clip)">`;
  let x = bx;
  langs.forEach((l, i) => {
    const w = (l.pct / 100) * bw;
    b += `<rect class="fade" style="animation-delay:${0.1 + i * 0.08}s" x="${x.toFixed(2)}" y="${by}" width="${(w + 0.6).toFixed(2)}" height="${bh}" fill="${l.color}"/>`;
    x += w;
  });
  b += `</g>`;
  const colW = bw / 4;
  langs.forEach((l, i) => {
    const cx = bx + (i % 4) * colW, cy = by + 44 + Math.floor(i / 4) * 28;
    b += `<g class="fade" style="animation-delay:${0.4 + i * 0.06}s">
  <circle cx="${cx + 6}" cy="${cy - 4}" r="5.5" fill="${l.color}"/>
  <text x="${cx + 20}" y="${cy}" font-size="13" font-weight="600" fill="${t.text}">${esc(l.name)}</text>
  <text x="${cx + colW - 16}" y="${cy}" text-anchor="end" font-size="12.5" fill="${t.muted}" class="mono">${l.pct.toFixed(1)}%</text>
</g>`;
  });
  return svgShell(t, W, H, b, id);
}

// ---------------------------------------------------------------- main

const raw = MOCK ? mockData() : await fetchData();
const stats = analyse(raw);
mkdirSync(OUT, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(join(OUT, `stats-${name}.svg`), renderOverview(stats, t, `o${name[0]}`));
  writeFileSync(join(OUT, `langs-${name}.svg`), renderLangs(stats, t, `l${name[0]}`));
}
writeFileSync(join(OUT, "stats.json"), JSON.stringify({ ...stats, days: undefined }, null, 2));
console.log(`total ${stats.totals.all} | last year ${stats.lastYear} | streak ${stats.current.len}/${stats.longest.len} | commits ${stats.totals.commits}`);
