'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MiniCalendarProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
}

export default function MiniCalendar({ currentDate, onDateChange }: MiniCalendarProps) {
    const [viewDate, setViewDate] = useState(currentDate);

    // Update view if the selected date changes externally and it's far from current view?
    // Actually, usually users want to see the selected date, but if they navigated away, maybe not.
    // Let's sync it only if it drifts too much or on initial mount. 
    // For now, let's keep them loosely coupled. If user clicks "Today" in parent, parent updates currentDate. 
    // We should probably update viewDate to match currentDate when currentDate changes.
    useEffect(() => {
        setViewDate(currentDate);
    }, [currentDate]);

    const handlePreviousMonth = () => setViewDate(prev => subMonths(prev, 1));
    const handleNextMonth = () => setViewDate(prev => addMonths(prev, 1));

    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate
    });

    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    return (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-sm text-gray-900 capitalize">
                    {format(viewDate, 'MMMM yyyy', { locale: ptBR })}
                </h3>
                <div className="flex gap-1">
                    <button
                        onClick={handlePreviousMonth}
                        className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                        aria-label="Mês anterior"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={handleNextMonth}
                        className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                        aria-label="Próximo mês"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-gray-400 font-medium">
                {weekDays.map((day, i) => (
                    <div key={i}>{day}</div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
                {calendarDays.map((day) => {
                    const isSelected = isSameDay(day, currentDate);
                    const isCurrentMonth = isSameMonth(day, viewDate);
                    const isTodayDate = isToday(day);

                    return (
                        <button
                            key={day.toString()}
                            onClick={() => onDateChange(day)}
                            className={`
                                h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs transition-all relative
                                ${isSelected
                                    ? 'bg-primary text-white shadow-md shadow-primary/30 font-semibold'
                                    : isTodayDate
                                        ? 'text-primary font-bold bg-primary/10'
                                        : 'hover:bg-gray-200 text-gray-700'
                                }
                                ${!isCurrentMonth && !isSelected ? 'text-gray-300' : ''}
                            `}
                        >
                            {format(day, 'd')}
                            {/* Optional: Add a dot for events if we had that data */}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
