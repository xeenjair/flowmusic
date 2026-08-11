import React, { useEffect, useRef } from 'react';

function Visualizer({ audioContext, analyser, color }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!analyser) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Проверяем и нормализуем цвет
    const baseColor = color || '#1ed760';
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        // Создаём градиент
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        
        // Безопасное добавление цветов
        try {
          gradient.addColorStop(0, baseColor);
          // Добавляем прозрачность правильным способом
          if (baseColor.startsWith('rgb')) {
            // Если rgb формат - добавляем альфа-канал
            const rgbMatch = baseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
              gradient.addColorStop(1, `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, 0.5)`);
            } else {
              gradient.addColorStop(1, baseColor);
            }
          } else if (baseColor.startsWith('#')) {
            // Если hex - используем как есть
            gradient.addColorStop(1, baseColor + '80');
          } else {
            gradient.addColorStop(1, baseColor);
          }
        } catch (e) {
          // Если ошибка - используем только базовый цвет
          gradient.addColorStop(0, '#1ed760');
          gradient.addColorStop(1, '#1ed76080');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    draw();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, color]);

  return (
    <canvas 
      ref={canvasRef} 
      className="visualizer-canvas"
      width={window.innerWidth}
      height={150}
    />
  );
}

export default Visualizer;