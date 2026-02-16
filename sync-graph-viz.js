#!/usr/bin/env node
// 同步 graph.json → memory-graph/graph-data.js
// 2D 和 3D 都通过 <script src="graph-data.js"> 引用同一份数据
// 用法: node sync-graph-viz.js
const fs = require('fs');
const path = require('path');

const GRAPH = path.join('/Users/kenefe/clawd/memory/graph.json');
const OUT = path.join(__dirname, 'graph-data.js');

const graph = JSON.parse(fs.readFileSync(GRAPH, 'utf8'));
fs.writeFileSync(OUT, 'const graphData = ' + JSON.stringify(graph) + ';\n');
console.log(`✅ Synced graph-data.js: ${Object.keys(graph.nodes).length} nodes, ${graph.edges.length} edges`);
