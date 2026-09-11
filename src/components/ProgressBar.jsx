// Shared progress bar — consistent look across the whole app.
// Sizes: sm (h-1.5) | md (h-2.5) | lg (h-3)
// Pass `gradient` classes to customize fill color (defaults to indigo→purple).
export default function ProgressBar({ value = 0, size = 'md', gradient, className = '', trackClassName = '', showShimmer = false }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3' };
  const fill = gradient || 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400';

  return (
    <div
      className={`progress-track ${heights[size] || heights.md} ${trackClassName} ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div
        className={`progress-fill ${fill} ${showShimmer ? 'animate-shimmer' : ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}