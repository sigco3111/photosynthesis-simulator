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
let temperature = 25;  // 0-50°C
let wavelength = 'red';  // 'red', 'green', 'blue'

// --- 제한 인자 추적 ---
let lastEfficiency = {
  rate_light: 0,
  rate_co2: 0,
  rate_water: 0,
  tempFactor: 0,
  wavelengthFactor: 0,
  total: 0
};

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
const tempSlider = document.getElementById('temp-slider');
const tempValue = document.getElementById('temp-value');
const wlButtons = document.querySelectorAll('.wl-btn');

// --- 프리셋 ---
const presets = {
  sunny:      { light: 90, co2: 70, water: 80, temperature: 25, wavelength: 'red' },
  cloudy:     { light: 30, co2: 60, water: 70, temperature: 20, wavelength: 'red' },
  greenhouse: { light: 70, co2: 95, water: 80, temperature: 35, wavelength: 'red' },
  desert:     { light: 95, co2: 30, water: 10, temperature: 45, wavelength: 'red' },
  deepsea:    { light: 5,  co2: 40, water: 90, temperature: 5,  wavelength: 'blue' }
};

let activePreset = null;

function applyPreset(name) {
  const p = presets[name];
  if (!p) return;
  
  activePreset = name;
  
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === name);
  });
  
  animateSlider(lightSlider, light, p.light, 400, (val) => {
    light = val;
    lightValue.textContent = val + '%';
  });
  
  animateSlider(co2Slider, co2, p.co2, 400, (val) => {
    co2 = val;
    co2Value.textContent = val + '%';
  });
  
  animateSlider(waterSlider, water, p.water, 400, (val) => {
    water = val;
    waterValue.textContent = val + '%';
  });
  
  animateSlider(tempSlider, temperature, p.temperature, 400, (val) => {
    temperature = val;
    tempValue.textContent = val + '°C';
    tempValue.style.color = val <= 15 ? '#2196f3' : val <= 35 ? '#4caf50' : '#f44336';
  });
  
  wavelength = p.wavelength;
  wlButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.wl === p.wavelength);
  });
}

function animateSlider(slider, from, to, duration, onUpdate) {
  const startTime = performance.now();
  
  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    
    const currentVal = Math.round(from + (to - from) * eased);
    slider.value = currentVal;
    onUpdate(currentVal);
    
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  
  requestAnimationFrame(step);
}

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
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    activePreset = null;
  });
  
  co2Slider.addEventListener('input', (e) => {
    co2 = parseInt(e.target.value);
    co2Value.textContent = co2 + '%';
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    activePreset = null;
  });
  
  waterSlider.addEventListener('input', (e) => {
    water = parseInt(e.target.value);
    waterValue.textContent = water + '%';
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    activePreset = null;
  });
  
  speedSlider.addEventListener('input', (e) => {
    const speeds = [0.25, 0.5, 1, 2, 3];
    speed = speeds[parseInt(e.target.value) - 1];
    speedValue.textContent = speed + 'x';
  });

  tempSlider.addEventListener('input', (e) => {
    temperature = parseInt(e.target.value);
    tempValue.textContent = temperature + '°C';
    tempValue.style.color = temperature <= 15 ? '#2196f3' : temperature <= 35 ? '#4caf50' : '#f44336';
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    activePreset = null;
  });

  wlButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      wlButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      wavelength = btn.dataset.wl;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      activePreset = null;
    });
  });

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyPreset(btn.dataset.preset);
    });
  });

  playBtn.addEventListener('click', startSimulation);
  pauseBtn.addEventListener('click', pauseSimulation);
  
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeCanvas, 100);
  });
}

let resizeTimeout = null;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  
  const graphRect = graphCanvas.getBoundingClientRect();
  graphCanvas.width = graphRect.width * 2;
  graphCanvas.height = graphRect.height * 2;
  graphCtx.setTransform(2, 0, 0, 2, 0, 0);
  
  drawCell();
  drawGraph();
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

