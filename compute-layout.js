#!/usr/bin/env node
// compute-layout.js — 用 UMAP 把图谱向量降维到 3D 坐标
// 用法: node compute-layout.js

const fs = require('fs');
const path = require('path');
const { UMAP } = require('umap-js');

const EMBED_PATH = path.join(__dirname, '..', '..', '..', 'clawd', 'memory', 'graph-embeddings.json');
const GRAPH_PATH = path.join(__dirname, '..', '..', '..', 'clawd', 'memory', 'graph.json');
const OUTPUT_PATH = path.join(__dirname, 'graph-data-emb.json');

async function main() {
  console.log('📦 加载嵌入...');
  const embeddings = JSON.parse(fs.readFileSync(EMBED_PATH, 'utf8'));
  const graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));
  
  const nodeIds = Object.keys(embeddings.vectors);
  const vectors = nodeIds.map(id => embeddings.vectors[id]);
  console.log(`📊 ${nodeIds.length} 个节点, ${embeddings.dims} 维`);

  console.log('🔄 UMAP 降维到 3D...');
  const umap = new UMAP({
    nComponents: 3,
    nNeighbors: 8,
    minDist: 0.8,
    spread: 3.0,
    random: () => Math.random()
  });
  
  const coords3d = umap.fit(vectors);
  console.log('✅ 降维完成');

  // 归一化到 [-500, 500] 范围
  const mins = [Infinity, Infinity, Infinity];
  const maxs = [-Infinity, -Infinity, -Infinity];
  for (const c of coords3d) {
    for (let i = 0; i < 3; i++) {
      mins[i] = Math.min(mins[i], c[i]);
      maxs[i] = Math.max(maxs[i], c[i]);
    }
  }
  const RANGE = 500;
  const positions = {};
  nodeIds.forEach((id, idx) => {
    positions[id] = {
      x: ((coords3d[idx][0] - mins[0]) / (maxs[0] - mins[0]) - 0.5) * 2 * RANGE,
      y: ((coords3d[idx][1] - mins[1]) / (maxs[1] - mins[1]) - 0.5) * 2 * RANGE,
      z: ((coords3d[idx][2] - mins[2]) / (maxs[2] - mins[2]) - 0.5) * 2 * RANGE
    };
  });

  // 构建输出：跟 graph-data.json 同结构但带预计算坐标
  const nodes = [];
  for (const [id, node] of Object.entries(graph.nodes)) {
    if (!positions[id]) continue;
    nodes.push({
      id,
      type: node.type || '',
      definition: node.definition || '',
      aliases: node.aliases || [],
      status: node.status || '',
      deploy: node.deploy || '',
      fx: positions[id].x,
      fy: positions[id].y,
      fz: positions[id].z
    });
  }

  const links = graph.edges
    .filter(e => positions[e.from] && positions[e.to])
    .map(e => ({ source: e.from, target: e.to, weight: e.w || 1 }));

  const clusters = graph.clusters || [];

  const output = { nodes, links, clusters };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output));
  console.log(`✅ 输出: ${OUTPUT_PATH}`);
  console.log(`   ${nodes.length} nodes, ${links.length} links`);
}

main().catch(console.error);
