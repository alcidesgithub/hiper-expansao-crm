import React from 'react';
import { 
  Share2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Megaphone, 
  BarChart3, 
  Users, 
  Calendar, 
  User, 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Table, 
  Filter, 
  Phone, 
  CheckCircle2, 
  Handshake,
  Download
} from 'lucide-react';

const Analytics: React.FC = () => {
  return (
    <div className="w-full space-y-8 font-display text-gray-800 pb-20">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Visão Geral de Performance</h1>
                <p className="text-gray-500 mt-1">Acompanhe métricas de SDRs, ROI e distribuição geográfica.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-600 shadow-sm">
                    <Calendar size={16} className="text-gray-500" />
                    <span>Out 2023</span>
                </div>
                <div className="relative">
                    <select className="appearance-none bg-white border border-gray-300 text-gray-700 py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-medium shadow-sm cursor-pointer">
                        <option>Últimos 30 dias</option>
                        <option>Este Trimestre</option>
                        <option>Este Ano</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <ChevronDown size={16} />
                    </div>
                </div>
                <div className="flex rounded-lg shadow-sm">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-50 text-sm font-medium transition-colors text-gray-600">
                        <FileText size={18} className="text-gray-500"/> PDF
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border-t border-b border-r border-gray-300 rounded-r-lg hover:bg-gray-50 text-sm font-medium transition-colors text-gray-600">
                        <Table size={18} className="text-gray-500"/> CSV
                    </button>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg shadow-lg shadow-primary/30 transition-all text-sm font-medium">
                    <Share2 size={18} /> Compartilhar
                </button>
            </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard 
                title="Receita Total" 
                value="R$ 482.300" 
                trend="+12.5%" 
                trendUp={true} 
                icon={<DollarSign className="text-green-600" size={20} />} 
                iconBg="bg-green-50"
                trendBg="bg-green-50 text-green-600"
            />
            <KPICard 
                title="Investimento Ads" 
                value="R$ 42.150" 
                trend="+5.2%" 
                trendUp={true} 
                icon={<Megaphone className="text-primary" size={20} />} 
                iconBg="bg-primary/10"
                trendBg="bg-primary/5 text-primary"
            />
            <KPICard 
                title="ROI Marketing" 
                value="1.045%" 
                subtitle="ROAS: 11.4x"
                icon={<BarChart3 className="text-blue-600" size={20} />} 
                iconBg="bg-blue-50"
            />
            <KPICard 
                title="Novos Leads (PR/SC)" 
                value="1.240" 
                trend="-2.1%" 
                trendUp={false} 
                icon={<Users className="text-purple-600" size={20} />} 
                iconBg="bg-purple-50"
                trendBg="bg-red-50 text-red-500"
            />
        </div>

        {/* Main Content Area: Charts & Maps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (2 Cols) */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* ROI Chart */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">ROI: Investimento vs. Receita</h2>
                            <p className="text-sm text-gray-500">Comparativo mensal de ads versus receita gerada.</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-primary"></span> <span className="text-gray-600">Receita</span></div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-300"></span> <span className="text-gray-600">Investimento</span></div>
                        </div>
                    </div>
                    {/* CSS Chart Representation */}
                    <div className="h-64 w-full relative flex items-end justify-between gap-2 px-2">
                        {/* Y-Axis Lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                            {[0,1,2,3,4].map(i => <div key={i} className="w-full h-px bg-gray-100"></div>)}
                        </div>
                        {['Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out'].map((m, i) => (
                            <div key={m} className="relative z-10 flex flex-col items-center justify-end h-full w-full group cursor-default">
                                <div className="flex gap-1 items-end h-full w-8 sm:w-12 transition-all">
                                    <div className="w-1/2 bg-gray-300 rounded-t-sm transition-colors group-hover:bg-gray-400" style={{height: `${20 + i*3}%`}}></div>
                                    <div className="w-1/2 bg-primary rounded-t-sm transition-colors group-hover:bg-primary-hover" style={{height: `${45 + i*10}%`}}></div>
                                </div>
                                <span className={`text-xs mt-2 ${m === 'Out' ? 'font-bold text-primary' : 'text-gray-400'}`}>{m}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SDR Performance Detailed */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Performance por SDR</h2>
                            <p className="text-sm text-gray-500">Métricas individuais de produtividade e conversão.</p>
                        </div>
                        <button className="text-sm text-primary font-medium hover:text-primary-hover transition-colors">Ver relatório completo</button>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4">SDR</th>
                                    <th className="px-6 py-4 text-center">Calls / Dia</th>
                                    <th className="px-6 py-4 text-center">Conexões</th>
                                    <th className="px-6 py-4 text-center">Agendamentos</th>
                                    <th className="px-6 py-4 text-right">Conv. Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <SdrRow name="Bruno Silva" img="https://lh3.googleusercontent.com/aida-public/AB6AXuDcJdNCTEufd0Jg5rO1gKASq6Uhns14ZAZthkzy8bWHf4olNinQS0bU7SSqn6p69l88kCQEGjF93iautAI17uMC5XPOUaD7farKEb8tCWbVZqZVzs2J9fIWjEcBOFAWhWIeHxWfK7v4P_f_DjRnjrKdhoaE1kZrMcuYVY3Ej2XIllT60wNuTcPuwIV5oWvnOffkM5EfKmk-p50EVQ82VIw5sSm0t0ckrnLpjHSlexSycN6hM19KeD5AxrtwOUMFwAtPm33_AWVj8NQ" calls="52" callsColor="bg-green-50 text-green-700" connections="18" meetings="4" rate="7.8%" />
                                <SdrRow name="Carla Mendes" img="https://lh3.googleusercontent.com/aida-public/AB6AXuBzjmvGkwOhRJKmCuZRp14092Gez1vJs29UT1gaUBCL8fhR0-mut4Z4zxccAwdXfGtw59zAc5iBpFl6X5KkHQf6927CIn7mO8r-KvHMnr1MesInkyOkjrtTqbwjRONN4o_MWm9JgrQTH2ZPpNl0j_XZGsoorsvvrxYiM_p0oeQ2v3CCNBn3Dt7kXDpUn9EtbwYx-D4SECUt-Ekd1pgrDu3xdvuhB9OhHwc8hfTL8K8GQUKipcLqYpzVpLB5QowALZpLWOxIrt4-w18" calls="45" callsColor="bg-gray-100 text-gray-700" connections="15" meetings="5" rate="11.1%" />
                                <SdrRow name="Roberto Dias" img="https://lh3.googleusercontent.com/aida-public/AB6AXuBi43fgeB_tsahs7el1PFhQJuVaMj_FATONO5pFVFB894E9QNUToanrAtPChjz_oPbkyOgnQ3JzEM2S2XgZUUN_QIaLCdTtu0vc89IQ7OHCyaMCj4owEBnVoXhB5oSBHjnbs--jbDzTCxn_lyigsLtw18BF39aDa7-uWs_NLqP5Z_yEawpRCnq12nDAiTY4AbAogivnFUX5bouPtCOtsZCAIpgrV4kTB7qdL1bVnBCWuvBnpiu3nAkgEx5U-kW1mmqNZIik42G2nVU" calls="38" callsColor="bg-red-50 text-red-700" connections="12" meetings="2" rate="5.2%" />
                                <SdrRow name="Ana Souza" img="https://lh3.googleusercontent.com/aida-public/AB6AXuB1Payqrf5KJ0tJBkAIsRSPo1wvlpM4lKe8EVTqLxv1u53VzCYZu5MwlQh9FwyhaAKMjxk2bg6E27asJ57_F4qk-GthHBwUblsJePVyu6c70P1VIjcnzezcZJYS8OsFudh5dUk8bRJn-rcSnKzE1acUkyr8-yruCKPisKfKlwrUrEeJ5Vo1u6Hw993wbGXvRmqY3JJVHDGOAChxrNQpg1Bg1p_9VBrxf5ICAIT6HiMdZVjGok6iicmiXyt5LHJ696_49mUfr0NvU2o" calls="60" callsColor="bg-green-50 text-green-700" connections="22" meetings="6" rate="10.0%" />
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Geographic Heatmap Section (Right - 1 Col) */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
                    <div className="p-6 pb-2">
                        <h2 className="text-lg font-bold text-gray-900">Origem dos Leads</h2>
                        <p className="text-sm text-gray-500 mb-4">Concentração geográfica (PR & SC).</p>
                        <div className="flex items-center gap-4 text-xs mb-6">
                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary/20"></span><span>Baixa</span></div>
                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary/60"></span><span>Média</span></div>
                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary"></span><span>Alta</span></div>
                        </div>
                    </div>
                    
                    {/* CSS Abstract Map Representation */}
                    <div className="relative flex-1 bg-gray-50 m-6 mt-0 rounded-lg overflow-hidden border border-gray-100 min-h-[300px]">
                        {/* Background pattern */}
                        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                        
                        {/* Abstract Shapes for States */}
                        <div className="absolute inset-0 flex items-center justify-center p-8">
                            <div className="relative w-full h-full max-w-[280px] max-h-[400px]">
                                {/* PR (Paraná) */}
                                <div className="absolute top-[45%] left-[30%] w-[40%] h-[15%] bg-primary shadow-lg rounded-sm transform -rotate-6 z-20 group cursor-pointer hover:scale-105 transition-transform flex items-center justify-center">
                                     <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 shadow-lg">
                                        Paraná: 485 Leads
                                    </div>
                                    <span className="text-white/90 font-bold text-sm">PR</span>
                                </div>
                                
                                {/* SC (Santa Catarina) */}
                                <div className="absolute top-[61%] left-[35%] w-[30%] h-[12%] bg-primary/80 shadow-lg rounded-sm transform -rotate-3 z-20 group cursor-pointer hover:scale-105 transition-transform flex items-center justify-center">
                                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 shadow-lg">
                                        Santa Catarina: 320 Leads
                                    </div>
                                    <span className="text-white/90 font-bold text-sm">SC</span>
                                </div>
                                
                                {/* RS (Rio Grande do Sul) */}
                                <div className="absolute top-[74%] left-[25%] w-[35%] h-[18%] bg-primary/30 rounded-sm transform rotate-2 z-10 group cursor-pointer hover:bg-primary/40 transition-colors flex items-center justify-center">
                                    <span className="text-primary/60 font-bold text-xs">RS</span>
                                </div>
                                
                                {/* SP (São Paulo) */}
                                <div className="absolute top-[30%] right-[20%] w-[25%] h-[15%] bg-primary/20 rounded-sm transform -rotate-12 z-10"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="px-6 pb-6">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary"></span> Paraná (PR)</span>
                                <span className="font-bold">48%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-primary h-1.5 rounded-full" style={{width: '48%'}}></div></div>
                            <div className="flex justify-between items-center text-sm mt-2">
                                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary/80"></span> Santa Catarina (SC)</span>
                                <span className="font-bold">32%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5"><div className="bg-primary/80 h-1.5 rounded-full" style={{width: '32%'}}></div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Conversion Funnel Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Funil de Vendas Geral</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                {/* Connector Line */}
                <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -z-0 transform -translate-y-1/2"></div>
                
                <FunnelCard 
                    icon={<Filter size={20} />} 
                    label="Leads" 
                    value="2.450" 
                />
                <FunnelCard 
                    icon={<Phone size={20} />} 
                    label="Contactados" 
                    value="1.840" 
                    percent="75%" 
                />
                <FunnelCard 
                    icon={<CheckCircle2 size={20} />} 
                    label="Qualificados (SQL)" 
                    value="620" 
                    percent="33%" 
                />
                <FunnelCard 
                    icon={<FileText size={20} />} 
                    label="Propostas" 
                    value="280" 
                    percent="45%" 
                />
                <FunnelCard 
                    icon={<Handshake size={20} />} 
                    label="Vendas" 
                    value="92" 
                    percent="32%" 
                    isWin={true}
                />
            </div>
        </div>
    </div>
  );
};

// --- Helper Components ---

const KPICard = ({ title, value, trend, trendUp, icon, iconBg, trendBg, subtitle }: any) => (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-2 rounded-lg ${iconBg}`}>
                {icon}
            </div>
            {trend && (
                <span className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${trendBg}`}>
                    {trend} {trendUp ? <TrendingUp size={14} className="ml-0.5"/> : <TrendingDown size={14} className="ml-0.5"/>}
                </span>
            )}
            {subtitle && (
                <span className="text-xs font-medium text-gray-500 mt-1">{subtitle}</span>
            )}
        </div>
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
);

