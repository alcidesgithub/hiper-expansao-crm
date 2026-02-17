'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { BarChart3, TrendingUp, Download, Calendar, DollarSign, Users, Loader2, AlertCircle } from 'lucide-react';
import {
    getReportsOverview,
    getExportData,
} from '../actions';

const ReportsCharts = dynamic(() => import('./ReportsCharts'), {
    ssr: false,
    loading: () => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="h-80 w-full rounded-lg bg-slate-100 animate-pulse" />
        </div>
    ),
});

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
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [chartsEnabled, setChartsEnabled] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
    const [leadsOverTime, setLeadsOverTime] = useState<LeadsOverTimePoint[]>([]);
    const [funnelData, setFunnelData] = useState<FunnelMetrics | null>(null);
    const [sourceData, setSourceData] = useState<SourceDistributionItem[]>([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const overview = await getReportsOverview(period);

            setMetrics(overview.financial as FinancialMetrics);
            setLeadsOverTime((overview.leadsOverTime as LeadsOverTimePoint[]) ?? []);
            setFunnelData(overview.funnel as FunnelMetrics);
            setSourceData((overview.source as SourceDistributionItem[]) ?? []);
        } catch (fetchError) {
            console.error('Error fetching report data:', fetchError);
            setError('Nao foi possivel carregar os relatorios. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        setMounted(true);
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
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Relatorios de Performance</h1>
                    <p className="mt-2 text-slate-500">Acompanhe as metricas vitais da expansao.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
                            className="appearance-none bg-white border border-gray-300 text-gray-700 px-4 py-2 pr-8 rounded-lg text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="7d">Ultimos 7 dias</option>
                            <option value="30d">Ultimos 30 dias</option>
                            <option value="90d">Ultimos 90 dias</option>
                            <option value="12m">Ultimos 12 meses</option>
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
                                <p className="text-sm text-gray-500 font-medium">Ticket Medio</p>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(metrics?.averageTicket ?? 0)}</h3>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                                    <BarChart3 size={24} />
                                </div>
                                <p className="text-sm text-gray-500 font-medium">Taxa de Conversao</p>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">{conversionRate.toFixed(1)}%</h3>
                            <p className="text-xs text-gray-400 mt-1">{totalConverted} convertidos no periodo</p>
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

                    {chartsEnabled ? (
                        <ReportsCharts
                            mounted={mounted}
                            leadsOverTime={leadsOverTime}
                            sourceData={sourceData}
                            funnelData={funnelData}
                        />
                    ) : (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Visualizacoes de Grafico</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Carregue os graficos sob demanda para manter a pagina inicial mais leve.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onMouseEnter={() => void import('./ReportsCharts')}
                                    onFocus={() => void import('./ReportsCharts')}
                                    onClick={() => setChartsEnabled(true)}
                                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
                                >
                                    Carregar graficos
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
