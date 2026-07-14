import React from 'react';
import { LayoutDashboard, Store, Calendar, FileText, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  user: User | null;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  alertCount: number;
}

export default function Sidebar({
  currentView,
  onNavigate,
  user,
  onLogout,
  theme,
  onToggleTheme,
  alertCount,
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard, badge: alertCount > 0 ? alertCount : undefined },
    { id: 'lojas', label: 'Lojas', icon: Store },
    { id: 'planejamento', label: 'Agenda', icon: Calendar },
    { id: 'relatorios', label: 'Relatórios', icon: FileText },
    { id: 'config', label: 'Ajustes', icon: Settings },
  ];

  return (
    <>
      {/* Desktop / Tablet Sidebar (hidden on small screens) */}
      <nav className="hidden md:flex fixed top-0 bottom-0 left-0 w-56 bg-brand-navy text-[#cdd6e6] flex-col p-5 z-40 border-r border-brand-navy-3">
        {/* Brand logo */}
        <div className="flex items-center gap-2.5 pb-6 pt-2">
          <div className="relative w-3.5 h-3.5 rounded-full bg-brand-accent">
            <span className="absolute -inset-1 border-2 border-dashed border-brand-accent rounded-full opacity-40 animate-spin" />
          </div>
          <span className="font-condensed font-extrabold text-xl text-white tracking-wider uppercase">
            RotaCerta
          </span>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col gap-1.5 flex-1">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentView === item.id || (currentView === 'loja-detalhe' && item.id === 'lojas');
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-accent text-white shadow-md'
                    : 'text-[#a9b4c8] hover:bg-white/5 hover:text-white'
                }`}
              >
                <IconComponent className="w-[18px] h-[18px] flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="bg-brand-red text-white text-[10.5px] font-bold rounded-full px-2 py-0.5 min-w-5 text-center animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* User profile & quick settings */}
        {user && (
          <div className="pt-4 border-t border-white/10 mt-auto">
            <div className="px-1.5 py-1 mb-3">
              <div className="text-white text-[13.5px] font-bold truncate leading-tight">
                {user.nome}
              </div>
              <div className="text-[#8291a8] text-[11px] truncate mt-0.5">
                {user.email}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleTheme}
                title="Alternar tema"
                className="flex items-center justify-center flex-1 py-1.5 px-2.5 bg-white/5 hover:bg-white/10 text-[#cdd6e6] rounded-lg transition-colors border border-white/5"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 mr-1.5" /> : <Moon className="w-4 h-4 mr-1.5" />}
                <span className="text-xs">{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
              </button>
              <button
                onClick={onLogout}
                title="Sair da conta"
                className="flex items-center justify-center p-2 bg-white/5 hover:bg-brand-red/20 text-[#cdd6e6] hover:text-brand-red rounded-lg transition-colors border border-white/5"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Bottom Navigation (visible only on mobile screen) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-brand-navy border-t border-brand-navy-3 flex items-center justify-around px-2 py-1 z-50">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentView === item.id || (currentView === 'loja-detalhe' && item.id === 'lojas');
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-lg transition-all ${
                isActive ? 'text-brand-accent' : 'text-[#a9b4c8]'
              }`}
            >
              <IconComponent className="w-[18px] h-[18px]" />
              <span className="text-[10px] font-medium mt-1 uppercase tracking-wide">
                {item.label}
              </span>
              {item.badge && (
                <span className="absolute top-0.5 right-1/4 bg-brand-red text-white text-[9px] font-extrabold rounded-full h-4 w-4 flex items-center justify-center shadow-sm">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
        {user && (
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center flex-1 py-1 px-1.5 text-[#a9b4c8] hover:text-brand-red transition-all"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span className="text-[10px] font-medium mt-1 uppercase tracking-wide">Sair</span>
          </button>
        )}
      </nav>
    </>
  );
}
