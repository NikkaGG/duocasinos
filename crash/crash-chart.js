class CrashChart {
  constructor(container) {
    this.container = container;
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
    
    this.padding = { top: 20, right: 20, bottom: 30, left: 50 };
    this.maxVisibleTime = 15000;
    
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
  }
  
  crash() {
    this.isCrashed = true;
    this.crashAnimation = {
      startTime: Date.now(),
      duration: 1000,
      startY: this.getYPosition(this.currentMultiplier)
    };
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
  
  getYPosition(multiplier) {
    const chartHeight = this.height - this.padding.top - this.padding.bottom;
    const maxMultiplier = Math.max(10, this.currentMultiplier * 1.2);
    
    const logMultiplier = Math.log10(multiplier);
    const logMax = Math.log10(maxMultiplier);
    
    const ratio = logMultiplier / logMax;
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
    
    const horizontalLines = 5;
    for (let i = 0; i <= horizontalLines; i++) {
      const y = this.padding.top + (this.height - this.padding.top - this.padding.bottom) * (i / horizontalLines);
      
      this.ctx.beginPath();
      this.ctx.moveTo(this.padding.left, y);
      this.ctx.lineTo(this.width - this.padding.right, y);
      this.ctx.stroke();
      
      const maxMultiplier = Math.max(10, this.currentMultiplier * 1.2);
      const multiplierValue = Math.pow(10, Math.log10(maxMultiplier) * (1 - i / horizontalLines));
      
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
      const x = this.padding.left + chartWidth * (timeSincePoint / this.maxVisibleTime);
      const y = this.getYPosition(point.multiplier);
      
      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        const prevPoint = visiblePoints[index - 1];
        const prevX = this.padding.left + chartWidth * ((elapsed - prevPoint.time) / this.maxVisibleTime);
        const prevY = this.getYPosition(prevPoint.multiplier);
        
        const cpX = (prevX + x) / 2;
        const cpY = (prevY + y) / 2;
        
        this.ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
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
    const lastX = this.padding.left + chartWidth * ((elapsed - lastPoint.time) / this.maxVisibleTime);
    const firstPoint = visiblePoints[0];
    const firstX = this.padding.left + chartWidth * ((elapsed - firstPoint.time) / this.maxVisibleTime);
    
    this.ctx.lineTo(lastX, this.height - this.padding.bottom);
    this.ctx.lineTo(firstX, this.height - this.padding.bottom);
    this.ctx.closePath();
    
    this.ctx.fillStyle = fillGradient;
    this.ctx.fill();
    
    const lastY = this.getYPosition(lastPoint.multiplier);
    
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
    const lastX = this.padding.left + chartWidth * ((elapsedTotal - lastPoint.time) / this.maxVisibleTime);
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