function calculateEfficiency() {
  const Vmax = 1.0;
  const Km = { light: 30, co2: 25, water: 20 };

  const rate_light = Vmax * light / (Km.light + light);
  const rate_co2  = Vmax * co2 / (Km.co2 + co2);
  const rate_water = Vmax * water / (Km.water + water);

  const limitingRate = Math.min(rate_light, rate_co2);

  const optimalTemp = 30;
  const sigma = 10;
  const tempFactor = Math.exp(-((temperature - optimalTemp) ** 2) / (2 * sigma ** 2));

  const absorption = { red: 0.90, blue: 0.85, green: 0.10 };
  const wavelengthFactor = absorption[wavelength];

  const total = limitingRate * rate_water * tempFactor * wavelengthFactor;

  lastEfficiency = { rate_light, rate_co2, rate_water, tempFactor, wavelengthFactor, total };

  return total;
}

function updateSimulation(deltaTime) {
  const efficiency = calculateEfficiency();
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
        size: 6 + Math.random() * 4,
        life: 1,
        trail: []
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
    // Store trail position before updating
    if (m.trail) {
      m.trail.push({ x: m.x, y: m.y });
      if (m.trail.length > 5) m.trail.shift();
    }
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

  // 배경 그라디언트
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  const skyColors = {
    red: '#ffb3b3',
    blue: '#b3b3ff',
    green: '#b3ffb3'
  };
  gradient.addColorStop(0, skyColors[wavelength] || '#87ceeb');
  gradient.addColorStop(0.6, '#c8e6c9');
  gradient.addColorStop(0.85, '#66bb6a');
  gradient.addColorStop(1, '#33691e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // 구름 효과 (사인파 기반)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  for (let c = 0; c < 4; c++) {
    const cx = (w * 0.2 * c + Math.sin(simTime * 0.3 + c * 1.5) * 30) % w;
    const cy = 25 + c * 15 + Math.sin(simTime * 0.5 + c) * 5;
    for (let b = 0; b < 3; b++) {
      ctx.beginPath();
      ctx.arc(cx + b * 18 - 18, cy + Math.sin(b) * 3, 14 + b * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 바닥 풀 텍스처
  ctx.strokeStyle = '#2e7d32';
  ctx.lineWidth = 1;
  for (let gx = 0; gx < w; gx += 6) {
    const gh = 4 + Math.sin(gx * 0.3 + simTime) * 2;
    ctx.beginPath();
    ctx.moveTo(gx, h);
    ctx.lineTo(gx + 1, h - gh);
    ctx.stroke();
  }

  // 빛 줄기 효과
  if (light > 20) {
    const beamColors = {
      red: '255, 68, 68',
      blue: '68, 68, 255',
      green: '68, 255, 68'
    };
    const bc = beamColors[wavelength] || '255, 235, 59';
    const pulse = 0.5 + Math.sin(simTime * 2) * 0.3;
    const beamCount = 6;

    for (let i = 0; i < beamCount; i++) {
      const startX = (w / beamCount) * i + 20;
      const endX = w * 0.3 + (w * 0.5 / beamCount) * i;
      const endY = h * 0.25 + (h * 0.6 / beamCount) * i;
      const alpha = (light / 100) * 0.15 * pulse;

      ctx.strokeStyle = `rgba(${bc}, ${alpha})`;
      ctx.lineWidth = 3 + Math.sin(simTime * 3 + i) * 1;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.strokeStyle = `rgba(${bc}, ${alpha * 0.5})`;
      ctx.lineWidth = 8 + Math.sin(simTime * 2 + i) * 2;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }

  // 식물 세포
  const cellX = w * 0.3;
  const cellY = h * 0.25;
  const cellW = w * 0.5;
  const cellH = h * 0.6;

  // 세포벽 (두꺼운 둥근 사각형 + 나무결 질감)
  ctx.strokeStyle = '#5d4037';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(cellX, cellY, cellW, cellH, 8);
  ctx.stroke();

  // 나무결 질감 (수평 얇은 선)
  ctx.strokeStyle = 'rgba(93, 64, 55, 0.15)';
  ctx.lineWidth = 0.5;
  for (let ty = cellY + 8; ty < cellY + cellH - 4; ty += 6) {
    ctx.beginPath();
    ctx.moveTo(cellX + 3, ty + Math.sin(ty * 0.2) * 1);
    ctx.lineTo(cellX + cellW - 3, ty + Math.sin(ty * 0.2 + 2) * 1);
    ctx.stroke();
  }

  // 세포막 (내부 점선)
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = 'rgba(129, 199, 132, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(cellX + 4, cellY + 4, cellW - 8, cellH - 8, 6);
  ctx.stroke();
  ctx.setLineDash([]);

  // 세포질 (반투명 초록 + 미세 입자)
  ctx.fillStyle = 'rgba(200, 230, 201, 0.5)';
  ctx.beginPath();
  ctx.roundRect(cellX + 5, cellY + 5, cellW - 10, cellH - 10, 6);
  ctx.fill();

  // 세포질 미세 입자 효과
  ctx.fillStyle = 'rgba(165, 214, 167, 0.3)';
  for (let p = 0; p < 20; p++) {
    const px = cellX + 10 + Math.sin(p * 1.3 + simTime * 0.4) * (cellW * 0.4) + cellW * 0.4;
    const py = cellY + 10 + Math.cos(p * 0.9 + simTime * 0.3) * (cellH * 0.4) + cellH * 0.4;
    ctx.beginPath();
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 액포 (중앙 대형 투명 청록색)
  const vacX = cellX + cellW * 0.35;
  const vacY = cellY + cellH * 0.5;
  const vacR = Math.min(cellW, cellH) * 0.2;
  const vacGrad = ctx.createRadialGradient(vacX, vacY, 0, vacX, vacY, vacR);
  vacGrad.addColorStop(0, 'rgba(178, 235, 242, 0.35)');
  vacGrad.addColorStop(0.7, 'rgba(128, 222, 234, 0.2)');
  vacGrad.addColorStop(1, 'rgba(77, 208, 225, 0.1)');
  ctx.fillStyle = vacGrad;
  ctx.beginPath();
  ctx.ellipse(vacX, vacY, vacR * 1.3, vacR, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(77, 208, 225, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(vacX, vacY, vacR * 1.3, vacR, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 핵 (큰 원 + 인)
  const nucX = cellX + cellW * 0.75;
  const nucY = cellY + cellH * 0.3;
  const nucR = 16;
  const nucGrad = ctx.createRadialGradient(nucX - 3, nucY - 3, 0, nucX, nucY, nucR);
  nucGrad.addColorStop(0, 'rgba(206, 147, 216, 0.9)');
  nucGrad.addColorStop(1, 'rgba(156, 39, 176, 0.6)');
  ctx.fillStyle = nucGrad;
  ctx.beginPath();
  ctx.arc(nucX, nucY, nucR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(123, 31, 162, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(nucX, nucY, nucR, 0, Math.PI * 2);
  ctx.stroke();

  // 인 (작은 어두운 원)
  ctx.fillStyle = 'rgba(74, 20, 140, 0.6)';
  ctx.beginPath();
  ctx.arc(nucX + 3, nucY - 2, 5, 0, Math.PI * 2);
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

  // 물결 효과 (하단)
  if (water > 20) {
    ctx.globalAlpha = (water / 100) * 0.3;
    ctx.strokeStyle = '#64b5f6';
    ctx.lineWidth = 1;
    for (let r = 0; r < 3; r++) {
      ctx.beginPath();
      for (let x = 0; x < w; x += 3) {
        const y = h - 10 - r * 8 + Math.sin(x * 0.05 + simTime * 2 + r) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // 레이블
  ctx.fillStyle = '#1b5e20';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('식물 세포', cellX + cellW / 2 - 30, cellY - 8);

  ctx.fillStyle = 'rgba(74, 20, 140, 0.8)';
  ctx.font = '10px sans-serif';
  ctx.fillText('핵', nucX - 4, nucY + nucR + 12);

  ctx.fillStyle = 'rgba(0, 131, 143, 0.8)';
  ctx.fillText('액포', vacX - 8, vacY + 4);

  ctx.fillStyle = '#2e7d32';
  ctx.font = '10px sans-serif';
  ctx.fillText('엽록체', cellX + cellW * 0.35, cellY + cellH * 0.45);
}

function drawChloroplast(x, y) {
  ctx.fillStyle = '#66bb6a';
  ctx.beginPath();
  ctx.ellipse(x, y, 22, 12, Math.PI * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2e7d32';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const granaPositions = [
    { dx: -7, dy: -2 },
    { dx: 2, dy: 1 },
    { dx: 9, dy: -1 }
  ];

  granaPositions.forEach(gp => {
    const gx = x + gp.dx;
    const gy = y + gp.dy;
    for (let d = 0; d < 3; d++) {
      ctx.fillStyle = d % 2 === 0 ? '#1b5e20' : '#2e7d32';
      ctx.fillRect(gx - 3, gy - 2 + d * 1.5, 6, 1.5);
    }
  });

  ctx.strokeStyle = '#388e3c';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.quadraticCurveTo(x, y + 3, x + 5, y + 1);
  ctx.stroke();

  if (light > 50) {
    const glowAlpha = (light / 100) * 0.4;
    const grad = ctx.createRadialGradient(x, y, 5, x, y, 28);
    grad.addColorStop(0, `rgba(255, 235, 59, ${glowAlpha})`);
    grad.addColorStop(1, `rgba(255, 235, 59, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  if (light > 80) {
    for (let s = 0; s < 3; s++) {
      const sx = x + Math.cos(simTime * 3 + s * 2.1) * 18;
      const sy = y + Math.sin(simTime * 3 + s * 2.1) * 10;
      const salpha = 0.4 + Math.sin(simTime * 5 + s) * 0.3;
      ctx.fillStyle = `rgba(255, 255, 200, ${salpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawMolecules() {
  const w = canvas.width / 2;
  const h = canvas.height / 2;

  molecules.lightPhotons.forEach(m => {
    const alpha = m.life;

    if (m.trail && m.trail.length > 1) {
      for (let t = 0; t < m.trail.length - 1; t++) {
        const ta = (t / m.trail.length) * alpha * 0.3;
        ctx.strokeStyle = `rgba(255, 235, 59, ${ta})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.trail[t].x, m.trail[t].y);
        ctx.lineTo(m.trail[t + 1].x, m.trail[t + 1].y);
        ctx.stroke();
      }
    }

    const colors = {
      red: ['255, 200, 50', '255, 100, 50'],
      blue: ['100, 150, 255', '50, 50, 255'],
      green: ['100, 255, 100', '50, 200, 50']
    };
    const c = colors[wavelength] || colors.red;

    const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size);
    grad.addColorStop(0, `rgba(${c[0]}, ${alpha})`);
    grad.addColorStop(0.5, `rgba(${c[1]}, ${alpha * 0.5})`);
    grad.addColorStop(1, `rgba(${c[1]}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
    ctx.fill();
  });

  molecules.waterMolecules.forEach(m => {
    const alpha = m.life;
    const wobble = Math.sin(simTime * 3 + m.x * 0.1) * 2;

    const grad = ctx.createRadialGradient(m.x, m.y + wobble, 0, m.x, m.y + wobble, 12);
    grad.addColorStop(0, `rgba(33, 150, 243, ${alpha * 0.6})`);
    grad.addColorStop(1, `rgba(33, 150, 243, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(m.x, m.y + wobble, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(33, 150, 243, ${alpha})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y + wobble, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(200, 230, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(m.x - 5, m.y + wobble - 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(m.x + 5, m.y + wobble - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(13, 71, 161, ${alpha})`;
    ctx.font = '9px sans-serif';
    ctx.fillText('H₂O', m.x - 10, m.y + wobble + 14);
  });

  molecules.co2Molecules.forEach(m => {
    const alpha = m.life;

    const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 14);
    grad.addColorStop(0, `rgba(255, 152, 0, ${alpha * 0.5})`);
    grad.addColorStop(1, `rgba(255, 152, 0, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(100, 100, 100, ${alpha})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 87, 34, ${alpha})`;
    ctx.beginPath();
    ctx.arc(m.x - 8, m.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(m.x + 8, m.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(150, 150, 150, ${alpha * 0.6})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(m.x - 4, m.y);
    ctx.lineTo(m.x + 4, m.y);
    ctx.stroke();

    ctx.fillStyle = `rgba(230, 81, 0, ${alpha})`;
    ctx.font = '9px sans-serif';
    ctx.fillText('CO₂', m.x - 10, m.y + 16);
  });

  molecules.o2Molecules.forEach(m => {
    const alpha = m.life;
    const bubbleSize = 8 + (1 - m.life) * 4;
    const wobble = Math.sin(simTime * 4 + m.x * 0.2) * 3;
    const bx = m.x + wobble;
    const by = m.y;

    ctx.strokeStyle = `rgba(76, 175, 80, ${alpha * 0.8})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx, by, bubbleSize, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(200, 230, 201, ${alpha * 0.2})`;
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx - 2, by - 2, bubbleSize * 0.5, -Math.PI * 0.8, -Math.PI * 0.2);
    ctx.stroke();

    ctx.fillStyle = `rgba(27, 94, 32, ${alpha})`;
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('O₂', bx - 8, by + 4);
  });

  molecules.atpParticles.forEach(m => {
    const alpha = m.life;
    const angle = simTime * 5;

    const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 10);
    grad.addColorStop(0, `rgba(233, 30, 99, ${alpha * 0.7})`);
    grad.addColorStop(1, `rgba(233, 30, 99, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(233, 30, 99, ${alpha})`;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(4, 0);
    ctx.lineTo(0, 5);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = `rgba(136, 14, 79, ${alpha})`;
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('ATP', m.x - 10, m.y - 8);
  });

  molecules.glucoseParticles.forEach(m => {
    const alpha = m.life;
    const pulse = 1 + Math.sin(simTime * 2) * 0.1;
    const size = 8 * pulse;

    const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 15);
    grad.addColorStop(0, `rgba(139, 195, 74, ${alpha * 0.5})`);
    grad.addColorStop(1, `rgba(139, 195, 74, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(139, 195, 74, ${alpha})`;
    ctx.strokeStyle = `rgba(85, 139, 47, ${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = m.x + Math.cos(a) * size;
      const py = m.y + Math.sin(a) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = `rgba(51, 105, 30, ${alpha})`;
    ctx.font = '8px sans-serif';
    ctx.fillText('C₆H₁₂O₆', m.x - 18, m.y + size + 12);
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
  calculateEfficiency();
  const e = lastEfficiency;

  if (e.tempFactor < 0.3) {
    stageName.textContent = '🌡️ 온도 비효율! 효소 활성 낮음';
    return;
  }

  if (e.total > 0.5) {
    stageName.textContent = '⚡ 광반응 활발 + 🔄 탄소동화 진행 중!';
    return;
  }

  const rates = [
    { name: '⚡ 빛', value: e.rate_light, emoji: '빛' },
    { name: '💨 CO₂', value: e.rate_co2, emoji: 'CO₂' },
    { name: '💧 물', value: e.rate_water, emoji: '물' }
  ];
  rates.sort((a, b) => a.value - b.value);
  const limiting = rates[0];

  if (e.wavelengthFactor < 0.2) {
    stageName.textContent = '🌈 녹색광 흡수율 낮음! + ' + limiting.name + ' 제한 인자!';
  } else if (e.total > 0.2) {
    stageName.textContent = '🔬 광합성 진행 중... ' + limiting.name + '이 제한 인자';
  } else {
    stageName.textContent = '⚠️ ' + limiting.name + '이(가) 제한 인자!';
  }
}

function updateStats() {
  o2Stat.textContent = totalO2.toFixed(2) + ' units';
  glucoseStat.textContent = totalGlucose.toFixed(3) + ' units';
}

// 시작
init();
