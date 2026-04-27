// ===== 광합성 시뮬레이터 =====

// --- 상태 ---
let isRunning = false;
let animationId = null;
let lastTime = 0;
let speed = 1;
let simTime = 0;

// --- 파라미터 ---
let light = 70;      // 0-100
let co2 = 70;        // 0-100
let water = 70;      // 0-100

// --- 생성량 ---
let totalO2 = 0;
let totalGlucose = 0;
let o2History = [];
let glucoseHistory = [];

// --- 분자들 ---
const molecules = {
  lightPhotons: [],
  waterMolecules: [],
  co2Molecules: [],
  o2Molecules: [],
  atpParticles: [],
  glucoseParticles: []
};

// --- Canvas ---
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const graphCanvas = document.getElementById('graph-canvas');
const graphCtx = graphCanvas.getContext('2d');

// --- DOM 요소 ---
const lightSlider = document.getElementById('light-slider');
const co2Slider = document.getElementById('co2-slider');
const waterSlider = document.getElementById('water-slider');
const lightValue = document.getElementById('light-value');
const co2Value = document.getElementById('co2-value');
const waterValue = document.getElementById('water-value');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const speedSlider = document.getElementById('speed-slider');
const speedValue = document.getElementById('speed-value');
const stageName = document.getElementById('stage-name');
const o2Stat = document.getElementById('o2-stat');
const glucoseStat = document.getElementById('glucose-stat');

// --- 초기화 ---
function init() {
  resizeCanvas();
  resetSimulation();
  drawCell();
  drawGraph();
  
  // 이벤트 리스너
  lightSlider.addEventListener('input', (e) => {
    light = parseInt(e.target.value);
    lightValue.textContent = light + '%';
  });
  
  co2Slider.addEventListener('input', (e) => {
    co2 = parseInt(e.target.value);
    co2Value.textContent = co2 + '%';
  });
  
  waterSlider.addEventListener('input', (e) => {
    water = parseInt(e.target.value);
    waterValue.textContent = water + '%';
  });
  
  speedSlider.addEventListener('input', (e) => {
    const speeds = [0.25, 0.5, 1, 2, 3];
    speed = speeds[parseInt(e.target.value) - 1];
    speedValue.textContent = speed + 'x';
  });
  
  playBtn.addEventListener('click', startSimulation);
  pauseBtn.addEventListener('click', pauseSimulation);
  
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  ctx.scale(2, 2);
  
  const graphRect = graphCanvas.getBoundingClientRect();
  graphCanvas.width = graphRect.width * 2;
  graphCanvas.height = graphRect.height * 2;
  graphCtx.scale(2, 2);
}

// --- 시뮬레이션 ---
function resetSimulation() {
  simTime = 0;
  totalO2 = 0;
  totalGlucose = 0;
  o2History = [];
  glucoseHistory = [];
  molecules.lightPhotons = [];
  molecules.waterMolecules = [];
  molecules.co2Molecules = [];
  molecules.o2Molecules = [];
  molecules.atpParticles = [];
  molecules.glucoseParticles = [];
  updateStats();
}

function startSimulation() {
  if (!isRunning) {
    isRunning = true;
    playBtn.disabled = true;
    pauseBtn.disabled = false;
    lastTime = performance.now();
    animationId = requestAnimationFrame(animate);
  }
}

function pauseSimulation() {
  if (isRunning) {
    isRunning = false;
    playBtn.disabled = false;
    pauseBtn.disabled = true;
    cancelAnimationFrame(animationId);
  }
}

function animate(currentTime) {
  if (!isRunning) return;
  
  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;
  
  simTime += deltaTime * speed;
  
  updateSimulation(deltaTime);
  drawCell();
  updateStageIndicator();
  
  animationId = requestAnimationFrame(animate);
}

