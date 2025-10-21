// Lightweight stubs to avoid bundling heavy charting code by default.
// If charts are needed, replace these with a dynamic import to a real chart implementation.
import * as React from "react";

export type ChartConfig = Record<string, unknown>;

export const ChartContainer: React.FC<React.ComponentProps<"div"> & { config?: ChartConfig }>
  = ({ className, children }) => (
  <div className={className}>
    {/* Chart placeholder */}
    {children}
  </div>
);

export const ChartTooltip: React.FC = () => null;
export const ChartTooltipContent: React.FC = () => null;
export const ChartLegend: React.FC = () => null;
export const ChartLegendContent: React.FC = () => null;
export const ChartStyle: React.FC = () => null;
