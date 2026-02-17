'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';

// Helper to generate temporary IDs for frontend tracking
const generateId = () => Math.random().toString(36).substr(2, 9);

type AvailabilitySlot = {
    id?: string;
    _tempId?: string; // Internal ID for frontend tracking (sorting stability)
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
};

type AvailabilityBlock = {
    id?: string;
    _tempId?: string;
    startDate: string;
    endDate: string;
    reason: string;
};

type ConsultantOption = {
    id: string;
    name: string;
    role: 'CONSULTANT';
};

const WEEK_DAYS: Array<{ value: number; label: string }> = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda' },
    { value: 2, label: 'Terca' },
    { value: 3, label: 'Quarta' },
    { value: 4, label: 'Quinta' },
    { value: 5, label: 'Sexta' },
    { value: 6, label: 'Sabado' },
];

const createDefaultSlots = (): AvailabilitySlot[] => [
    { _tempId: generateId(), dayOfWeek: 1, startTime: '09:00', endTime: '12:00', isActive: true },
    { _tempId: generateId(), dayOfWeek: 1, startTime: '14:00', endTime: '18:00', isActive: true },
    { _tempId: generateId(), dayOfWeek: 2, startTime: '09:00', endTime: '12:00', isActive: true },
    { _tempId: generateId(), dayOfWeek: 2, startTime: '14:00', endTime: '18:00', isActive: true },
    { _tempId: generateId(), dayOfWeek: 3, startTime: '09:00', endTime: '12:00', isActive: true },
    { _tempId: generateId(), dayOfWeek: 3, startTime: '14:00', endTime: '18:00', isActive: true },
    { _tempId: generateId(), dayOfWeek: 4, startTime: '09:00', endTime: '12:00', isActive: true },
    { _tempId: generateId(), dayOfWeek: 4, startTime: '14:00', endTime: '18:00', isActive: true },
    { _tempId: generateId(), dayOfWeek: 5, startTime: '09:00', endTime: '12:00', isActive: true },
    { _tempId: generateId(), dayOfWeek: 5, startTime: '14:00', endTime: '18:00', isActive: true },
];

