import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Users, User, Ticket, Calendar, AlertTriangle, TrendingUp,
  Search, Trash2, MapPin, Image as ImageIcon,
  CheckCircle, XCircle, Edit2, Save, X, Megaphone, Send,
  CheckSquare, Square, CheckCheck
} from 'lucide-react';
import { API_URL } from '../utils/helpers';

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
const formatFecha = (raw) => {
  if (!raw) return 'Sin fecha';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return 'Fecha inválida';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/* ─────────────────────────────────────────
   Sub-components
───────────────────────────────────────── */

const MetricCard = ({ title, value, icon, color }) => (
  <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl flex items-center gap-4 transition-all hover:border-gray-700">
    <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
    <div>
      <p className="text-sm text-gray-400 font-medium">{title}</p>
      <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
    </div>
  </div>
);

const ReportItem = ({ report, onUpdate }) => (
  <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-indigo-500/50 transition-colors">
    <div className="flex justify-between items-start mb-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 px-2 py-0.5 bg-indigo-500/10 rounded">
        {report.tipo_contenido}
      </span>
      <span className="text-xs text-gray-500">{formatFecha(report.created_at)}</span>
    </div>
    <p className="text-sm text-gray-300 mb-3 leading-relaxed">{report.motivo}</p>
    <div className="flex justify-between items-center text-xs border-t border-gray-700/50 pt-2 mb-3">
      <span className="text-gray-400">
        Reportado por: <span className="text-gray-200">{report.emisor_nombre || 'Anónimo'}</span>
      </span>
      <span className={`px-2 py-0.5 rounded-full font-medium ${
        report.estado === 'pendiente'  ? 'bg-orange-500/20 text-orange-400' :
        report.estado === 'resuelto'   ? 'bg-green-500/20 text-green-400'   : 'bg-gray-500/20 text-gray-400'
      }`}>
        {report.estado}
      </span>
    </div>
    {report.estado === 'pendiente' && (
      <div className="flex gap-2">
        <button
          onClick={() => onUpdate('resuelto')}
          className="flex-1 flex items-center justify-center gap-1 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white py-1.5 rounded-lg transition-all text-[10px] font-bold uppercase"
        >
          <CheckCircle size={12} /> Resolver
        </button>
        <button
          onClick={() => onUpdate('ignorado')}
          className="flex-1 flex items-center justify-center gap-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white py-1.5 rounded-lg transition-all text-[10px] font-bold uppercase"
        >
          <XCircle size={12} /> Ignorar
        </button>
      </div>
    )}
  </div>
);

/* ─────────────────────────────────────────
   Toast
───────────────────────────────────────── */
const Toast = ({ toast }) => {
  if (!toast.show) return null;
  const isSuccess = toast.type === 'success';
  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border transition-all
      ${isSuccess
        ? 'bg-green-900/90 border-green-500/40 text-green-200'
        : 'bg-red-900/90 border-red-500/40 text-red-200'
      }`}
    >
      {isSuccess ? <CheckCheck size={18} /> : <AlertTriangle size={18} />}
      <span className="text-sm font-medium">{toast.message}</span>
    </div>
  );
};

/* ─────────────────────────────────────────
   Confirm Modal
───────────────────────────────────────── */
const ConfirmModal = ({ modal, onConfirm, onCancel }) => {
  if (!modal.show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="text-red-400 w-5 h-5" />
            </div>
            <h3 className="text-white font-bold text-lg">{modal.title || '¿Estás seguro?'}</h3>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">{modal.message}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 font-semibold text-sm transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
const Admin = () => {
  const { token } = useAuth();
  // activeTab viene del AdminLayout via outlet context
  const { activeTab } = useOutletContext();
  const [stats, setStats]           = useState(null);
  const [usuarios, setUsuarios]     = useState([]);
  const [tocatas, setTocatas]       = useState([]);
  const [noticias, setNoticias]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  // Búsqueda — SEPARADA por sección para evitar interferencia
  const [userSearch,       setUserSearch]       = useState('');
  const [tocataSearch,     setTocataSearch]     = useState('');
  const [megaphoneSearch,  setMegaphoneSearch]  = useState('');

  // Noticias
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [newNews, setNewNews] = useState({ titulo: '', contenido: '', imagen_url: '', fuente: 'Bandify' });

  // Edición de usuario
  const [editingUser, setEditingUser] = useState(null);
  const [userForm,    setUserForm]    = useState({ nombre: '', email: '', role: '', es_premium: false, es_verificado: false });

  // Megáfono
  const [massNotif,      setMassNotif]      = useState({ titulo: '', descripcion: '', link: '' });
  const [sendingNotif,   setSendingNotif]   = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // UI modals / toasts
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [toast,        setToast]        = useState({ show: false, message: '', type: 'success' });

  /* ── UX helpers ── */
  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3500);
  }, []);

  const showConfirm = useCallback((message, onConfirm, title = '¿Estás seguro?') => {
    setConfirmModal({ show: true, title, message, onConfirm });
  }, []);

  const hideConfirm = () => setConfirmModal({ show: false, title: '', message: '', onConfirm: null });

  /* ── Fetchers ── */
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar estadísticas');
      setStats(await res.json());
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  const fetchUsuarios = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/usuarios`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar usuarios');
      setUsuarios(await res.json());
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  const fetchTocatas = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/tocatas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar tocatas');
      setTocatas(await res.json());
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  const fetchNoticias = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/noticias`);
      if (!res.ok) throw new Error('Error al cargar noticias');
      const data = await res.json();
      // data puede ser { articles: [...] } o directamente un array
      const articles = Array.isArray(data) ? data : (data?.articles ?? []);
      setNoticias(articles.filter(a => a.isLocal));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  /* ── Carga inicial: stats + usuarios (necesarios para Stats y Megáfono desde el inicio) ── */
  useEffect(() => {
    if (!token) return;
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchUsuarios()]);
      setLoading(false);
    };
    init();
  }, [token, fetchStats, fetchUsuarios]);

  /* ── Carga perezosa por pestaña ── */
  useEffect(() => {
    if (!token) return;
    if (activeTab === 'tocatas' && tocatas.length === 0) fetchTocatas();
    if (activeTab === 'noticias' && noticias.length === 0) fetchNoticias();
  }, [activeTab, token]);  // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Handlers ── */
  const handleDeleteUsuario = (id) => {
    showConfirm(
      'Esta acción eliminará al usuario permanentemente de la plataforma.',
      async () => {
        hideConfirm();
        try {
          const res = await fetch(`${API_URL}/api/admin/usuarios/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            setUsuarios(prev => prev.filter(u => u.id !== id));
            fetchStats();
            showToast('Usuario eliminado correctamente');
          } else {
            showToast('Error al eliminar usuario', 'error');
          }
        } catch {
          showToast('Error de conexión', 'error');
        }
      },
      'Eliminar usuario'
    );
  };

  const handleEditUser = (user) => {
    setEditingUser(user.id);
    setUserForm({
      nombre:       user.nombre,
      email:        user.email,
      role:         user.role,
      es_premium:   user.es_premium   ?? false,
      es_verificado: user.es_verificado ?? false,
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/admin/usuarios/${editingUser}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsuarios(prev => prev.map(u => u.id === editingUser ? { ...u, ...updated } : u));
        setEditingUser(null);
        showToast('Usuario actualizado correctamente');
      } else {
        showToast('Error al actualizar usuario', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    }
  };

  const handleDeleteTocata = (id) => {
    showConfirm(
      'Esta acción eliminará la tocata permanentemente.',
      async () => {
        hideConfirm();
        try {
          const res = await fetch(`${API_URL}/api/admin/tocatas/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            setTocatas(prev => prev.filter(t => t.id !== id));
            fetchStats();
            showToast('Tocata eliminada correctamente');
          } else {
            showToast('Error al eliminar tocata', 'error');
          }
        } catch {
          showToast('Error de conexión', 'error');
        }
      },
      'Eliminar tocata'
    );
  };

  const handleUpdateReportState = async (reportId, nuevoEstado) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/reportes/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (res.ok) {
        fetchStats();
        showToast(`Reporte marcado como "${nuevoEstado}"`);
      } else {
        showToast('Error al actualizar el reporte', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    }
  };

  const handleCreateNews = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/noticias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newNews),
      });
      if (res.ok) {
        const created = await res.json();
        const mapped = {
          id:          created.id,
          title:       created.titulo,
          description: created.contenido,
          urlToImage:  created.imagen_url,
          isLocal:     true,
          publishedAt: created.created_at,
          source:      { name: created.fuente },
        };
        setNoticias(prev => [mapped, ...prev]);
        setNewNews({ titulo: '', contenido: '', imagen_url: '', fuente: 'Bandify' });
        setShowNewsForm(false);
        showToast('Noticia publicada correctamente');
      } else {
        showToast('Error al crear noticia', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    }
  };

  const handleDeleteNews = (id) => {
    showConfirm(
      '¿Eliminar esta noticia de la plataforma?',
      async () => {
        hideConfirm();
        try {
          const res = await fetch(`${API_URL}/api/noticias/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            setNoticias(prev => prev.filter(n => n.id !== id));
            showToast('Noticia eliminada');
          } else {
            showToast('Error al eliminar noticia', 'error');
          }
        } catch {
          showToast('Error de conexión', 'error');
        }
      },
      'Eliminar noticia'
    );
  };

  const handleSendMassNotif = (e) => {
    e.preventDefault();
    const isFiltered = selectedUserIds.length > 0;
    const message = isFiltered
      ? `Esto enviará una notificación a los ${selectedUserIds.length} usuarios seleccionados. ¿Continuar?`
      : 'Esto enviará una notificación a TODOS los usuarios de la plataforma. ¿Continuar?';

    showConfirm(message, async () => {
      hideConfirm();
      setSendingNotif(true);
      try {
        const res = await fetch(`${API_URL}/api/admin/notificaciones-masivas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...massNotif,
            usuario_ids: isFiltered ? selectedUserIds : null,
          }),
        });
        if (res.ok) {
          showToast('¡Mensaje enviado con éxito!');
          setMassNotif({ titulo: '', descripcion: '', link: '' });
          setSelectedUserIds([]);
        } else {
          showToast('Error al enviar notificación', 'error');
        }
      } catch {
        showToast('Error de conexión', 'error');
      } finally {
        setSendingNotif(false);
      }
    }, isFiltered ? 'Enviar anuncio segmentado' : 'Enviar anuncio masivo');
  };

  const toggleUserSelection = (id) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  /* ── Filtros derivados ── */
  const filteredUsuarios = usuarios.filter(u =>
    (u.nombre || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email  || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredTocatas = tocatas.filter(t =>
    (t.nombre           || '').toLowerCase().includes(tocataSearch.toLowerCase()) ||
    (t.genero           || '').toLowerCase().includes(tocataSearch.toLowerCase()) ||
    (t.organizador_nombre || '').toLowerCase().includes(tocataSearch.toLowerCase())
  );

  // Megáfono usa su propio estado de búsqueda
  const megaphoneUsuarios = usuarios.filter(u =>
    (u.nombre || '').toLowerCase().includes(megaphoneSearch.toLowerCase()) ||
    (u.email  || '').toLowerCase().includes(megaphoneSearch.toLowerCase())
  );

  /* ── Datos de gráfica — con guard seguro ── */
  const chartData = stats?.registrosSemanales?.map(item => ({
    name:      formatFecha(item.semana),
    registros: item.cantidad,
  })) ?? [];

  /* ── Guards de render ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-900/20 border border-red-500/50 rounded-xl text-red-200 flex items-center gap-3">
        <AlertTriangle className="w-6 h-6" />
        <p>{error}</p>
      </div>
    );
  }

  // Null-safe destructuring — stats puede ser null si el fetch falló silenciosamente
  const totales            = stats?.totales            ?? { usuarios: 0, tocatas: 0, tickets: 0 };
  const reportes           = stats?.reportes           ?? [];

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <>
      <ConfirmModal
        modal={confirmModal}
        onConfirm={() => confirmModal.onConfirm?.()}
        onCancel={hideConfirm}
      />
      <Toast toast={toast} />

      <div className="p-6 space-y-8 pb-20">

        {/* ── Stats ── */}
        {activeTab === 'stats' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard title="Total Usuarios"    value={totales.usuarios} icon={<Users    className="w-6 h-6 text-blue-400"   />} color="bg-blue-500/10"   />
              <MetricCard title="Total Tocatas"     value={totales.tocatas}  icon={<Calendar className="w-6 h-6 text-purple-400" />} color="bg-purple-500/10" />
              <MetricCard title="Tickets Vendidos"  value={totales.tickets}  icon={<Ticket   className="w-6 h-6 text-green-400"  />} color="bg-green-500/10"  />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Gráfica de registros */}
              <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-xl font-semibold text-white">Registros por Semana</h2>
                </div>
                <div className="h-[300px] w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                          itemStyle={{ color: '#818CF8' }}
                        />
                        <Line type="monotone" dataKey="registros" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#6366F1' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-600 italic text-sm">
                      Sin datos de los últimos 30 días
                    </div>
                  )}
                </div>
              </div>

              {/* Reportes */}
              <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl">
                <div className="flex items-center gap-2 mb-6">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  <h2 className="text-xl font-semibold text-white">Actividad Flaggeada</h2>
                </div>
                {reportes.length > 0 ? (
                  <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                    {reportes.map((rep, idx) => (
                      <ReportItem
                        key={rep.id ?? idx}
                        report={rep}
                        onUpdate={(nuevo) => handleUpdateReportState(rep.id, nuevo)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[250px] text-gray-500 italic">
                    <CheckCircle className="w-10 h-10 mb-3 text-gray-700" />
                    <p>No hay reportes pendientes</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Usuarios ── */}
        {activeTab === 'usuarios' && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">
                Gestión de Usuarios
                <span className="ml-2 text-sm text-gray-500 font-normal">({usuarios.length})</span>
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors w-64"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-800/50 text-gray-400 uppercase text-[10px] tracking-widest font-bold">
                  <tr>
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Ubicación</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredUsuarios.map(u => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase">
                            {(u.nombre || 'U').substring(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium">{u.nombre}</p>
                              {u.es_verificado && (
                                <CheckCircle size={14} className="text-blue-400" fill="currentColor" fillOpacity={0.2} />
                              )}
                            </div>
                            <p className="text-gray-500 text-xs">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`text-[10px] font-bold uppercase w-fit px-2 py-0.5 rounded ${
                            u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700/50 text-gray-400'
                          }`}>{u.role}</span>
                          {u.es_premium && (
                            <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-500 w-fit px-2 py-0.5 rounded">Premium</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        <div className="flex items-center gap-1"><MapPin size={12}/>{u.ciudad || 'No especificada'}</div>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button onClick={() => handleEditUser(u)}       className="text-gray-500 hover:text-indigo-400 transition-colors p-2" title="Editar"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteUsuario(u.id)} className="text-gray-500 hover:text-red-400 transition-colors p-2"   title="Eliminar"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsuarios.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-16 text-gray-600 italic">No se encontraron usuarios</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Modal Edición Usuario ── */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Editar Músico</h3>
                <button onClick={() => setEditingUser(null)} className="text-gray-500 hover:text-white"><X size={20}/></button>
              </div>
              <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Nombre</label>
                  <input
                    type="text"
                    value={userForm.nombre}
                    onChange={e => setUserForm({ ...userForm, nombre: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Rol</label>
                    <select
                      value={userForm.role}
                      onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white outline-none"
                    >
                      <option value="user">Usuario (Músico)</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-3 justify-center">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={userForm.es_premium}
                        onChange={e => setUserForm({ ...userForm, es_premium: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-0"
                      />
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Premium</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={userForm.es_verificado}
                        onChange={e => setUserForm({ ...userForm, es_verificado: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-0"
                      />
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Verificado ✅</span>
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl mt-4 flex items-center justify-center gap-2 transition-all"
                >
                  <Save size={18} /> Guardar Cambios
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Tocatas ── */}
        {activeTab === 'tocatas' && (
          <div className="space-y-6">
            <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-2xl flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">
                Explorar Tocatas
                <span className="ml-2 text-sm text-gray-500 font-normal">({tocatas.length})</span>
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, género u organizador..."
                  value={tocataSearch}
                  onChange={(e) => setTocataSearch(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors w-72"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTocatas.length > 0 ? (
                filteredTocatas.map(t => (
                  <div key={t.id} className="bg-gray-900/50 border border-gray-800 p-5 rounded-2xl hover:border-gray-700 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-white font-bold group-hover:text-indigo-400 transition-colors">{t.nombre}</h3>
                        <p className="text-xs text-gray-500 uppercase tracking-tighter">{t.genero}</p>
                      </div>
                      <button onClick={() => handleDeleteTocata(t.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-gray-400"><Calendar size={14}/>{formatFecha(t.fecha)}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-400"><MapPin size={14}/>{t.ciudad}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-400"><User size={14}/>Org: {t.organizador_nombre}</div>
                    </div>
                    {t.description && (
                      <p className="text-sm text-gray-400 line-clamp-2 italic">"{t.description}"</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center text-gray-500 italic">No se encontraron tocatas.</div>
              )}
            </div>
          </div>
        )}

        {/* ── Noticias ── */}
        {activeTab === 'noticias' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Gestión de Noticias Locales</h2>
              <button
                onClick={() => setShowNewsForm(!showNewsForm)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
              >
                {showNewsForm ? 'Cerrar Editor' : 'Redactar Noticia'}
              </button>
            </div>

            {showNewsForm && (
              <form onSubmit={handleCreateNews} className="bg-gray-900/80 border border-indigo-500/30 p-6 rounded-2xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Título</label>
                    <input required type="text" value={newNews.titulo} onChange={e => setNewNews(p => ({ ...p, titulo: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Imagen URL</label>
                    <input type="url" value={newNews.imagen_url} onChange={e => setNewNews(p => ({ ...p, imagen_url: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contenido</label>
                  <textarea required rows={4} value={newNews.contenido} onChange={e => setNewNews(p => ({ ...p, contenido: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none resize-none" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all">
                  Publicar Noticia
                </button>
              </form>
            )}

            <div className="grid grid-cols-1 gap-4">
              {noticias.length === 0 && (
                <div className="py-16 text-center text-gray-600 italic">No hay noticias locales publicadas aún.</div>
              )}
              {noticias.map(n => (
                <div key={n.id} className="bg-gray-900/50 border border-gray-800 p-4 rounded-2xl flex gap-4 items-center group hover:border-gray-700 transition-all">
                  {n.urlToImage ? (
                    <img
                      src={n.urlToImage}
                      className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                      alt=""
                      onError={e => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <ImageIcon size={28} className="text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold truncate">{n.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2 mt-1">{n.description}</p>
                  </div>
                  <button onClick={() => handleDeleteNews(n.id)} className="p-3 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Megáfono ── */}
        {activeTab === 'megaphone' && (
          <div className="space-y-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Megaphone className="text-amber-500" />
                Notificación Segmentada (El Megáfono)
              </h2>
              <p className="text-gray-400">Envía un aviso directo a la campana de todos los usuarios o solo a los que selecciones.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Columna 1: Formulario */}
              <div className="xl:col-span-1 space-y-6">
                <form onSubmit={handleSendMassNotif} className="bg-gray-900/50 border border-gray-800 p-6 rounded-3xl space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Título del Anuncio</label>
                    <input
                      required
                      type="text"
                      placeholder="Ej: ¡Actualización importante!"
                      value={massNotif.titulo}
                      onChange={e => setMassNotif({ ...massNotif, titulo: e.target.value })}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:border-amber-500 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Mensaje</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Escribe aquí los detalles..."
                      value={massNotif.descripcion}
                      onChange={e => setMassNotif({ ...massNotif, descripcion: e.target.value })}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:border-amber-500 transition-all outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Enlace (opcional)</label>
                    <input
                      type="text"
                      placeholder="/noticias"
                      value={massNotif.link}
                      onChange={e => setMassNotif({ ...massNotif, link: e.target.value })}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:border-amber-500 transition-all outline-none"
                    />
                  </div>

                  <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                    <p className="text-xs text-amber-200 font-bold mb-1 uppercase tracking-tighter">Destinatarios:</p>
                    <p className="text-sm text-white font-medium">
                      {selectedUserIds.length > 0
                        ? `Enviando a ${selectedUserIds.length} seleccionados`
                        : 'Enviando a TODOS los usuarios'}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={sendingNotif}
                    className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-amber-500/10 uppercase tracking-widest text-sm"
                  >
                    {sendingNotif
                      ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black" />
                      : <><Send size={18} /> Lanzar Mensaje</>
                    }
                  </button>
                </form>
              </div>

              {/* Columna 2: Selector de Usuarios — usa megaphoneSearch propio */}
              <div className="xl:col-span-1 space-y-6">
                <div className="bg-gray-900/50 border border-gray-800 rounded-3xl flex flex-col h-[580px]">
                  <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/20">
                    <h3 className="text-white font-bold text-sm">Seleccionar Usuarios</h3>
                    <button
                      onClick={() => setSelectedUserIds([])}
                      className="text-[10px] uppercase font-bold text-indigo-400 hover:text-white transition-colors"
                    >
                      Limpiar selección
                    </button>
                  </div>
                  <div className="p-4 border-b border-gray-800">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3 h-3" />
                      <input
                        type="text"
                        placeholder="Filtrar por nombre..."
                        value={megaphoneSearch}
                        onChange={(e) => setMegaphoneSearch(e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-8 pr-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {megaphoneUsuarios.map(u => (
                      <div
                        key={u.id}
                        onClick={() => toggleUserSelection(u.id)}
                        className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all mb-1 ${
                          selectedUserIds.includes(u.id)
                            ? 'bg-indigo-500/20 border border-indigo-500/30'
                            : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        {selectedUserIds.includes(u.id)
                          ? <CheckSquare size={16} className="text-indigo-400" />
                          : <Square      size={16} className="text-gray-600" />
                        }
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{u.nombre}</p>
                          <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                        </div>
                      </div>
                    ))}
                    {megaphoneUsuarios.length === 0 && (
                      <p className="text-center text-xs text-gray-600 italic py-8">Sin resultados</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Columna 3: Vista Previa */}
              <div className="xl:col-span-1 space-y-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Vista previa final</h3>
                <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                      <Megaphone size={20} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-white font-bold text-sm">{massNotif.titulo || 'Título de ejemplo'}</h4>
                      <p className="text-zinc-400 text-xs leading-relaxed">{massNotif.descripcion || 'Aquí aparecerá el cuerpo del mensaje...'}</p>
                      <p className="text-[10px] text-zinc-600 font-bold uppercase pt-2">Ahora mismo • SISTEMA</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-900/30 border border-gray-800 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3 text-indigo-400">
                    <Users size={18} />
                    <span className="text-xs font-bold uppercase">Tips de uso</span>
                  </div>
                  <ul className="text-xs text-gray-500 space-y-3 list-disc pl-4">
                    <li>Si no seleccionas a nadie, el sistema envía el mensaje a <strong>toda la comunidad</strong>.</li>
                    <li>Usa el buscador de la columna central para encontrar músicos específicos.</li>
                    <li>Los usuarios verán un punto rojo de notificación apenas envíes el mensaje.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Admin;
