'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Slot {
    time: string;
    available: boolean;
    consultorId?: string;
    consultorName?: string;
}

function formatLocalYmd(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function CalendarContent() {
    const searchParams = useSearchParams();
    const leadId = searchParams.get('leadId') || '';
    const token = searchParams.get('token') || '';

    const [selectedDate, setSelectedDate] = useState('');
    const [slots, setSlots] = useState<Slot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [booking, setBooking] = useState(false);
    const [booked, setBooked] = useState(false);
    const [bookingResult, setBookingResult] = useState<{ date: string; time: string; consultorName: string } | null>(null);
    const [error, setError] = useState('');

    const availableDates = useCallback(() => {
        const dates: Array<{ value: string; label: string }> = [];
        const now = new Date();
        let date = new Date(now);
        date.setDate(date.getDate() + 1);

        while (dates.length < 14) {
            const day = date.getDay();
            if (day !== 0 && day !== 6) {
                dates.push({
                    value: formatLocalYmd(date),
                    label: date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }),
                });
            }
            date = new Date(date);
            date.setDate(date.getDate() + 1);
        }

        return dates;
    }, []);

    useEffect(() => {
        if (!selectedDate) return;

        setLoading(true);
        setSelectedSlot(null);
        setError('');

        fetch(`/api/schedule?date=${selectedDate}`)
            .then((response) => response.json())
            .then((data) => {
                if (data.error) {
                    setError(data.error);
                    setSlots([]);
                    return;
                }
                setSlots(data.slots || []);
            })
            .catch(() => setError('Erro ao carregar horários.'))
            .finally(() => setLoading(false));
    }, [selectedDate]);

    const handleBook = async () => {
        if (!selectedSlot || !leadId || !token || !selectedSlot.consultorId) {
            setError('Selecione uma data e horário válidos.');
            return;
        }

        setBooking(true);
        setError('');

        try {
            const response = await fetch('/api/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadId,
                    token,
                    consultorId: selectedSlot.consultorId,
                    date: selectedDate,
                    time: selectedSlot.time,
                    notes,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                setError(data.error || 'Erro ao agendar reunião.');
                return;
            }

            setBooked(true);
            setBookingResult(data.meeting);
        } catch {
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setBooking(false);
        }
    };

    const dates = availableDates();

    if (!leadId || !token) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 border border-gray-100 text-center">
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Agendamento indisponível</h1>
                    <p className="text-sm text-gray-600">Não foi possível validar esta sessão de agendamento.</p>
                </div>
            </div>
        );
    }

    if (booked && bookingResult) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
                <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Reunião agendada com sucesso</h1>
                    <p className="text-gray-600 mb-6">Você receberá um email de confirmação em breve.</p>

                    <div className="bg-gray-50 rounded-xl p-6 text-left mb-6">
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Data</span>
                                <span className="font-semibold">{bookingResult.date}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Horário</span>
                                <span className="font-semibold">{bookingResult.time}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Consultor</span>
                                <span className="font-semibold">{bookingResult.consultorName}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
                        <p className="text-sm text-amber-800">
                            Tenha em mãos dados de faturamento e os principais desafios atuais para aproveitar melhor a reunião.
                        </p>
                    </div>

                    <Link
                        href="/"
                        className="inline-block w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
                    >
                        Voltar ao site
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-8 text-white text-center">
                    <h1 className="text-2xl font-bold mb-2">Agende sua reunião</h1>
                    <p className="text-red-100">Escolha o melhor dia e horário para conversar com nosso consultor</p>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">1. Escolha a data</h2>
                        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
                            {dates.map((date) => (
                                <button
                                    key={date.value}
                                    onClick={() => setSelectedDate(date.value)}
                                    className={`px-2 py-3 rounded-lg text-sm font-medium transition-all text-center ${selectedDate === date.value
                                        ? 'bg-red-600 text-white shadow-md scale-105'
                                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                                        }`}
                                >
                                    {date.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedDate && (
                        <div>
                            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">2. Escolha o horário</h2>
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
                                    <span className="ml-3 text-gray-500">Verificando disponibilidade...</span>
                                </div>
                            ) : slots.length === 0 ? (
                                <p className="text-gray-500 text-center py-6">Nenhum horário disponível neste dia.</p>
                            ) : (
                                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                                    {slots.map((slot) => (
                                        <button
                                            key={slot.time}
                                            onClick={() => slot.available && setSelectedSlot(slot)}
                                            disabled={!slot.available}
                                            className={`py-3 rounded-lg text-sm font-medium transition-all ${!slot.available
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                                                : selectedSlot?.time === slot.time
                                                    ? 'bg-red-600 text-white shadow-md scale-105'
                                                    : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                                }`}
                                        >
                                            {slot.time}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {selectedSlot && (
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">3. Observações (opcional)</h2>
                                <textarea
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                    placeholder="Alguma observação para o consultor?"
                                    className="w-full border border-gray-300 rounded-xl p-4 text-sm placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                                    rows={3}
                                />
                            </div>

                            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                <h3 className="font-semibold text-gray-800 mb-3">Resumo</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Data</span>
                                        <span className="font-medium">
                                            {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Horário</span>
                                        <span className="font-medium">
                                            {selectedSlot.time} - {(Number.parseInt(selectedSlot.time.split(':')[0], 10) + 1).toString().padStart(2, '0')}:00
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Consultor</span>
                                        <span className="font-medium">{selectedSlot.consultorName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Duração</span>
                                        <span className="font-medium">1 hora</span>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleBook}
                                disabled={booking}
                                className="w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg hover:shadow-xl"
                            >
                                {booking ? (
                                    <span className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                                        Agendando...
                                    </span>
                                ) : (
                                    'Confirmar agendamento'
                                )}
                            </button>
                        </div>
                    )}

                    {error && !selectedSlot && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function CalendarFunnelPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
                </div>
            }
        >
            <CalendarContent />
        </Suspense>
    );
}
