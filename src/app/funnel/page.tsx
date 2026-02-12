'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { submitStepOne } from './actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRight, User, Phone, Mail, Building2 } from 'lucide-react';
import { loadDraft, saveDraft } from './_utils/draft';

const STEP_ONE_DRAFT_KEY = 'funnel:step1';
const GATE_APPROVED_KEY = 'funnel:gate:approved';

const stepOneSchema = z.object({
    fullName: z.string().trim().min(3, 'Nome completo é obrigatório'),
    email: z.string().trim().email('Email inválido'),
    phone: z.string().trim().min(10, 'Telefone inválido'),
    companyName: z.string().trim().min(2, 'Nome da farmácia/rede é obrigatório'),
});

type StepOneData = z.infer<typeof stepOneSchema>;

const defaultValues: StepOneData = {
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
};

function FunnelStepOneContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const gateParam = searchParams.get('gate');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [isGateVerified, setIsGateVerified] = useState(false);
    const didLoadDraftRef = useRef(false);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isValid },
    } = useForm<StepOneData>({
        resolver: zodResolver(stepOneSchema),
        mode: 'onChange',
        defaultValues,
    });

    useEffect(() => {
        if (gateParam === 'decisor') {
            window.localStorage.setItem(GATE_APPROVED_KEY, 'true');
            setIsGateVerified(true);
            return;
        }

        const hasApprovedGate = window.localStorage.getItem(GATE_APPROVED_KEY) === 'true';
        if (!hasApprovedGate) {
            router.replace('/funnel/gate');
            return;
        }

        setIsGateVerified(true);
    }, [gateParam, router]);

    useEffect(() => {
        const draft = loadDraft<StepOneData>(STEP_ONE_DRAFT_KEY);
        if (draft) {
            reset({
                ...defaultValues,
                ...draft,
            });
        }
        didLoadDraftRef.current = true;
    }, [reset]);

    useEffect(() => {
        const subscription = watch((values) => {
            if (!didLoadDraftRef.current) return;
            saveDraft(STEP_ONE_DRAFT_KEY, {
                fullName: values.fullName || '',
                email: values.email || '',
                phone: values.phone || '',
                companyName: values.companyName || '',
            });
        });
        return () => subscription.unsubscribe();
    }, [watch]);

    const isSubmitDisabled = useMemo(
        () => isSubmitting || !isValid,
        [isSubmitting, isValid]
    );

    const onSubmit = async (data: StepOneData) => {
        setIsSubmitting(true);
        setFormError('');

        try {
            const result = await submitStepOne({
                ...data,
                isDecisionMaker: 'yes',
            });
            if (result?.error) {
                setFormError(result.error);
            }
        } catch (error) {
            console.error(error);
            setFormError('Não foi possível continuar. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isGateVerified) {
        return (
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-gray-100 p-10 text-center">
                <p className="text-slate-500">Validando pré-qualificação...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 h-2 w-full">
                <div className="bg-primary h-full w-[25%] transition-all duration-500 ease-out" />
            </div>

            <div className="p-8 md:p-10">
                <div className="text-center mb-8">
                    <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
                        Passo 1 de 5
                    </span>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                        Vamos começar!
                    </h1>
                    <p className="text-slate-500">
                        Preencha seus dados para iniciarmos sua análise de expansão.
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome completo</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    {...register('fullName')}
                                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${errors.fullName ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'} rounded-lg outline-none transition-all`}
                                    placeholder="Seu nome"
                                />
                            </div>
                            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email corporativo</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <input
                                        {...register('email')}
                                        type="email"
                                        className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'} rounded-lg outline-none transition-all`}
                                        placeholder="seu@email.com"
                                    />
                                </div>
                                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">WhatsApp / Telefone</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <input
                                        {...register('phone')}
                                        type="tel"
                                        className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${errors.phone ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'} rounded-lg outline-none transition-all`}
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome da farmácia / rede</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    {...register('companyName')}
                                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${errors.companyName ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'} rounded-lg outline-none transition-all`}
                                    placeholder="Ex: Farmácias Estrela"
                                />
                            </div>
                            {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName.message}</p>}
                        </div>
                    </div>

                    {formError && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                            {formError}
                        </p>
                    )}

                    {!isValid && (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                            Preencha todos os campos obrigatórios para continuar.
                        </p>
                    )}

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitDisabled}
                            className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Processando...' : (
                                <>
                                    Continuar <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                        <p className="text-xs text-center text-slate-400 mt-4">
                            Ao continuar, você concorda com nossa Política de Privacidade.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function FunnelStepOne() {
    return (
        <Suspense fallback={<div className="text-center p-12">Carregando...</div>}>
            <FunnelStepOneContent />
        </Suspense>
    );
}
