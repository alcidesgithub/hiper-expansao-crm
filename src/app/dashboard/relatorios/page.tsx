'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Download, Calendar, DollarSign, Users, Loader2, AlertCircle } from 'lucide-react';
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
import {
    getFinancialMetrics,
    getLeadsOverTime,
    getFunnelMetrics,
    getSourceDistribution,
    getExportData,
} from '../actions';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

type ReportPeriod = '7d' | '30d' | '90d' | '12m';

interface FinancialMetrics {
    totalRevenue: number;
    averageTicket: number;
    conversionRate: number;
    totalConverted: number;
}

interface LeadsOverTimePoint {
    date: string;
    count: number;
}

interface FunnelMetrics {
    funnel: Array<{ step: string; count: number }>;
    dropoffRate: number;
}

interface SourceDistributionItem {
    source: string;
    count: number;
}

interface ExportLeadRow {
    name: string;
    email: string;
    phone: string;
    company: string | null;
    status: string;
    source: string;
    grade: string | null;
    estimatedValue: number;
    createdAt: string | Date;
    convertedAt: string | Date | null;
}

function escapeCsv(value: unknown): string {
    if (value === null || value === undefined) return '""';
    const text = String(value).replace(/"/g, '""');
    return `"${text}"`;
}

function formatDate(value: string | Date | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR');
}

export default function ReportsPage() {
    const [period, setPeriod] = useState<ReportPeriod>('30d');
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
    const [leadsOverTime, setLeadsOverTime] = useState<LeadsOverTimePoint[]>([]);
    const [funnelData, setFunnelData] = useState<FunnelMetrics | null>(null);
    const [sourceData, setSourceData] = useState<SourceDistributionItem[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [fin, time, funnel, source] = await Promise.all([
                getFinancialMetrics(period),
                getLeadsOverTime(period),
                getFunnelMetrics(period),
                getSourceDistribution(period),
            ]);

            setMetrics(fin as FinancialMetrics);
            setLeadsOverTime((time as LeadsOverTimePoint[]) ?? []);
            setFunnelData(funnel as FunnelMetrics);
            setSourceData((source as SourceDistributionItem[]) ?? []);
        } catch (fetchError) {
            console.error('Error fetching report data:', fetchError);
            setError('Não foi possível carregar os relatórios. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleExport = async () => {
        if (exporting) return;

        setExporting(true);
        try {
            const data = (await getExportData(period)) as ExportLeadRow[];

            const headers = [
                'Nome',
                'Email',
                'Telefone',
                'Empresa',
                'Status',
                'Origem',
                'Nota',
                'Valor Estimado',
                'Criado em',
                'Convertido em',
            ];

            const rows = data.map((row) =>
                [
                    row.name,
                    row.email,
                    row.phone,
                    row.company || '',
                    row.status,
                    row.source,
                    row.grade || '',
                    row.estimatedValue ?? 0,
                    formatDate(row.createdAt),
                    formatDate(row.convertedAt),
                ]
                    .map(escapeCsv)
                    .join(',')
            );

            const csvContent = `\uFEFF${[headers.map(escapeCsv).join(','), ...rows].join('\n')}`;
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `relatorio_leads_${period}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (exportError) {
            console.error('Error exporting data:', exportError);
            alert('Erro ao exportar dados.');
        } finally {
            setExporting(false);
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const totalNewLeads = leadsOverTime.reduce((acc, curr) => acc + curr.count, 0);
    const conversionRate = metrics?.conversionRate ?? 0;
    const totalConverted = metrics?.totalConverted ?? 0;

    return (
        <div className="w-full bg-slate-50 min-h-full font-sans text-slate-800 p-6 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Relatórios de Performance</h1>
                    <p className="mt-2 text-slate-500">Acompanhe as métricas vitais da expansão.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
                            className="appearance-none bg-white border border-gray-300 text-gray-700 px-4 py-2 pr-8 rounded-lg text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="7d">Últimos 7 dias</option>
                            <option value="30d">Últimos 30 dias</option>
                            <option value="90d">Últimos 90 dias</option>
                            <option value="12m">Últimos 12 meses</option>
                        </select>
                        <Calendar className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={16} />
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {exporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                        Exportar CSV
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            ) : error ? (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200">
                    <div className="flex items-center gap-2 text-red-700 font-medium">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={() => void loadData()}
                        className="mt-4 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                        Tentar novamente
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                                    <DollarSign size={24} />
                                </div>
                                <p className="text-sm text-gray-500 font-medium">Receita Total (Ganho)</p>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(metrics?.totalRevenue ?? 0)}</h3>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                    <TrendingUp size={24} />
                                </div>
                                <p className="text-sm text-gray-500 font-medium">Ticket Médio</p>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(metrics?.averageTicket ?? 0)}</h3>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                                    <BarChart3 size={24} />
                                </div>
                                <p className="text-sm text-gray-500 font-medium">Taxa de Conversão</p>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">{conversionRate.toFixed(1)}%</h3>
                            <p className="text-xs text-gray-400 mt-1">{totalConverted} convertidos no período</p>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                                    <Users size={24} />
                                </div>
                                <p className="text-sm text-gray-500 font-medium">Novos Leads</p>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">{totalNewLeads}</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Volume de Leads</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Origem dos Leads</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-800">Funil de Conversão</h3>
                                <div className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                    Drop-off Total: {funnelData?.dropoffRate ?? 0}%
                                </div>
                            </div>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
