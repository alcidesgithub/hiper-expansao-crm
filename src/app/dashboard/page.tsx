import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
    Users,
    Filter,
    Calendar,
    TrendingUp,
    CheckCircle,
    Clock,
    BarChart3,
    Target,
    PieChart,
} from 'lucide-react';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { RecentLeadsTable } from '@/components/dashboard/RecentLeadsTable';
import { getDashboardMetrics, getRecentLeads, getFunnelGateAnalytics, getFunnelMetrics, getUpcomingMeetings } from './actions';
import { auth } from '@/auth';
import { canAny } from '@/lib/permissions';

const PERIOD_OPTIONS = [
    { key: '7d', label: '7 dias' },
    { key: '30d', label: '30 dias' },
    { key: '90d', label: '90 dias' },
    { key: '12m', label: '12 meses' },
] as const;

type DashboardPeriod = (typeof PERIOD_OPTIONS)[number]['key'];
type DashboardSearchParams = Promise<{ period?: string }>;
type UpcomingMeeting = Awaited<ReturnType<typeof getUpcomingMeetings>>[number];

function normalizePeriod(value?: string): DashboardPeriod {
    return PERIOD_OPTIONS.some((option) => option.key === value)
        ? (value as DashboardPeriod)
        : '30d';
}

function getPeriodLabel(period: DashboardPeriod): string {
    return PERIOD_OPTIONS.find((option) => option.key === period)?.label || '30 dias';
}

