#!/usr/bin/env node
// 同步 graph.json → memory-graph/index.html
// 用法: node sync-graph-viz.js
const fs = require('fs');
const path = require('path');

const GRAPH = path.join('/Users/kenefe/clawd/memory/graph.json');
const TEMPLATE = path.join(__dirname, 'index.html');

const graph = JSON.parse(fs.readFileSync(GRAPH, 'utf8'));
let html = fs.readFileSync(TEMPLATE, 'utf8');

// 替换内嵌数据（用标记定位，不依赖 JSON 内容匹配）
const startMarker = 'const graphData = ';
const endMarker = '\n// === COLOR MAP ===';
const si = html.indexOf(startMarker);
const ei = html.indexOf(endMarker);
if (si === -1 || ei === -1) {
  console.error('❌ Markers not found in index.html');
  process.exit(1);
}
html = html.slice(0, si) + startMarker + JSON.stringify(graph) + ';' + html.slice(ei);

fs.writeFileSync(TEMPLATE, html);
console.log(`✅ Synced: ${Object.keys(graph.nodes).length} nodes, ${graph.edges.length} edges`);
