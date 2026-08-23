<template>
  <canvas ref="canvasEl" class="particle-canvas" aria-hidden="true"></canvas>
</template>

<script setup>
// 全屏 Three.js 粒子波背景：极简点阵随正弦波缓慢起伏，鼠标视差
// - 跟随明暗主题切换粒子颜色
// - prefers-reduced-motion 时仅渲染静态帧
// - 标签页隐藏时暂停渲染循环，DPR 上限 2，卸载时完整释放 GPU 资源
import { ref, onMounted, onUnmounted } from 'vue';

const canvasEl = ref(null);
let THREE, renderer, scene, camera, points, geo, mat, rafId, resizeHandler, themeObserver, visHandler;
let mouseX = 0, mouseY = 0, t = 0;

const COLS = 72;
const ROWS = 40;
const GAP = 0.42;

function particleColor() {
  const dark = document.documentElement.getAttribute('data-theme') !== 'light';
  return dark ? 0x8ea2ff : 0x3a4a8c;
}

function onPointer(e) {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
}

// 同步注册卸载钩子（await 之后注册生命周期会丢失上下文）
onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId);
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  window.removeEventListener('pointermove', onPointer);
  if (visHandler) document.removeEventListener('visibilitychange', visHandler);
  if (themeObserver) themeObserver.disconnect();
  if (geo) geo.dispose();
  if (mat) mat.dispose();
  if (renderer) renderer.dispose();
});

onMounted(async () => {
  // 动态导入 three，拆成异步 chunk，不拖慢首屏主包
  THREE = await import('three');
  const canvas = canvasEl.value;
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 3.2, 9);
  camera.lookAt(0, 0, 0);

  const count = COLS * ROWS;
  const positions = new Float32Array(count * 3);
  const base = new Float32Array(count * 3);
  let i = 0;
  for (let x = 0; x < COLS; x++) {
    for (let z = 0; z < ROWS; z++) {
      const px = (x - COLS / 2) * GAP;
      const pz = (z - ROWS / 2) * GAP;
      base[i * 3] = px;
      base[i * 3 + 1] = 0;
      base[i * 3 + 2] = pz;
      positions[i * 3] = px;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = pz;
      i++;
    }
  }
  geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  mat = new THREE.PointsMaterial({
    color: particleColor(),
    size: 0.035,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  points = new THREE.Points(geo, mat);
  points.position.y = -2.4;
  scene.add(points);

  const posAttr = geo.getAttribute('position');
  function tick() {
    t += 0.012;
    for (let j = 0; j < count; j++) {
      const bx = base[j * 3];
      const bz = base[j * 3 + 2];
      posAttr.array[j * 3 + 1] =
        Math.sin(bx * 0.55 + t) * 0.32 + Math.cos(bz * 0.5 + t * 0.8) * 0.28;
    }
    posAttr.needsUpdate = true;
    // 鼠标视差：相机轻微跟随
    camera.position.x += (mouseX * 1.1 - camera.position.x) * 0.04;
    camera.position.y += (3.2 + mouseY * 0.6 - camera.position.y) * 0.04;
    camera.lookAt(0, -1.4, 0);
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    t = 2; // 静态但有波形的一帧
    for (let j = 0; j < count; j++) {
      const bx = base[j * 3];
      const bz = base[j * 3 + 2];
      posAttr.array[j * 3 + 1] =
        Math.sin(bx * 0.55 + t) * 0.32 + Math.cos(bz * 0.5 + t * 0.8) * 0.28;
    }
    posAttr.needsUpdate = true;
    renderer.render(scene, camera);
  } else {
    rafId = requestAnimationFrame(tick);
  }

  window.addEventListener('pointermove', onPointer, { passive: true });

  resizeHandler = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', resizeHandler);

  // 主题切换：换粒子颜色
  themeObserver = new MutationObserver(() => mat.color.setHex(particleColor()));
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  // 隐藏标签页时暂停
  visHandler = () => {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId), (rafId = null);
    } else if (!reduced && !rafId) {
      rafId = requestAnimationFrame(tick);
    }
  };
  document.addEventListener('visibilitychange', visHandler);
});
</script>

<style scoped>
.particle-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.5;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, transparent 78%);
  -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, transparent 78%);
}
[data-theme='light'] .particle-canvas {
  opacity: 0.35;
}
</style>
