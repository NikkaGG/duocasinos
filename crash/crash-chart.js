class CrashChart {
  constructor(container, multiplierElement) {
    this.container = container;
    this.multiplierElement = multiplierElement;
    this.canvas = null;
    this.ctx = null;
    this.animationFrame = null;
    
    this.width = 0;
    this.height = 0;
    this.points = [];
    this.currentMultiplier = 1.0;
    this.startTime = null;
    this.isCrashed = false;
    this.crashAnimation = null;
    this.pulseAnimation = 0;
    this.noiseOffset = 0;
    
    this.padding = { top: 20, right: 20, bottom: 30, left: 50 };
    this.maxVisibleTime = 20000;
    
    this.init();
  }
  
  init() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'crashChart';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.zIndex = '1';
    
    this.container.insertBefore(this.canvas, this.container.firstChild);
    this.ctx = this.canvas.getContext('2d');
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  
  start() {
    this.points = [];
    this.currentMultiplier = 1.0;
    this.startTime = Date.now();
    this.isCrashed = false;
    this.crashAnimation = null;
    this.noiseOffset = Math.random() * 1000;
    
    this.points.push({
      time: 0,
      multiplier: 1.0
    });
    
    if (this.multiplierElement) {
      this.multiplierElement.textContent = '1.00x';
      this.multiplierElement.classList.remove('crashed');
    }
    
    this.animate();
  }
  
  updateMultiplier(multiplier) {
    if (this.isCrashed) return;
    
    this.currentMultiplier = multiplier;
    const elapsed = Date.now() - this.startTime;
    
    this.points.push({
      time: elapsed,
      multiplier: multiplier
    });
    
    if (this.points.length > 1000) {
      this.points.shift();
    }
    
    if (this.multiplierElement) {
      this.multiplierElement.textContent = `${multiplier.toFixed(2)}x`;
    }
  }
  
  crash(crashPoint) {
    this.isCrashed = true;
    this.currentMultiplier = crashPoint;
    this.crashAnimation = {
      startTime: Date.now(),
      duration: 1000,
      startY: this.getYPosition(crashPoint)
    };
    
    if (this.multiplierElement) {
      this.multiplierElement.textContent = `${crashPoint.toFixed(2)}x`;
      this.multiplierElement.classList.add('crashed');
    }
  }
  
  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  
  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
  
  animate() {
    this.draw();
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }
  
  getMaxMultiplier() {
    if (this.currentMultiplier <= 2) {
      return 2.5;
    } else if (this.currentMultiplier <= 5) {
      return 6;
    } else if (this.currentMultiplier <= 10) {
      return 12;
    } else {
      return Math.ceil(this.currentMultiplier * 1.2);
    }
  }
  
  getNoise(time) {
    const t = time / 1000 + this.noiseOffset;
    const wave1 = Math.sin(t * 2.1) * 0.5;
    const wave2 = Math.sin(t * 3.7) * 0.3;
    const wave3 = Math.sin(t * 5.3) * 0.2;
    return (wave1 + wave2 + wave3);
  }
  
  getYPosition(multiplier) {
    const chartHeight = this.height - this.padding.top - this.padding.bottom;
    const minMultiplier = 1.0;
    const maxMultiplier = this.getMaxMultiplier();
    
    const logMin = Math.log(minMultiplier);
    const logMax = Math.log(maxMultiplier);
    const logValue = Math.log(Math.max(multiplier, minMultiplier));
    
    const ratio = (logValue - logMin) / (logMax - logMin);
    const y = this.height - this.padding.bottom - (ratio * chartHeight);
    
    return Math.max(this.padding.top, Math.min(this.height - this.padding.bottom, y));
  }
  
  draw() {
    this.clear();
    
    this.drawGrid();
    
    if (this.points.length > 0) {
      this.pulseAnimation += 0.05;
      this.drawChart();
    }
    
    if (this.isCrashed && this.crashAnimation) {
      this.drawCrashAnimation();
    }
  }
  
  drawGrid() {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    
    const minMultiplier = 1.0;
    const maxMultiplier = this.getMaxMultiplier();
    
    const logMin = Math.log(minMultiplier);
    const logMax = Math.log(maxMultiplier);
    
    const horizontalLines = 5;
    for (let i = 0; i <= horizontalLines; i++) {
      const logValue = logMax - (logMax - logMin) * (i / horizontalLines);
      const multiplierValue = Math.exp(logValue);
      
      const y = this.getYPosition(multiplierValue);
      
      this.ctx.beginPath();
      this.ctx.moveTo(this.padding.left, y);
      this.ctx.lineTo(this.width - this.padding.right, y);
      this.ctx.stroke();
      
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.font = '10px Montserrat';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`${multiplierValue.toFixed(2)}x`, this.padding.left - 5, y + 4);
    }
  }
  
  drawChart() {
    const elapsed = Date.now() - this.startTime;
    const chartWidth = this.width - this.padding.left - this.padding.right;
    
    const visiblePoints = this.points.filter(p => 
      elapsed - p.time < this.maxVisibleTime
    );
    
    if (visiblePoints.length < 2) return;
    
    const gradient = this.ctx.createLinearGradient(
      this.padding.left, 
      0, 
      this.width - this.padding.right, 
      0
    );
    gradient.addColorStop(0, 'rgba(64, 123, 61, 0.8)');
    gradient.addColorStop(0.5, 'rgba(84, 164, 80, 1)');
    gradient.addColorStop(1, 'rgba(186, 166, 87, 1)');
    
    this.ctx.beginPath();
    
    visiblePoints.forEach((point, index) => {
      const timeSincePoint = elapsed - point.time;
      const x = this.padding.left + chartWidth * (1 - timeSincePoint / this.maxVisibleTime);
      let y = this.getYPosition(point.multiplier);
      
      const noise = this.getNoise(point.time);
      const noiseAmplitude = 3 + (point.multiplier - 1) * 0.5;
      y += noise * noiseAmplitude;
      
      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });
    
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.stroke();
    
    const fillGradient = this.ctx.createLinearGradient(
      0, 
      this.padding.top, 
      0, 
      this.height - this.padding.bottom
    );
    fillGradient.addColorStop(0, 'rgba(84, 164, 80, 0.3)');
    fillGradient.addColorStop(1, 'rgba(84, 164, 80, 0.05)');
    
    const lastPoint = visiblePoints[visiblePoints.length - 1];
    const lastX = this.padding.left + chartWidth * (1 - (elapsed - lastPoint.time) / this.maxVisibleTime);
    let lastY = this.getYPosition(lastPoint.multiplier);
    
    const lastNoise = this.getNoise(lastPoint.time);
    const lastNoiseAmplitude = 3 + (lastPoint.multiplier - 1) * 0.5;
    lastY += lastNoise * lastNoiseAmplitude;
    
    this.ctx.lineTo(lastX, this.height - this.padding.bottom);
    this.ctx.lineTo(this.padding.left, this.height - this.padding.bottom);
    this.ctx.closePath();
    
    this.ctx.fillStyle = fillGradient;
    this.ctx.fill();
    
    const pulse = Math.sin(this.pulseAnimation) * 0.3 + 1;
    const baseRadius = 6;
    
    this.ctx.beginPath();
    this.ctx.arc(lastX, lastY, baseRadius * pulse, 0, Math.PI * 2);
    this.ctx.fillStyle = '#BAA657';
    this.ctx.shadowColor = '#BAA657';
    this.ctx.shadowBlur = 15 * pulse;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    
    this.ctx.beginPath();
    this.ctx.arc(lastX, lastY, baseRadius * 0.7, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(lastX, lastY, (baseRadius + 3) * pulse, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(186, 166, 87, ${0.5 / pulse})`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }
  
  drawCrashAnimation() {
    const elapsed = Date.now() - this.crashAnimation.startTime;
    const progress = Math.min(elapsed / this.crashAnimation.duration, 1);
    
    const easeOut = 1 - Math.pow(1 - progress, 3);
    
    const chartWidth = this.width - this.padding.left - this.padding.right;
    const lastPoint = this.points[this.points.length - 1];
    const elapsedTotal = Date.now() - this.startTime;
    const lastX = this.padding.left + chartWidth * (1 - (elapsedTotal - lastPoint.time) / this.maxVisibleTime);
    const lastY = this.crashAnimation.startY;
    
    const flyDistance = this.height * 0.5;
    const crashY = lastY - (flyDistance * easeOut);
    
    this.ctx.beginPath();
    this.ctx.arc(lastX, crashY, 8 * (1 + easeOut * 0.5), 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(202, 57, 89, ${1 - progress * 0.5})`;
    this.ctx.fill();
    
    for (let i = 1; i <= 3; i++) {
      this.ctx.beginPath();
      this.ctx.arc(lastX, crashY, 8 + (i * 10 * easeOut), 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(202, 57, 89, ${(1 - progress) * (1 - i * 0.2)})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
    
    if (progress >= 1) {
      this.crashAnimation = null;
    }
  }
}

window.CrashChart = CrashChart;
