import React from 'react';
import { MoreVertical } from 'lucide-react';

interface LeadRowProps {
    initials: string;
    color: string;
    name: string;
    email: string;
    company: string;
    grade: string;
    gradeColor: string;
    prob: string;
    sla: string;
    slaColor: string;
    onClick?: () => void;
}

export function LeadRow({ initials, color, name, email, company, grade, gradeColor, prob, sla, slaColor, onClick }: LeadRowProps) {
    return (
        <tr className="group hover:bg-gray-50 transition-colors cursor-pointer" onClick={onClick}>
            <td className="px-6 py-4">
                <div className="flex items-center">
                    <div className={`h-8 w-8 rounded-full ${color} flex items-center justify-center font-bold text-xs mr-3`}>{initials}</div>
                    <div>
                        <div className="font-medium text-gray-900">{name}</div>
                        <div className="text-xs text-gray-500">{email}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 text-sm text-gray-600">{company}</td>
            <td className="px-6 py-4 text-center">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded font-bold text-xs ${gradeColor}`}>
                    {grade}
                </span>
            </td>
            <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                {prob}
            </td>
            <td className="px-6 py-4">
                <span className={`text-xs font-mono ${slaColor} font-bold`}>
                    {sla}
                </span>
            </td>
            <td className="px-6 py-4 text-sm">
                <button className="text-gray-400 hover:text-primary transition-colors">
                    <MoreVertical size={18} />
                </button>
            </td>
        </tr>
    );
}
