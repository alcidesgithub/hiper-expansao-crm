import React from 'react';
import { Users, Filter, Calendar, DollarSign, TrendingUp, TrendingDown, ArrowUpRight, MoreVertical, Download, Target, PieChart, Activity, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

interface DashboardProps {
    onNavigate: (page: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6 p-6 overflow-y-auto scroll-smooth font-display text-slate-800">
      <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Dashboard Executivo</h2>
            <p className="text-sm text-slate-500">Sistema de Qualificação - Tempo Real (11/02/2026)</p>
          </div>
          <div className="flex gap-2">
             <span className="px-3 py-1 bg-white border border-gray-200 rounded text-xs font-medium text-gray-600 flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div> Operação Ativa
             </span>
          </div>
      </div>

      {/* Main Stats - Updated to PRD v2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard 
            title="Total Leads" 
            value="47" 
            change="Hoje" 
            icon={<Users size={20} />} 
        />
        <MetricCard 
            title="Taxa Conclusão" 
            value="82%" 
            changeType="positive"
            icon={<CheckCircle size={20} />} 
        />
        <MetricCard 
            title="Tempo Médio" 
            value="2m 34s" 
            icon={<Clock size={20} />} 
        />
        <MetricCard 
            title="Taxa Aprovação" 
            value="64%" 
            subtext="30 qualificados" 
            changeType="positive"
            icon={<Filter size={20} />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Grade Distribution Chart */}
        <div className="lg:col-span-2 bg-surface-light rounded-xl shadow-sm border border-gray-100 p-6">
           <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><PieChart size={20} className="text-primary"/> Distribuição por Grade</h3>
             <div className="flex gap-2 text-xs">
                 <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">Hoje</span>
             </div>
           </div>
           
           <div className="space-y-5">
              <GradeRow grade="A" label="Hot Lead (Altíssimo Potencial)" count="12" percent={26} color="bg-green-500" action="< 2h 🔥" />
              <GradeRow grade="B" label="Warm Lead (Alto Potencial)" count="18" percent={38} color="bg-blue-500" action="< 4h ⭐" />
              <GradeRow grade="C" label="Cold Lead (Médio Potencial)" count="10" percent={21} color="bg-yellow-400" action="< 24h ✅" />
              <GradeRow grade="D" label="Very Cold (Baixo Potencial)" count="5" percent={11} color="bg-gray-400" action="< 72h ⚠️" />
              <GradeRow grade="F" label="Sem Fit (Descartável)" count="2" percent={4} color="bg-gray-200" action="N/A ❌" />
           </div>
           
           <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                <span>Precisão Scoring: <strong className="text-green-600">87%</strong></span>
                <span>Conv. A → Assoc: <strong className="text-green-600">68%</strong></span>
           </div>
        </div>

        {/* Alerts Section */}
        <div className="bg-surface-light rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <h3 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2 text-red-600"><AlertTriangle size={20}/> Alertas Ativos</h3>
            
            <div className="flex-1 flex flex-col space-y-4">
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex gap-3 items-start">
                    <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-red-800">2 Leads Grade A</p>
                        <p className="text-xs text-red-600">Aguardando contato há {'>'} 1h. Prioridade crítica.</p>
                    </div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 items-start">
                    <Target size={16} className="text-blue-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-blue-800">1 Lead VIP Capturado</p>
                        <p className="text-xs text-blue-600">Rede com 50+ lojas (SP). Notificar diretoria.</p>
                    </div>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg flex gap-3 items-start">
                    <Activity size={16} className="text-yellow-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-yellow-800">3 Inconsistências</p>
                        <p className="text-xs text-yellow-600">Dados de faturamento não batem com porte.</p>
                    </div>
                </div>
            </div>
            
            <button className="w-full mt-4 py-2 text-sm text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
                Ver Central de Alertas
            </button>
        </div>
      </div>

      {/* Recent Leads Table */}
      <div className="bg-surface-light rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
            <div>
                <h3 className="font-bold text-lg text-gray-900">Últimos Leads Qualificados</h3>
                <p className="text-sm text-gray-500 mt-1">Ordenado por prioridade de atendimento.</p>
            </div>
            <button className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center">
                <Download size={14} className="mr-2" /> Exportar Relatório
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Grade</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Probabilidade</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">SLA Restante</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    <LeadRow 
                        initials="RS" color="bg-green-100 text-green-700" 
                        name="Roberto Santos" email="roberto@redesantos.com.br" 
                        company="Rede Santos (4 Lojas)" 
                        grade="A" gradeColor="bg-green-600 text-white"
                        prob="85%" sla="45 min" slaColor="text-red-500 font-bold"
                        onClick={() => onNavigate('lead-detail')}
                    />
                    <LeadRow 
                        initials="LF" color="bg-blue-100 text-blue-700" 
                        name="Lucas Ferraz" email="lucas@horizon.com" 
                        company="Grupo Horizon (6 Lojas)" 
                        grade="A" gradeColor="bg-green-600 text-white"
                        prob="82%" sla="1h 20m" slaColor="text-orange-500"
                        onClick={() => onNavigate('lead-detail')}
                    />
                    <LeadRow 
                        initials="MC" color="bg-purple-100 text-purple-700" 
                        name="Mariana Costa" email="mariana@farmacosta.com" 
                        company="Farma Costa (1 Loja)" 
                        grade="B" gradeColor="bg-blue-500 text-white"
                        prob="65%" sla="3h 10m" slaColor="text-gray-600"
                        onClick={() => onNavigate('lead-detail')}
                    />
                </tbody>
            </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-center">
            <button className="text-sm text-primary font-medium hover:underline flex items-center">
                Ver Todos os Leads <ArrowUpRight className="ml-1" size={14} />
            </button>
        </div>
      </div>
      
      {/* Footer Spacing */}
      <div className="h-8"></div>
    </div>
  );
};

const MetricCard = ({ title, value, change, changeType, subtext, icon }: any) => (
  <div className="bg-surface-light p-5 rounded-xl shadow-sm border border-gray-100 hover:border-primary/20 transition-all">
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
            {change}
          </span>
      )}
      {subtext && <span className="text-xs font-medium text-gray-400 mt-1">{subtext}</span>}
    </div>
  </div>
);

const GradeRow = ({ grade, label, count, percent, color, action }: any) => (
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

const LeadRow = ({ initials, color, name, email, company, grade, gradeColor, prob, sla, slaColor, onClick }: any) => (
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
            <span className={`text-xs font-mono ${slaColor}`}>
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

export default Dashboard;