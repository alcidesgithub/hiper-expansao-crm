import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Headphones, 
  Wallet, 
  Calendar, 
  Lock, 
  ArrowRight, 
  CheckCircle2 
} from 'lucide-react';

interface ScheduleCallProps {
    onBack: () => void;
}

const ScheduleCall: React.FC<ScheduleCallProps> = ({ onBack }) => {
  const [selectedTime, setSelectedTime] = useState<string | null>('10:30');
  const [selectedDate, setSelectedDate] = useState<number>(6);

  const timeSlots = ['09:00', '09:30', '10:30', '11:00', '14:00', '15:30'];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-display text-slate-800">
        
        {/* Header Section */}
        <header className="w-full max-w-5xl flex flex-col items-center justify-center mb-8 space-y-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
                <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">H</div>
                <span className="font-bold text-2xl text-secondary tracking-tight">Hiperfarma</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-center text-slate-900">
                Agende seu Diagnóstico Estratégico
            </h1>
        </header>

        {/* Main Content Container */}
        <main className="bg-white shadow-xl rounded-xl w-full max-w-5xl overflow-hidden border border-gray-200 flex flex-col lg:flex-row min-h-[600px]">
            
            {/* Left Panel: Value Proposition & Consultant Info */}
            <div className="w-full lg:w-1/3 bg-secondary text-white p-8 flex flex-col justify-between relative overflow-hidden">
                {/* Decorative background pattern */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
                
                <div className="relative z-10">
                    <h2 className="text-xl font-semibold mb-6 text-white/90">Detalhes da Sessão</h2>
                    <ul className="space-y-6">
                        <li className="flex items-start space-x-4 group">
                            <div className="bg-white/10 p-2 rounded-lg group-hover:bg-primary transition-colors duration-300">
                                <Clock className="text-white" size={24} />
                            </div>
                            <div>
                                <p className="font-medium">30 Minutos</p>
                                <p className="text-sm text-blue-100">Duração da sessão</p>
                            </div>
                        </li>
                        <li className="flex items-start space-x-4 group">
                            <div className="bg-white/10 p-2 rounded-lg group-hover:bg-primary transition-colors duration-300">
                                <Headphones className="text-white" size={24} />
                            </div>
                            <div>
                                <p className="font-medium">Conversa Consultiva</p>
                                <p className="text-sm text-blue-100">Focada no seu negócio</p>
                            </div>
                        </li>
                        <li className="flex items-start space-x-4 group">
                            <div className="bg-white/10 p-2 rounded-lg group-hover:bg-primary transition-colors duration-300">
                                <Wallet className="text-white" size={24} />
                            </div>
                            <div>
                                <p className="font-medium">Sem Custo</p>
                                <p className="text-sm text-blue-100">Diagnóstico gratuito</p>
                            </div>
                        </li>
                    </ul>

                    <hr className="border-white/20 my-8"/>

                    <div className="flex items-center space-x-4">
                        <img 
                            alt="Foto do Consultor" 
                            className="w-12 h-12 rounded-full object-cover border-2 border-white/30" 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXMkRS3SIRL5qYycB7j6iWqnsDZv5hSufJRrAcmtzEDa9TryPaFwMh8kYkei9rr9l20XlSSbLGFx1AmEBOhejl_7jj-gqc2hxhptwUcLmi7Q1Z-gN123Abt_JFw-mLrT58Q1ArGa9DIwpAiPF7ewygxO-cKssASja5-mQmErWWGbGlSohPDT-6jHglvM7jJQeAXq1F0ZZgfLcfXsK1-B6imLQo0TOduyXwYA1vmXfCFpDBxHICPudBvWh_EzojXPEuc17SdTy03co"
                        />
                        <div>
                            <p className="text-sm font-semibold">Consultor Especialista</p>
                            <p className="text-xs text-blue-200">Equipe de Expansão</p>
                        </div>
                    </div>
                </div>
                
                <div className="relative z-10 mt-8 lg:mt-0 text-xs text-blue-200 text-center lg:text-left">
                    <p>Horário de Brasília (GMT-3)</p>
                </div>
            </div>

            {/* Right Panel: Calendar & Time Slots */}
            <div className="w-full lg:w-2/3 p-6 lg:p-10 flex flex-col">
                <h3 className="text-lg font-semibold mb-6 text-slate-800 flex items-center">
                    <Calendar className="mr-2 text-primary" size={24} /> Selecione uma Data e Horário
                </h3>
                
                <div className="flex flex-col md:flex-row gap-8 flex-grow">
                    {/* Date Picker */}
                    <div className="w-full md:w-1/2">
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <button className="text-gray-400 hover:text-primary"><ChevronLeft size={20} /></button>
                                <span className="font-semibold text-gray-700">Outubro 2023</span>
                                <button className="text-gray-600 hover:text-primary"><ChevronRight size={20} /></button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center text-sm mb-2">
                                {['D','S','T','Q','Q','S','S'].map((d, i) => (
                                    <span key={i} className="text-gray-400 text-xs font-medium">{d}</span>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-sm">
                                {/* Empty days */}
                                <span className="p-2"></span>
                                <span className="p-2"></span>
                                {/* Days */}
                                {[1,2].map(d => (
                                    <button key={d} className="p-2 rounded-full hover:bg-gray-200 text-gray-400 cursor-not-allowed">{d}</button>
                                ))}
                                {[3,4,5].map(d => (
                                    <button key={d} onClick={() => setSelectedDate(d)} className={`p-2 rounded-full hover:bg-gray-200 ${selectedDate === d ? 'bg-primary text-white shadow-md' : 'text-gray-600'}`}>{d}</button>
                                ))}
                                <button onClick={() => setSelectedDate(6)} className={`p-2 rounded-full ${selectedDate === 6 ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-gray-600 hover:bg-gray-200'}`}>6</button> 
                                {[7,8,9,10,11,12,13,14].map(d => (
                                    <button key={d} onClick={() => setSelectedDate(d)} className={`p-2 rounded-full hover:bg-gray-200 ${selectedDate === d ? 'bg-primary text-white shadow-md' : 'text-gray-600'}`}>{d}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Time Slots */}
                    <div className="w-full md:w-1/2 flex flex-col">
                        <p className="text-sm text-gray-500 mb-3">Sexta-feira, {selectedDate} de Outubro</p>
                        <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[300px] pr-2">
                            {timeSlots.map((time) => (
                                <button 
                                    key={time}
                                    onClick={() => setSelectedTime(time)}
                                    className={`w-full py-3 px-4 rounded border transition-all duration-200 text-center flex justify-center items-center group
                                        ${selectedTime === time 
                                            ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm ring-2 ring-primary/20' 
                                            : 'border-gray-200 hover:border-primary hover:text-primary bg-white text-gray-700 font-medium'
                                        }
                                    `}
                                >
                                    {time}
                                    {selectedTime === time && <CheckCircle2 className="ml-2" size={16} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-end">
                    <button 
                        onClick={() => alert("Agendamento confirmado! Enviamos os detalhes para seu e-mail.")}
                        className="w-full md:w-auto bg-primary hover:bg-primary-hover text-white font-bold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl hover:shadow-primary/30 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center"
                    >
                        Confirmar Agendamento
                        <ArrowRight className="ml-2" size={20} />
                    </button>
                    <p className="text-xs text-gray-400 mt-3 text-center md:text-right w-full flex items-center justify-end gap-1">
                        <Lock size={12} />
                        Seus dados estão seguros e não serão compartilhados.
                    </p>
                </div>
            </div>
        </main>

        {/* Page Footer */}
        <footer className="mt-8 text-center text-gray-500">
            <p className="text-sm flex items-center justify-center gap-2">
                <CheckCircle2 className="text-green-500" size={16} />
                Você receberá o link do Google Meet por e-mail e WhatsApp
            </p>
        </footer>
    </div>
  );
};

export default ScheduleCall;