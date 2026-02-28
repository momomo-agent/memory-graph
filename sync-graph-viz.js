#!/usr/bin/env node
// 同步 graph.json → memory-graph/graph-data.js
// 2D 和 3D 都通过 <script src="graph-data.js"> 引用同一份数据
// 用法: node sync-graph-viz.js
const fs = require('fs');
const path = require('path');

const GRAPH = path.join('/Users/kenefe/clawd/memory/graph.json');
const CHANGELOG = path.join('/Users/kenefe/clawd/memory/graph-changelog.jsonl');
const OUT = path.join(__dirname, 'graph-data.js');

const graph = JSON.parse(fs.readFileSync(GRAPH, 'utf8'));

// Sync changelog (last 50 entries)
let changelog = [];
if (fs.existsSync(CHANGELOG)) {
  const lines = fs.readFileSync(CHANGELOG, 'utf8').trim().split('\n').filter(Boolean);
  changelog = lines.slice(-50).map(l => { try { return JSON.parse(l); } catch(e) { return null; } }).filter(Boolean);
}

// Extract today's activated nodes/edges from changelog
const todayStart = new Date(); todayStart.setHours(0,0,0,0);
const todayISO = todayStart.toISOString();
const activeNodes = new Set();
const activeEdges = new Set();
for (const entry of changelog) {
  if (entry.ts >= todayISO) {
    (entry.nodes || []).forEach(n => activeNodes.add(n));
    (entry.edges || []).forEach(e => activeEdges.add(e));
  }
}

// Load UMAP positions if available
let embPositions = {};
const UMAP_PATH = path.join(__dirname, 'graph-data-emb.json');
try {
  if (fs.existsSync(UMAP_PATH)) {
    embPositions = JSON.parse(fs.readFileSync(UMAP_PATH, 'utf8'));
  }
} catch(e) {}

fs.writeFileSync(OUT, 'const graphData = ' + JSON.stringify(graph) + ';\nconst graphChangelog = ' + JSON.stringify(changelog) + ';\nconst todayActive = ' + JSON.stringify({ nodes: [...activeNodes], edges: [...activeEdges] }) + ';\nconst embPositions = ' + JSON.stringify(embPositions) + ';\n');
console.log(`✅ Synced graph-data.js: ${Object.keys(graph.nodes).length} nodes, ${graph.edges.length} edges, ${changelog.length} changelog entries`);

// Auto cache-bust: update graph-data.js version in HTML files
const ts = Math.floor(Date.now() / 1000);
for (const htmlFile of ['index-3d.html', 'index.html']) {
  const hp = path.join(__dirname, htmlFile);
  if (fs.existsSync(hp)) {
    let html = fs.readFileSync(hp, 'utf8');
    html = html.replace(/graph-data\.js\?v=\d+/, `graph-data.js?v=${ts}`);
    fs.writeFileSync(hp, html);
  }
}

// Auto git push (best-effort, non-blocking)
const { execSync } = require('child_process');
try {
  execSync('git checkout main 2>/dev/null; git add graph-data.js && git diff --cached --quiet || (git commit -m "auto-sync graph" && git push)', { cwd: __dirname, timeout: 15000, stdio: 'pipe' });
  console.log('✅ Pushed to GitHub');
} catch(e) {
  console.log('⚠️ Git push skipped:', e.message?.split('\n')[0]);
}
