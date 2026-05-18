import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEmpresa } from '../../context/EmpresaContext';
import { getProductos } from '../../api/productos';
import { crearOrden, getOrden, confirmarOrden, cancelarOrden, getProveedores, crearProveedor } from '../../api/compras';

interface Proveedor {
  id: string;
  codigo: string;
  nombre: string;
}

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
}

interface LineaCompra {
  productoId: string;
  codigo: string;
  cantidad: number;
}

interface OrdenDetalle {
  id: string;
  cen: string;
  proveedor: string;
  estado: string;
  estadoApi: string;
  fecha: string;
  items: { id: string; productoId: string; productoCen: string; cantidad: number; codigo?: string }[];
}

const estadoColor: Record<string, { bg: string; color: string }> = {
  PENDIENTE:  { bg: '#fef9c3', color: '#854d0e' },
  CONFIRMADA: { bg: '#dcfce7', color: '#166534' },
  CANCELADA:  { bg: '#fee2e2', color: '#991b1b' },
};

const cenCorto = (cen: string) => cen.slice(0, 8).toUpperCase();

export default function CompraDetalle() {
  const { id } = useParams<{ id: string }>();
  const { empresa } = useEmpresa();
  const navigate = useNavigate();
  const esNueva = id === 'nueva';

  const [orden, setOrden] = useState<OrdenDetalle | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorCen, setProveedorCen] = useState('');
  const [nuevoProveedor, setNuevoProveedor] = useState('');
  const [mostrarNuevoProveedor, setMostrarNuevoProveedor] = useState(false);
  const [lineas, setLineas] = useState<LineaCompra[]>([]);
  const [buscar, setBuscar] = useState('');
  const [loading, setLoading] = useState(!esNueva);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null);

  const codigoProducto = useCallback((productoId: string) => {
    return productos.find(p => p.id === productoId)?.codigo ?? productoId.slice(0, 8).toUpperCase();
  }, [productos]);

  const cargarOrden = useCallback(async () => {
    if (!empresa || !id || esNueva) return;
    setLoading(true);
    try {
      const data = await getOrden(empresa.id, id);
      setOrden(data);
    } finally {
      setLoading(false);
    }
  }, [empresa, id, esNueva]);

  useEffect(() => {
    if (!empresa) return;
    getProductos(empresa.id).then(setProductos);
    getProveedores(empresa.id).then(setProveedores).catch(() => setProveedores([]));
    if (!esNueva) cargarOrden();
  }, [empresa, esNueva, cargarOrden]);

  const productosFiltrados = productos
    .filter(p => p.activo)
    .filter(p => `${p.codigo} ${p.nombre}`.toLowerCase().includes(buscar.toLowerCase()));

  const agregarProducto = (producto: Producto) => {
    if (!esNueva || orden) return;
    setLineas(prev => {
      const existente = prev.find(l => l.productoId === producto.id);
      if (existente) {
        return prev.map(l => l.productoId === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l);
      }
      return [...prev, { productoId: producto.id, codigo: producto.codigo, cantidad: 1 }];
    });
  };

  const actualizarCantidad = (productoId: string, cantidad: number) => {
    const entera = Math.floor(cantidad);
    if (entera < 1) {
      setLineas(prev => prev.filter(l => l.productoId !== productoId));
      return;
    }
    if (cantidad !== entera) {
      setMensaje({ texto: 'La cantidad debe ser un número entero', tipo: 'error' });
      return;
    }
    setLineas(prev => prev.map(l => l.productoId === productoId ? { ...l, cantidad: entera } : l));
  };

  const handleCrearProveedor = async () => {
    if (!empresa || !nuevoProveedor.trim()) return;
    setProcesando(true);
    try {
      const creado = await crearProveedor(empresa.id, { nombre: nuevoProveedor.trim() });
      setProveedores(prev => [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setProveedorCen(creado.codigo);
      setNuevoProveedor('');
      setMostrarNuevoProveedor(false);
      setMensaje({ texto: `Proveedor ${creado.codigo} registrado`, tipo: 'ok' });
    } catch (e: any) {
      const err = e.response?.data;
      setMensaje({ texto: typeof err === 'string' ? err : 'No se pudo crear el proveedor', tipo: 'error' });
    } finally {
      setProcesando(false);
    }
  };

  const handleGuardar = async () => {
    if (!empresa) return;
    if (!proveedorCen) {
      setMensaje({ texto: 'Selecciona un proveedor', tipo: 'error' });
      return;
    }
    if (lineas.length === 0) {
      setMensaje({ texto: 'Agrega al menos un producto', tipo: 'error' });
      return;
    }
    setProcesando(true);
    setMensaje(null);
    try {
      const creada = await crearOrden(empresa.id, {
        proveedorCen,
        items: lineas.map(l => ({ productoId: l.productoId, cantidad: l.cantidad })),
      });
      navigate(`/compras/${creada.id}`, { replace: true });
    } catch (e: any) {
      const err = e.response?.data;
      setMensaje({ texto: typeof err === 'string' ? err : 'Error al crear la orden', tipo: 'error' });
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmar = async () => {
    if (!empresa || !orden) return;
    if (!confirm('¿Confirmar compra? Se incrementará el stock en inventario.')) return;
    setProcesando(true);
    setMensaje(null);
    try {
      const actualizada = await confirmarOrden(empresa.id, orden.id);
      setOrden(actualizada);
      setMensaje({ texto: '✅ Compra confirmada. Stock actualizado.', tipo: 'ok' });
    } catch (e: any) {
      const err = e.response?.data;
      setMensaje({ texto: typeof err === 'string' ? err : 'No se pudo confirmar', tipo: 'error' });
    } finally {
      setProcesando(false);
    }
  };

  const handleCancelar = async () => {
    if (!empresa || !orden) return;
    if (!confirm('¿Cancelar esta orden de compra?')) return;
    setProcesando(true);
    try {
      const actualizada = await cancelarOrden(empresa.id, orden.id);
      setOrden(actualizada);
      setMensaje({ texto: 'Orden cancelada', tipo: 'ok' });
    } catch (e: any) {
      const err = e.response?.data;
      setMensaje({ texto: typeof err === 'string' ? err : 'No se pudo cancelar', tipo: 'error' });
    } finally {
      setProcesando(false);
    }
  };

  if (loading) return <p style={{ color: '#94a3b8' }}>Cargando...</p>;

  const itemsVista = esNueva
    ? lineas
    : (orden?.items ?? []).map(i => ({
        productoId: i.productoId,
        codigo: codigoProducto(i.productoId),
        cantidad: i.cantidad,
      }));

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' as const };
  const estiloEstado = orden ? estadoColor[orden.estado] : estadoColor.PENDIENTE;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: esNueva ? '1fr 380px' : '1fr', gap: 24 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => navigate('/compras')} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
            ← Volver
          </button>
          <h1 style={{ margin: 0, fontSize: 22, color: '#1e293b' }}>
            {esNueva ? 'Nueva compra' : `Orden CEN ${cenCorto(orden?.cen ?? '')}`}
          </h1>
          {!esNueva && orden && (
            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: estiloEstado.bg, color: estiloEstado.color }}>
              {orden.estado}
            </span>
          )}
        </div>

        {mensaje && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: mensaje.tipo === 'ok' ? '#dcfce7' : '#fee2e2', color: mensaje.tipo === 'ok' ? '#166534' : '#991b1b' }}>
            {mensaje.texto}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Proveedor</label>
          {esNueva ? (
            <div>
              <select
                value={proveedorCen}
                onChange={e => setProveedorCen(e.target.value)}
                style={inputStyle}
                disabled={!!orden}
              >
                <option value="">Selecciona proveedor (CEN)...</option>
                {proveedores.map(p => (
                  <option key={p.codigo} value={p.codigo}>{p.codigo} — {p.nombre}</option>
                ))}
              </select>
              {!mostrarNuevoProveedor ? (
                <button
                  type="button"
                  onClick={() => setMostrarNuevoProveedor(true)}
                  style={{ padding: '8px 12px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, textAlign: 'left', marginTop: 10 }}
                >
                  + Registrar nuevo proveedor
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <input
                    value={nuevoProveedor}
                    onChange={e => setNuevoProveedor(e.target.value)}
                    placeholder="Nombre del proveedor"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleCrearProveedor}
                    disabled={procesando}
                    style={{ padding: '10px 14px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                  >
                    Crear
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1e293b' }}>{orden?.proveedor}</div>
          )}
          {!esNueva && orden && (
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
              {new Date(orden.fecha).toLocaleString('es-PE')}
            </div>
          )}
        </div>

        {esNueva && !orden && (
          <>
            <input
              placeholder="Buscar producto por CEN..."
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              style={{ ...inputStyle, marginBottom: 16 }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {productosFiltrados.map(p => (
                <button
                  key={p.id}
                  onClick={() => agregarProducto(p)}
                  style={{
                    padding: '14px 10px', background: 'white', border: '2px solid #e2e8f0',
                    borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 'bold', color: '#1e293b' }}>{p.codigo}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{p.nombre}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: 'fit-content' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#1e293b' }}>Detalle de compra</h2>

        {itemsVista.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Sin productos</p>
        ) : (
          <div style={{ marginBottom: 20 }}>
            {itemsVista.map(item => (
              <div key={item.productoId} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{item.codigo}</span>
                {esNueva && !orden ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => actualizarCantidad(item.productoId, item.cantidad - 1)} style={{ width: 26, height: 26, border: 'none', borderRadius: 6, background: '#f1f5f9', cursor: 'pointer' }}>−</button>
                    <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 'bold' }}>{item.cantidad}</span>
                    <button onClick={() => actualizarCantidad(item.productoId, item.cantidad + 1)} style={{ width: 26, height: 26, border: 'none', borderRadius: 6, background: '#f1f5f9', cursor: 'pointer' }}>+</button>
                  </div>
                ) : (
                  <span style={{ fontWeight: 'bold' }}>× {item.cantidad}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {esNueva && !orden && (
          <button
            onClick={handleGuardar}
            disabled={procesando || lineas.length === 0}
            style={{ width: '100%', padding: '12px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 14 }}
          >
            {procesando ? 'Guardando...' : 'Guardar orden'}
          </button>
        )}

        {!esNueva && orden?.estado === 'PENDIENTE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleConfirmar}
              disabled={procesando}
              style={{ padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}
            >
              {procesando ? 'Procesando...' : '✅ Confirmar compra'}
            </button>
            <button
              onClick={handleCancelar}
              disabled={procesando}
              style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}
            >
              Cancelar orden
            </button>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
              Al confirmar, cada ítem llamará a inventario para aumentar stock.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
