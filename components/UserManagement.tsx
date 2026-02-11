
import React, { useState } from 'react';
import { 
  Search, 
  Download, 
  Plus, 
  MoreHorizontal, 
  Filter,
  UserCog,
  Shield,
  Trash2,
  Lock,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Briefcase,
  Eye,
  EyeOff,
  Check,
  ChevronDown
} from 'lucide-react';

const UserManagement: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    team: '',
    password: '',
    forceChangePassword: true
  });

  // Mock Data
  const users = [
    {
      id: 1,
      name: 'Ricardo Mendes',
      since: 'Jan 2022',
      email: 'ricardo.mendes@hiperfarma.com',
      role: 'Administrador',
      team: 'Diretoria',
      status: 'active',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrS3KDcRAElWPePn7USGvrhdHgJWr--E0m1Eg96fh2QjjkwTRI_woJpolEcuXjSf5p6IViMoCfmeXJBLKGi-Ql6JhEcnpU5bbX38vte0c7HWKQJhFLRTgbx42JEFdSMHRZUe-37PWtsSbcQjnEaKpHPAozd2SUY7-YGtMpI75Wgxpx-WGlRvj-UQdtPRLzC0UPu1NHn4xcxPqyYgL5y5NbeDoIWEhy0RUlAHpSaFVIoUS4zLrmV8UuVWDpldb4t_RKRAZ3lwXBKO4'
    },
    {
      id: 2,
      name: 'Ana Beatriz Mendes',
      since: 'Jul 2023',
      email: 'ana.mendes@hiperfarma.com',
      role: 'Gestor',
      team: 'Expansão Sul',
      status: 'active',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDpgPCdwfXn8Vx1TRcNDJ5_sBfEsPSLcZ3f0UhAowrox233QZMpiA4_uQq2dUeTrhOkyMqEoxP4dybaXJ9QzGptb4PJVDrdTAEqKmB80x5Ud1Tfx-af1wSbgWDsKim4pMsDPG3IrqtKO1ABB3FqYb18PcTeAnPgFWX4UsnzZWtbmnj8ht3rZJQ7tqr-bWBFaairw9Prgyr4dXhhd_N8mjKtm6nPx8YJwNScnCiYYD5ZmYEAKHdM3t0vpHLWJ8oefjLP3F8ahT_TYwI'
    },
    {
      id: 3,
      name: 'Bruno Albuquerque',
      since: 'Jan 2024',
      email: 'bruno.alb@hiperfarma.com',
      role: 'Consultor',
      team: 'Key Accounts',
      status: 'active',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1yi5BKFKtCBh8KqWIvhGilqcGPoJfnzLt9Xp_OzraFG43P6u4JJLSPsffouEvySt9ID_aY4Za8jYophR4I68fdLmljAXR3N41an5rk80xosmyqAc4CkqYaLppmPWqjiQrASYrnbMEaMp3i7iGFfKg_ksBxpEeqjAiWxObDfJs_rxg4zeR55tyf1602OW2QwjN5GfkGxhnJUpJlNsM1FjlAS7oV-jJOuxi8rK7ShO7edr6DsncV2JrSo49M0dPQLyOzX0KPPJ541A'
    },
    {
      id: 4,
      name: 'Carla Peixoto',
      since: 'Mar 2023',
      email: 'carla.p@hiperfarma.com',
      role: 'SDR',
      team: 'Expansão Sul',
      status: 'active',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDq7WBkLuSuMl--Z8JVh-wWl3xeyfy4gY4F-ykM2h77ahETROAw5DY9e--ul5PfCgw-T4AvmXZxxd5Pg0qdsQPbm2dJqRBSdb2YkyjxN5I-4L7VT6u0o_G94TNm8mtprcnX6gKWTeh6cpxqAwAzKpL4B3Y1iGt9Cc_5B3HRpqbnvDTgOFtCOzr3BMnCHlouTj_YG9lVxZiawdVIyuCdST-b4eXRaQ5C5-qCXmgNg9ye9HpAlgPqTgBO4LHzEksYGIAiUPpUrEbeqZY'
    },
    {
      id: 5,
      name: 'Eduardo Ferraz',
      since: 'Out 2022',
      email: 'eduardo.ferraz@hiperfarma.com',
      role: 'Diretor',
      team: 'Corporativo',
      status: 'active',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCB43Tb6D3RStAcJt8LeGj9TP3vINw7uS6dqXetDdXQzVQUtlxrrXx1CU8FmjhTuvqm0N44yAWiKY6_udBzt-lcQ4hjpXmTCrkxgTXM5gEjJis7bwrB1NXKl9hd6lhuDv5qTfVtDoGvoBxNo8oBfOAyCVMDJ31mRJarfd9daFMGZL8QFcd-kj_pnUdx5Y8hUiXlp7NsiIo-AHz5RQPo8SpgR6MDnMZueWnf6Hpx956XPd5loCnqGridbwk1U2bb_ETm4TbwvigDtLE'
    },
    {
      id: 6,
      name: 'Marcos Valente',
      since: 'Fev 2023',
      email: 'marcos.valente@hiperfarma.com',
      role: 'Consultor',
      team: 'Expansão Norte',
      status: 'inactive',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCthQCPXANzHHpVmp4AZj08xfcrq7hbeURHXCOUrT8S5qj7j0hynK3brVE4mHdrAkDpjxM1KpRU6qM5RwMIpjH__vn1S_4JD85FUgjjC3Y6pwTWl7L8P5Y80skfLtv9MLxJmkjJLrAyLNki-370UZ5jb6wy7b-oD197jXnnguLRh_z0J6TH8DAILWeuZs9bNmEUvW5dLqbg5JgdKY50apJHBnuhuaxWguzhfB1FgY8lNqqk6RwG9rotWh74YwumTXaWW84UBStHXoM'
    }
  ];

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'Administrador': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'Diretor': return 'bg-red-50 text-red-600 border-red-100';
      case 'Gestor': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'Consultor': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'SDR': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const handleSave = () => {
      alert("Usuário cadastrado com sucesso!");
      setIsModalOpen(false);
      setFormData({
        name: '',
        email: '',
        role: '',
        team: '',
        password: '',
        forceChangePassword: true
      });
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] font-display text-slate-900 relative">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between flex-shrink-0">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 font-heading">Gestão de Usuários</h1>
                <p className="text-xs text-slate-500 mt-1">Gerencie membros da equipe, cargos e níveis de acesso ao sistema.</p>
            </div>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-[#DF362D] hover:bg-[#c42f27] text-white px-5 py-2.5 rounded-lg font-medium shadow-lg shadow-red-200 flex items-center gap-2 transition-all active:scale-95"
            >
                <Plus size={18} />
                <span>Novo Usuário</span>
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[280px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#114F99]/20 focus:border-[#114F99] transition-all outline-none" 
                            placeholder="Buscar por nome ou e-mail..." 
                            type="text"
                        />
                    </div>
                    <div className="w-44">
                        <select className="w-full py-2 px-3 bg-slate-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#114F99]/20 focus:border-[#114F99] outline-none text-slate-600">
                            <option value="">Todos os Cargos</option>
                            <option>Administrador</option>
                            <option>Diretor</option>
                            <option>Gestor</option>
                            <option>SDR</option>
                            <option>Consultor</option>
                        </select>
                    </div>
                    <div className="w-44">
                        <select className="w-full py-2 px-3 bg-slate-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#114F99]/20 focus:border-[#114F99] outline-none text-slate-600">
                            <option value="">Todas as Equipes</option>
                            <option>Expansão Sul</option>
                            <option>Expansão Norte</option>
                            <option>Key Accounts</option>
                        </select>
                    </div>
                    <div className="w-40">
                        <select className="w-full py-2 px-3 bg-slate-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#114F99]/20 focus:border-[#114F99] outline-none text-slate-600">
                            <option value="">Status</option>
                            <option>Ativos</option>
                            <option>Inativos</option>
                        </select>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors border border-transparent">
                        <Download size={18} />
                        <span className="text-sm">Exportar</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-gray-200">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome do Usuário</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cargo</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Equipe</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((user) => (
                            <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors ${user.status === 'inactive' ? 'opacity-75 bg-slate-50/20' : ''}`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={`flex items-center gap-3 ${user.status === 'inactive' ? 'grayscale' : ''}`}>
                                        <img alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-gray-100" src={user.avatar} />
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                                            <p className="text-[11px] text-slate-400">Desde {user.since}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase ${getRoleStyle(user.role)}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{user.team}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <label className="inline-flex relative items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked={user.status === 'active'} />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right relative group">
                                    <button className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                                        <MoreHorizontal size={20} />
                                    </button>
                                    
                                    {/* Actions Dropdown Mockup */}
                                    <div className="hidden group-hover:block absolute right-8 top-8 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-10 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-gray-50 mb-1">Ações do Usuário</div>
                                        <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                            <Shield size={16} className="text-slate-400"/> Editar Permissões
                                        </button>
                                        <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                            <Lock size={16} className="text-slate-400"/> Redefinir Senha
                                        </button>
                                        <div className="h-px bg-slate-100 my-1"></div>
                                        <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                            <Trash2 size={16} className="text-red-400"/> Excluir Usuário
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {/* Pagination */}
                <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
                    <p className="text-sm text-slate-500">Mostrando 1 a 6 de 43 usuários</p>
                    <div className="flex items-center gap-1">
                        <button className="p-2 rounded hover:bg-slate-100 text-slate-400 disabled:opacity-30">
                            <ChevronLeft size={18} />
                        </button>
                        <button className="w-8 h-8 rounded bg-[#114F99] text-white text-xs font-bold">1</button>
                        <button className="w-8 h-8 rounded hover:bg-slate-100 text-slate-600 text-xs font-medium">2</button>
                        <button className="w-8 h-8 rounded hover:bg-slate-100 text-slate-600 text-xs font-medium">3</button>
                        <span className="px-1 text-slate-400">...</span>
                        <button className="w-8 h-8 rounded hover:bg-slate-100 text-slate-600 text-xs font-medium">9</button>
                        <button className="p-2 rounded hover:bg-slate-100 text-slate-400">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Modal Novo Usuário */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl transform transition-all scale-100 opacity-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                        <h2 className="text-xl font-bold text-slate-800 font-heading">Cadastrar Novo Usuário</h2>
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-50"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-8 overflow-y-auto custom-scrollbar">
                        <form className="space-y-6">
                            {/* Section 1: Informações Básicas */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <User className="text-[#114F99]" size={20} />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Informações Básicas</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-700" htmlFor="nome">Nome Completo</label>
                                        <input 
                                            type="text" 
                                            id="nome"
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#114F99]/20 focus:border-[#114F99] transition-all outline-none placeholder:text-slate-400"
                                            placeholder="Ex: João Silva"
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-700" htmlFor="email">E-mail Profissional</label>
                                        <input 
                                            type="email" 
                                            id="email"
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#114F99]/20 focus:border-[#114F99] transition-all outline-none placeholder:text-slate-400"
                                            placeholder="nome@hiperfarma.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 w-full"></div>

                            {/* Section 2: Atribuição */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Briefcase className="text-[#114F99]" size={20} />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Atribuição</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-700" htmlFor="cargo">Cargo</label>
                                        <div className="relative">
                                            <select 
                                                id="cargo"
                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#114F99]/20 focus:border-[#114F99] transition-all outline-none appearance-none text-slate-700"
                                                value={formData.role}
                                                onChange={(e) => setFormData({...formData, role: e.target.value})}
                                            >
                                                <option value="" disabled>Selecione um cargo</option>
                                                <option value="diretor">Diretor</option>
                                                <option value="gestor">Gestor</option>
                                                <option value="sdr">SDR</option>
                                                <option value="consultor">Consultor</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={16} />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-slate-700" htmlFor="equipe">Equipe</label>
                                        <div className="relative">
                                            <select 
                                                id="equipe"
                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#114F99]/20 focus:border-[#114F99] transition-all outline-none appearance-none text-slate-700"
                                                value={formData.team}
                                                onChange={(e) => setFormData({...formData, team: e.target.value})}
                                            >
                                                <option value="" disabled>Selecione uma equipe</option>
                                                <option value="sul">Expansão Sul</option>
                                                <option value="norte">Expansão Norte</option>
                                                <option value="ka">Key Accounts</option>
                                                <option value="corp">Corporativo</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 w-full"></div>

                            {/* Section 3: Acesso */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Lock className="text-[#114F99]" size={20} />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Acesso</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1.5 max-w-md">
                                        <label className="block text-sm font-medium text-slate-700" htmlFor="senha">Senha Inicial</label>
                                        <div className="relative">
                                            <input 
                                                type={showPassword ? "text" : "password"} 
                                                id="senha"
                                                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#114F99]/20 focus:border-[#114F99] transition-all outline-none placeholder:text-slate-400"
                                                placeholder="Defina uma senha provisória"
                                                value={formData.password}
                                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            id="change_pwd"
                                            className="w-4 h-4 rounded border-slate-300 text-[#DF362D] focus:ring-[#DF362D]/20 cursor-pointer accent-[#DF362D]"
                                            checked={formData.forceChangePassword}
                                            onChange={(e) => setFormData({...formData, forceChangePassword: e.target.checked})}
                                        />
                                        <label htmlFor="change_pwd" className="text-sm text-slate-600 select-none cursor-pointer">
                                            Exigir troca de senha no primeiro acesso
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 z-10">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-medium hover:bg-white hover:border-slate-400 transition-all text-sm"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave}
                            className="px-5 py-2.5 rounded-lg bg-[#DF362D] hover:bg-[#c42f27] text-white font-medium shadow-lg shadow-red-200 transition-all text-sm flex items-center gap-2"
                        >
                            <Check size={18} />
                            Cadastrar Usuário
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default UserManagement;
