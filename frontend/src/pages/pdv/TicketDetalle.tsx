import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTicket, agregarItem, actualizarItem } from '../../api/tickets';
import { enviarComanda } from '../../api/comandas';
import { cobrar } from '../../api/pagos';
import { getProductos } from '../../api/productos';
import { useEmpresa } from '../../context/EmpresaContext';
import { getCategorias } from '../../api/categorias';

interface TicketItem {
  id: string; productoId: string; producto: string;
  cantidad: number; precioUnitario: number; nota?: string; subtotal: number;
}

interface TicketData {
  id: string; numero: number; estado: string;
  items: TicketItem[]; subtotal: number;
  impuesto: number; total: number; tasaImpuesto: number;
  pago?: { metodoPago: string; total: number; fecha: string };
}

interface Producto {
  id: string; codigo: string; nombre: string; precio: number;
  categoriaId: string; agotado: boolean; activo: boolean;
}

interface Categoria { id: string; nombre: string; }

export default function TicketDetalle() {
  const { id } = useParams<{ id: string }>();
  const { empresa } = useEmpresa();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [buscar, setBuscar] = useState('');
  const [notaModal, setNotaModal] = useState<{ itemId: string; nota: string; cantidad: number } | null>(null);
  const [modalPago, setModalPago] = useState(false);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null);

  const cargar = useCallback(async () => {
    if (!id || !empresa) return;
    const [t, p, c] = await Promise.all([
      getTicket(id),
      getProductos(empresa.id),
      getCategorias(empresa.id),
    ]);
    setTicket(t);
    setProductos(p);
    setCategorias(c);
  }, [id, empresa]);

  useEffect(() => { cargar(); }, [cargar]);

  const productosFiltrados = productos
    .filter(p => p.activo && !p.agotado)
    .filter(p => filtroCategoria ? p.categoriaId === filtroCategoria : true)
    .filter(p => `${p.codigo} ${p.nombre}`.toLowerCase().includes(buscar.toLowerCase()));

  const handleAgregarProducto = async (productoId: string) => {
    if (!id || ticket?.estado !== 'ABIERTO') return;
    try {
      const existente = ticket?.items.find(i => i.productoId === productoId);
      const producto = productos.find(p => p.id === productoId);
      if (existente) {
        await handleActualizarItem(existente.id, existente.cantidad + 1, existente.nota);
        return;
      }
      await agregarItem(id, { productoId, cantidad: 1, precioUnitario: producto?.precio ?? 0 });
      cargar();
    } catch (e: any) {
      const err = e.response?.data;
      setMensaje({ texto: typeof err === 'string' ? err : err?.title ?? 'Error al agregar', tipo: 'error' });
    }
  };

  const handleActualizarItem = async (itemId: string, cantidad: number, nota?: string) => {
    if (!id) return;
    const cantidadEntera = Math.floor(cantidad);
    if (cantidad > 0 && cantidad !== cantidadEntera) {
      setMensaje({ texto: 'La cantidad debe ser un número entero', tipo: 'error' });
      return;
    }
    try {
      await actualizarItem(id, itemId, { cantidad: cantidadEntera, nota });
      setNotaModal(null);
      cargar();
    } catch (e: any) {
      const err = e.response?.data;
      setMensaje({ texto: typeof err === 'string' ? err : err?.title ?? 'Error al actualizar', tipo: 'error' });
    }
  };

  const handleEnviarComanda = async () => {
    if (!id) return;
    setProcesando(true);
    try {
      await enviarComanda(id);
      setMensaje({ texto: '✅ Comanda enviada a cocina/bar', tipo: 'ok' });
    } catch (e: any) {
      setMensaje({ texto: e.response?.data ?? 'Error al enviar comanda', tipo: 'error' });
    } finally {
      setProcesando(false);
    }
  };

  const handleCobrar = async () => {
    if (!id) return;
    setProcesando(true);
    try {
      await cobrar({ ticketId: id, metodoPago });
      setModalPago(false);
      setMensaje({ texto: '✅ Pago registrado correctamente', tipo: 'ok' });
      cargar();
    } catch (e: any) {
      const err = e.response?.data;
      const texto = typeof err === 'object' ? err.mensaje : err;
      setMensaje({ texto: `❌ ${texto}`, tipo: 'error' });
    } finally {
      setProcesando(false);
    }
  };

  if (!ticket) return <p style={{ color: '#94a3b8' }}>Cargando...</p>;

  const abierto = ticket.estado === 'ABIERTO';
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' as const };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, height: 'calc(100vh - 64px)' }}>

      {/* Panel izquierdo — catálogo */}
      <div style={{ overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => navigate('/pdv')} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>← Volver</button>
          <h1 style={{ margin: 0, fontSize: 22, color: '#1e293b' }}>Ticket #{ticket.numero}</h1>
          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: abierto ? '#dbeafe' : '#dcfce7', color: abierto ? '#1e40af' : '#166534' }}>
            {ticket.estado}
          </span>
        </div>

        {mensaje && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: mensaje.tipo === 'ok' ? '#dcfce7' : '#fee2e2', color: mensaje.tipo === 'ok' ? '#166534' : '#991b1b' }}>
            {mensaje.texto}
          </div>
        )}

        {abierto && (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input placeholder="Buscar producto..." value={buscar} onChange={e => setBuscar(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ ...inputStyle, width: 180 }}>
                <option value="">Todas</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {productosFiltrados.map(p => (
                <button key={p.id} onClick={() => handleAgregarProducto(p.id)} style={{
                  padding: '16px 12px', background: 'white', border: '2px solid #e2e8f0',
                  borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
                >
                  <div style={{ fontSize: 13, fontWeight: 'bold', color: '#1e293b', marginBottom: 6 }}>{p.codigo}</div>
                  <div style={{ fontSize: 14, color: '#10b981', fontWeight: 'bold' }}>S/ {p.precio.toFixed(2)}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Panel derecho — ticket */}
      <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#1e293b' }}>Pedido</h2>

        {ticket.items.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
            Agrega productos al pedido
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {ticket.items.map(item => (
              <div key={item.id} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{item.producto}</div>
                    {item.nota && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>📝 {item.nota}</div>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 'bold', color: '#1e293b' }}>S/ {item.subtotal.toFixed(2)}</div>
                </div>

                {abierto && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <button
                      onClick={() => item.cantidad <= 1 ? handleActualizarItem(item.id, 0) : handleActualizarItem(item.id, item.cantidad - 1, item.nota)}
                      style={{ width: 28, height: 28, background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
                    >−</button>
                    <span style={{ fontSize: 14, fontWeight: 'bold', minWidth: 24, textAlign: 'center' }}>{item.cantidad}</span>
                    <button onClick={() => handleActualizarItem(item.id, item.cantidad + 1, item.nota)} style={{ width: 28, height: 28, background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>+</button>
                    <button onClick={() => setNotaModal({ itemId: item.id, nota: item.nota ?? '', cantidad: item.cantidad })} style={{ padding: '4px 8px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: '#64748b' }}>📝 Nota</button>
                    <button onClick={() => handleActualizarItem(item.id, 0)} style={{ padding: '4px 8px', background: '#fee2e2', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: '#991b1b', marginLeft: 'auto' }}>✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Totales */}
        <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: 16, marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#64748b', marginBottom: 6 }}>
            <span>Subtotal</span><span>S/ {ticket.subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#64748b', marginBottom: 10 }}>
            <span>IGV ({(ticket.tasaImpuesto * 100).toFixed(0)}%)</span>
            <span>S/ {ticket.impuesto.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 'bold', color: '#1e293b' }}>
            <span>Total</span><span>S/ {ticket.total.toFixed(2)}</span>
          </div>
        </div>

        {ticket.pago && (
          <div style={{ marginTop: 12, padding: 12, background: '#dcfce7', borderRadius: 8, fontSize: 13, color: '#166534' }}>
            ✅ Pagado con {ticket.pago.metodoPago} — S/ {ticket.pago.total.toFixed(2)}
          </div>
        )}

        {abierto && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            <button onClick={handleEnviarComanda} disabled={procesando || ticket.items.length === 0} style={{ padding: '12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>
              🍳 Enviar Comanda
            </button>
            <button onClick={() => setModalPago(true)} disabled={procesando || ticket.items.length === 0} style={{ padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>
              💳 Cobrar
            </button>
          </div>
        )}
      </div>

      {/* Modal nota */}
      {notaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 380 }}>
            <h3 style={{ margin: '0 0 16px', color: '#1e293b' }}>Nota del ítem</h3>
            <textarea
              value={notaModal.nota}
              onChange={e => setNotaModal(n => n ? { ...n, nota: e.target.value } : n)}
              placeholder="Ej: Sin cebolla, extra picante..."
              rows={3}
              style={{ ...inputStyle, resize: 'none' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setNotaModal(null)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => handleActualizarItem(notaModal.itemId, notaModal.cantidad, notaModal.nota)} style={{ flex: 1, padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pago */}
      {modalPago && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: 380 }}>
            <h2 style={{ margin: '0 0 8px', color: '#1e293b' }}>Cobrar ticket #{ticket.numero}</h2>
            <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: 14 }}>Total: <strong>S/ {ticket.total.toFixed(2)}</strong></p>

            <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 8 }}>Método de pago</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
              {(['EFECTIVO', 'QR', 'TARJETA'] as const).map(m => (
                <button key={m} onClick={() => setMetodoPago(m)} style={{
                  padding: '12px 8px', border: '2px solid',
                  borderColor: metodoPago === m ? '#3b82f6' : '#e2e8f0',
                  borderRadius: 8, background: metodoPago === m ? '#eff6ff' : 'white',
                  color: metodoPago === m ? '#1e40af' : '#64748b',
                  cursor: 'pointer', fontWeight: 'bold', fontSize: 13
                }}>
                  {m === 'EFECTIVO' ? '💵' : m === 'QR' ? '📱' : '💳'} {m}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setModalPago(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button onClick={handleCobrar} disabled={procesando} style={{ flex: 1, padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>
                {procesando ? 'Procesando...' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
