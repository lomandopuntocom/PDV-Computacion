import { useEffect, useState } from 'react';
import { useEmpresa } from '../../context/EmpresaContext';
import { getCategorias, crearCategoria, editarCategoria } from '../../api/categorias';
import { getUnidades, crearUnidad, editarUnidad } from '../../api/unidades';
import { getProductos, crearProducto, editarProducto, toggleActivo, toggleAgotado } from '../../api/productos';
import { getEstaciones } from '../../api/estaciones';

interface Categoria { id: string; nombre: string; }
interface Unidad { id: string; nombre: string; }
interface Estacion { id: string; nombre: string; }
interface Producto {
  id: string; nombre: string; precio: number;
  categoria: string; categoriaId: string;
  unidad: string; unidadId: string;
  estacionId: string; stockMinimo: number;
  agotado: boolean; activo: boolean;
}

type Tab = 'productos' | 'categorias' | 'unidades';

export default function Catalogo() {
  const { empresa } = useEmpresa();
  const [tab, setTab] = useState<Tab>('productos');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [buscar, setBuscar] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [modal, setModal] = useState<'categoria' | 'unidad' | 'producto' | null>(null);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null);

  const cargar = async () => {
    if (!empresa) return;
    const [cats, unis, prods, ests] = await Promise.all([
      getCategorias(empresa.id),
      getUnidades(empresa.id),
      getProductos(empresa.id),
      getEstaciones(empresa.id),
    ]);
    setCategorias(cats);
    setUnidades(unis);
    setProductos(prods);
    setEstaciones(ests);
  };

  useEffect(() => { cargar(); }, [empresa]);

  const productosFiltrados = productos.filter(p => {
    const coincideNombre = p.nombre.toLowerCase().includes(buscar.toLowerCase());
    const coincideCategoria = filtroCategoria ? p.categoriaId === filtroCategoria : true;
    return coincideNombre && coincideCategoria;
  });

  const abrirModal = (tipo: 'categoria' | 'unidad' | 'producto', item?: any) => {
    setEditando(item ?? null);
    setForm(item ?? {});
    setMensaje(null);
    setModal(tipo);
  };

  const cerrarModal = () => { setModal(null); setEditando(null); setForm({}); };

  const handleGuardarCategoria = async () => {
    if (!form.nombre?.trim()) return setMensaje({ texto: 'El nombre es obligatorio', tipo: 'error' });
    try {
      if (editando) await editarCategoria(editando.id, { empresaId: empresa!.id, nombre: form.nombre });
      else await crearCategoria({ empresaId: empresa!.id, nombre: form.nombre });
      cerrarModal();
      cargar();
    } catch (e: any) {
      setMensaje({ texto: e.response?.data ?? 'Error al guardar', tipo: 'error' });
    }
  };

  const handleGuardarUnidad = async () => {
    if (!form.nombre?.trim()) return setMensaje({ texto: 'El nombre es obligatorio', tipo: 'error' });
    try {
      if (editando) await editarUnidad(editando.id, { empresaId: empresa!.id, nombre: form.nombre });
      else await crearUnidad({ empresaId: empresa!.id, nombre: form.nombre });
      cerrarModal();
      cargar();
    } catch (e: any) {
      setMensaje({ texto: e.response?.data ?? 'Error al guardar', tipo: 'error' });
    }
  };

  const handleGuardarProducto = async () => {
    if (!form.nombre?.trim()) return setMensaje({ texto: 'El nombre es obligatorio', tipo: 'error' });
    if (!form.precio || form.precio <= 0) return setMensaje({ texto: 'El precio debe ser mayor a 0', tipo: 'error' });
    if (!form.categoriaId) return setMensaje({ texto: 'La categoría es obligatoria', tipo: 'error' });
    if (!form.unidadId) return setMensaje({ texto: 'La unidad es obligatoria', tipo: 'error' });
    if (!form.estacionId) return setMensaje({ texto: 'La estación es obligatoria', tipo: 'error' });
    try {
      const data = {
        empresaId: empresa!.id,
        nombre: form.nombre,
        categoriaId: form.categoriaId,
        unidadId: form.unidadId,
        precio: parseFloat(form.precio),
        stockMinimo: parseFloat(form.stockMinimo ?? 0),
        estacionId: form.estacionId,
      };
      if (editando) await editarProducto(editando.id, data);
      else await crearProducto(data);
      cerrarModal();
      cargar();
    } catch (e: any) {
      setMensaje({ texto: e.response?.data ?? 'Error al guardar', tipo: 'error' });
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' as const
  };

  const selectStyle = { ...inputStyle };

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', color: '#1e293b', fontSize: 28 }}>Catálogo</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['productos', 'categorias', 'unidades'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === t ? '#3b82f6' : '#f1f5f9',
            color: tab === t ? 'white' : '#475569',
            fontWeight: tab === t ? 'bold' : 'normal', fontSize: 14,
            textTransform: 'capitalize'
          }}>
            {t === 'productos' ? '📦 Productos' : t === 'categorias' ? '🏷️ Categorías' : '📐 Unidades'}
          </button>
        ))}
      </div>

      {/* TAB PRODUCTOS */}
      {tab === 'productos' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <input
              placeholder="Buscar producto..."
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ ...selectStyle, width: 200 }}>
              <option value="">Todas las categorías</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <button onClick={() => abrirModal('producto')} style={{
              padding: '10px 20px', background: '#10b981', color: 'white',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold'
            }}>
              + Nuevo producto
            </button>
          </div>

          <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Nombre', 'Categoría', 'Unidad', 'Precio', 'Estación', 'Estado', 'Acciones'].map(col => (
                    <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{p.nombre}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748b' }}>{p.categoria}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748b' }}>{p.unidad}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 'bold', color: '#1e293b' }}>S/ {p.precio.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748b' }}>
                      {estaciones.find(e => e.id === p.estacionId)?.nombre ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: p.activo ? '#dcfce7' : '#fee2e2',
                          color: p.activo ? '#166534' : '#991b1b'
                        }}>{p.activo ? 'Activo' : 'Inactivo'}</span>
                        {p.agotado && <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fef9c3', color: '#854d0e' }}>Agotado</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => abrirModal('producto', p)} style={{ padding: '6px 10px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✏️</button>
                        <button onClick={() => toggleActivo(p.id).then(cargar)} style={{ padding: '6px 10px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                          {p.activo ? '🚫' : '✅'}
                        </button>
                        <button onClick={() => toggleAgotado(p.id).then(cargar)} style={{ padding: '6px 10px', background: p.agotado ? '#dcfce7' : '#fef9c3', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                          {p.agotado ? '✅ Disponible' : '86'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CATEGORIAS */}
      {tab === 'categorias' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button onClick={() => abrirModal('categoria')} style={{
              padding: '10px 20px', background: '#10b981', color: 'white',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold'
            }}>+ Nueva categoría</button>
          </div>
          <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Nombre', 'Acciones'].map(col => (
                    <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categorias.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#1e293b' }}>{c.nombre}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => abrirModal('categoria', c)} style={{ padding: '6px 10px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✏️ Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB UNIDADES */}
      {tab === 'unidades' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button onClick={() => abrirModal('unidad')} style={{
              padding: '10px 20px', background: '#10b981', color: 'white',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold'
            }}>+ Nueva unidad</button>
          </div>
          <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Nombre', 'Acciones'].map(col => (
                    <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unidades.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#1e293b' }}>{u.nombre}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => abrirModal('unidad', u)} style={{ padding: '6px 10px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✏️ Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: modal === 'producto' ? 520 : 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 24px', color: '#1e293b' }}>
              {editando ? 'Editar' : 'Nuevo'} {modal === 'categoria' ? 'categoría' : modal === 'unidad' ? 'unidad' : 'producto'}
            </h2>

            {mensaje && (
              <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: '#fee2e2', color: '#991b1b' }}>
                {mensaje.texto}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Campos categoría y unidad */}
              {(modal === 'categoria' || modal === 'unidad') && (
                <div>
                  <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Nombre</label>
                  <input value={form.nombre ?? ''} onChange={e => setForm({ ...form, nombre: e.target.value })} style={inputStyle} />
                </div>
              )}

              {/* Campos producto */}
              {modal === 'producto' && (
                <>
                  <div>
                    <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Nombre</label>
                    <input value={form.nombre ?? ''} onChange={e => setForm({ ...form, nombre: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Categoría</label>
                      <select value={form.categoriaId ?? ''} onChange={e => setForm({ ...form, categoriaId: e.target.value })} style={selectStyle}>
                        <option value="">Selecciona...</option>
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Unidad</label>
                      <select value={form.unidadId ?? ''} onChange={e => setForm({ ...form, unidadId: e.target.value })} style={selectStyle}>
                        <option value="">Selecciona...</option>
                        {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Precio</label>
                      <input type="number" min={0} step={0.01} value={form.precio ?? ''} onChange={e => setForm({ ...form, precio: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Stock mínimo</label>
                      <input type="number" min={0} value={form.stockMinimo ?? 0} onChange={e => setForm({ ...form, stockMinimo: e.target.value })} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Estación</label>
                    <select value={form.estacionId ?? ''} onChange={e => setForm({ ...form, estacionId: e.target.value })} style={selectStyle}>
                      <option value="">Selecciona...</option>
                      {estaciones.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={cerrarModal} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
                Cancelar
              </button>
              <button
                onClick={modal === 'categoria' ? handleGuardarCategoria : modal === 'unidad' ? handleGuardarUnidad : handleGuardarProducto}
                style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}