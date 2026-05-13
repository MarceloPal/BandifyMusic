import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Users, User, Ticket, Calendar, AlertTriangle, TrendingUp,
  Search, Trash2, MapPin, Image as ImageIcon, Newspaper, Plus,
  CheckCircle, XCircle, Edit2, Save, X, Megaphone, Send, Link as LinkIcon,
  CheckSquare, Square, CheckCheck, DollarSign, Tag, Clock
} from 'lucide-react';
import { API_URL } from '../utils/helpers';
import { useImageUrl } from '../hooks/useImageUrl';

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
      <div className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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
   Avatar de usuario en la tabla — usa useImageUrl (hook) por usuario
   para pedir signed URL si tiene foto_url, sino muestra iniciales.
───────────────────────────────────────── */
const UserAvatar = ({ user, size = 'sm' }) => {
  const { url: photoUrl } = useImageUrl(user?.foto_url ?? null);
  const dim = size === 'md' ? 'w-10 h-10' : 'w-8 h-8';

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={user.nombre}
        className={`${dim} rounded-full object-cover border border-zinc-700`}
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
    );
  }
  return (
    <div className={`${dim} rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs uppercase`}>
      {(user?.nombre || 'U').substring(0, 2)}
    </div>
  );
};

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
const Admin = () => {
  const { token } = useAuth();
  const { activeTab } = useOutletContext();
  
  const [stats, setStats]           = useState(null);
  const [usuarios, setUsuarios]     = useState([]);
  const [tocatas, setTocatas]       = useState([]);
  const [noticias, setNoticias]     = useState([]);
  const [ventasData, setVentasData] = useState({ tickets: [], resumen: { total_ventas: 0, ingresos_totales: 0 } });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  // Búsqueda
  const [userSearch,       setUserSearch]       = useState('');
  const [tocataSearch,     setTocataSearch]     = useState('');
  const [ventaSearch,      setVentaSearch]      = useState('');
  const [megaphoneSearch,  setMegaphoneSearch]  = useState('');

  // Noticias
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [newNews, setNewNews] = useState({ titulo: '', contenido: '', imagen_url: '', fuente: 'Bandify' });

  // Edición de usuario
  const [editingUser, setEditingUser] = useState(null);
  const [userForm,    setUserForm]    = useState({ nombre: '', email: '', role: '', es_premium: false, es_verificado: false });

  // Megáfono
  const [massNotif,      setMassNotif]      = useState({ titulo: '', descripcion: '', link: '', imagen_url: '' });
  const [sendingNotif,   setSendingNotif]   = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [imagenPreview,  setImagenPreview]  = useState(null);   // blob URL para preview local
  const [imagenUploading, setImagenUploading] = useState(false);
  const anuncioImgRef = useRef(null);

  // Historial de anuncios enviados
  const [anuncios, setAnuncios] = useState([]);

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
      const articles = Array.isArray(data) ? data : (data?.articles ?? []);
      setNoticias(articles.filter(a => a.isLocal));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const fetchVentas = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/ventas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar ventas');
      setVentasData(await res.json());
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  /** Trae el historial de anuncios (deduplicado por contenido). */
  const fetchAnuncios = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/notificaciones`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar anuncios');
      setAnuncios(await res.json());
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  /* ── Carga inicial ── */
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
    if (activeTab === 'ventas' && ventasData.tickets.length === 0) fetchVentas();
    if (activeTab === 'megaphone' && anuncios.length === 0) fetchAnuncios();
  }, [activeTab, token, fetchTocatas, fetchNoticias, fetchVentas, fetchAnuncios, tocatas.length, noticias.length, ventasData.tickets.length, anuncios.length]);

  /* ── Handlers ── */
  const handleDeleteUsuario = (id) => {
    const userId = id; // captura explícita antes de pasar al modal
    showConfirm(
      'Esta acción eliminará al usuario permanentemente de la plataforma.',
      async () => {
        hideConfirm();
        try {
          const res = await fetch(`${API_URL}/api/admin/usuarios/${userId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            setUsuarios(prev => prev.filter(u => u.id !== userId));
            fetchStats();
            showToast('Usuario eliminado correctamente');
          } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.error || `Error al eliminar usuario (${res.status})`, 'error');
          }
        } catch (err) {
          showToast(`Error de conexión: ${err.message}`, 'error');
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
          setMassNotif({ titulo: '', descripcion: '', link: '', imagen_url: '' });
          setSelectedUserIds([]);
          if (imagenPreview) URL.revokeObjectURL(imagenPreview);
          setImagenPreview(null);
          fetchAnuncios();   // refresca el historial con el anuncio recién enviado
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

  /**
   * Sube una imagen para el anuncio: pide URL presignada → PUT a S3 → guarda
   * la key en massNotif.imagen_url. Muestra preview local instantáneo con blob URL.
   */
  const handleAnuncioImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      showToast('Solo JPG, PNG o WebP', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('La imagen no puede pesar más de 5 MB', 'error');
      return;
    }

    // Preview local instantáneo (blob URL — no espera al upload de S3)
    if (imagenPreview) URL.revokeObjectURL(imagenPreview);
    setImagenPreview(URL.createObjectURL(file));
    setImagenUploading(true);

    try {
      const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg';
      const urlRes = await fetch(`${API_URL}/images/upload-url?type=anuncio&ext=${ext}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!urlRes.ok) throw new Error('No se pudo obtener URL de subida');
      const { uploadUrl, key } = await urlRes.json();

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      setMassNotif((prev) => ({ ...prev, imagen_url: key }));
    } catch {
      showToast('Error al subir la imagen', 'error');
      if (imagenPreview) URL.revokeObjectURL(imagenPreview);
      setImagenPreview(null);
    } finally {
      setImagenUploading(false);
    }
  };

  const removeAnuncioImage = () => {
    if (imagenPreview) URL.revokeObjectURL(imagenPreview);
    setImagenPreview(null);
    setMassNotif((prev) => ({ ...prev, imagen_url: '' }));
    if (anuncioImgRef.current) anuncioImgRef.current.value = '';
  };

  /** Borra un anuncio del historial — confirma primero, refresca al terminar. */
  const handleDeleteAnuncio = (anuncio) => {
    showConfirm(
      `Esto eliminará el anuncio "${anuncio.titulo}" de los ${anuncio.destinatarios} usuarios que lo recibieron. ¿Continuar?`,
      async () => {
        hideConfirm();
        try {
          const res = await fetch(`${API_URL}/api/admin/notificaciones/${anuncio.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            showToast('Anuncio eliminado');
            setAnuncios((prev) => prev.filter((a) => a.id !== anuncio.id));
          } else {
            showToast('Error al eliminar', 'error');
          }
        } catch {
          showToast('Error de conexión', 'error');
        }
      },
      'Eliminar anuncio'
    );
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

  const filteredVentas = ventasData.tickets.filter(v => 
    (v.comprador_nombre || '').toLowerCase().includes(ventaSearch.toLowerCase()) ||
    (v.evento_nombre || '').toLowerCase().includes(ventaSearch.toLowerCase()) ||
    (v.categoria || '').toLowerCase().includes(ventaSearch.toLowerCase())
  );

  // Megáfono usa su propio estado de búsqueda
  const megaphoneUsuarios = usuarios.filter(u =>
    (u.nombre || '').toLowerCase().includes(megaphoneSearch.toLowerCase()) ||
    (u.email  || '').toLowerCase().includes(megaphoneSearch.toLowerCase())
  );

  /* ── Datos de gráfica ── */
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

  const totales = stats?.totales ?? { usuarios: 0, tocatas: 0, tickets: 0 };
  const reportes = stats?.reportes ?? [];

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <>
      <ConfirmModal
        modal={confirmModal}
        onConfirm={confirmModal.onConfirm ?? (() => {})}
        onCancel={hideConfirm}
      />
      <Toast toast={toast} />

      <div className="space-y-8 pb-20">

        {/* ── Stats ── */}
        {activeTab === 'stats' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard title="Total Usuarios"    value={totales.usuarios} icon={<Users    className="w-6 h-6 text-blue-400"   />} color="bg-blue-500/10"   />
              <MetricCard title="Total Tocatas"     value={totales.tocatas}  icon={<Calendar className="w-6 h-6 text-purple-400" />} color="bg-purple-500/10" />
              <MetricCard title="Tickets Vendidos"  value={totales.tickets}  icon={<Ticket   className="w-6 h-6 text-green-400"  />} color="bg-green-500/10"  />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                        <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }} itemStyle={{ color: '#818CF8' }} />
                        <Line type="monotone" dataKey="registros" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#6366F1' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-600 italic text-sm">Sin datos recientes</div>
                  )}
                </div>
              </div>

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
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Gestión de Usuarios <span className="ml-2 text-sm text-gray-500 font-normal">({usuarios.length})</span></h2>
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
                          <UserAvatar user={u} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium">{u.nombre}</p>
                              {u.es_verificado && <CheckCircle size={14} className="text-blue-400" fill="currentColor" fillOpacity={0.2} />}
                            </div>
                            <p className="text-gray-500 text-xs">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold uppercase w-fit px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700/50 text-gray-400'}`}>{u.role}</span>
                            <span className="text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400 w-fit px-2 py-0.5 rounded">
                              Demos: {u.demo_count ?? 0}
                            </span>
                          </div>
                          {u.es_premium && <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-500 w-fit px-2 py-0.5 rounded">Premium</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        <div className="flex items-center gap-1"><MapPin size={12}/>{u.ciudad || 'No especificada'}</div>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button onClick={() => handleEditUser(u)} className="text-gray-500 hover:text-purple-400 transition-colors p-2" title="Editar"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteUsuario(u.id)} className="text-gray-500 hover:text-red-400 transition-colors p-2" title="Eliminar"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Modal Edición ── */}
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
                  <input type="text" value={userForm.nombre} onChange={e => setUserForm({ ...userForm, nombre: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-indigo-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Email</label>
                  <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-indigo-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Rol</label>
                    <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white outline-none">
                      <option value="user">Usuario (Músico)</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-3 justify-center">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={userForm.es_premium} onChange={e => setUserForm({ ...userForm, es_premium: e.target.checked })} className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-0" />
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Premium</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={userForm.es_verificado} onChange={e => setUserForm({ ...userForm, es_verificado: e.target.checked })} className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-0" />
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Verificado</span>
                    </label>
                  </div>
                </div>
                <button type="submit" className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3 rounded-xl mt-4 flex items-center justify-center gap-2 transition-all uppercase tracking-wide text-sm">
                  <Save size={18} /> Guardar Cambios
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Tocatas ── */}
        {activeTab === 'tocatas' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-2xl flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Explorar Tocatas <span className="ml-2 text-sm text-gray-500 font-normal">({tocatas.length})</span></h2>
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
                    {t.description && <p className="text-sm text-gray-400 line-clamp-2 italic">"{t.description}"</p>}
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
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Gestión de Noticias Locales</h2>
              <button onClick={() => setShowNewsForm(!showNewsForm)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20">{showNewsForm ? 'Cerrar Editor' : 'Redactar Noticia'}</button>
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
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all">Publicar Noticia</button>
              </form>
            )}
            <div className="grid grid-cols-1 gap-4">
              {noticias.map(n => (
                <div key={n.id} className="bg-gray-900/50 border border-gray-800 p-4 rounded-2xl flex gap-4 items-center group hover:border-gray-700 transition-all">
                  {n.urlToImage ? <img src={n.urlToImage} className="w-24 h-24 rounded-xl object-cover flex-shrink-0" alt="" /> : <div className="w-24 h-24 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0"><ImageIcon size={28} className="text-gray-600" /></div>}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold truncate">{n.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2 mt-1">{n.description}</p>
                  </div>
                  <button onClick={() => handleDeleteNews(n.id)} className="p-3 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"><Trash2 size={20} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Ventas ── */}
        {activeTab === 'ventas' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-8 rounded-3xl flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400"><DollarSign size={32} /></div>
                <div>
                  <p className="text-emerald-500/70 text-sm font-bold uppercase tracking-wider">Ingresos Totales</p>
                  <p className="text-4xl font-black text-white mt-1">${ventasData.resumen.ingresos_totales.toLocaleString('es-CL')}</p>
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 p-8 rounded-3xl flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400"><Ticket size={32} /></div>
                <div>
                  <p className="text-blue-500/70 text-sm font-bold uppercase tracking-wider">Tickets Vendidos</p>
                  <p className="text-4xl font-black text-white mt-1">{ventasData.resumen.total_ventas}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/20">
                <h2 className="text-xl font-bold text-white flex items-center gap-3"><Clock className="text-indigo-400" />Historial de Transacciones</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                  <input type="text" placeholder="Comprador, evento o categoría..." value={ventaSearch} onChange={(e) => setVentaSearch(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors w-80" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-800/50 text-gray-400 uppercase text-[10px] tracking-widest font-bold">
                    <tr>
                      <th className="px-6 py-5">Fecha / ID</th>
                      <th className="px-6 py-5">Comprador</th>
                      <th className="px-6 py-5">Evento / Categoría</th>
                      <th className="px-6 py-5 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredVentas.map(v => (
                      <tr key={v.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-white font-medium">{formatFecha(v.fecha)}</span>
                            <span className="text-[10px] text-gray-500 font-mono mt-0.5">{v.id.substring(0, 8)}...</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-white font-bold">{v.comprador_nombre}</span>
                            <span className="text-xs text-gray-500">{v.comprador_email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-indigo-300 font-medium">{v.evento_nombre}</span>
                            <div className="flex items-center gap-1.5"><Tag size={10} className="text-gray-500" /><span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold uppercase tracking-tighter">{v.categoria || 'Tocata'}</span></div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right"><span className="text-emerald-400 font-black text-lg">${(v.monto || 0).toLocaleString('es-CL')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Megáfono ── */}
        {activeTab === 'megaphone' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Megaphone className="text-amber-500" />Notificación Segmentada (El Megáfono)</h2>
              <p className="text-gray-400">Envía un aviso directo a la campana de todos los usuarios o solo a los que selecciones.</p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-1 space-y-6">
                <form onSubmit={handleSendMassNotif} className="bg-gray-900/50 border border-gray-800 p-6 rounded-3xl space-y-6">
                  <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Título</label><input required type="text" value={massNotif.titulo} onChange={e => setMassNotif({ ...massNotif, titulo: e.target.value })} className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:border-amber-500 transition-all outline-none" /></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Mensaje</label><textarea required rows={4} value={massNotif.descripcion} onChange={e => setMassNotif({ ...massNotif, descripcion: e.target.value })} className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:border-amber-500 transition-all outline-none resize-none" /></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Enlace</label><input type="text" value={massNotif.link} onChange={e => setMassNotif({ ...massNotif, link: e.target.value })} className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:border-amber-500 transition-all outline-none" /></div>

                  {/* Imagen opcional del anuncio */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Imagen (opcional)</label>
                    <input
                      ref={anuncioImgRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAnuncioImage}
                      className="hidden"
                    />
                    {imagenPreview ? (
                      <div className="relative rounded-2xl overflow-hidden border border-gray-700 bg-black">
                        <img src={imagenPreview} alt="Vista previa" className="w-full h-40 object-cover" />
                        {imagenUploading && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-amber-500" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={removeAnuncioImage}
                          disabled={imagenUploading}
                          className="absolute top-2 right-2 w-8 h-8 bg-black/70 hover:bg-black text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-40"
                          title="Quitar imagen"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => anuncioImgRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-700 hover:border-amber-500/50 rounded-2xl py-8 flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-amber-400 transition-colors"
                      >
                        <ImageIcon size={22} />
                        <span className="text-xs font-semibold uppercase tracking-wider">Subir imagen</span>
                        <span className="text-[10px] text-gray-600">JPG, PNG o WebP · máx 5 MB</span>
                      </button>
                    )}
                  </div>

                  <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20"><p className="text-xs text-amber-200 font-bold mb-1 uppercase tracking-tighter">Destinatarios:</p><p className="text-sm text-white font-medium">{selectedUserIds.length > 0 ? `Enviando a ${selectedUserIds.length} seleccionados` : 'Enviando a TODOS los usuarios'}</p></div>
                  <button type="submit" disabled={sendingNotif} className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-amber-500/10 uppercase tracking-widest text-sm">{sendingNotif ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black" /> : <><Send size={18} /> Lanzar Mensaje</>}</button>
                </form>
              </div>
              <div className="xl:col-span-1 space-y-6">
                <div className="bg-gray-900/50 border border-gray-800 rounded-3xl flex flex-col h-[580px]">
                  <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/20"><h3 className="text-white font-bold text-sm">Seleccionar Usuarios</h3><button onClick={() => setSelectedUserIds([])} className="text-[10px] uppercase font-bold text-indigo-400 hover:text-white transition-colors">Limpiar selección</button></div>
                  <div className="p-4 border-b border-gray-800"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3 h-3" /><input type="text" placeholder="Filtrar por nombre..." value={megaphoneSearch} onChange={(e) => setMegaphoneSearch(e.target.value)} className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-8 pr-4 py-2 text-xs text-white outline-none focus:border-indigo-500" /></div></div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-2">{megaphoneUsuarios.map(u => (<div key={u.id} onClick={() => toggleUserSelection(u.id)} className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all mb-1 ${selectedUserIds.includes(u.id) ? 'bg-indigo-500/20 border border-indigo-500/30' : 'hover:bg-white/5 border border-transparent'}`}>{selectedUserIds.includes(u.id) ? <CheckSquare size={16} className="text-indigo-400" /> : <Square size={16} className="text-gray-600" />}<div className="min-w-0"><p className="text-xs font-bold text-white truncate">{u.nombre}</p><p className="text-[10px] text-gray-500 truncate">{u.email}</p></div></div>))}</div>
                </div>
              </div>
              <div className="xl:col-span-1 space-y-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Vista previa final</h3>
                <div className="bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 z-10" />
                  {imagenPreview && (
                    <img src={imagenPreview} alt="" className="w-full h-32 object-cover" />
                  )}
                  <div className="p-6">
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
                </div>
                <div className="bg-gray-900/30 border border-gray-800 p-6 rounded-2xl space-y-4"><div className="flex items-center gap-3 text-purple-400"><Users size={18} /><span className="text-xs font-bold uppercase">Tips de uso</span></div><ul className="text-xs text-gray-500 space-y-3 list-disc pl-4"><li>Si no seleccionas a nadie, el sistema envía el mensaje a <strong>toda la comunidad</strong>.</li><li>Usa el buscador de la columna central para encontrar músicos específicos.</li><li>Los usuarios verán un punto rojo de notificación apenas envíes el mensaje.</li></ul></div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════
                Historial de Anuncios — deduplicado por backend
            ══════════════════════════════════════════════ */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <Clock size={18} className="text-purple-400" />
                  Historial de Anuncios
                </h3>
                <span className="text-xs text-zinc-500">{anuncios.length} {anuncios.length === 1 ? 'anuncio' : 'anuncios'}</span>
              </div>

              {anuncios.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-sm">
                  <Megaphone size={28} className="mx-auto mb-2 text-zinc-700" />
                  Aún no se han enviado anuncios.
                </div>
              ) : (
                <div className="space-y-3">
                  {anuncios.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-4 bg-black/30 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                        <Megaphone size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="text-white font-semibold text-sm">{a.titulo}</h4>
                          <span className="text-[10px] uppercase font-bold bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded">
                            {a.destinatarios} {a.destinatarios === 1 ? 'destinatario' : 'destinatarios'}
                          </span>
                        </div>
                        <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2">{a.descripcion}</p>
                        <p className="text-zinc-600 text-[10px] mt-1.5">{formatFecha(a.created_at)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnuncio(a)}
                        className="text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors p-2 rounded-lg shrink-0"
                        title="Eliminar anuncio"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Admin;
