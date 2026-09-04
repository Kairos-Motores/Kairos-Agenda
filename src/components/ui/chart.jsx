import React, { createContext, useContext, useId } from 'react';
import * as RechartsPrimitive from 'recharts';
import { cn } from '@/lib/utils';

// Padrão shadcn: `config` mapeia cada série/categoria a { label, color }. O color pode
// ser um hex direto ou "var(--chart-1)" etc — o ChartContainer injeta essas cores como
// CSS vars com escopo (--color-<key>) que os componentes do gráfico consultam via
// `fill="var(--color-x)"`, então trocar o tema (claro/escuro) já reflete sozinho.
const ChartContext = createContext(null);

const useChart = () => {
    const ctx = useContext(ChartContext);
    if (!ctx) throw new Error('useChart deve ser usado dentro de <ChartContainer>');
    return ctx;
};

export const ChartContainer = React.forwardRef(({ id, className, children, config, ...props }, ref) => {
    const uid = useId();
    const chartId = `chart-${id || uid.replace(/:/g, '')}`;

    return (
        <ChartContext.Provider value={{ config }}>
            <div
                ref={ref}
                data-chart={chartId}
                className={cn(
                    "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
                    "[&_.recharts-cartesian-grid_line]:stroke-border [&_.recharts-cartesian-grid_line]:opacity-40",
                    "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent",
                    "[&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
                    "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
                    className
                )}
                {...props}
            >
                <ChartStyle id={chartId} config={config} />
                <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
            </div>
        </ChartContext.Provider>
    );
});
ChartContainer.displayName = 'ChartContainer';

const ChartStyle = ({ id, config }) => {
    const entries = Object.entries(config || {}).filter(([, cfg]) => cfg.color);
    if (!entries.length) return null;
    const css = `[data-chart="${id}"] { ${entries.map(([key, cfg]) => `--color-${key}: ${cfg.color};`).join(' ')} }`;
    return <style dangerouslySetInnerHTML={{ __html: css }} />;
};

export const ChartTooltip = RechartsPrimitive.Tooltip;

export const ChartTooltipContent = React.forwardRef(({ active, payload, className, indicator = 'dot', hideLabel = false, label, labelFormatter, formatter }, ref) => {
    const { config } = useChart();
    if (!active || !payload?.length) return null;

    return (
        <div ref={ref} className={cn("min-w-[9rem] rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg", className)}>
            {!hideLabel && label != null && (
                <div className="mb-1.5 font-semibold text-foreground">{labelFormatter ? labelFormatter(label, payload) : label}</div>
            )}
            <div className="flex flex-col gap-1">
                {payload.map((item, i) => {
                    const key = item.dataKey || item.name;
                    const itemConfig = config?.[key];
                    const color = item.color || itemConfig?.color;
                    return (
                        <div key={i} className="flex items-center gap-2">
                            {indicator === 'dot' && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
                            <span className="text-muted-foreground">{itemConfig?.label || item.name}</span>
                            <span className="ml-auto font-semibold text-foreground">
                                {formatter ? formatter(item.value, item.name, item) : item.value}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
ChartTooltipContent.displayName = 'ChartTooltipContent';

export const ChartLegend = RechartsPrimitive.Legend;

export const ChartLegendContent = ({ payload, className }) => {
    const { config } = useChart();
    if (!payload?.length) return null;

    return (
        <div className={cn("flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-3", className)}>
            {payload.map((item, i) => {
                const key = item.dataKey || item.value;
                const itemConfig = config?.[key];
                return (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                        {itemConfig?.label || item.value}
                    </div>
                );
            })}
        </div>
    );
};