const SdrRow = ({ name, img, calls, callsColor, connections, meetings, rate }: any) => (
    <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
            <img className="w-8 h-8 rounded-full object-cover" src={img} alt={name} />
            {name}
        </td>
        <td className="px-6 py-4 text-center">
            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${callsColor}`}>{calls}</span>
        </td>
        <td className="px-6 py-4 text-center text-gray-600">{connections}</td>
        <td className="px-6 py-4 text-center text-gray-600">{meetings}</td>
        <td className="px-6 py-4 text-right font-semibold text-gray-900">{rate}</td>
    </tr>
);

const FunnelCard = ({ icon, label, value, percent, isWin }: any) => (
    <div className={`relative z-10 p-4 border rounded-lg text-center transition-colors group cursor-default ${isWin ? 'border-green-200 bg-green-50/30' : 'bg-white border-gray-100 hover:border-primary/50'}`}>
        <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-3 transition-colors ${isWin ? 'bg-green-100 text-green-700' : 'bg-gray-100 group-hover:bg-primary group-hover:text-white'}`}>
             {icon}
        </div>
        <p className={`text-xs uppercase tracking-wide font-semibold ${isWin ? 'text-green-700' : 'text-gray-500'}`}>{label}</p>
        <p className={`text-xl font-bold mt-1 ${isWin ? 'text-green-700' : 'text-gray-900'}`}>{value}</p>
        {percent && <span className="absolute top-1/2 -left-3 transform -translate-y-1/2 -translate-x-full bg-gray-50 text-gray-500 text-[10px] px-1.5 py-0.5 rounded border border-gray-200 hidden md:block">{percent}</span>}
    </div>
);

export default Analytics;