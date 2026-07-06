import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  colorTheme?: "emerald" | "indigo" | "rose" | "amber" | "blue";
}

const colorMap = {
  emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
  indigo: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/20 text-indigo-400",
  rose: "from-rose-500/20 to-rose-500/5 border-rose-500/20 text-rose-400",
  amber: "from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400",
  blue: "from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400",
};

export const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend, 
  colorTheme = "indigo" 
}) => {
  const themeClasses = colorMap[colorTheme];

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-${colorTheme}-500/10 p-6 ${themeClasses}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        {icon && <div className={`p-2 rounded-lg bg-${colorTheme}-500/10`}>{icon}</div>}
      </div>
      
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-slate-100">{value}</span>
      </div>
      
      {trend && (
        <div className="mt-2 text-xs font-medium opacity-80">
          {trend}
        </div>
      )}
      
      {/* Decorative background glow */}
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-${colorTheme}-500/10 blur-2xl`} />
    </div>
  );
};
