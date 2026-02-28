#!/usr/bin/env node
// compute-layout.js — 用 UMAP 把图谱向量降维到 3D 坐标
// 优先从 SQLite 读 embeddings，fallback 到 graph-embeddings.json

const fs = require('fs');
const path = require('path');
const { UMAP } = require('umap-js');

const DB_PATH = path.join(__dirname, '..', '..', '..', 'clawd', 'memory', 'graph.db');
const EMBED_PATH = path.join(__dirname, '..', '..', '..', 'clawd', 'memory', 'graph-embeddings.json');
const OUTPUT_PATH = path.join(__dirname, 'graph-data-emb.json');

async function main() {
  console.log('📦 加载嵌入...');
  
  let nodeIds = [];
  let vectors = [];

  // Try SQLite first (via graph-db.js)
  if (fs.existsSync(DB_PATH)) {
    const gdb = require('/Users/kenefe/clawd/memory/graph-db');
    const allEmb = gdb.getAllEmbeddings();
    for (const [id, vec] of Object.entries(allEmb)) {
      if (vec && vec.length > 0) {
        nodeIds.push(id);
        vectors.push(vec);
      }
    }
    console.log(`  SQLite: ${nodeIds.length} embeddings, ${vectors[0]?.length} dims`);
  } else if (fs.existsSync(EMBED_PATH)) {
    const embeddings = JSON.parse(fs.readFileSync(EMBED_PATH, 'utf8'));
    nodeIds = Object.keys(embeddings.vectors);
    vectors = nodeIds.map(id => embeddings.vectors[id]);
    console.log(`  JSON fallback: ${nodeIds.length} embeddings, ${embeddings.dims} dims`);
  } else {
    console.error('❌ No embedding source found');
    process.exit(1);
  }

  console.log(`🔄 UMAP 降维到 3D (${nodeIds.length} nodes)...`);
  const umap = new UMAP({
    nComponents: 3,
    nNeighbors: 8,
    minDist: 0.8,
    spread: 3.0,
    random: () => Math.random()
  });
  
  const coords3d = umap.fit(vectors);
  console.log('✅ 降维完成');

  // 归一化到 [-500, 500]
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

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(positions));
  console.log(`✅ 输出: ${OUTPUT_PATH} (${Object.keys(positions).length} positions)`);
}

main().catch(console.error);
