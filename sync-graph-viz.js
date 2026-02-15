#!/usr/bin/env node
// 同步 graph.json → memory-graph/index.html
// 用法: node sync-graph-viz.js
const fs = require('fs');
const path = require('path');

const GRAPH = path.join('/Users/kenefe/clawd/memory/graph.json');
const TEMPLATE = path.join(__dirname, 'index.html');

const graph = JSON.parse(fs.readFileSync(GRAPH, 'utf8'));
let html = fs.readFileSync(TEMPLATE, 'utf8');

// 替换内嵌数据
html = html.replace(
  /const graphData = \{.*?\};(\n\/\/ === COLOR MAP ===)/s,
  `const graphData = ${JSON.stringify(graph)};$1`
);

fs.writeFileSync(TEMPLATE, html);
console.log(`✅ Synced: ${Object.keys(graph.nodes).length} nodes, ${graph.edges.length} edges`);
