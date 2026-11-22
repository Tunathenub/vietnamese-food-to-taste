import { useState } from 'react';

export interface RadarDimension {
  key: string;
  label: string;
  authentic: number;
  tourist: number;
  difference: number;
}

interface TasteRadarChartProps {
  dimensions: RadarDimension[];
  touristName?: string;
  className?: string;
}

export function TasteRadarChart({
  dimensions,
  touristName = 'Khẩu vị du khách',
  className = '',
}: TasteRadarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const size = 380;
  const center = size / 2;
  const maxRadius = 125;
  const numAxes = dimensions.length;
  const maxScale = 5;

  // Compute (x, y) coordinates for a given index and value (0..5)
  const getCoordinates = (index: number, value: number, radiusScale: number = maxRadius) => {
    // Start at -PI/2 (top 12 o'clock)
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    const r = (value / maxScale) * radiusScale;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  // Generate SVG polygon points string from an array of values
  const getPolygonPoints = (values: number[]) => {
    return values
      .map((val, idx) => {
        const { x, y } = getCoordinates(idx, val);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const authenticPoints = getPolygonPoints(dimensions.map((d) => d.authentic));
  const touristPoints = getPolygonPoints(dimensions.map((d) => d.tourist));

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[380px] h-auto overflow-visible"
        style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }}
      >
        <defs>
          {/* Gradients for Authentic and Tourist Polygons */}
          <radialGradient id="radarAuthenticGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.1" />
          </radialGradient>
          <radialGradient id="radarTouristGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.2" />
          </radialGradient>
        </defs>

        {/* Background Grid: Concentric Polygons (1 to 5) */}
        {[1, 2, 3, 4, 5].map((level) => {
          const levelPoints = dimensions
            .map((_, idx) => {
              const { x, y } = getCoordinates(idx, level);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');

          return (
            <polygon
              key={`grid-level-${level}`}
              points={levelPoints}
              fill={level % 2 === 0 ? 'rgba(30, 41, 59, 0.45)' : 'rgba(15, 23, 42, 0.25)'}
              stroke="rgba(100, 116, 139, 0.25)"
              strokeWidth="1"
              strokeDasharray={level === 5 ? 'none' : '3 3'}
            />
          );
        })}

        {/* Radial Axis Lines */}
        {dimensions.map((_, idx) => {
          const { x, y } = getCoordinates(idx, maxScale);
          return (
            <line
              key={`axis-line-${idx}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="rgba(100, 116, 139, 0.3)"
              strokeWidth="1"
            />
          );
        })}

        {/* Level Scale Indicator Numbers */}
        {[1, 2, 3, 4, 5].map((level) => {
          const { y } = getCoordinates(0, level);
          return (
            <text
              key={`scale-num-${level}`}
              x={center + 8}
              y={y + 3}
              fill="rgba(148, 163, 184, 0.5)"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {level}
            </text>
          );
        })}

        {/* Layer 1: Authentic VN Polygon */}
        <polygon
          points={authenticPoints}
          fill="url(#radarAuthenticGrad)"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeDasharray="4 3"
          className="transition-all duration-500 ease-out"
        />

        {/* Layer 2: Tourist Profile Polygon */}
        <polygon
          points={touristPoints}
          fill="url(#radarTouristGrad)"
          stroke="#10b981"
          strokeWidth="2.5"
          className="transition-all duration-500 ease-out"
        />

        {/* Authentic Nodes */}
        {dimensions.map((dim, idx) => {
          const { x, y } = getCoordinates(idx, dim.authentic);
          return (
            <circle
              key={`auth-node-${idx}`}
              cx={x}
              cy={y}
              r={3}
              fill="#f59e0b"
              stroke="#78350f"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Tourist Nodes & Interactive Hit Areas */}
        {dimensions.map((dim, idx) => {
          const { x, y } = getCoordinates(idx, dim.tourist);
          const isHovered = hoveredIdx === idx;

          return (
            <g
              key={`tourist-node-${idx}`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <circle
                cx={x}
                cy={y}
                r={isHovered ? 7 : 4.5}
                fill="#10b981"
                stroke="#022c22"
                strokeWidth="2"
                className="transition-all duration-200"
              />
              {isHovered && (
                <circle
                  cx={x}
                  cy={y}
                  r={12}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="1.5"
                  opacity="0.75"
                  className="animate-ping"
                />
              )}
            </g>
          );
        })}

        {/* Axis Labels (Positioned around perimeter) */}
        {dimensions.map((dim, idx) => {
          const { x, y, angle } = getCoordinates(idx, maxScale, maxRadius + 30);
          const isHovered = hoveredIdx === idx;
          const diff = dim.difference;
          const diffSign = diff > 0 ? `+${diff}` : `${diff}`;

          let textAnchor: 'middle' | 'start' | 'end' = 'middle';
          if (Math.cos(angle) > 0.3) textAnchor = 'start';
          else if (Math.cos(angle) < -0.3) textAnchor = 'end';

          return (
            <g
              key={`label-group-${idx}`}
              className="cursor-pointer transition-transform duration-200"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <text
                x={x}
                y={y - 6}
                textAnchor={textAnchor}
                className={`text-[11px] font-bold transition-colors ${
                  isHovered ? 'fill-emerald-300' : 'fill-slate-200'
                }`}
              >
                {dim.label}
              </text>
              <text
                x={x}
                y={y + 8}
                textAnchor={textAnchor}
                className="text-[10px] font-mono font-semibold"
              >
                <tspan fill="#10b981">{dim.tourist}</tspan>
                <tspan fill="rgba(148, 163, 184, 0.6)"> vs </tspan>
                <tspan fill="#f59e0b">{dim.authentic}</tspan>
                <tspan
                  fill={diff > 0 ? '#34d399' : diff < 0 ? '#f87171' : '#94a3b8'}
                  className="font-bold ml-1"
                >
                  {' '}({diffSign})
                </tspan>
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-2 pt-2 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-0.5 bg-amber-500 border-t border-dashed border-amber-300" />
          <span className="text-amber-300 font-semibold">Vị chuẩn Việt Nam</span>
          <span className="text-[10px] text-slate-500">(Gốc)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1 bg-emerald-500 rounded-full" />
          <span className="text-emerald-300 font-bold">{touristName}</span>
          <span className="text-[10px] text-slate-500">(Thực tế)</span>
        </div>
      </div>
    </div>
  );
}
