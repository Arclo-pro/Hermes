import { cn } from "@/lib/utils";

interface BenchmarkPositionBarProps {
  value: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  direction?: "lower-is-better" | "higher-is-better";
}

export function BenchmarkPositionBar({
  value,
  p25,
  p50,
  p75,
  p90,
  direction = "lower-is-better",
}: BenchmarkPositionBarProps) {
  const min = direction === "lower-is-better" ? p25 : p90;
  const max = direction === "lower-is-better" ? p90 : p25;
  
  const range = max - min;
  if (range === 0) return null;

  const clampedValue = Math.max(min, Math.min(max, value));
  const position = ((clampedValue - min) / range) * 100;

  const getMarkerColor = () => {
    if (direction === "lower-is-better") {
      if (value <= p25) return "bg-green-500 ring-green-500/30";
      if (value <= p50) return "bg-green-500 ring-green-500/30";
      if (value <= p75) return "bg-yellow-500 ring-yellow-500/30";
      return "bg-red-500 ring-red-500/30";
    } else {
      if (value >= p25) return "bg-green-500 ring-green-500/30";
      if (value >= p50) return "bg-green-500 ring-green-500/30";
      if (value >= p75) return "bg-yellow-500 ring-yellow-500/30";
      return "bg-red-500 ring-red-500/30";
    }
  };

  const p25Pos = direction === "lower-is-better" ? 0 : 100;
  const p50Pos = direction === "lower-is-better" 
    ? ((p50 - p25) / range) * 100 
    : ((p25 - p50) / (p25 - p90)) * 100;
  const p75Pos = direction === "lower-is-better" 
    ? ((p75 - p25) / range) * 100 
    : ((p25 - p75) / (p25 - p90)) * 100;
  const p90Pos = direction === "lower-is-better" ? 100 : 0;

  return (
    <div className="relative mt-2 mb-1">
      <div className="h-2 rounded-full overflow-hidden flex">
        {direction === "lower-is-better" ? (
          <>
            <div 
              className="bg-green-500/40" 
              style={{ width: `${((p50 - p25) / range) * 100}%` }} 
            />
            <div 
              className="bg-yellow-500/40" 
              style={{ width: `${((p75 - p50) / range) * 100}%` }} 
            />
            <div 
              className="bg-red-500/40" 
              style={{ width: `${((p90 - p75) / range) * 100}%` }} 
            />
          </>
        ) : (
          <>
            <div 
              className="bg-red-500/40" 
              style={{ width: `${((p75 - p90) / range) * 100}%` }} 
            />
            <div 
              className="bg-yellow-500/40" 
              style={{ width: `${((p50 - p75) / range) * 100}%` }} 
            />
            <div 
              className="bg-green-500/40" 
              style={{ width: `${((p25 - p50) / range) * 100}%` }} 
            />
          </>
        )}
      </div>
      
      <div 
        className={cn(
          "absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full ring-2 ring-offset-1 ring-offset-background shadow-md transition-all",
          getMarkerColor()
        )}
        style={{ 
          left: `${position}%`,
          transform: `translate(-50%, -50%)`,
        }}
      />

      <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
        {direction === "lower-is-better" ? (
          <>
            <span className="text-green-600 font-medium">p25</span>
            <span className="text-yellow-600 font-medium" style={{ marginLeft: `${p50Pos - 10}%` }}>p50</span>
            <span className="text-orange-600 font-medium">p75</span>
            <span className="text-red-600 font-medium">p90</span>
          </>
        ) : (
          <>
            <span className="text-red-600 font-medium">p90</span>
            <span className="text-orange-600 font-medium">p75</span>
            <span className="text-yellow-600 font-medium">p50</span>
            <span className="text-green-600 font-medium">p25</span>
          </>
        )}
      </div>
    </div>
  );
}
