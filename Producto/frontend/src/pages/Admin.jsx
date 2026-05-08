import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Users, User, Ticket, Calendar, AlertTriangle, TrendingUp, 
  Shield, Search, Trash2, MapPin, Newspaper, Plus, Image as ImageIcon,
  CheckCircle, XCircle, Edit2, Save, X
} from 'lucide-react';
import { API_URL } from '../utils/helpers';

const Admin = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [tocatas, setTocatas] = useState([]);
  const [noticias, setNoticias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [userSearch, setUserSearch] = useState('');
  const [tocataSearch, setTocataSearch] = useState('');
  const [showNewsForm, setShowNewsForm] = useState(false);
  const [newNews, setNewNews] = useState({ titulo: '', contenido: '', imagen_url: '', fuente: 'Bandify' });

  // Estado para edición de usuario
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ nombre: '', email: '', role: '', es_premium: false, es_verificado: false });

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al cargar estadísticas');
      const data = await response.json();
      setStats(data);
    } catch (err) { setError(err.message); }
  };

  const fetchUsuarios = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/usuarios`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al cargar usuarios');
      const data = await response.json();
      setUsuarios(data);
    } catch (err) { setError(err.message); }
  };

  const fetchTocatas = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/tocatas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al cargar tocatas');
      const data = await response.json();
      setTocatas(data);
    } catch (err) { setError(err.message); }
  };

  const fetchNoticias = async () => {
    try {
      const response = await fetch(`${API_URL}/api/noticias`);
      if (!response.ok) throw new Error('Error al cargar noticias');
      const data = await response.json();
      setNoticias(data.articles.filter(a => a.isLocal));
    } catch (err) { setError(err.message); }
  };

  const handleDeleteUsuario = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/usuarios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setUsuarios(prev => prev.filter(u => u.id !== id));
        fetchStats();
      }
    } catch (err) { alert('Error al eliminar usuario'); }
  };

  const handleEditUser = (user) => {
    setEditingUser(user.id);
    setUserForm({
      nombre: user.nombre,
      email: user.email,
      role: user.role,
      es_premium: user.es_premium,
      es_verificado: user.es_verificado || false
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/admin/usuarios/${editingUser}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userForm)
      });
      if (response.ok) {
        const updated = await response.json();
        setUsuarios(prev => prev.map(u => u.id === editingUser ? { ...u, ...updated } : u));
        setEditingUser(null);
      } else {
        alert('Error al actualizar usuario');
      }
    } catch (err) { alert('Error de conexión'); }
  };

  const handleDeleteTocata = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta tocata?')) return;
    try {
      const response = await fetch(`${API_URL}/api/admin/tocatas/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setTocatas(prev => prev.filter(t => t.id !== id));
        fetchStats();
      }
    } catch (err) { alert('Error al eliminar tocata'); }
  };

  const handleUpdateReportState = async (reportId, nuevoEstado) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/reportes/${reportId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      if (response.ok) {
        fetchStats();
      } else {
        alert('Error al actualizar el reporte');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleCreateNews = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/noticias`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newNews)
      });
      if (response.ok) {
        const created = await response.json();
        const mapped = { 
          id: created.id,
          title: created.titulo, 
          description: created.contenido, 
          urlToImage: created.imagen_url, 
          isLocal: true, 
          publishedAt: created.created_at, 
          source: { name: created.fuente } 
        };
        setNoticias(prev => [mapped, ...prev]);
        setNewNews({ titulo: '', contenido: '', imagen_url: '', fuente: 'Bandify' });
        setShowNewsForm(false);
      } else {
        alert('Error al crear noticia');
      }
    } catch (err) { alert('Error de conexión'); }
  };

  const handleDeleteNews = async (id) => {
    if (!window.confirm('¿Eliminar esta noticia?')) return;
    try {
      const response = await fetch(`${API_URL}/api/noticias/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setNoticias(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) { alert('Error al eliminar noticia'); }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchUsuarios(), fetchTocatas(), fetchNoticias()]);
      setLoading(false);
    };
    if (token) loadData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
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

  const { totales, registrosSemanales, reportes } = stats;
  const chartData = registrosSemanales.map(item => ({
    name: new Date(item.semana).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
    registros: item.cantidad
  }));

  const filteredUsuarios = usuarios.filter(u => 
    (u.nombre || '').toLowerCase().includes(userSearch.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredTocatas = tocatas.filter(t => 
    (t.nombre || '').toLowerCase().includes(tocataSearch.toLowerCase()) || 
    (t.genero || '').toLowerCase().includes(tocataSearch.toLowerCase()) ||
    (t.organizador_nombre || '').toLowerCase().includes(tocataSearch.toLowerCase())
  );

  return (
    <div className="p-6 space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Shield className="text-indigo-500" />
            Panel de Administración
          </h1>
          <p className="text-gray-400">Control central de la plataforma Bandify</p>
        </div>
        
        <div className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-800 self-start md:self-center overflow-x-auto">
          <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<TrendingUp size={16}/>} label="Métricas" />
          <TabButton active={activeTab === 'usuarios'} onClick={() => setActiveTab('usuarios')} icon={<Users size={16}/>} label="Usuarios" />
          <TabButton active={activeTab === 'tocatas'} onClick={() => setActiveTab('tocatas')} icon={<Calendar size={16}/>} label="Tocatas" />
          <TabButton active={activeTab === 'noticias'} onClick={() => setActiveTab('noticias')} icon={<Newspaper size={16}/>} label="Noticias" />
        </div>
      </header>

      {activeTab === 'stats' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard title="Total Usuarios" value={totales.usuarios} icon={<Users className="w-6 h-6 text-blue-400" />} color="bg-blue-500/10" />
            <MetricCard title="Total Tocatas" value={totales.tocatas} icon={<Calendar className="w-6 h-6 text-purple-400" />} color="bg-purple-500/10" />
            <MetricCard title="Tickets Vendidos" value={totales.tickets} icon={<Ticket className="w-6 h-6 text-green-400" />} color="bg-green-500/10" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-semibold text-white">Registros por Semana</h2>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }} itemStyle={{ color: '#818CF8' }} />
                    <Line type="monotone" dataKey="registros" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#6366F1' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
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
                      key={idx} 
                      report={rep} 
                      onUpdate={(nuevo) => handleUpdateReportState(rep.id, nuevo)} 
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[250px] text-gray-500 italic">
                  <p>No hay reportes pendientes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'usuarios' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Gestión de Usuarios</h2>
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
                          {(u.nombre || 'U').substring(0,2)}
                        </div>
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
                        <span className={`text-[10px] font-bold uppercase w-fit px-2 py-0.5 rounded ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700/50 text-gray-400'}`}>{u.role}</span>
                        {u.es_premium && <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-500 w-fit px-2 py-0.5 rounded">Premium</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400"><div className="flex items-center gap-1"><MapPin size={12}/>{u.ciudad || 'No especificada'}</div></td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => handleEditUser(u)} className="text-gray-500 hover:text-indigo-400 transition-colors p-2" title="Editar Usuario"><Edit2 size={16} /></button>
                      <button onClick={() => handleDeleteUsuario(u.id)} className="text-gray-500 hover:text-red-400 transition-colors p-2" title="Eliminar Usuario"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Edición de Usuario */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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
                  onChange={e => setUserForm({...userForm, nombre: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Email</label>
                <input 
                  type="email" 
                  value={userForm.email}
                  onChange={e => setUserForm({...userForm, email: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Rol</label>
                  <select 
                    value={userForm.role}
                    onChange={e => setUserForm({...userForm, role: e.target.value})}
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
                      onChange={e => setUserForm({...userForm, es_premium: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Premium</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={userForm.es_verificado}
                      onChange={e => setUserForm({...userForm, es_verificado: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-0"
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">Verificado ✅</span>
                  </label>
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl mt-4 flex items-center justify-center gap-2 transition-all">
                <Save size={18} /> Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'tocatas' && (
        <div className="space-y-6">
          <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-2xl flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Explorar Tocatas</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar por nombre, género o organizador..." 
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
                    <button onClick={() => handleDeleteTocata(t.id)} className="text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-gray-400"><Calendar size={14}/>{new Date(t.fecha).toLocaleDateString()}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-400"><MapPin size={14}/>{t.ciudad}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-400"><User size={14}/>Org: {t.organizador_nombre}</div>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2 italic">"{t.description}"</p>
                </div>
              ))
            ) : (<div className="col-span-full py-20 text-center text-gray-500 italic">No se encontraron tocatas.</div>)}
          </div>
        </div>
      )}

      {activeTab === 'noticias' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Gestión de Noticias Locales</h2>
            <button 
              onClick={() => setShowNewsForm(!showNewsForm)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
            >
              {showNewsForm ? "Cerrar Editor" : "Redactar Noticia"}
            </button>
          </div>

          {showNewsForm && (
            <form onSubmit={handleCreateNews} className="bg-gray-900/80 border border-indigo-500/30 p-6 rounded-2xl space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Título de la Noticia</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ej: ¡Nuevo festival en Santiago!"
                    value={newNews.titulo}
                    onChange={e => setNewNews(prev => ({...prev, titulo: e.target.value}))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 transition-colors outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">URL de la Imagen</label>
                  <input 
                    type="url" 
                    placeholder="https://images.unsplash.com/..."
                    value={newNews.imagen_url}
                    onChange={e => setNewNews(prev => ({...prev, imagen_url: e.target.value}))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 transition-colors outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contenido</label>
                <textarea 
                  required
                  placeholder="Escribe el cuerpo de la noticia aquí..."
                  rows={4}
                  value={newNews.contenido}
                  onChange={e => setNewNews(prev => ({...prev, contenido: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 transition-colors outline-none resize-none"
                />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all">
                Publicar Noticia en Bandify
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 gap-4">
            {noticias.length > 0 ? (
              noticias.map(n => (
                <div key={n.id} className="bg-gray-900/50 border border-gray-800 p-4 rounded-2xl flex gap-4 items-center group hover:border-gray-700 transition-all">
                  <img src={n.urlToImage || 'https://via.placeholder.com/150'} className="w-24 h-24 rounded-xl object-cover" alt="" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold truncate">{n.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2 mt-1">{n.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                      <span>{n.source?.name}</span>
                      <span>•</span>
                      <span>{new Date(n.publishedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteNews(n.id)} className="p-3 text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-gray-500 italic bg-gray-900/30 rounded-2xl border border-dashed border-gray-800">
                Aún no has publicado noticias locales.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
      active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-400 hover:text-white'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const MetricCard = ({ title, value, icon, color }) => (
  <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl flex items-center gap-4 transition-all hover:border-gray-700">
    <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
    <div>
      <p className="text-sm text-gray-400 font-medium">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  </div>
);

const ReportItem = ({ report, onUpdate }) => (
  <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-indigo-500/50 transition-colors">
    <div className="flex justify-between items-start mb-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 px-2 py-0.5 bg-indigo-500/10 rounded">{report.tipo_contenido}</span>
      <span className="text-xs text-gray-500">{new Date(report.created_at).toLocaleDateString()}</span>
    </div>
    <p className="text-sm text-gray-300 mb-3 leading-relaxed">{report.motivo}</p>
    
    <div className="flex justify-between items-center text-xs border-t border-gray-700/50 pt-2 mb-3">
      <span className="text-gray-400">Reportado por: <span className="text-gray-200">{report.emisor_nombre || 'Anónimo'}</span></span>
      <span className={`px-2 py-0.5 rounded-full font-medium ${
        report.estado === 'pendiente' ? 'bg-orange-500/20 text-orange-400' : 
        report.estado === 'resuelto' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
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

export default Admin;