function updateSimulation(deltaTime) {
  const efficiency = (light / 100) * (co2 / 100) * (water / 100);
  const productionRate = efficiency * 10 * speed;
  
  // 광반응: 빛 → 산소 + ATP
  if (light > 10) {
    // 빛 광자 생성
    if (Math.random() < (light / 100) * 0.3) {
      molecules.lightPhotons.push({
        x: Math.random() * canvas.width / 2,
        y: 0,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 2 + 1,
        size: 8 + Math.random() * 4
      });
    }
    
    // 물 분자 생성
    if (Math.random() < (water / 100) * 0.2) {
      molecules.waterMolecules.push({
        x: Math.random() * (canvas.width / 2 - 100) + 50,
        y: canvas.height / 2 - 20,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 1.5,
        life: 1
      });
    }
    
    // 산소 방출
    if (Math.random() < productionRate * 0.02) {
      molecules.o2Molecules.push({
        x: canvas.width / 2 + Math.random() * 60 - 30,
        y: canvas.height / 2 - 50,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2 - 1,
        life: 1
      });
      totalO2 += 0.1 * efficiency;
    }
    
    // ATP 입자
    if (Math.random() < productionRate * 0.03) {
      molecules.atpParticles.push({
        x: canvas.width / 2 + Math.random() * 40 - 20,
        y: canvas.height / 2 - 30,
        vx: Math.random() * 2 - 1,
        vy: Math.random() * 1.5,
        life: 1
      });
    }
  }
  
  // 탄소동화: CO2 → 포도당
  if (co2 > 10) {
    if (Math.random() < (co2 / 100) * 0.15) {
      molecules.co2Molecules.push({
        x: canvas.width / 2 - 100 + Math.random() * 40 - 20,
        y: canvas.height / 2 + 30,
        vx: Math.random() * 1.5 + 0.5,
        vy: (Math.random() - 0.5) * 1,
        life: 1
      });
    }
    
    if (Math.random() < productionRate * 0.01 && light > 30) {
      molecules.glucoseParticles.push({
        x: canvas.width / 2 + 50,
        y: canvas.height / 2 + 50,
        vx: Math.random() * 1.5 + 0.5,
        vy: Math.random() * 1.5 + 0.5,
        life: 1
      });
      totalGlucose += 0.01 * efficiency;
    }
  }
  
  // 분자 업데이트
  updateMolecules(molecules.lightPhotons, deltaTime, true);
  updateMolecules(molecules.waterMolecules, deltaTime, true);
  updateMolecules(molecules.co2Molecules, deltaTime, true);
  updateMolecules(molecules.o2Molecules, deltaTime, false);
  updateMolecules(molecules.atpParticles, deltaTime, true);
  updateMolecules(molecules.glucoseParticles, deltaTime, false);
  
  // 그래프 업데이트
  if (simTime % 0.5 < deltaTime) {
    o2History.push(totalO2);
    glucoseHistory.push(totalGlucose);
    if (o2History.length > 50) o2History.shift();
    if (glucoseHistory.length > 50) glucoseHistory.shift();
    drawGraph();
  }
  
  updateStats();
}

function updateMolecules(arr, deltaTime, hasDecay) {
  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i];
    m.x += m.vx * speed * 60 * deltaTime;
    m.y += m.vy * speed * 60 * deltaTime;
    if (hasDecay) m.life -= deltaTime * 0.5;
    
    if (m.life <= 0 || m.x < 0 || m.x > canvas.width / 2 || m.y < 0 || m.y > canvas.height / 2) {
      arr.splice(i, 1);
    }
  }
}

// --- 그림 그리기 ---
function drawCell() {
  const w = canvas.width / 2;
  const h = canvas.height / 2;
  
  // 배경
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, '#87ceeb');
  gradient.addColorStop(0.7, '#98d8c8');
  gradient.addColorStop(1, '#4a7c59');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  
  // 햇살 효과
  if (light > 20) {
    ctx.globalAlpha = (light / 100) * 0.3;
    ctx.fillStyle = '#fff9c4';
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, 20 + Math.random() * 30, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  
  // 식물 세포 (큰 직사각형)
  const cellX = w * 0.3;
  const cellY = h * 0.25;
  const cellW = w * 0.5;
  const cellH = h * 0.6;
  
  // 세포벽
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 4;
  ctx.strokeRect(cellX, cellY, cellW, cellH);
  
  // 세포 내용물 (연한 초록)
  ctx.fillStyle = 'rgba(200, 230, 201, 0.6)';
  ctx.fillRect(cellX + 2, cellY + 2, cellW - 4, cellH - 4);
  
  // 핵
  ctx.fillStyle = '#8d6e63';
  ctx.beginPath();
  ctx.arc(cellX + cellW * 0.7, cellY + cellH * 0.3, 15, 0, Math.PI * 2);
  ctx.fill();
  
  // 엽록체들
  const chloroplasts = [
    { x: 0.3, y: 0.3 },
    { x: 0.5, y: 0.2 },
    { x: 0.7, y: 0.35 },
    { x: 0.25, y: 0.55 },
    { x: 0.55, y: 0.5 },
    { x: 0.75, y: 0.6 },
    { x: 0.35, y: 0.75 },
    { x: 0.6, y: 0.8 }
  ];
  
  chloroplasts.forEach(pos => {
    drawChloroplast(cellX + cellW * pos.x, cellY + cellH * pos.y);
  });
  
  // 분자 그리기
  drawMolecules();
  
  // 레이블
  ctx.fillStyle = '#1b5e20';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('식물 세포', cellX + cellW / 2 - 30, cellY - 8);
  ctx.fillText('엽록체', cellX + cellW * 0.35, cellY + cellH * 0.45);
}

