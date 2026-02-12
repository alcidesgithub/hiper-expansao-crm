import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string;
    change?: string;
    changeType?: 'positive' | 'negative';
    subtext?: string;
    icon: React.ReactNode;
}

export function MetricCard({ title, value, change, changeType, subtext, icon }: MetricCardProps) {
    return (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:border-primary/20 transition-all">
            <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    {icon}
                </span>
            </div>
            <div className="flex items-baseline flex-col">
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                {change && (
                    <span className={`text-xs font-medium flex items-center mt-1 ${changeType === 'positive' ? 'text-green-600' : 'text-gray-500'}`}>
                        {changeType === 'positive' && <TrendingUp size={12} className="mr-0.5" />}
                        {changeType === 'negative' && <TrendingDown size={12} className="mr-0.5" />}
                        {change}
                    </span>
                )}
                {subtext && <span className="text-xs font-medium text-gray-400 mt-1">{subtext}</span>}
            </div>
        </div>
    );
}
