'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Download, ArrowUpRight } from 'lucide-react';
import { LeadRow } from './LeadRow';

type Lead = {
    id: string;
    name: string;
    email: string;
    company: string | null;
    status: string;
    score: number;
    grade: string | null;
    priority: string;
    source: string;
    pipelineStage: { name: string; color: string } | null;
    createdAt: string | Date;
    [key: string]: unknown;
};

function escapeCsv(value: unknown): string {
    const stringValue = String(value ?? '');
    return `"${stringValue.replace(/"/g, '""')}"`;
}

export function RecentLeadsTable({ leads }: { leads: Lead[] }) {
    const router = useRouter();

    const handleNavigate = (leadId: string) => {
        router.push(`/dashboard/leads/${leadId}`);
    };

    const handleExportCsv = () => {
        if (leads.length === 0) return;

        const header = ['Nome', 'Email', 'Empresa', 'Score', 'Grade', 'Status', 'Etapa', 'Data de criação'];
        const rows = leads.map((lead) => [
            lead.name,
            lead.email,
            lead.company || '',
            lead.score ?? 0,
            lead.grade || '',
            lead.status || '',
            lead.pipelineStage?.name || '',
            new Date(lead.createdAt).toISOString(),
        ]);

        const csvContent = [
            header.map(escapeCsv).join(','),
            ...rows.map((row) => row.map(escapeCsv).join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `leads-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-white rounded-xl shadow-md shadow-slate-200/50 border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg text-gray-900">Últimos Leads</h3>
                    <p className="text-sm text-gray-500 mt-1">Ordenado por data de criação.</p>
                </div>
                <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={leads.length === 0}
                    className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center disabled:opacity-50"
                >
                    <Download size={14} className="mr-2" /> Exportar CSV
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Grade</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {leads.map((lead) => {
                            const grade = lead.grade || '-';
                            const gradeColor = grade === 'A'
                                ? 'bg-green-600 text-white'
                                : grade === 'B'
                                    ? 'bg-blue-500 text-white'
                                    : grade === 'C'
                                        ? 'bg-yellow-400 text-yellow-900'
                                        : grade === 'D'
                                            ? 'bg-gray-400 text-white'
                                            : grade === 'F'
                                                ? 'bg-red-500 text-white'
                                                : 'bg-gray-200';

                            const initials = lead.name
                                .split(' ')
                                .map((part) => part[0])
                                .join('')
                                .substring(0, 2)
                                .toUpperCase();
                            const colors = ['bg-blue-100 text-blue-700', 'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700'];
                            const color = colors[lead.name.length % 3];

                            return (
                                <LeadRow
                                    key={lead.id}
                                    initials={initials}
                                    color={color}
                                    name={lead.name}
                                    email={lead.email}
                                    company={lead.company || 'N/A'}
                                    grade={grade}
                                    gradeColor={gradeColor}
                                    prob={lead.score ? `${lead.score}pts` : '-'}
                                    sla={new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                                    slaColor="text-gray-600"
                                    onClick={() => handleNavigate(lead.id)}
                                />
                            );
                        })}
                        {leads.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    Nenhum lead encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-center">
                <button
                    type="button"
                    onClick={() => router.push('/dashboard/leads')}
                    className="text-sm text-primary font-medium hover:underline flex items-center"
                >
                    Ver Todos os Leads <ArrowUpRight className="ml-1" size={14} />
                </button>
            </div>
        </div>
    );
}