function drawChloroplast(x, y) {
  ctx.fillStyle = '#4caf50';
  ctx.beginPath();
  ctx.ellipse(x, y, 18, 10, Math.PI * 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  // 내막 구조
  ctx.strokeStyle = '#2e7d32';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(x, y, 10 - i * 3, 6 - i, Math.PI * 0.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // 광흡수 효과
  if (light > 50) {
    ctx.globalAlpha = (light / 100) * 0.5;
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawMolecules() {
  const w = canvas.width / 2;
  const h = canvas.height / 2;
  
  // 빛 광자
  molecules.lightPhotons.forEach(m => {
    ctx.fillStyle = `rgba(255, 235, 59, ${m.life})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
    ctx.fill();
    
    // 광선
    ctx.strokeStyle = `rgba(255, 235, 59, ${m.life * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x + m.vx * 10, m.y + m.vy * 10);
    ctx.stroke();
  });
  
  // 물 분자
  molecules.waterMolecules.forEach(m => {
    ctx.fillStyle = `rgba(33, 150, 243, ${m.life})`;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('H₂O', m.x - 15, m.y);
  });
  
  // 이산화탄소
  molecules.co2Molecules.forEach(m => {
    ctx.fillStyle = `rgba(255, 152, 0, ${m.life})`;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('CO₂', m.x - 15, m.y);
  });
  
  // 산소
  molecules.o2Molecules.forEach(m => {
    ctx.fillStyle = `rgba(76, 175, 80, ${m.life})`;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('O₂ ↑', m.x - 15, m.y);
  });
  
  // ATP
  molecules.atpParticles.forEach(m => {
    ctx.fillStyle = `rgba(233, 30, 99, ${m.life})`;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('ATP', m.x - 15, m.y);
  });
  
  // 포도당
  molecules.glucoseParticles.forEach(m => {
    ctx.fillStyle = `rgba(139, 195, 74, ${m.life})`;
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('C₆H₁₂O₆', m.x - 25, m.y);
  });
}

function drawGraph() {
  const w = graphCanvas.width / 2;
  const h = graphCanvas.height / 2;
  
  // 배경
  graphCtx.fillStyle = '#fafafa';
  graphCtx.fillRect(0, 0, w, h);
  
  // 격자
  graphCtx.strokeStyle = '#e0e0e0';
  graphCtx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = (h / 5) * i;
    graphCtx.beginPath();
    graphCtx.moveTo(0, y);
    graphCtx.lineTo(w, y);
    graphCtx.stroke();
  }
  
  // 축
  graphCtx.strokeStyle = '#333';
  graphCtx.lineWidth = 2;
  graphCtx.beginPath();
  graphCtx.moveTo(40, 10);
  graphCtx.lineTo(40, h - 20);
  graphCtx.lineTo(w - 10, h - 20);
  graphCtx.stroke();
  
  // 레이블
  graphCtx.fillStyle = '#333';
  graphCtx.font = '10px sans-serif';
  graphCtx.fillText('시간 →', w - 50, h - 5);
  graphCtx.fillText('생성량', 5, 15);
  
  if (o2History.length < 2) return;
  
  const maxVal = Math.max(...o2History, ...glucoseHistory, 1);
  const graphW = w - 55;
  const graphH = h - 35;
  
  // 산소 선
  graphCtx.strokeStyle = '#2196f3';
  graphCtx.lineWidth = 2;
  graphCtx.beginPath();
  o2History.forEach((val, i) => {
    const x = 45 + (i / (o2History.length - 1)) * graphW;
    const y = h - 25 - (val / maxVal) * graphH;
    if (i === 0) graphCtx.moveTo(x, y);
    else graphCtx.lineTo(x, y);
  });
  graphCtx.stroke();
  
  // 포도당 선
  graphCtx.strokeStyle = '#4caf50';
  graphCtx.beginPath();
  glucoseHistory.forEach((val, i) => {
    const x = 45 + (i / (glucoseHistory.length - 1)) * graphW;
    const y = h - 25 - (val / maxVal) * graphH;
    if (i === 0) graphCtx.moveTo(x, y);
    else graphCtx.lineTo(x, y);
  });
  graphCtx.stroke();
}

function updateStageIndicator() {
  const efficiency = (light / 100) * (co2 / 100) * (water / 100);
  if (efficiency > 0.7) {
    stageName.textContent = '⚡ 광반응 활발 + 🔄 탄소동화 진행 중!';
  } else if (light / 100 > 0.5) {
    stageName.textContent = '☀️ 광반응 진행 중...';
  } else if (co2 / 100 > 0.5) {
    stageName.textContent = '💨 이산화탄소 대기 중...';
  } else if (water / 100 < 0.3) {
    stageName.textContent = '⚠️ 물 부족! 광합성 제한';
  } else {
    stageName.textContent = '💡 빛 부족! 광반응 제한';
  }
}

function updateStats() {
  o2Stat.textContent = totalO2.toFixed(2) + ' units';
  glucoseStat.textContent = totalGlucose.toFixed(3) + ' units';
}

// 시작
init();
