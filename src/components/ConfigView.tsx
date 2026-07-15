import React, { useState } from 'react';
import { User, Config } from '../types';
import { Sun, Moon, Download, Shield, Eye, EyeOff, UserPlus } from 'lucide-react';
import { todayISO } from '../utils';

interface ConfigViewProps {
  users: User[];
  currentUser: User | null;
  config: Config;
  setPrazoPadrao: (prazo: number) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onUpdatePassword: (userId: string, newPw: string) => void;
  onAddUser: (nome: string, email: string, senha: string) => void;
  onImportBackup: (backupData: string) => void;
  lojas: any[];
  visitas: any[];
  planos: any[];
  toast: (msg: string) => void;
}

export default function ConfigView({
  users,
  currentUser,
  config,
  setPrazoPadrao,
  theme,
  onToggleTheme,
  onUpdatePassword,
  onAddUser,
  onImportBackup,
  lojas,
  visitas,
  planos,
  toast,
}: ConfigViewProps) {
  const [newPw, setNewPw] = useState(currentUser?.senha || '');
  const [showPw, setShowPw] = useState(false);

  const [cadNome, setCadNome] = useState('');
  const [cadEmail, setCadEmail] = useState('');
  const [cadSenha, setCadSenha] = useState('1234');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleNomeChange = (val: string) => {
    setCadNome(val);
    const sanitized = val.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');
    if (sanitized) {
      setCadEmail(`${sanitized}@alvorada.com`);
    } else {
      setCadEmail('');
    }
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cadNome.trim()) {
      toast('Informe o nome do supervisor!');
      return;
    }
    if (!cadEmail.trim()) {
      toast('Informe o e-mail do supervisor!');
      return;
    }
    if (!cadSenha.trim()) {
      toast('Informe uma senha inicial!');
      return;
    }

    onAddUser(cadNome.trim(), cadEmail.trim(), cadSenha.trim());
    setCadNome('');
    setCadEmail('');
    setCadSenha('1234');
    setShowAddForm(false);
  };

  // Trigger JSON file backup export
  const exportarBackup = () => {
    try {
      const backup = {
        exportadoEm: new Date().toISOString(),
        lojas,
        users: users.map((u) => ({ nome: u.nome, email: u.email })), // export metadata securely
        visitas,
        planos,
        config,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rotacerta_backup_${todayISO()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Cópia de segurança (JSON) baixada com sucesso!');
    } catch (e) {
      toast('Falha ao exportar backup de dados.');
    }
  };

  // Import JSON backup
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        onImportBackup(text);
      } catch (err) {
        toast('Formato de arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleSavePw = () => {
    if (!currentUser) return;
    if (!newPw.trim()) {
      toast('Informe uma senha válida!');
      return;
    }
    onUpdatePassword(currentUser.id, newPw.trim());
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-condensed font-extrabold text-3xl text-ink tracking-tight uppercase leading-none">
            Ajustes do Sistema
          </h1>
          <p className="text-sm text-ink-soft mt-1.5">
            Gerencie as preferências globais, usuários de acesso e backups operacionais
          </p>
        </div>
      </div>

      {/* Grid: Return threshold + appearance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Threshold selection */}
        <div className="bg-card border border-line rounded-xl p-5 shadow-custom flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="font-condensed text-lg font-bold text-ink uppercase tracking-wide">
              Prazo de Retorno Padrão
            </h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Frequência de retorno aplicada automaticamente a lojas que não possuam prazo personalizado definido no cadastro.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-4">
            {[15, 30, 45].map((d) => (
              <button
                key={d}
                onClick={() => setPrazoPadrao(d)}
                className={`px-4.5 py-1.5 rounded-full text-xs font-bold border-1.5 active:scale-95 transition-all cursor-pointer ${
                  config.prazoPadrao === d
                    ? 'bg-brand-accent border-brand-accent text-white'
                    : 'bg-card border-line text-ink-soft hover:bg-paper hover:text-ink'
                }`}
              >
                {d} Dias
              </button>
            ))}
          </div>
        </div>

        {/* Theme Settings switcher */}
        <div className="bg-card border border-line rounded-xl p-5 shadow-custom flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="font-condensed text-lg font-bold text-ink uppercase tracking-wide">
              Aparência do Painel
            </h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Alterne entre o modo de visualização claro (default) e o modo escuro para ambientes com pouca luz.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={onToggleTheme}
              className={`flex items-center gap-2 px-4.5 py-1.5 rounded-full text-xs font-bold border-1.5 active:scale-95 transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-brand-navy border-brand-navy-3 text-[#cdd6e6]'
                  : 'bg-card border-line text-ink-soft hover:bg-paper hover:text-ink'
              }`}
            >
              {theme === 'dark' ? <Moon className="w-4 h-4 text-brand-accent" /> : <Sun className="w-4 h-4 text-brand-amber" />}
              {theme === 'dark' ? 'Modo Escuro Ativo' : 'Modo Claro Ativo'}
            </button>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-condensed text-lg font-bold text-ink uppercase tracking-wide">
            Supervisores Cadastrados
          </h3>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              if (!showAddForm) {
                setCadNome('');
                setCadEmail('');
                setCadSenha('1234');
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-xs rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Cadastrar Novo
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddUserSubmit} className="bg-card border-2 border-brand-accent/30 rounded-xl p-5 shadow-lg space-y-4 animate-fade-in">
            <h4 className="font-condensed text-sm font-bold text-ink uppercase tracking-wide flex items-center gap-1.5 text-brand-accent">
              <UserPlus className="w-4 h-4" /> Cadastrar Novo Supervisor
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                  Nome do Supervisor
                </label>
                <input
                  type="text"
                  placeholder="Ex: David"
                  value={cadNome}
                  onChange={(e) => handleNomeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-lg text-xs bg-paper/40 text-ink outline-none focus:border-brand-accent font-semibold"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                  Email Institucional
                </label>
                <input
                  type="email"
                  placeholder="Ex: david@alvorada.com"
                  value={cadEmail}
                  onChange={(e) => setCadEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-lg text-xs bg-paper/40 text-ink outline-none focus:border-brand-accent font-mono"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                  Senha Inicial
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1234"
                  value={cadSenha}
                  onChange={(e) => setCadSenha(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-lg text-xs bg-paper/40 text-ink outline-none focus:border-brand-accent font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-1.5 border border-line rounded-lg text-xs font-bold text-ink-soft hover:bg-paper transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-xs rounded-lg transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                Salvar Supervisor
              </button>
            </div>
          </form>
        )}

        <div className="bg-card border border-line rounded-xl p-5 shadow-custom space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-paper border-b border-line text-ink-soft font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3">Supervisor</th>
                  <th className="p-3">Email Institucional</th>
                  <th className="p-3">Sua Senha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-ink">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-paper/20">
                      <td className="p-3 font-bold">{u.nome}</td>
                      <td className="p-3 font-mono text-ink-soft">{u.email}</td>
                      <td className="p-3">
                        {isCurrent ? (
                          <div className="flex items-center gap-2 max-w-[200px]">
                            <div className="relative flex-1">
                              <input
                                type={showPw ? 'text' : 'password'}
                                value={newPw}
                                onChange={(e) => setNewPw(e.target.value)}
                                className="w-full px-2.5 py-1 border border-line rounded-md text-xs bg-paper/50 text-ink outline-none focus:border-brand-accent"
                              />
                              <button
                                onClick={() => setShowPw(!showPw)}
                                className="absolute inset-y-0 right-2 flex items-center text-ink-faint hover:text-ink-soft"
                              >
                                {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <button
                              onClick={handleSavePw}
                              className="px-2 py-1 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-[10.5px] rounded-md transition-all active:scale-95"
                            >
                              Salvar
                            </button>
                          </div>
                        ) : (
                          <span className="text-ink-faint font-mono">••••••••</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Backup and restore */}
      <div className="space-y-3">
        <h3 className="font-condensed text-lg font-bold text-ink uppercase tracking-wide">
          Segurança e Backup de Dados
        </h3>

        <div className="bg-card border border-line rounded-xl p-5 shadow-custom space-y-4">
          <p className="text-xs text-ink-soft leading-relaxed max-w-2xl">
            Para garantir a durabilidade e integridade operacional, você pode exportar uma cópia completa de todos os dados do sistema (lojas, visitas, planejamento e usuários) em um arquivo JSON. Este backup pode ser restaurado a qualquer momento.
          </p>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              onClick={exportarBackup}
              className="flex items-center gap-1.5 px-4.5 py-2.5 border border-line rounded-lg text-xs font-bold text-ink bg-card hover:bg-paper transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              Baixar Backup Operacional (JSON)
            </button>

            <label className="flex items-center gap-1.5 px-4.5 py-2.5 border border-dashed border-brand-accent/40 rounded-lg text-xs font-bold text-brand-accent bg-brand-accent-soft/20 hover:bg-brand-accent-soft/40 transition-all active:scale-95 cursor-pointer shadow-xs">
              <Shield className="w-4 h-4" />
              Restaurar Backup
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
