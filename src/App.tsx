/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Loja, User, Visita, Plano, Config, Revisita, RevisitaPonto } from './types';
import { INITIAL_LOJAS, INITIAL_USERS, STATUS_OPCOES } from './data';
import { todayISO, nowTimeStr, fileToCompressedDataURL } from './utils';
import {
  seedDatabaseIfEmpty,
  subscribeToCollection,
  subscribeToDoc,
  saveLojaToFirestore,
  deleteLojaFromFirestore,
  saveUserToFirestore,
  saveVisitaToFirestore,
  deleteVisitaFromFirestore,
  saveRevisitaToFirestore,
  deleteRevisitaFromFirestore,
  savePlanoToFirestore,
  deletePlanoFromFirestore,
  saveConfigToFirestore
} from './firebase';

// Import Views
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import LojasView from './components/LojasView';
import LojaDetailView from './components/LojaDetailView';
import PlanejamentoView from './components/PlanejamentoView';
import RelatoriosView from './components/RelatoriosView';
import ConfigView from './components/ConfigView';

// Import Modals
import Modal from './components/Modal';

// Icons
import { Camera, MapPin, Eye, EyeOff, AlertTriangle, Search } from 'lucide-react';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Core Data States
  const [lojas, setLojas] = useState<Loja[]>(() => {
    const storedLojas = localStorage.getItem('lojas');
    if (storedLojas) {
      try {
        const parsed = JSON.parse(storedLojas) as Loja[];
        return parsed.filter(l => l.filial !== '6' && l.filial !== '28' && l.id !== 'loja_6' && l.id !== 'loja_28');
      } catch (e) {
        return INITIAL_LOJAS;
      }
    }
    return INITIAL_LOJAS;
  });
  const [users, setUsers] = useState<User[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [revisitas, setRevisitas] = useState<Revisita[]>([]);
  const [config, setConfig] = useState<Config>({ prazoPadrao: 15 });

  // Navigation State
  const [currentView, setCurrentView] = useState('dashboard');
  const [relatoriosActiveTab, setRelatoriosActiveTab] = useState<'realizadas' | 'planejadas' | 'revisitas' | 'historico'>('realizadas');
  const [selectedLojaId, setSelectedLojaId] = useState('');

  // Filtering states
  const [busca, setBusca] = useState('');
  const [regional, setRegional] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Weekly Planning Navigation Offset
  const [planSemanaOffset, setPlanSemanaOffset] = useState(0);

  // Visual Theme Preference
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Modals States
  const [lojaFormOpen, setLojaFormOpen] = useState(false);
  const [editingLoja, setEditingLoja] = useState<Loja | null>(null);

  const [visitaFormOpen, setVisitaFormOpen] = useState(false);
  const [visitaActionType, setVisitaActionType] = useState<'realizar' | 'planejar'>('realizar');
  const [selectedLojaForVisita, setSelectedLojaForVisita] = useState<Loja | null>(null);
  const [selectedLojaIdsForVisita, setSelectedLojaIdsForVisita] = useState<string[]>([]);
  const [visitaLojaSearch, setVisitaLojaSearch] = useState('');
  const [associatedPlanoId, setAssociatedPlanoId] = useState<string | null>(null);
  const [selectedCoVisitantes, setSelectedCoVisitantes] = useState<string[]>([]);

  // Visita input fields states
  const [vData, setVData] = useState(todayISO());
  const [vHora, setVHora] = useState(nowTimeStr());
  const [vStatus, setVStatus] = useState(STATUS_OPCOES[0]);
  const [vComentario, setVComentario] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [vPendencias, setVPendencias] = useState<string[]>([]);
  const [novaPendencia, setNovaPendencia] = useState('');
  const [pendingGPS, setPendingGPS] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');

  // Revisit execution modal states
  const [revisitaFormOpen, setRevisitaFormOpen] = useState(false);
  const [selectedRevisita, setSelectedRevisita] = useState<Revisita | null>(null);
  const [revData, setRevData] = useState(todayISO());
  const [revHora, setRevHora] = useState(nowTimeStr());
  const [revObservacoes, setRevObservacoes] = useState('');
  const [revPendingPhotos, setRevPendingPhotos] = useState<string[]>([]);
  const [revPontosMelhoria, setRevPontosMelhoria] = useState<RevisitaPonto[]>([]);

  // Planned Visit setup modal
  const [planoFormOpen, setPlanoFormOpen] = useState(false);
  const [pLojaIds, setPLojaIds] = useState<string[]>([]);
  const [pLojaSearch, setPLojaSearch] = useState('');
  const [pData, setPData] = useState(todayISO());
  const [pUsuarios, setPUsuarios] = useState<string[]>([]);
  const [pObs, setPObs] = useState('');

  // Reschedule / return modal states
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnLojaId, setReturnLojaId] = useState('');
  const [returnData, setReturnData] = useState('');
  const [returnUsuario, setReturnUsuario] = useState('');
  const [returnObs, setReturnObs] = useState('');

  // Photo viewer modal overlay
  const [photoViewerUrl, setPhotoViewerUrl] = useState<string | null>(null);

  // Custom confirmation modal state (bypasses iframe block on window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const requestConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Simple Global toast system
  const [toastMsg, setToastMsg] = useState('');
  const [toastTimer, setToastTimer] = useState<NodeJS.Timeout | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer) clearTimeout(toastTimer);
    const timer = setTimeout(() => {
      setToastMsg('');
    }, 2800);
    setToastTimer(timer);
  };

  // Firebase synchronization state status
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // On mount: load database states from local storage or populate seed data, and sync with Firestore in real time
  useEffect(() => {
    // 1. First, load from localStorage if available to ensure instant, zero-delay boot
    const storedLojas = localStorage.getItem('lojas');
    if (storedLojas) {
      try {
        const parsed = JSON.parse(storedLojas) as Loja[];
        const filtered = parsed.filter(l => l.filial !== '6' && l.filial !== '28' && l.id !== 'loja_6' && l.id !== 'loja_28');
        setLojas(filtered);
      } catch (e) {}
    }

    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
      try {
        setUsers(JSON.parse(storedUsers));
      } catch (e) {
        setUsers(INITIAL_USERS);
      }
    } else {
      setUsers(INITIAL_USERS);
    }

    const storedVisitas = localStorage.getItem('visitas');
    if (storedVisitas) {
      try {
        setVisitas(JSON.parse(storedVisitas));
      } catch (e) {}
    }

    const storedPlanos = localStorage.getItem('planos');
    if (storedPlanos) {
      try {
        setPlanos(JSON.parse(storedPlanos));
      } catch (e) {}
    }

    const storedConfig = localStorage.getItem('config');
    if (storedConfig) {
      try {
        setConfig(JSON.parse(storedConfig));
      } catch (e) {}
    }

    const storedRevisitas = localStorage.getItem('revisitas');
    if (storedRevisitas) {
      try {
        setRevisitas(JSON.parse(storedRevisitas));
      } catch (e) {}
    }

    // Now, run the async Firestore seed to ensure default data is populated if DB is blank
    seedDatabaseIfEmpty();

    const handleSyncSuccess = () => setSyncStatus('connected');
    const handleSyncError = (err: any) => {
      console.error('Real-time sync error:', err);
      setSyncStatus('error');
    };

    // Subscribe to all Firestore collections for real-time live synchronization
    const unsubscribeLojas = subscribeToCollection<Loja>('lojas', (items) => {
      handleSyncSuccess();
      if (items && items.length > 0) {
        const filtered = items.filter(l => l.filial !== '6' && l.filial !== '28' && l.id !== 'loja_6' && l.id !== 'loja_28');
        setLojas(filtered);
        localStorage.setItem('lojas', JSON.stringify(filtered));
      }
    }, handleSyncError);

    const unsubscribeUsers = subscribeToCollection<User>('users', (items) => {
      handleSyncSuccess();
      if (items && items.length > 0) {
        setUsers(items);
        localStorage.setItem('users', JSON.stringify(items));
      }
    }, handleSyncError);

    const unsubscribeVisitas = subscribeToCollection<Visita>('visitas', (items) => {
      handleSyncSuccess();
      setVisitas(items);
      localStorage.setItem('visitas', JSON.stringify(items));
    }, handleSyncError);

    const unsubscribePlanos = subscribeToCollection<Plano>('planos', (items) => {
      handleSyncSuccess();
      setPlanos(items);
      localStorage.setItem('planos', JSON.stringify(items));
    }, handleSyncError);

    const unsubscribeRevisitas = subscribeToCollection<Revisita>('revisitas', (items) => {
      handleSyncSuccess();
      setRevisitas(items);
      localStorage.setItem('revisitas', JSON.stringify(items));
    }, handleSyncError);

    const unsubscribeConfig = subscribeToDoc<Config>('config', 'global', (item) => {
      handleSyncSuccess();
      if (item) {
        setConfig(item);
        localStorage.setItem('config', JSON.stringify(item));
      }
    }, handleSyncError);

    return () => {
      unsubscribeLojas();
      unsubscribeUsers();
      unsubscribeVisitas();
      unsubscribePlanos();
      unsubscribeRevisitas();
      unsubscribeConfig();
    };
  }, []);

  // Sync state changes to local storage when updated
  const saveLojasToStorage = (updatedLojas: Loja[]) => {
    const cleanLojas = updatedLojas.filter(l => l.filial !== '6' && l.filial !== '28' && l.id !== 'loja_6' && l.id !== 'loja_28');
    setLojas(cleanLojas);
    localStorage.setItem('lojas', JSON.stringify(cleanLojas));
  };

  const saveUsersToStorage = (updatedUsers: User[]) => {
    setUsers(updatedUsers);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
  };

  const saveVisitasToStorage = (updatedVisitas: Visita[]) => {
    setVisitas(updatedVisitas);
    localStorage.setItem('visitas', JSON.stringify(updatedVisitas));
  };

  const saveRevisitasToStorage = (updatedRevisitas: Revisita[]) => {
    setRevisitas(updatedRevisitas);
    localStorage.setItem('revisitas', JSON.stringify(updatedRevisitas));
  };

  const savePlanosToStorage = (updatedPlanos: Plano[]) => {
    setPlanos(updatedPlanos);
    localStorage.setItem('planos', JSON.stringify(updatedPlanos));
  };

  const saveConfigToStorage = (updatedConfig: Config) => {
    setConfig(updatedConfig);
    localStorage.setItem('config', JSON.stringify(updatedConfig));
  };

  // Theme application
  const applyTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Login handler
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = loginUsername.trim().toLowerCase();
    const emailBusca = raw.includes('@') ? raw : raw + '@alvorada.com';

    const u = users.find((x) => {
      const email = x.email.toLowerCase();
      const nome = x.nome.toLowerCase();
      return (email === raw || email === emailBusca || nome === raw) && x.senha === loginPassword;
    });

    if (!u) {
      setLoginError('Usuário ou senha inválidos.');
      return;
    }

    setLoginError('');
    setCurrentUser(u);

    // Load user preferences (theme)
    const storedPref = localStorage.getItem(`pref_${u.id}`);
    if (storedPref) {
      try {
        const pref = JSON.parse(storedPref);
        applyTheme(pref.darkMode ? 'dark' : 'light');
      } catch (e) {
        applyTheme('light');
      }
    } else {
      applyTheme('light');
    }

    triggerToast(`Bem-vindo, ${u.nome}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
    setLoginError('');
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    if (currentUser) {
      localStorage.setItem(`pref_${currentUser.id}`, JSON.stringify({ darkMode: nextTheme === 'dark' }));
    }
  };

  // Nav orchestrator
  const navigateTo = (view: string, param?: string) => {
    setCurrentView(view);
    if (view === 'loja-detalhe' && param) {
      setSelectedLojaId(param);
    }
    window.scrollTo(0, 0);
  };

  // Count delayed return stores
  const getAlertCount = () => {
    const hojeStr = todayISO();
    return lojas.filter((l) => {
      const lVisitas = visitas
        .filter((v) => v.lojaId === l.id)
        .sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));

      if (lVisitas.length === 0) return false; // never visited is not technically 'atrasada', it's pending
      const ultima = lVisitas[0];
      const prazo = l.prazo || config.prazoPadrao;
      const proximaDate = new Date(ultima.data);
      proximaDate.setDate(proximaDate.getDate() + prazo);

      const diffTime = proximaDate.getTime() - new Date(hojeStr).getTime();
      const dias = Math.round(diffTime / (1000 * 60 * 60 * 24));
      return dias < 0;
    }).length;
  };

  // Save / edit store details
  const handleOpenLojaForm = (lojaId?: string) => {
    if (lojaId) {
      const match = lojas.find((l) => l.id === lojaId);
      if (match) {
        setEditingLoja(match);
      }
    } else {
      setEditingLoja(null);
    }
    setLojaFormOpen(true);
  };

  const handleSaveLoja = async (formData: any) => {
    if (editingLoja) {
      // Editing
      const updatedLoja = { ...editingLoja, ...formData };
      const updated = lojas.map((l) => (l.id === editingLoja.id ? updatedLoja : l));
      saveLojasToStorage(updated);
      try {
        await saveLojaToFirestore(updatedLoja);
        triggerToast('Cadastro de loja atualizado!');
      } catch (err) {
        console.error('Error saving store to Firestore:', err);
      }
    } else {
      // Creating
      const newId = `loja_${Date.now()}`;
      const newLoja: Loja = {
        id: newId,
        filial: String(lojas.length + 1),
        ...formData,
      };
      saveLojasToStorage([...lojas, newLoja]);
      try {
        await saveLojaToFirestore(newLoja);
        triggerToast('Nova loja cadastrada com sucesso!');
      } catch (err) {
        console.error('Error creating store in Firestore:', err);
      }
    }
    setLojaFormOpen(false);
  };

  const handleDeleteLoja = (lojaId: string) => {
    requestConfirmation(
      'Excluir Loja',
      'Deseja realmente excluir esta loja e todo o histórico associado? Esta ação é irreversível.',
      async () => {
        const filteredLojas = lojas.filter((l) => l.id !== lojaId);
        const filteredVisitas = visitas.filter((v) => v.lojaId !== lojaId);
        const filteredPlanos = planos.filter((p) => p.lojaId !== lojaId);

        saveLojasToStorage(filteredLojas);
        saveVisitasToStorage(filteredVisitas);
        savePlanosToStorage(filteredPlanos);

        try {
          await deleteLojaFromFirestore(lojaId);
          // Delete associated visits & plans from Firestore as well
          const visitsToDelete = visitas.filter((v) => v.lojaId === lojaId);
          for (const v of visitsToDelete) {
            await deleteVisitaFromFirestore(v.id);
          }
          const plansToDelete = planos.filter((p) => p.lojaId === lojaId);
          for (const p of plansToDelete) {
            await deletePlanoFromFirestore(p.id);
          }
        } catch (err) {
          console.error('Error deleting store from Firestore:', err);
        }

        setLojaFormOpen(false);
        triggerToast('Loja excluída com sucesso.');
        navigateTo('lojas');
      }
    );
  };

  // Save / record a visit report
  const handleOpenVisitaModal = (lojaId?: string, planoId?: string, initialActionType: 'realizar' | 'planejar' = 'realizar') => {
    const defaultLoja = lojaId ? lojas.find((l) => l.id === lojaId) : (lojas.length > 0 ? lojas[0] : null);
    setSelectedLojaForVisita(defaultLoja || null);
    setSelectedLojaIdsForVisita(defaultLoja ? [defaultLoja.id] : []);
    setVisitaLojaSearch('');
    setAssociatedPlanoId(planoId || null);
    
    // Pre-populate co-visitors from associated plan if present
    const plan = planoId ? planos.find((p) => p.id === planoId) : null;
    if (plan) {
      const names = plan.usuario.split(',').map(s => s.trim()).filter(Boolean);
      const primaryUser = currentUser?.nome || 'Supervisor';
      const coVisitantes = names.filter(n => n.toLowerCase() !== primaryUser.toLowerCase() && n.toLowerCase() !== 'supervisor');
      setSelectedCoVisitantes(coVisitantes);
    } else {
      setSelectedCoVisitantes([]);
    }
    
    setVisitaActionType(initialActionType);

    // Reset input fields
    setVData(todayISO());
    setVHora(nowTimeStr());
    setVStatus(STATUS_OPCOES[0]);
    setVComentario('');
    setPendingPhotos([]);
    setVPendencias([]);
    setNovaPendencia('');
    setPendingGPS(null);
    setGpsStatus('');
    setGpsLoading(false);

    setVisitaFormOpen(true);
  };

  const handlePhotoInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const loadedPhotos = [...pendingPhotos];
    for (const f of files) {
      if (loadedPhotos.length >= 8) {
        triggerToast('Limite de 8 fotos por visita atingido.');
        break;
      }
      try {
        const compressed = await fileToCompressedDataURL(f);
        loadedPhotos.push(compressed);
      } catch (err) {
        triggerToast('Falha ao processar imagem.');
      }
    }
    setPendingPhotos(loadedPhotos);
    e.target.value = ''; // Reset input
  };

  const handleRemovePendingPhoto = (idx: number) => {
    setPendingPhotos(pendingPhotos.filter((_, i) => i !== idx));
  };

  const handleCaptureGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocalização não suportada no seu navegador.');
      return;
    }
    setGpsLoading(true);
    setGpsStatus('Capturando coordenadas...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPendingGPS({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('Localização registrada com sucesso ✓');
        setGpsLoading(false);
      },
      (err) => {
        setGpsStatus('Coordenadas indisponíveis ou permissão negada.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleAddPendencia = () => {
    if (novaPendencia.trim()) {
      setVPendencias([...vPendencias, novaPendencia.trim()]);
      setNovaPendencia('');
    }
  };

  const handleSaveVisita = async () => {
    if (!vData) {
      triggerToast('Defina a data da visita.');
      return;
    }

    const primaryUser = currentUser?.nome || 'Supervisor';
    const allParticipants = [primaryUser, ...selectedCoVisitantes];
    const uniqueParticipants = Array.from(new Set(allParticipants)).filter(Boolean);
    const usuarioStr = uniqueParticipants.join(', ');

    if (visitaActionType === 'planejar') {
      if (selectedLojaIdsForVisita.length === 0) {
        triggerToast('Selecione pelo menos uma filial para agendar.');
        return;
      }
      const novosPlanos: Plano[] = selectedLojaIdsForVisita.map((lojaId, index) => ({
        id: `plano_${Date.now()}_${index}`,
        lojaId,
        data: vData,
        usuario: usuarioStr,
        obs: vComentario.trim() || 'Visita agendada.',
        concluido: false,
      }));
      savePlanosToStorage([...planos, ...novosPlanos]);
      
      try {
        for (const p of novosPlanos) {
          await savePlanoToFirestore(p);
        }
      } catch (err) {
        console.error('Error saving plans to Firestore:', err);
      }

      setVisitaFormOpen(false);
      triggerToast(`Visita agendada com sucesso para ${selectedLojaIdsForVisita.length} ${selectedLojaIdsForVisita.length === 1 ? 'filial' : 'filiais'}!`);
      return;
    }

    if (!selectedLojaForVisita) {
      triggerToast('Selecione uma loja válida.');
      return;
    }

    const visitaId = `visita_${Date.now()}`;
    const newVisita: Visita = {
      id: visitaId,
      lojaId: selectedLojaForVisita.id,
      usuario: usuarioStr,
      data: vData,
      hora: vHora,
      status: vStatus,
      comentario: vComentario.trim(),
      gps: pendingGPS,
      temFotos: pendingPhotos.length > 0,
      pendencias: vPendencias,
      fotos: pendingPhotos,
    };

    // Save photos in separate entries to prevent exceeding browser localStorage quota
    if (pendingPhotos.length > 0) {
      localStorage.setItem(`fotos:${visitaId}`, JSON.stringify(pendingPhotos));
    }

    // Save visit
    const updatedVisitas = [...visitas, newVisita];
    saveVisitasToStorage(updatedVisitas);
    
    try {
      await saveVisitaToFirestore(newVisita);
    } catch (err) {
      console.error('Error saving visit to Firestore:', err);
    }

    // Check off scheduled planning if associated
    const basePlanos = associatedPlanoId
      ? planos.map((p) => {
          if (p.id === associatedPlanoId) {
            const updatedP = { ...p, concluido: true };
            savePlanoToFirestore(updatedP).catch(console.error);
            return updatedP;
          }
          return p;
        })
      : planos;

    // Automatically calculate future revisit date (periodicity)
    const prazoDias = selectedLojaForVisita.prazo || config.prazoPadrao || 15;
    let dataRevisita = todayISO();
    try {
      const baseDate = new Date(vData + 'T12:00:00');
      baseDate.setDate(baseDate.getDate() + prazoDias);
      dataRevisita = baseDate.toISOString().split('T')[0];
    } catch (e) {
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + prazoDias);
      dataRevisita = baseDate.toISOString().split('T')[0];
    }

    // Create automatic Revisita Pendente
    const newRevisita: Revisita = {
      id: `revisita_${Date.now()}`,
      visitaOriginalId: newVisita.id,
      lojaId: selectedLojaForVisita.id,
      usuario: usuarioStr,
      dataPlanejada: dataRevisita,
      concluida: false,
      pontosMelhoria: vPendencias.map((p) => ({
        descricao: p,
        corrigido: false,
      })),
      observacoesOriginais: vComentario.trim() || 'Visita concluída.',
      temFotos: false,
    };

    saveRevisitasToStorage([...revisitas, newRevisita]);
    try {
      await saveRevisitaToFirestore(newRevisita);
    } catch (err) {
      console.error('Error saving revisit to Firestore:', err);
    }

    savePlanosToStorage(basePlanos);

    // Close registration modal
    setVisitaFormOpen(false);
    setRelatoriosActiveTab('realizadas');
    navigateTo('relatorios');
    triggerToast('Relatório de visita gravado e revisita agendada automaticamente!');
  };

  const handleSaveReturnPlano = async () => {
    if (!returnLojaId || !returnData) {
      triggerToast('Selecione a loja e data agendada.');
      return;
    }
    const newPlano: Plano = {
      id: `plano_${Date.now()}`,
      lojaId: returnLojaId,
      data: returnData,
      usuario: returnUsuario,
      obs: returnObs.trim() || 'Retorno agendado pós visita.',
      concluido: false,
    };
    savePlanosToStorage([...planos, newPlano]);
    try {
      await savePlanoToFirestore(newPlano);
    } catch (err) {
      console.error('Error saving plan to Firestore:', err);
    }

    // Automatically create a corresponding Revisita as per Step 3!
    const originalVisita = visitas[visitas.length - 1] || null;
    const newRevisita: Revisita = {
      id: `revisita_${Date.now()}`,
      visitaOriginalId: originalVisita ? originalVisita.id : '',
      lojaId: returnLojaId,
      usuario: returnUsuario,
      dataPlanejada: returnData,
      concluida: false,
      pontosMelhoria: (originalVisita?.pendencias || []).map((p) => ({
        descricao: p,
        corrigido: false,
      })),
      observacoesOriginais: originalVisita?.comentario || '',
      temFotos: false,
    };
    saveRevisitasToStorage([...revisitas, newRevisita]);
    try {
      await saveRevisitaToFirestore(newRevisita);
    } catch (err) {
      console.error('Error saving revisit to Firestore:', err);
    }

    setReturnModalOpen(false);
    triggerToast('Agendamento de retorno e revisita automática gravados!');

    setRelatoriosActiveTab('realizadas');
    navigateTo('relatorios');
  };

  const handleSkipReturn = () => {
    setReturnModalOpen(false);
    setRelatoriosActiveTab('realizadas');
    navigateTo('relatorios');
  };

  const handleOpenRevisitaModal = (revisita: Revisita) => {
    setSelectedRevisita(revisita);
    setRevData(todayISO());
    setRevHora(nowTimeStr());
    setRevObservacoes('');
    setRevPendingPhotos([]);
    setRevPontosMelhoria(revisita.pontosMelhoria.map((p) => ({ ...p })));
    setRevisitaFormOpen(true);
  };

  const handlePhotoInputRevisita = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const loadedPhotos = [...revPendingPhotos];
    for (const f of files) {
      if (loadedPhotos.length >= 8) {
        triggerToast('Limite máximo de 8 fotos atingido.');
        break;
      }
      try {
        const compressed = await fileToCompressedDataURL(f);
        loadedPhotos.push(compressed);
      } catch (err) {
        triggerToast('Erro ao carregar a imagem.');
      }
    }
    setRevPendingPhotos(loadedPhotos);
  };

  const handleRemovePendingPhotoRevisita = (index: number) => {
    setRevPendingPhotos(revPendingPhotos.filter((_, i) => i !== index));
  };

  const handleSaveRevisitaExecution = async () => {
    if (!selectedRevisita) return;

    const updatedRevisitaObj = {
      ...selectedRevisita,
      dataRealizada: revData,
      horaRealizada: revHora,
      concluida: true,
      pontosMelhoria: revPontosMelhoria,
      novasObservacoes: revObservacoes.trim(),
      temFotos: revPendingPhotos.length > 0,
      fotos: revPendingPhotos,
    };

    const baseRevisitas = revisitas.map((r) =>
      r.id === selectedRevisita.id ? updatedRevisitaObj : r
    );

    if (revPendingPhotos.length > 0) {
      localStorage.setItem(`fotos_revisita:${selectedRevisita.id}`, JSON.stringify(revPendingPhotos));
    }

    saveRevisitasToStorage(baseRevisitas);
    try {
      await saveRevisitaToFirestore(updatedRevisitaObj);
    } catch (err) {
      console.error('Error saving revisit execution to Firestore:', err);
    }
    setRevisitaFormOpen(false);
    setRelatoriosActiveTab('realizadas');
    navigateTo('relatorios');
    triggerToast('Revisita finalizada com sucesso e registrada no histórico!');
  };

  const handleExcluirRevisita = (id: string) => {
    if (currentUser?.nome?.trim().toLowerCase() !== 'kadu') {
      triggerToast('Apenas o usuário Kadu tem permissão para excluir!');
      return;
    }
    requestConfirmation(
      'Excluir Revisita',
      'Deseja realmente excluir esta revisita? Esta ação é irreversível.',
      async () => {
        const updated = revisitas.filter((r) => r.id !== id);
        saveRevisitasToStorage(updated);
        localStorage.removeItem(`fotos_revisita:${id}`);
        try {
          await deleteRevisitaFromFirestore(id);
        } catch (err) {
          console.error('Error deleting revisit from Firestore:', err);
        }
        triggerToast('Revisita excluída com sucesso.');
      }
    );
  };

  const handleRescheduleRevisita = async (revisitaId: string, newDate: string) => {
    const r = revisitas.find((item) => item.id === revisitaId);
    if (!r) return;

    const updatedRevisitaObj = { ...r, dataPlanejada: newDate };
    const updatedList = revisitas.map((item) => (item.id === revisitaId ? updatedRevisitaObj : item));
    saveRevisitasToStorage(updatedList);

    try {
      await saveRevisitaToFirestore(updatedRevisitaObj);
      triggerToast('Data da revisita reprogramada com sucesso!');
    } catch (err) {
      console.error('Error updating revisit date in Firestore:', err);
      triggerToast('Erro ao atualizar data no banco de dados.');
    }
  };

  // Planned Visits handling
  const handleOpenPlanoForm = () => {
    if (lojas.length === 0) {
      triggerToast('Cadastre ao menos uma loja antes de planejar.');
      return;
    }
    setPLojaIds([lojas[0].id]);
    setPLojaSearch('');
    setPData(todayISO());
    setPUsuarios([currentUser?.nome || users[0]?.nome || '']);
    setPObs('');
    setPlanoFormOpen(true);
  };

  const handleSavePlano = async () => {
    if (pLojaIds.length === 0) {
      triggerToast('Selecione ao menos uma filial.');
      return;
    }
    if (!pData) {
      triggerToast('Selecione a data agendada.');
      return;
    }
    if (pUsuarios.length === 0) {
      triggerToast('Selecione ao menos um responsável.');
      return;
    }

    const novosPlanos: Plano[] = pLojaIds.map((lojaId, index) => ({
      id: `plano_${Date.now()}_${index}`,
      lojaId,
      data: pData,
      usuario: pUsuarios.join(', '),
      obs: pObs.trim(),
      concluido: false,
    }));

    savePlanosToStorage([...planos, ...novosPlanos]);
    try {
      for (const p of novosPlanos) {
        await savePlanoToFirestore(p);
      }
    } catch (err) {
      console.error('Error saving plans to Firestore:', err);
    }
    setPlanoFormOpen(false);
    triggerToast(`Agenda registrada com sucesso para ${pLojaIds.length} ${pLojaIds.length === 1 ? 'filial' : 'filiais'}!`);
  };

  const handleExcluirPlano = (id: string) => {
    if (currentUser?.nome?.trim().toLowerCase() !== 'kadu') {
      triggerToast('Apenas o usuário Kadu tem permissão para excluir!');
      return;
    }
    const updated = planos.filter((p) => p.id !== id);
    savePlanosToStorage(updated);
    deletePlanoFromFirestore(id).catch(console.error);
    triggerToast('Visita removida da agenda.');
  };

  const handleExcluirVisita = (id: string) => {
    if (currentUser?.nome?.trim().toLowerCase() !== 'kadu') {
      triggerToast('Apenas o usuário Kadu tem permissão para excluir!');
      return;
    }
    requestConfirmation(
      'Excluir Visita',
      'Deseja realmente excluir este relatório de visita? Esta ação é irreversível.',
      async () => {
        const updated = visitas.filter((v) => v.id !== id);
        saveVisitasToStorage(updated);
        localStorage.removeItem(`fotos:${id}`);

        // Cascade-delete any associated revisits linked to this visit
        const associatedRevisitas = revisitas.filter((r) => r.visitaOriginalId === id);
        if (associatedRevisitas.length > 0) {
          const updatedRevisitas = revisitas.filter((r) => r.visitaOriginalId !== id);
          saveRevisitasToStorage(updatedRevisitas);
          for (const rev of associatedRevisitas) {
            localStorage.removeItem(`fotos_revisita:${rev.id}`);
            try {
              await deleteRevisitaFromFirestore(rev.id);
            } catch (err) {
              console.error('Error deleting associated revisit from Firestore:', err);
            }
          }
        }

        try {
          await deleteVisitaFromFirestore(id);
        } catch (err) {
          console.error('Error deleting visit from Firestore:', err);
        }
        triggerToast('Relatório de visita excluído com sucesso.');
      }
    );
  };

  const handleConcluirPlano = async (planoId: string) => {
    const plano = planos.find((p) => p.id === planoId);
    if (!plano) return;

    // Create a corresponding completed Visita
    const visitaId = `visita_${Date.now()}`;
    const newVisita: Visita = {
      id: visitaId,
      lojaId: plano.lojaId,
      usuario: plano.usuario,
      data: plano.data,
      hora: '12:00',
      status: 'OK · No Prazo',
      comentario: plano.obs ? `Visita concluída. Obs original: ${plano.obs}` : 'Visita concluída com sucesso',
      gps: null,
      temFotos: false,
    };

    // Mark the plan as completed
    const updatedPlanos = planos.map((p) => {
      if (p.id === planoId) {
        const updatedP = { ...p, concluido: true };
        savePlanoToFirestore(updatedP).catch(console.error);
        return updatedP;
      }
      return p;
    });

    saveVisitasToStorage([...visitas, newVisita]);
    savePlanosToStorage(updatedPlanos);
    try {
      await saveVisitaToFirestore(newVisita);
    } catch (err) {
      console.error('Error saving concluded visit to Firestore:', err);
    }
    triggerToast('Visita marcada como concluída e registrada nos relatórios!');
  };

  // Save changes to thresholds
  const handleSetPrazoPadrao = async (prazo: number) => {
    const updatedConfig = { ...config, prazoPadrao: prazo };
    saveConfigToStorage(updatedConfig);
    try {
      await saveConfigToFirestore(updatedConfig);
      triggerToast(`Prazo padrão definido para ${prazo} dias.`);
    } catch (err) {
      console.error('Error saving config to Firestore:', err);
    }
  };

  // Save changes to current user password
  const handleUpdatePassword = async (userId: string, passwordString: string) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        const updatedU = { ...u, senha: passwordString };
        saveUserToFirestore(updatedU).catch(console.error);
        return updatedU;
      }
      return u;
    });
    saveUsersToStorage(updated);
    if (currentUser && currentUser.id === userId) {
      setCurrentUser({ ...currentUser, senha: passwordString });
    }
    triggerToast('Senha pessoal redefinida!');
  };

  const handleCreateUser = async (nome: string, email: string, senha: string) => {
    const trimmedNome = nome.trim();
    const trimmedEmail = email.trim();
    const trimmedSenha = senha.trim();

    if (!trimmedNome || !trimmedEmail || !trimmedSenha) {
      triggerToast('Preencha todos os campos do supervisor!');
      return;
    }

    // Check for duplicates
    if (users.some((u) => u.nome.toLowerCase() === trimmedNome.toLowerCase() || u.email.toLowerCase() === trimmedEmail.toLowerCase())) {
      triggerToast('Este supervisor ou e-mail já está cadastrado!');
      return;
    }

    const newUser: User = {
      id: `user_${Date.now()}`,
      nome: trimmedNome,
      email: trimmedEmail,
      senha: trimmedSenha
    };

    const updated = [...users, newUser];
    saveUsersToStorage(updated);
    try {
      await saveUserToFirestore(newUser);
      triggerToast(`Supervisor ${trimmedNome} cadastrado com sucesso!`);
    } catch (err) {
      console.error('Error saving new user to Firestore:', err);
      triggerToast('Supervisor cadastrado localmente.');
    }
  };

  // Import JSON database backup
  const handleImportBackup = async (backupDataString: string) => {
    try {
      const data = JSON.parse(backupDataString);
      if (data.lojas && Array.isArray(data.lojas)) {
        saveLojasToStorage(data.lojas);
        for (const l of data.lojas) {
          await saveLojaToFirestore(l);
        }
      }
      if (data.visitas && Array.isArray(data.visitas)) {
        saveVisitasToStorage(data.visitas);
        for (const v of data.visitas) {
          await saveVisitaToFirestore(v);
        }
      }
      if (data.planos && Array.isArray(data.planos)) {
        savePlanosToStorage(data.planos);
        for (const p of data.planos) {
          await savePlanoToFirestore(p);
        }
      }
      if (data.config && typeof data.config === 'object') {
        saveConfigToStorage(data.config);
        await saveConfigToFirestore(data.config);
      }
      triggerToast('Dados operacionais restaurados com sucesso!');
      navigateTo('dashboard');
    } catch (e) {
      triggerToast('O arquivo JSON importado possui erros.');
    }
  };

  // If not authenticated, render Login Screen
  if (currentUser === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-radial from-brand-accent/20 via-brand-navy to-[#0a1220]">
        <div className="bg-card border border-line rounded-2xl px-6 py-8 sm:p-10 w-full max-w-sm shadow-2xl relative overflow-hidden transition-colors duration-300">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="relative w-4 h-4 rounded-full bg-brand-accent">
              <span className="absolute -inset-1.5 border-2 border-dashed border-brand-accent rounded-full opacity-40 animate-spin" />
            </div>
            <span className="font-condensed font-extrabold text-2xl text-ink tracking-wider uppercase">
              RotaCerta
            </span>
          </div>
          <p className="text-xs text-ink-soft mb-6 leading-relaxed">
            Painel de rotas e visitas a filiais do Grupo Alvorada
          </p>

          {loginError && (
            <div className="bg-brand-red-soft border border-brand-red/10 text-brand-red text-xs p-3 rounded-lg flex items-center gap-2 mb-4 animate-shake">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Usuário / Supervisor
              </label>
              <input
                type="text"
                placeholder="Seu nome ou email institucional"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 border-1.5 border-line rounded-lg bg-paper text-ink text-sm outline-none focus:border-brand-accent transition-colors"
                autoComplete="username"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Senha Operacional
              </label>
              <div className="relative">
                <input
                  type={showLoginPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 border-1.5 border-line rounded-lg bg-paper text-ink text-sm outline-none focus:border-brand-accent transition-colors"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPw(!showLoginPw)}
                  className="absolute inset-y-0 right-3 flex items-center text-ink-faint hover:text-ink-soft"
                >
                  {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-brand-accent text-white font-bold text-sm rounded-lg hover:bg-brand-accent/90 active:scale-95 transition-all shadow-md cursor-pointer mt-2"
            >
              Acessar Painel
            </button>
          </form>

          {/* Quick-select supervisor logins hint helper */}
          <div className="mt-6 pt-5 border-t border-line border-dashed text-[11px] text-ink-faint leading-normal">
            Supervisores cadastrados: <span className="font-semibold text-ink-soft">{users.map((u) => u.nome).join(', ')}</span>.
            <br />
            Senha padrão de acesso: <span className="font-mono font-bold text-ink-soft">1234</span> (altere após conectar).
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col md:flex-row transition-colors duration-300">
      {/* Side Menu Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={navigateTo}
        user={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        alertCount={getAlertCount()}
        syncStatus={syncStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-56 px-4 py-6 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
        {currentView === 'dashboard' && (
          <DashboardView
            lojas={lojas}
            visitas={visitas}
            planos={planos}
            onNavigate={navigateTo}
            onOpenVisitaModal={handleOpenVisitaModal}
          />
        )}

        {currentView === 'lojas' && (
          <LojasView
            lojas={lojas}
            visitas={visitas}
            planos={planos}
            onNavigate={navigateTo}
            onOpenLojaForm={handleOpenLojaForm}
            busca={busca}
            setBusca={setBusca}
            regional={regional}
            setRegional={setRegional}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        )}

        {currentView === 'loja-detalhe' && (
          <LojaDetailView
            lojaId={selectedLojaId}
            lojas={lojas}
            visitas={visitas}
            revisitas={revisitas}
            planos={planos}
            onNavigate={navigateTo}
            onOpenLojaForm={handleOpenLojaForm}
            onOpenVisitaModal={handleOpenVisitaModal}
            onOpenRevisitaModal={handleOpenRevisitaModal}
            onViewPhoto={setPhotoViewerUrl}
            onExcluirPlano={handleExcluirPlano}
            onExcluirVisita={handleExcluirVisita}
            onExcluirRevisita={handleExcluirRevisita}
            canExcluir={currentUser?.nome?.trim().toLowerCase() === 'kadu'}
          />
        )}

        {currentView === 'planejamento' && (
          <PlanejamentoView
            planos={planos}
            revisitas={revisitas}
            lojas={lojas}
            users={users}
            onOpenVisitaModal={handleOpenVisitaModal}
            onOpenRevisitaModal={handleOpenRevisitaModal}
            onOpenPlanoForm={handleOpenPlanoForm}
            onExcluirPlano={handleExcluirPlano}
            planSemanaOffset={planSemanaOffset}
            setPlanSemanaOffset={setPlanSemanaOffset}
            canExcluir={currentUser?.nome?.trim().toLowerCase() === 'kadu'}
          />
        )}

        {currentView === 'relatorios' && (
          <RelatoriosView
            visitas={visitas}
            planos={planos}
            revisitas={revisitas}
            lojas={lojas}
            users={users}
            toast={triggerToast}
            activeTab={relatoriosActiveTab}
            onChangeTab={setRelatoriosActiveTab}
            onExcluirVisita={handleExcluirVisita}
            onExcluirPlano={handleExcluirPlano}
            onConcluirPlano={handleConcluirPlano}
            onOpenRevisitaModal={handleOpenRevisitaModal}
            onExcluirRevisita={handleExcluirRevisita}
            onViewPhoto={setPhotoViewerUrl}
            onOpenVisitaModal={handleOpenVisitaModal}
            onNavigate={navigateTo}
            onRescheduleRevisita={handleRescheduleRevisita}
            canExcluir={currentUser?.nome?.trim().toLowerCase() === 'kadu'}
          />
        )}

        {currentView === 'config' && (
          <ConfigView
            users={users}
            currentUser={currentUser}
            config={config}
            setPrazoPadrao={handleSetPrazoPadrao}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onUpdatePassword={handleUpdatePassword}
            onAddUser={handleCreateUser}
            onImportBackup={handleImportBackup}
            lojas={lojas}
            visitas={visitas}
            planos={planos}
            toast={triggerToast}
          />
        )}
      </main>

      {/* ========================================= MODALS ========================================= */}

      {/* Modal de Confirmação Customizado (Resolve limitação de window.confirm em iframes) */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        footer={
          <>
            <button
              onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
              className="px-4 py-2 border border-line rounded-lg text-xs font-semibold text-ink-soft bg-card hover:bg-paper cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmModal.onConfirm}
              className="px-4 py-2 bg-brand-red hover:bg-brand-red/90 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer active:scale-95"
            >
              Confirmar Exclusão
            </button>
          </>
        }
      >
        <div className="py-2">
          <p className="text-xs text-ink leading-relaxed font-semibold">
            {confirmModal.message}
          </p>
        </div>
      </Modal>

      {/* Modal: Store setup and modification */}
      <Modal
        isOpen={lojaFormOpen}
        onClose={() => setLojaFormOpen(false)}
        title={editingLoja ? 'Editar Loja' : 'Cadastrar Nova Loja'}
        footer={
          <>
            {editingLoja && (
              <button
                onClick={() => handleDeleteLoja(editingLoja.id)}
                className="px-4 py-2 border border-brand-red text-brand-red bg-card hover:bg-brand-red-soft font-bold rounded-lg text-xs mr-auto transition-colors cursor-pointer active:scale-95"
              >
                Excluir Loja
              </button>
            )}
            <button
              onClick={() => setLojaFormOpen(false)}
              className="px-4 py-2 border border-line rounded-lg text-xs font-semibold text-ink-soft bg-card hover:bg-paper cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                const fNome = (document.getElementById('m-f-nome') as HTMLInputElement)?.value.trim();
                if (!fNome) {
                  triggerToast('Informe o nome fantasia da loja.');
                  return;
                }
                const data = {
                  nome: fNome,
                  codigo: (document.getElementById('m-f-codigo') as HTMLInputElement)?.value.trim() || '—',
                  cidade: (document.getElementById('m-f-cidade') as HTMLInputElement)?.value.trim() || '—',
                  estado: (document.getElementById('m-f-estado') as HTMLInputElement)?.value.trim().toUpperCase() || 'RJ',
                  endereco: (document.getElementById('m-f-endereco') as HTMLInputElement)?.value.trim() || '—',
                  bairro: (document.getElementById('m-f-bairro') as HTMLInputElement)?.value.trim() || '—',
                  regional: (document.getElementById('m-f-regional') as HTMLInputElement)?.value.trim() || '—',
                  prazo: (document.getElementById('m-f-prazo') as HTMLInputElement)?.value
                    ? parseInt((document.getElementById('m-f-prazo') as HTMLInputElement)?.value)
                    : null,
                  supervisor: (document.getElementById('m-f-supervisor') as HTMLInputElement)?.value.trim() || '—',
                  observacoes: (document.getElementById('m-f-obs') as HTMLTextAreaElement)?.value.trim() || '',
                };
                handleSaveLoja(data);
              }}
              className="px-4.5 py-2 bg-brand-accent hover:bg-brand-accent/95 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer active:scale-95"
            >
              Gravar
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Nome Fantasia *
              </label>
              <input
                id="m-f-nome"
                type="text"
                defaultValue={editingLoja?.nome || ''}
                className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Código da Filial
              </label>
              <input
                id="m-f-codigo"
                type="text"
                defaultValue={editingLoja?.codigo || ''}
                placeholder="Ex: 001-TAN"
                className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Cidade
              </label>
              <input
                id="m-f-cidade"
                type="text"
                defaultValue={editingLoja?.cidade || ''}
                className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Estado
              </label>
              <input
                id="m-f-estado"
                type="text"
                defaultValue={editingLoja?.estado || 'RJ'}
                maxLength={2}
                className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
              Bairro
            </label>
            <input
              id="m-f-bairro"
              type="text"
              defaultValue={editingLoja?.bairro || ''}
              className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
              Logradouro / Endereço Completo
            </label>
            <input
              id="m-f-endereco"
              type="text"
              defaultValue={editingLoja?.endereco || ''}
              placeholder="Rua, avenida, número..."
              className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Regional (Letra)
              </label>
              <input
                id="m-f-regional"
                type="text"
                defaultValue={editingLoja?.regional || ''}
                placeholder="Ex: A"
                className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Prazo de Retorno (dias)
              </label>
              <input
                id="m-f-prazo"
                type="number"
                min={1}
                defaultValue={editingLoja?.prazo || ''}
                placeholder={`Padrão: ${config.prazoPadrao}`}
                className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
              Supervisor Responsável
            </label>
            <input
              id="m-f-supervisor"
              type="text"
              defaultValue={editingLoja?.supervisor || ''}
              placeholder="Nome do supervisor responsável"
              className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
              Observações gerais de rota
            </label>
            <textarea
              id="m-f-obs"
              defaultValue={editingLoja?.observacoes || ''}
              rows={3}
              placeholder="Instruções para reposição, restrições de horários..."
              className="px-3 py-2 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Record Visit */}
      <Modal
        isOpen={visitaFormOpen}
        onClose={() => setVisitaFormOpen(false)}
        title={visitaActionType === 'realizar' ? "Registrar Visita Técnica" : "Agendar Visita Técnica"}
        footer={
          <>
            <button
              onClick={() => setVisitaFormOpen(false)}
              className="px-4 py-2 border border-line rounded-lg text-xs font-semibold text-ink-soft bg-card hover:bg-paper cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveVisita}
              className="px-4.5 py-2 bg-brand-accent hover:bg-brand-accent/95 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer active:scale-95"
            >
              {visitaActionType === 'realizar' ? 'Gravar Relatório' : 'Agendar Visita'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Selector Tabs: Realizar vs Planejar */}
          {!associatedPlanoId && (
            <div className="flex bg-paper border border-line rounded-lg p-1">
              <button
                type="button"
                onClick={() => setVisitaActionType('realizar')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  visitaActionType === 'realizar'
                    ? 'bg-brand-accent text-white shadow-xs'
                    : 'text-ink-soft hover:bg-card'
                }`}
              >
                Registrar Visita Realizada
              </button>
              <button
                type="button"
                onClick={() => setVisitaActionType('planejar')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  visitaActionType === 'planejar'
                    ? 'bg-brand-accent text-white shadow-xs'
                    : 'text-ink-soft hover:bg-card'
                }`}
              >
                Agendar Visita (Planejar)
              </button>
            </div>
          )}

          {visitaActionType === 'realizar' ? (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Filial Visitada *
              </label>
              {associatedPlanoId ? (
                <div className="px-3.5 py-3 border border-brand-accent bg-brand-accent/5 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-ink block text-xs">
                      {selectedLojaForVisita?.nome || 'Filial não encontrada'}
                    </span>
                    <span className="text-[10px] text-ink-soft font-mono">
                      Código: {selectedLojaForVisita?.codigo || '—'}
                    </span>
                  </div>
                  <span className="text-[10px] bg-brand-accent/15 text-brand-accent font-extrabold px-2 py-0.5 rounded-full uppercase">
                    Regional {selectedLojaForVisita?.regional || '—'}
                  </span>
                </div>
              ) : (
                <select
                  value={selectedLojaForVisita?.id || ''}
                  onChange={(e) => {
                    const match = lojas.find((l) => l.id === e.target.value);
                    setSelectedLojaForVisita(match || null);
                  }}
                  className="px-3 py-2 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-card text-ink"
                >
                  {lojas.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome} · {l.codigo}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Selecionar Filiais Planejadas *
              </label>
              <span className="text-[10px] text-ink-faint leading-tight mb-1.5 block">
                Selecione uma ou mais filiais para planejar visitas.
              </span>
              
              {/* Busca da filial */}
              <div className="relative mb-2">
                <input
                  type="text"
                  placeholder="Pesquisar filial por nome ou código..."
                  value={visitaLojaSearch}
                  onChange={(e) => setVisitaLojaSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
                />
                <Search className="w-3.5 h-3.5 text-ink-faint absolute left-2.5 top-2.5" />
              </div>

              {/* Lista de Filiais */}
              <div className="border border-line rounded-lg bg-card/60 p-2 max-h-40 overflow-y-auto space-y-1">
                {(() => {
                  const filteredLojas = lojas.filter(
                    (l) =>
                      l.nome.toLowerCase().includes(visitaLojaSearch.toLowerCase()) ||
                      l.codigo.toLowerCase().includes(visitaLojaSearch.toLowerCase())
                  );
                  return (
                    <>
                      <div className="flex items-center justify-between border-b border-line/40 pb-1.5 mb-1.5 text-[10px] font-bold uppercase text-ink-soft px-1">
                        <span>{filteredLojas.length} Filiais encontradas</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedLojaIdsForVisita(lojas.map(l => l.id))}
                            className="text-brand-accent hover:underline cursor-pointer"
                          >
                            Marcar Todas
                          </button>
                          <span>·</span>
                          <button
                            type="button"
                            onClick={() => setSelectedLojaIdsForVisita([])}
                            className="text-ink-soft hover:underline cursor-pointer"
                          >
                            Desmarcar Todas
                          </button>
                        </div>
                      </div>
                      {filteredLojas.map((l) => {
                        const isChecked = selectedLojaIdsForVisita.includes(l.id);
                        return (
                          <label
                            key={l.id}
                            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors select-none ${
                              isChecked ? 'bg-brand-accent-soft/40 text-brand-accent font-bold' : 'hover:bg-paper text-ink'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedLojaIdsForVisita(selectedLojaIdsForVisita.filter((id) => id !== l.id));
                                } else {
                                  setSelectedLojaIdsForVisita([...selectedLojaIdsForVisita, l.id]);
                                }
                              }}
                              className="rounded border-line text-brand-accent focus:ring-brand-accent w-3.5 h-3.5"
                            />
                            <span className="truncate">
                              {l.nome} · <span className="font-mono text-[10.5px] font-medium text-ink-soft">{l.codigo}</span>
                            </span>
                          </label>
                        );
                      })}
                      {filteredLojas.length === 0 && (
                        <div className="text-center py-4 text-xs text-ink-faint">
                          Nenhuma filial encontrada.
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              {selectedLojaIdsForVisita.length > 0 && (
                <span className="text-[10px] text-brand-accent font-semibold mt-1">
                  {selectedLojaIdsForVisita.length} {selectedLojaIdsForVisita.length === 1 ? 'filial selecionada' : 'filiais selecionadas'}
                </span>
              )}
            </div>
          )}

          {/* Seletor de Equipe / Acompanhantes */}
          <div className="flex flex-col gap-1.5 border-t border-b border-line/40 py-2.5 my-2">
            <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">
              Equipe / Acompanhantes (Visita em Conjunto)
            </label>
            <span className="text-[10px] text-ink-faint leading-tight block">
              Selecione outros supervisores ou auditores que participaram ou participarão desta visita junto com você.
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {users.map((u) => {
                const isCurrentUser = currentUser ? u.nome.toLowerCase() === currentUser.nome.toLowerCase() : false;
                const isSelected = selectedCoVisitantes.includes(u.nome) || isCurrentUser;
                
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      if (isCurrentUser) return;
                      if (selectedCoVisitantes.includes(u.nome)) {
                        setSelectedCoVisitantes(selectedCoVisitantes.filter((name) => name !== u.nome));
                      } else {
                        setSelectedCoVisitantes([...selectedCoVisitantes, u.nome]);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none ${
                      isCurrentUser
                        ? 'bg-brand-accent/10 border-brand-accent/20 text-brand-accent cursor-not-allowed font-bold'
                        : isSelected
                        ? 'bg-brand-accent border-brand-accent text-white font-bold'
                        : 'bg-card border-line text-ink-soft hover:bg-paper hover:text-ink'
                    }`}
                  >
                    {isSelected && <span className="text-[9px] font-bold">✓</span>}
                    <span>{u.nome}</span>
                    {isCurrentUser && <span className="text-[9px] opacity-80 font-normal italic">(Você)</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {visitaActionType === 'realizar' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                    Data da Auditoria
                  </label>
                  <input
                    type="date"
                    value={vData}
                    onChange={(e) => setVData(e.target.value)}
                    className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                    Hora da Entrada
                  </label>
                  <input
                    type="time"
                    value={vHora}
                    onChange={(e) => setVHora(e.target.value)}
                    className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                  Parecer / Status da Loja *
                </label>
                <select
                  value={vStatus}
                  onChange={(e) => setVStatus(e.target.value)}
                  className="px-3 py-2 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-card text-ink"
                >
                  {STATUS_OPCOES.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                  Comentários e Desvios Identificados
                </label>
                <textarea
                  value={vComentario}
                  onChange={(e) => setVComentario(e.target.value)}
                  rows={3}
                  placeholder="Descreva a qualidade da reposição, planograma, rupturas identificadas..."
                  className="px-3 py-2 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
                />
              </div>

              {/* Pontos de Melhoria / Pendências */}
              <div className="flex flex-col gap-1 bg-paper/20 border border-line/60 rounded-xl p-3 space-y-2">
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider block">
                  Lista de Pendências / Pontos de Melhoria (Checklist para Revisita)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novaPendencia}
                    onChange={(e) => setNovaPendencia(e.target.value)}
                    placeholder="Ex: Corrigir precificação na gôndola"
                    className="flex-1 px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPendencia();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddPendencia}
                    className="px-3 py-1.5 bg-brand-accent text-white rounded-lg text-xs font-bold hover:bg-brand-accent/90 cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
                {vPendencias.length > 0 && (
                  <ul className="space-y-1 max-h-[120px] overflow-y-auto">
                    {vPendencias.map((p, index) => (
                      <li key={index} className="flex items-center justify-between text-xs text-ink py-1 border-b border-line/40 last:border-0">
                        <span className="truncate flex-1">• {p}</span>
                        <button
                          type="button"
                          onClick={() => setVPendencias(vPendencias.filter((_, i) => i !== index))}
                          className="text-brand-red hover:underline text-[10px] font-bold px-1"
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Photos list */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                  Anexar Evidências Fotográficas (Tirar Foto)
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {pendingPhotos.map((src, i) => (
                    <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-line shadow-xs flex-shrink-0">
                      <img src={src} className="w-full h-full object-cover" alt="Anexo" />
                      <button
                        onClick={() => handleRemovePendingPhoto(i)}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white rounded-full w-4.5 h-4.5 flex items-center justify-center text-[10px] font-bold leading-none border border-white/20 cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {pendingPhotos.length < 8 && (
                    <label className="w-14 h-14 rounded-lg border-2 border-dashed border-line flex flex-col items-center justify-center text-ink-faint hover:text-ink-soft hover:border-brand-accent bg-card transition-all cursor-pointer">
                      <Camera className="w-5 h-5" />
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={handlePhotoInput}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <span className="text-[10px] text-ink-faint leading-normal mt-1 block">
                  Máximo de 8 fotos. Imagens comprimidas de forma automática para poupar recursos.
                </span>
              </div>

              {/* GPS Coordinates registry */}
              <div className="pt-2 border-t border-line/60 flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                  Comprovante de Localização Física (GPS)
                </label>
                <button
                  onClick={handleCaptureGPS}
                  disabled={gpsLoading}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-line hover:border-brand-accent rounded-lg text-xs font-bold text-brand-accent bg-card hover:bg-brand-accent-soft disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {gpsLoading ? 'Coletando...' : 'Coletar Coordenadas Reais'}
                </button>
                {gpsStatus && (
                  <span className="text-[11px] text-ink-soft leading-normal italic font-medium block">
                    {gpsStatus}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                  Data Planejada para a Visita *
                </label>
                <input
                  type="date"
                  value={vData}
                  onChange={(e) => setVData(e.target.value)}
                  className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                  Instruções / Notas de Planejamento (Opcional)
                </label>
                <textarea
                  value={vComentario}
                  onChange={(e) => setVComentario(e.target.value)}
                  rows={3}
                  placeholder="Ex: Auditar planograma, verificar reposição..."
                  className="px-3 py-2 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
                />
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal: Setup planned visit */}
      <Modal
        isOpen={planoFormOpen}
        onClose={() => setPlanoFormOpen(false)}
        title="Agendar Visita Semanal"
        footer={
          <>
            <button
              onClick={() => setPlanoFormOpen(false)}
              className="px-4 py-2 border border-line rounded-lg text-xs font-semibold text-ink-soft bg-card hover:bg-paper cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSavePlano}
              className="px-4.5 py-2 bg-brand-accent hover:bg-brand-accent/95 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer active:scale-95"
            >
              Agendar
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {(() => {
            const filteredLojas = lojas.filter(
              (l) =>
                l.nome.toLowerCase().includes(pLojaSearch.toLowerCase()) ||
                l.codigo.toLowerCase().includes(pLojaSearch.toLowerCase())
            );
            return (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                    Selecione as Filiais *
                  </label>
                  <span className="text-[10px] text-ink-faint leading-tight mb-1.5 block">
                    Selecione uma ou mais filiais para agendar visitas simultâneas.
                  </span>
                  
                  {/* Busca da filial */}
                  <div className="relative mb-2">
                    <input
                      type="text"
                      placeholder="Pesquisar filial por nome ou código..."
                      value={pLojaSearch}
                      onChange={(e) => setPLojaSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
                    />
                    <Search className="w-3.5 h-3.5 text-ink-faint absolute left-2.5 top-2.5" />
                  </div>

                  {/* Lista de Filiais */}
                  <div className="border border-line rounded-lg bg-card/60 p-2 max-h-40 overflow-y-auto space-y-1">
                    <div className="flex items-center justify-between border-b border-line/40 pb-1.5 mb-1.5 text-[10px] font-bold uppercase text-ink-soft px-1">
                      <span>{filteredLojas.length} Filiais encontradas</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPLojaIds(lojas.map(l => l.id))}
                          className="text-brand-accent hover:underline cursor-pointer"
                        >
                          Marcar Todas
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => setPLojaIds([])}
                          className="text-ink-soft hover:underline cursor-pointer"
                        >
                          Desmarcar Todas
                        </button>
                      </div>
                    </div>
                    {filteredLojas.map((l) => {
                      const isChecked = pLojaIds.includes(l.id);
                      return (
                        <label
                          key={l.id}
                          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors select-none ${
                            isChecked ? 'bg-brand-accent-soft/40 text-brand-accent font-bold' : 'hover:bg-paper text-ink'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setPLojaIds(pLojaIds.filter((id) => id !== l.id));
                              } else {
                                setPLojaIds([...pLojaIds, l.id]);
                              }
                            }}
                            className="rounded border-line text-brand-accent focus:ring-brand-accent w-3.5 h-3.5"
                          />
                          <span className="truncate">
                            {l.nome} · <span className="font-mono text-[10.5px] font-medium text-ink-soft">{l.codigo}</span>
                          </span>
                        </label>
                      );
                    })}
                    {filteredLojas.length === 0 && (
                      <div className="text-center py-4 text-xs text-ink-faint">
                        Nenhuma filial encontrada.
                      </div>
                    )}
                  </div>
                  {pLojaIds.length > 0 && (
                    <span className="text-[10px] text-brand-accent font-semibold mt-1">
                      {pLojaIds.length} {pLojaIds.length === 1 ? 'filial selecionada' : 'filiais selecionadas'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                      Data Programada
                    </label>
                    <input
                      type="date"
                      value={pData}
                      onChange={(e) => setPData(e.target.value)}
                      className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                      Instruções / Notas internas (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Auditar planograma"
                      value={pObs}
                      onChange={(e) => setPObs(e.target.value)}
                      className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                    Responsáveis da Visita *
                  </label>
                  <span className="text-[10px] text-ink-faint leading-tight mb-1.5 block">
                    Selecione todos os supervisores que participarão desta visita conjunta.
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {users.map((u) => {
                      const isChecked = pUsuarios.includes(u.nome);
                      return (
                        <button
                          type="button"
                          key={u.id}
                          onClick={() => {
                            if (isChecked) {
                              setPUsuarios(pUsuarios.filter((name) => name !== u.nome));
                            } else {
                              setPUsuarios([...pUsuarios, u.nome]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 select-none ${
                            isChecked
                              ? 'bg-brand-accent border-brand-accent text-white shadow-xs font-bold'
                              : 'bg-card border-line text-ink-soft hover:bg-paper'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${isChecked ? 'bg-white' : 'bg-ink-faint'}`} />
                          {u.nome}
                        </button>
                      );
                    })}
                  </div>
                  {pUsuarios.length > 0 && (
                    <span className="text-[10px] text-brand-accent font-semibold mt-1">
                      Selecionado: {pUsuarios.join(', ')}
                    </span>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </Modal>

      {/* Modal: Agendar Retorno em 15 dias */}
      <Modal
        isOpen={returnModalOpen}
        onClose={handleSkipReturn}
        title="Agendar Retorno (15 Dias)"
        footer={
          <>
            <button
              onClick={handleSkipReturn}
              className="px-4 py-2 border border-line rounded-lg text-xs font-semibold text-ink-soft bg-card hover:bg-paper cursor-pointer transition-colors"
            >
              Agora Não / Pular
            </button>
            <button
              onClick={handleSaveReturnPlano}
              className="px-4.5 py-2 bg-brand-accent hover:bg-brand-accent/95 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer active:scale-95 animate-pulse-subtle"
            >
              Confirmar Retorno
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-ink-soft leading-relaxed">
            Para garantir o acompanhamento técnico contínuo, programe uma visita de retorno para esta filial. Sugerimos um intervalo padrão de <strong>15 dias</strong>, mas você pode personalizar a data abaixo.
          </p>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
              Filial Selecionada
            </label>
            <div className="px-3 py-2 border border-line rounded-lg text-xs bg-paper/20 font-semibold text-ink">
              {lojas.find((l) => l.id === returnLojaId)?.nome || 'Loja'} · {lojas.find((l) => l.id === returnLojaId)?.codigo || ''}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Data Programada de Retorno
              </label>
              <input
                type="date"
                value={returnData}
                onChange={(e) => setReturnData(e.target.value)}
                className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink font-semibold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Supervisor Responsável
              </label>
              <select
                value={returnUsuario}
                onChange={(e) => setReturnUsuario(e.target.value)}
                className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-card text-ink"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.nome}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
              Notas do Retorno (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Verificar correções dos desvios identificados"
              value={returnObs}
              onChange={(e) => setReturnObs(e.target.value)}
              className="px-3 py-2 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
            />
          </div>
        </div>
      </Modal>

      {/* Helper Component to display original visit photos in Revisit modal */}
      <RevisitOriginalPhotosHelper wrapperId="revisit-photos" />

      {/* Modal: Execute Revisit */}
      <Modal
        isOpen={revisitaFormOpen}
        onClose={() => setRevisitaFormOpen(false)}
        title="Executar Revisita Técnica"
        footer={
          <>
            <button
              onClick={() => setRevisitaFormOpen(false)}
              className="px-4 py-2 border border-line rounded-lg text-xs font-semibold text-ink-soft bg-card hover:bg-paper cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveRevisitaExecution}
              className="px-4.5 py-2 bg-brand-green hover:bg-brand-green/95 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer active:scale-95 shadow-md"
            >
              Finalizar Revisita
            </button>
          </>
        }
      >
        {selectedRevisita && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Previous Visit Summary Panel */}
            <div className="p-3.5 bg-paper rounded-xl border border-line space-y-2.5">
              <h4 className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">
                Histórico da Visita Anterior
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11.5px] text-ink-soft">
                <div>
                  <span className="font-semibold text-ink-faint">Supervisor:</span>{' '}
                  <span className="font-medium text-ink">{selectedRevisita.usuario}</span>
                </div>
                <div>
                  <span className="font-semibold text-ink-faint">Data Planejada:</span>{' '}
                  <span className="font-medium text-ink">{selectedRevisita.dataPlanejada.split('-').reverse().join('/')}</span>
                </div>
              </div>
              {selectedRevisita.observacoesOriginais && (
                <div className="text-[11.5px] bg-card p-2 rounded border border-line/50 text-ink leading-relaxed">
                  <span className="font-bold text-ink-soft block mb-0.5">Relatório Anterior:</span>
                  "{selectedRevisita.observacoesOriginais}"
                </div>
              )}
              {/* Lazily load and view original photos */}
              <div>
                <span className="text-[11px] font-bold text-ink-soft block mb-1">Evidências da Visita Anterior:</span>
                <RevisitOriginalPhotos visitaId={selectedRevisita.visitaOriginalId} onViewPhoto={setPhotoViewerUrl} />
              </div>
            </div>

            {/* Revisit inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                  Data da Revisita
                </label>
                <input
                  type="date"
                  value={revData}
                  onChange={(e) => setRevData(e.target.value)}
                  className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink font-semibold"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                  Hora
                </label>
                <input
                  type="time"
                  value={revHora}
                  onChange={(e) => setRevHora(e.target.value)}
                  className="px-3 py-1.5 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink font-semibold"
                />
              </div>
            </div>

            {/* Verification of previous desvios / checklist items */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Checklist: Pontos Identificados Corrigidos? *
              </label>
              {revPontosMelhoria.length > 0 ? (
                <div className="border border-line rounded-xl divide-y divide-line overflow-hidden bg-card">
                  {revPontosMelhoria.map((p, index) => (
                    <div key={index} className="flex items-center justify-between p-3 hover:bg-paper/40 transition-colors">
                      <span className="text-xs text-ink font-medium truncate flex-1 pr-2">
                        {p.descricao}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...revPontosMelhoria];
                            updated[index].corrigido = true;
                            setRevPontosMelhoria(updated);
                          }}
                          className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                            p.corrigido
                              ? 'bg-brand-green text-white shadow-xs'
                              : 'bg-paper text-ink-soft hover:bg-line border border-line'
                          }`}
                        >
                          Resolvido
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...revPontosMelhoria];
                            updated[index].corrigido = false;
                            setRevPontosMelhoria(updated);
                          }}
                          className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                            !p.corrigido
                              ? 'bg-brand-red text-white shadow-xs'
                              : 'bg-paper text-ink-soft hover:bg-line border border-line'
                          }`}
                        >
                          Pendente
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink-faint italic bg-paper/40 border border-line p-3 rounded-lg">
                  Nenhum desvio específico listado para conferência. Você pode registrar as correções nas observações abaixo.
                </p>
              )}
            </div>

            {/* New observations */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Novas Observações e Constatações de Retorno
              </label>
              <textarea
                value={revObservacoes}
                onChange={(e) => setRevObservacoes(e.target.value)}
                rows={3}
                placeholder="Descreva o status atual, se as pendências foram sanadas ou se novas ações são requeridas..."
                className="px-3 py-2 border border-line rounded-lg text-xs outline-none focus:border-brand-accent bg-paper/30 text-ink"
              />
            </div>

            {/* Attachment for Revisit photos */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-ink-soft uppercase tracking-wider">
                Novas Fotos da Revisita
              </label>
              <div className="flex flex-wrap gap-2 mt-1">
                {revPendingPhotos.map((src, i) => (
                  <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-line shadow-xs flex-shrink-0">
                    <img src={src} className="w-full h-full object-cover" alt="Anexo revisita" />
                    <button
                      type="button"
                      onClick={() => handleRemovePendingPhotoRevisita(i)}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white rounded-full w-4.5 h-4.5 flex items-center justify-center text-[10px] font-bold leading-none border border-white/20 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {revPendingPhotos.length < 8 && (
                  <label className="w-14 h-14 rounded-lg border-2 border-dashed border-line flex flex-col items-center justify-center text-ink-faint hover:text-ink-soft hover:border-brand-accent bg-card transition-all cursor-pointer">
                    <Camera className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handlePhotoInputRevisita}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Full-size Photo Viewer Modal Overlay */}
      {photoViewerUrl && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-xs animate-fade-in">
          <div className="relative max-w-2xl w-full max-h-[85vh] overflow-hidden flex items-center justify-center">
            <img
              src={photoViewerUrl}
              className="max-w-full max-h-[85vh] object-contain rounded-xl border border-white/10 shadow-2xl"
              alt="Ampliada"
            />
          </div>
          <button
            onClick={() => setPhotoViewerUrl(null)}
            className="mt-4 px-6 py-2 bg-card border border-line text-ink hover:bg-paper font-bold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Fechar Imagem
          </button>
        </div>
      )}

      {/* Global Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[400] bg-brand-navy border border-brand-navy-3 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-semibold tracking-wide flex items-center gap-2 max-w-[90vw] animate-slide-up">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-ping" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}

function RevisitOriginalPhotos({ visitaId, onViewPhoto }: { visitaId: string; onViewPhoto: (url: string) => void }) {
  const [photos, setPhotos] = useState<string[]>([]);
  useEffect(() => {
    if (visitaId) {
      const stored = localStorage.getItem(`fotos:${visitaId}`);
      if (stored) {
        try {
          setPhotos(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [visitaId]);

  if (photos.length === 0) {
    return <p className="text-[11px] text-ink-faint italic">Nenhuma foto registrada na visita anterior.</p>;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mt-1">
      {photos.map((src, index) => (
        <img
          key={index}
          src={src}
          onClick={() => onViewPhoto(src)}
          className="w-14 h-14 object-cover rounded-lg border border-line cursor-pointer hover:scale-105 transition-all"
          alt="Original"
        />
      ))}
    </div>
  );
}

function RevisitOriginalPhotosHelper({ wrapperId }: { wrapperId: string }) {
  return null;
}

