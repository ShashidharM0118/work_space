import React from 'react';

interface Props {
  show: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  startDrawing: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  draw: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  stopDrawing: () => void;
  clearWhiteboard: () => void;
}

const Whiteboard: React.FC<Props> = ({ show, canvasRef, startDrawing, draw, stopDrawing, clearWhiteboard }) => {
  if (!show) return null;
  return (
    <div style={{ position: 'relative', background: '#fff', borderRadius: '20px', padding: '24px' }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: '2px solid #e2e8f0', borderRadius: '12px', cursor: 'crosshair', backgroundColor: 'white' }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <button
        onClick={clearWhiteboard}
        style={{
          position: 'absolute',
          top: '36px',
          right: '36px'
        }}
      >
        Clear Board
      </button>
    </div>
  );
};

export default Whiteboard;
