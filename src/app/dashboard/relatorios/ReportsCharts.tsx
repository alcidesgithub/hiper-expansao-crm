'use client';

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export interface LeadsOverTimePoint {
    date: string;
    count: number;
}

export interface FunnelMetrics {
    funnel: Array<{ step: string; count: number }>;
    dropoffRate: number;
}

export interface SourceDistributionItem {
    source: string;
    count: number;
}

interface ReportsChartsProps {
    mounted: boolean;
    leadsOverTime: LeadsOverTimePoint[];
    sourceData: SourceDistributionItem[];
    funnelData: FunnelMetrics | null;
}

export default function ReportsCharts({ mounted, leadsOverTime, sourceData, funnelData }: ReportsChartsProps) {
    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Volume de Leads</h3>
                    <div className="h-80 w-full">
                        {mounted && (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200} debounce={100}>
                                <AreaChart data={leadsOverTime}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#DF362D" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#DF362D" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#9CA3AF"
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(val) =>
                                            new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                                        }
                                    />
                                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: 'none',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        }}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#DF362D"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorCount)"
                                        name="Leads"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Origem dos Leads</h3>
                    <div className="h-80 w-full">
                        {mounted && (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200} debounce={100}>
                                <PieChart>
                                    <Pie
                                        data={sourceData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="count"
                                        nameKey="source"
                                    >
                                        {sourceData.map((entry, index) => (
                                            <Cell key={`${entry.source}-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800">Funil de Conversao</h3>
                        <div className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            Drop-off Total: {funnelData?.dropoffRate ?? 0}%
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        {mounted && (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200} debounce={100}>
                                <BarChart data={funnelData?.funnel ?? []} layout="horizontal">
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="step" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: 'none',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        }}
                                    />
                                    <Bar dataKey="count" fill="#114F99" radius={[4, 4, 0, 0]} barSize={60} name="Leads" />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