export default async function DashboardPage({ searchParams }: { searchParams?: DashboardSearchParams }) {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role;
    const canAccessDashboard = canAny(role, ['dashboard:executive', 'dashboard:operational', 'dashboard:sdr']);
    if (!canAccessDashboard) {
        redirect('/dashboard/leads');
    }

    const resolvedSearch = searchParams ? await searchParams : undefined;
    const period = normalizePeriod(resolvedSearch?.period);
    const periodLabel = getPeriodLabel(period);

    const [metrics, recentLeads, funnelData, upcomingMeetings] = await Promise.all([
        getDashboardMetrics(period),
        getRecentLeads(),
        getFunnelMetrics(period),
        getUpcomingMeetings(5),
    ]);
    const gateAnalytics = await getFunnelGateAnalytics(period);

    const gradeColors: Record<string, string> = {
        A: 'bg-green-500',
        B: 'bg-blue-500',
        C: 'bg-yellow-500',
        D: 'bg-orange-500',
        F: 'bg-red-500',
        'N/A': 'bg-gray-400',
    };

    const maxFunnelCount = Math.max(...funnelData.funnel.map((step) => step.count), 1);
    const maxSourceCount = Math.max(...metrics.sourceDistribution.map((source) => source.count), 1);

    return (
        <div className="space-y-6 p-6 font-sans text-slate-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Dashboard Executivo</h2>
                    <p className="text-sm text-slate-500">
                        Sistema de Qualificação em tempo real ({new Date().toLocaleDateString('pt-BR')})
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {PERIOD_OPTIONS.map((option) => {
                        const isActive = option.key === period;
                        return (
                            <Link
                                key={option.key}
                                href={{ pathname: '/dashboard', query: { period: option.key } }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                    isActive
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary/30'
                                }`}
                            >
                                {option.label}
                            </Link>
                        );
                    })}
                    <span className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 flex items-center shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" /> Operação ativa
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <MetricCard title="Total Leads" value={metrics.totalLeads.toString()} change={periodLabel} icon={<Users size={20} />} />
                <MetricCard title="Taxa de Conversão" value={`${metrics.conversionRate}%`} changeType="positive" icon={<TrendingUp size={20} />} />
                <MetricCard title="Qualificados" value={metrics.qualifiedLeads.toString()} subtext="Leads prontos" changeType="positive" icon={<Filter size={20} />} />
                <MetricCard title="Convertidos" value={metrics.convertedLeads.toString()} subtext="Ganhos" changeType="positive" icon={<CheckCircle size={20} />} />
                <MetricCard title="Reuniões Pendentes" value={metrics.upcomingMeetings.toString()} subtext="Agendadas" icon={<Calendar size={20} />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 size={18} className="text-red-600" />
                        <h3 className="font-semibold text-gray-900">Funil de Qualificação</h3>
                        <span className="ml-auto text-xs text-gray-400">Drop-off: {funnelData.dropoffRate}%</span>
                    </div>
                    <div className="space-y-3">
                        {funnelData.funnel.map((step) => (
                            <div key={step.step} className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 w-24 text-right truncate">{step.step}</span>
                                <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden relative">
                                    <div
                                        className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                                        style={{ width: `${Math.max((step.count / maxFunnelCount) * 100, 8)}%` }}
                                    >
                                        <span className="text-xs text-white font-bold">{step.count}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Target size={18} className="text-red-600" />
                            <h3 className="font-semibold text-gray-900">Distribuição por Grade</h3>
                        </div>
                        {metrics.gradeDistribution.length > 0 ? (
                            <div className="flex items-end gap-2 h-32">
                                {['A', 'B', 'C', 'D', 'F'].map((grade) => {
                                    const gradeData = metrics.gradeDistribution.find((item) => item.grade === grade);
                                    const count = gradeData?.count || 0;
                                    const maxCount = Math.max(...metrics.gradeDistribution.map((item) => item.count), 1);
                                    const height = count > 0 ? Math.max((count / maxCount) * 100, 10) : 5;
                                    return (
                                        <div key={grade} className="flex-1 flex flex-col items-center gap-1">
                                            <span className="text-xs font-bold text-gray-700">{count}</span>
                                            <div
                                                className={`w-full ${gradeColors[grade]} rounded-t-lg transition-all duration-500 opacity-80`}
                                                style={{ height: `${height}%` }}
                                            />
                                            <span className="text-xs font-semibold text-gray-600">{grade}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-8">Nenhum lead qualificado ainda</p>
                        )}
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={18} className="text-red-600" />
                            <h3 className="font-semibold text-gray-900">Fontes</h3>
                        </div>
                        {metrics.sourceDistribution.length > 0 ? (
                            <div className="space-y-2">
                                {metrics.sourceDistribution.slice(0, 5).map((source) => (
                                    <div key={source.source} className="flex items-center gap-2">
                                        <span className="text-xs text-gray-600 w-20 truncate">{source.source}</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${(source.count / maxSourceCount) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium text-gray-700 w-8 text-right">{source.count}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>
                        )}
                    </div>
                </div>
            </div>

            {gateAnalytics && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <PieChart size={18} className="text-red-600" />
                            <h3 className="font-semibold text-gray-900">Gate de Decisão</h3>
                        </div>
                        <span className="text-xs text-gray-500">
                            Decisores: {gateAnalytics.totals.decisorRate}%
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Total</p>
                            <p className="text-lg font-bold text-gray-900">{gateAnalytics.totals.total}</p>
                        </div>
                        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                            <p className="text-xs text-green-700">Decisor</p>
                            <p className="text-lg font-bold text-green-700">{gateAnalytics.totals.decisor}</p>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <p className="text-xs text-amber-700">Influenciador</p>
                            <p className="text-lg font-bold text-amber-700">{gateAnalytics.totals.influenciador}</p>
                        </div>
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                            <p className="text-xs text-blue-700">Pesquisador</p>
                            <p className="text-lg font-bold text-blue-700">{gateAnalytics.totals.pesquisador}</p>
                        </div>
                    </div>

                    {gateAnalytics.totals.total > 0 ? (
                        <div className="space-y-2">
                            <div>
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Decisor</span>
                                    <span>{gateAnalytics.totals.decisor}</span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 rounded-full"
                                        style={{ width: `${(gateAnalytics.totals.decisor / gateAnalytics.totals.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Influenciador</span>
                                    <span>{gateAnalytics.totals.influenciador}</span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                    <div
                                        className="h-full bg-amber-500 rounded-full"
                                        style={{ width: `${(gateAnalytics.totals.influenciador / gateAnalytics.totals.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Pesquisador</span>
                                    <span>{gateAnalytics.totals.pesquisador}</span>
                                </div>
                                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${(gateAnalytics.totals.pesquisador / gateAnalytics.totals.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">Sem eventos de gate no período selecionado.</p>
                    )}
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Clock size={18} className="text-red-600" />
                    <h3 className="font-semibold text-gray-900">Próximas Reuniões</h3>
                </div>

                {upcomingMeetings.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {upcomingMeetings.map((meeting: UpcomingMeeting) => (
                            <div key={meeting.id} className="py-3 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                                        <Calendar size={18} className="text-red-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{meeting.lead?.name || 'Lead'}</p>
                                        <p className="text-xs text-gray-500 truncate">{meeting.lead?.company || ''}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900">
                                        {new Date(meeting.startTime).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(meeting.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        {' - '}
                                        {new Date(meeting.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div>
                                    <span
                                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                                            meeting.lead?.grade === 'A'
                                                ? 'bg-green-100 text-green-700'
                                                : meeting.lead?.grade === 'B'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        Grade {meeting.lead?.grade || 'N/A'}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-400">{meeting.user?.name}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">Nenhuma reunião agendada para os próximos dias.</p>
                )}
            </div>

            <RecentLeadsTable leads={recentLeads} />
        </div>
    );
}
