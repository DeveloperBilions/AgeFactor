'use client';

interface ScoreRingProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#79BD8B';
  if (score >= 60) return '#E8A838';
  if (score >= 40) return '#D95550';
  return '#B83A36';
}

export default function ScoreRing({
  score,
  size = 80,
  strokeWidth = 6,
  color,
  label,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const ringColor = color || getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5DFD4"
            strokeWidth={strokeWidth}
          />
          {/* Score ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="score-ring"
            style={{ '--score-offset': offset } as React.CSSProperties}
          />
        </svg>
        {/* Score number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-semibold text-text-primary" style={{ fontSize: size * 0.28 }}>
            {score}
          </span>
        </div>
      </div>
      {label && (
        <span className="text-xs text-text-secondary font-medium text-center leading-tight">
          {label}
        </span>
      )}
    </div>
  );
}
