import React from 'react';

interface GradeRowProps {
    grade: string;
    label: string;
    count: string | number;
    percent: number;
    color: string;
    action: string;
}

export function GradeRow({ grade, label, count, percent, color, action }: GradeRowProps) {
    return (
        <div className="relative">
            <div className="flex justify-between text-sm mb-1">
                <span className="font-bold text-gray-900 w-8">{grade}</span>
                <span className="font-medium text-gray-600 flex-1">{label}</span>
                <span className="font-bold text-gray-900 mx-3">{count} <span className="text-xs font-normal text-gray-400">({percent}%)</span></span>
                <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{action}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
                <div className={`${color} h-2 rounded-full`} style={{ width: `${percent}%` }}></div>
            </div>
        </div>
    );
}