function toLocalDateTimeInput(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoDateTime(localValue: string): string {
    const parsed = new Date(localValue);
    return parsed.toISOString();
}

export default function DisponibilidadePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [canManageOthers, setCanManageOthers] = useState(false);
    const [consultants, setConsultants] = useState<ConsultantOption[]>([]);
    const [targetUserId, setTargetUserId] = useState('');
    const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
    const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);

    const sortedSlots = useMemo(
        () => [...slots].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)),
        [slots]
    );

    const loadAvailability = useCallback(async (requestedUserId?: string) => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const query = requestedUserId ? `?userId=${encodeURIComponent(requestedUserId)}` : '';
            const response = await fetch(`/api/crm/availability${query}`, { cache: 'no-store' });
            const data = await response.json();
            if (!response.ok) {
                setError(data?.error || 'Nao foi possivel carregar disponibilidade');
                return;
            }

            setCanManageOthers(Boolean(data?.permissions?.canManageOthers));
            setConsultants(Array.isArray(data?.consultants) ? data.consultants : []);
            setTargetUserId(data?.userId || '');

            const loadedSlots = Array.isArray(data?.slots) ? data.slots : [];
            const loadedBlocks = Array.isArray(data?.blocks) ? data.blocks : [];

            setSlots(loadedSlots.length > 0
                ? loadedSlots.map((slot: AvailabilitySlot) => ({
                    id: slot.id,
                    _tempId: slot.id || generateId(), // Ensure we always have a tracking ID
                    dayOfWeek: slot.dayOfWeek,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isActive: slot.isActive,
                }))
                : createDefaultSlots()
            );

            setBlocks(loadedBlocks.map((block: AvailabilityBlock) => ({
                id: block.id,
                _tempId: block.id || generateId(),
                startDate: toLocalDateTimeInput(block.startDate),
                endDate: toLocalDateTimeInput(block.endDate),
                reason: block.reason || '',
            })));
        } catch (requestError) {
            console.error('Error loading availability:', requestError);
            setError('Erro ao carregar disponibilidade');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAvailability();
    }, [loadAvailability]);

    const updateSlot = (idOrTempId: string, updates: Partial<AvailabilitySlot> | null) => {
        setSlots(prev => {
            if (updates === null) {
                // Delete
                return prev.filter(s => (s.id === idOrTempId || s._tempId === idOrTempId) === false);
            }
            // Update
            return prev.map(s => {
                if (s.id === idOrTempId || s._tempId === idOrTempId) {
                    return { ...s, ...updates };
                }
                return s;
            });
        });
    };

    const updateBlock = (idOrTempId: string, updates: Partial<AvailabilityBlock> | null) => {
        setBlocks(prev => {
            if (updates === null) {
                return prev.filter(b => (b.id === idOrTempId || b._tempId === idOrTempId) === false);
            }
            return prev.map(b => {
                if (b.id === idOrTempId || b._tempId === idOrTempId) {
                    return { ...b, ...updates };
                }
                return b;
            });
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const hasInvalidBlockDate = blocks.some((block) => !block.startDate || !block.endDate);
            if (hasInvalidBlockDate) {
                setError('Preencha data inicial e final de todos os bloqueios');
                setSaving(false);
                return;
            }

            // Basic validation
            const hasInvalidSlots = slots.some(s => s.startTime >= s.endTime);
            if (hasInvalidSlots) {
                setError('Existem slots com horario inicial maior ou igual ao final');
                setSaving(false);
                return;
            }

            const payload = {
                userId: canManageOthers ? targetUserId : undefined,
                slots: slots.map((slot) => ({
                    id: slot.id,
                    dayOfWeek: slot.dayOfWeek,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isActive: slot.isActive,
                })),
                blocks: blocks.map((block) => ({
                    id: block.id,
                    startDate: toIsoDateTime(block.startDate),
                    endDate: toIsoDateTime(block.endDate),
                    reason: block.reason || null,
                })), // Remove _tempId and format dates
            };

            const response = await fetch('/api/crm/availability', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data?.error || 'Nao foi possivel salvar disponibilidade');
                return;
            }

            setSuccess('Disponibilidade salva com sucesso');
            await loadAvailability(canManageOthers ? targetUserId : undefined);
        } catch (requestError) {
            console.error('Error saving availability:', requestError);
            setError('Erro ao salvar disponibilidade');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="h-[70vh] flex items-center justify-center text-gray-500">
                <Loader2 className="animate-spin mr-2" size={18} />
                Carregando disponibilidade...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Minha disponibilidade</h1>
                    <p className="text-sm text-gray-500">
                        Configure os horarios e bloqueios usados no agendamento publico.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {canManageOthers && (
                        <select
                            value={targetUserId}
                            onChange={(event) => {
                                const nextUserId = event.target.value;
                                setTargetUserId(nextUserId);
                                void loadAvailability(nextUserId);
                            }}
                            className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
                        >
                            {consultants.map((consultant) => (
                                <option key={consultant.id} value={consultant.id}>
                                    {consultant.name} ({consultant.role})
                                </option>
                            ))}
                        </select>
                    )}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-60 flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                        Salvar
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-3 rounded-lg bg-green-50 text-green-700 border border-green-200 text-sm">
                    {success}
                </div>
            )}

            <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Slots recorrentes</h2>
                    <button
                        type="button"
                        onClick={() => setSlots((prev) => [...prev, { _tempId: generateId(), dayOfWeek: 1, startTime: '09:00', endTime: '10:00', isActive: true }])}
                        className="text-sm text-primary font-medium inline-flex items-center gap-1"
                    >
                        <Plus size={14} /> Adicionar slot
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    {sortedSlots.map((slot) => {
                        const uniqueKey = slot.id || slot._tempId || `${slot.dayOfWeek}-${slot.startTime}`;
                        return (
                            <div key={uniqueKey} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                                <select
                                    value={slot.dayOfWeek}
                                    onChange={(event) => updateSlot(uniqueKey, { dayOfWeek: Number.parseInt(event.target.value, 10) })}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                >
                                    {WEEK_DAYS.map((day) => (
                                        <option key={day.value} value={day.value}>{day.label}</option>
                                    ))}
                                </select>
                                <input
                                    type="time"
                                    value={slot.startTime}
                                    onChange={(event) => updateSlot(uniqueKey, { startTime: event.target.value })}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                />
                                <input
                                    type="time"
                                    value={slot.endTime}
                                    onChange={(event) => updateSlot(uniqueKey, { endTime: event.target.value })}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                />
                                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={slot.isActive}
                                        onChange={(event) => updateSlot(uniqueKey, { isActive: event.target.checked })}
                                    />
                                    Ativo
                                </label>
                                <button
                                    type="button"
                                    onClick={() => updateSlot(uniqueKey, null)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-gray-500 hover:text-red-600 hover:border-red-200 inline-flex items-center justify-center gap-1"
                                >
                                    <Trash2 size={14} /> Remover
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">Bloqueios especificos</h2>
                    <button
                        type="button"
                        onClick={() => setBlocks((prev) => [...prev, { _tempId: generateId(), startDate: '', endDate: '', reason: '' }])}
                        className="text-sm text-primary font-medium inline-flex items-center gap-1"
                    >
                        <Plus size={14} /> Adicionar bloqueio
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    {blocks.length === 0 && (
                        <p className="text-sm text-gray-500">Nenhum bloqueio cadastrado.</p>
                    )}
                    {blocks.map((block) => {
                        const uniqueKey = block.id || block._tempId || `${block.startDate}-${block.endDate}`;
                        return (
                            <div key={uniqueKey} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                                <input
                                    type="datetime-local"
                                    value={block.startDate}
                                    onChange={(event) => updateBlock(uniqueKey, { startDate: event.target.value })}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                />
                                <input
                                    type="datetime-local"
                                    value={block.endDate}
                                    onChange={(event) => updateBlock(uniqueKey, { endDate: event.target.value })}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                />
                                <input
                                    type="text"
                                    value={block.reason}
                                    onChange={(event) => updateBlock(uniqueKey, { reason: event.target.value })}
                                    placeholder="Motivo (opcional)"
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => updateBlock(uniqueKey, null)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-gray-500 hover:text-red-600 hover:border-red-200 inline-flex items-center justify-center gap-1"
                                >
                                    <Trash2 size={14} /> Remover
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
