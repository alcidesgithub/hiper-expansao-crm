'use client';

import React from 'react';
import { useActionState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, Lock, Eye, LogIn, LockKeyhole } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { authenticate } from '@/app/lib/actions';
import { toast } from 'sonner';

export default function LoginPage() {
    const [errorMessage, dispatch, isPending] = useActionState(authenticate, undefined);

    useEffect(() => {
        if (errorMessage) {
            toast.error(errorMessage);
        }
    }, [errorMessage]);

    return (
        <div className="h-screen w-full flex overflow-hidden bg-background-light font-sans">
            {/* Left Side - Brand & Info */}
            <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 relative bg-secondary overflow-hidden flex-col justify-between p-12 text-white">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}></div>

                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-primary/20 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-400/20 blur-3xl"></div>

                <div className="relative z-10">
                    <Image
                        src="/logo-branca.webp"
                        alt="Expansão Hiperfarma"
                        width={180}
                        height={50}
                        className="h-10 w-auto"
                        priority
                    />
                </div>

                <div className="relative z-10 max-w-lg mb-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium mb-6">
                        <span className="w-2 h-2 rounded-full bg-primary"></span> Expansão Hiperfarma
                    </div>
                    <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">Acesse o CRM de Expansão</h1>
                    <p className="text-blue-100 text-lg leading-relaxed">Acesse o painel de expansão para gerenciar leads, acompanhar métricas de vendas e conectar oportunidades em tempo real.</p>
                </div>

                <div className="relative z-10 flex justify-between items-end text-sm text-blue-200">
                    <div>
                        <p>© {new Date().getFullYear()} Hiperfarma. Todos os direitos reservados.</p>
                    </div>
                    <div className="flex gap-4">
                        <Link href="/termos" className="hover:text-white transition-colors">Termos</Link>
                        <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 xl:w-5/12 flex items-center justify-center bg-white p-6 sm:p-12 relative">
                <div className="w-full max-w-md space-y-8">
                    <div className="lg:hidden flex justify-center mb-8">
                        <Logo height={32} />
                    </div>

                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Bem-vindo de volta!</h2>
                        <p className="mt-2 text-sm text-slate-500">Por favor, insira suas credenciais para acessar o CRM.</p>
                    </div>

                    <form className="mt-8 space-y-6" action={dispatch}>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail profissional</label>
                                <div className="relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Mail size={20} /></div>
                                    <input name="email" type="email" required className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent sm:text-sm transition-shadow" placeholder="nome@hiperfarma.com.br" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                                <div className="relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Lock size={20} /></div>
                                    <input name="password" type="password" minLength={12} required className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent sm:text-sm transition-shadow" placeholder="••••••••" />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-slate-400 hover:text-slate-600"><Eye size={20} /></div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input type="checkbox" id="remember-me" className="h-4 w-4 text-secondary focus:ring-secondary border-slate-300 rounded cursor-pointer" />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 cursor-pointer select-none">Lembrar de mim</label>
                            </div>
                            <div className="text-sm">
                                <Link href="#" className="font-medium text-secondary hover:text-secondary/80 transition-colors">Esqueci minha senha</Link>
                            </div>
                        </div>

                        <button disabled={isPending} type="submit" className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed">
                            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                                <LogIn className="text-white/60 group-hover:text-white transition-colors" size={20} />
                            </span>
                            {isPending ? 'Entrando...' : 'Entrar no Sistema'}
                        </button>
                        <div className="flex h-8 items-end space-x-1" aria-live="polite" aria-atomic="true">
                            {errorMessage && (
                                <>
                                    <p className="text-sm text-red-500">{errorMessage}</p>
                                </>
                            )}
                        </div>
                    </form>

                    <div className="mt-6 flex items-center justify-center gap-4 text-slate-300" title="Secure SSL">
                        <LockKeyhole size={24} />
                        <span className="text-xs uppercase tracking-widest font-semibold">Acesso Seguro</span>
                    </div>
                </div>
                {/* Decor */}
                <div className="absolute top-0 right-0 -mr-24 -mt-24 w-64 h-64 rounded-full bg-slate-50 border border-slate-100 -z-10"></div>
            </div>
        </div>
    );
}
