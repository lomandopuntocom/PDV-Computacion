import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmpresa } from '../../context/EmpresaContext';
import { getStock, registrarAjuste } from '../../api/stock';
import { getAlmacenes } from '../../api/almacenes';
import { getProductos } from '../../api/productos';

interface StockItem {
  codigo: string;
  nombre: string;
  categoria?: string;
  unidad?: string;
  almacen: string;
  cantidad: number;
  stockBajo: boolean;
}

interface Almacen {
  id: string;
  nombre: string;
}

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
}

export default function StockPage() {
  const { empresa } = useEmpresa();
  const navigate = useNavigate();
  const [stock, setStock] = useState<StockItem[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [ajuste, setAjuste] = useState({
    productoId: '',
    almacenId: '',
    cantidad: 1,
    operacion: 'AGREGAR',
    motivo: ''
  });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null);

  const cargar = () => {
    if (!empresa) return;
    setLoading(true);
    Promise.all([
      getStock(empresa.id),
      getAlmacenes(empresa.id),
      getProductos(empresa.id)
    ]).then(([stockData, almacenesData, productosData]) => {
      setStock(stockData);
      setAlmacenes(almacenesData);
      setProductos(productosData);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [empresa]);

  const handleAjuste = async () => {
    if (!ajuste.productoId || !ajuste.almacenId || !ajuste.motivo || ajuste.cantidad <= 0) {
      setMensaje({ texto: 'Completa todos los campos correctamente', tipo: 'error' });
      return;
    }

    // Calcular cantidad nueva según operación
    const stockActual = stock.find(s => {
      const prod = productos.find(p => p.codigo === s.codigo);
      const alm = almacenes.find(a => a.nombre === s.almacen);
      return prod?.id === ajuste.productoId && alm?.id === ajuste.almacenId;
    });

    const cantidadActual = stockActual?.cantidad ?? 0;
    const cantidadNueva = ajuste.operacion === 'AGREGAR'
      ? cantidadActual + ajuste.cantidad
      : cantidadActual - ajuste.cantidad;

    if (cantidadNueva < 0) {
      setMensaje({ texto: `❌ No puedes quitar más de lo que hay (stock actual: ${cantidadActual})`, tipo: 'error' });
      return;
    }

    setGuardando(true);
    try {
      await registrarAjuste({
        productoId: ajuste.productoId,
        almacenId: ajuste.almacenId,
        cantidadNueva,
        motivo: ajuste.motivo
      });
      setMensaje({ texto: '✅ Ajuste registrado correctamente', tipo: 'ok' });
      setModalAbierto(false);
      setAjuste({ productoId: '', almacenId: '', cantidad: 1, operacion: 'AGREGAR', motivo: '' });
      cargar();
    } catch {
      setMensaje({ texto: '❌ Error al registrar el ajuste', tipo: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, color: '#1e293b', fontSize: 28 }}>Stock</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{empresa?.nombre}</p>
        </div>
        <button
          onClick={() => { setModalAbierto(true); setMensaje(null); }}
          style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}
        >
          ⚙️ Registrar Ajuste
        </button>
      </div>

      {mensaje && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14,
          background: mensaje.tipo === 'ok' ? '#dcfce7' : '#fee2e2',
          color: mensaje.tipo === 'ok' ? '#166534' : '#991b1b'
        }}>
          {mensaje.texto}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Cargando stock...</p>
      ) : stock.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
          <p>No hay stock registrado. Usa "Registrar Ajuste" para ingresar cantidades.</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Código', 'Producto', 'Categoría', 'Almacén', 'Cantidad', 'Estado', 'Kardex'].map(col => (
                  <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stock.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontFamily: 'monospace', color: '#3b82f6' }}>{s.codigo}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{s.nombre}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748b' }}>{s.categoria || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748b' }}>{s.almacen}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 'bold', color: '#1e293b' }}>
                    {s.cantidad} {s.unidad}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: s.stockBajo ? '#fee2e2' : '#dcfce7',
                      color: s.stockBajo ? '#991b1b' : '#166534'
                    }}>
                      {s.stockBajo ? '⚠️ Stock bajo' : '✅ Normal'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => {
                        const prod = productos.find(p => p.codigo === s.codigo);
                        if (prod) navigate(`/kardex/${prod.id}`);
                      }}
                      style={{ padding: '6px 12px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#475569' }}
                    >
                      Ver kardex
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Ajuste */}
      {modalAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 24px', color: '#1e293b' }}>Registrar Ajuste de Stock</h2>

            {mensaje && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
                background: mensaje.tipo === 'ok' ? '#dcfce7' : '#fee2e2',
                color: mensaje.tipo === 'ok' ? '#166534' : '#991b1b'
              }}>
                {mensaje.texto}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Producto</label>
                <select
                  value={ajuste.productoId}
                  onChange={e => setAjuste(a => ({ ...a, productoId: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}
                >
                  <option value="">Selecciona un producto</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Almacén</label>
                <select
                  value={ajuste.almacenId}
                  onChange={e => setAjuste(a => ({ ...a, almacenId: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}
                >
                  <option value="">Selecciona un almacén</option>
                  {almacenes.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Operación</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(['AGREGAR', 'QUITAR'] as const).map(op => (
                    <button
                      key={op}
                      onClick={() => setAjuste(a => ({ ...a, operacion: op }))}
                      style={{
                        padding: '10px',
                        border: '2px solid',
                        borderColor: ajuste.operacion === op ? (op === 'AGREGAR' ? '#10b981' : '#ef4444') : '#e2e8f0',
                        borderRadius: 8,
                        background: ajuste.operacion === op ? (op === 'AGREGAR' ? '#dcfce7' : '#fee2e2') : 'white',
                        color: ajuste.operacion === op ? (op === 'AGREGAR' ? '#166534' : '#991b1b') : '#64748b',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: 14
                      }}
                    >
                      {op === 'AGREGAR' ? '+ Agregar' : '− Quitar'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Cantidad</label>
                <input
                  type="number"
                  min={1}
                  value={ajuste.cantidad}
                  onChange={e => setAjuste(a => ({ ...a, cantidad: Number(e.target.value) }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Motivo</label>
                <input
                  type="text"
                  placeholder="Ej: Conteo físico, merma, corrección..."
                  value={ajuste.motivo}
                  onChange={e => setAjuste(a => ({ ...a, motivo: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                onClick={() => { setModalAbierto(false); setMensaje(null); }}
                style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAjuste}
                disabled={guardando}
                style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}
              >
                {guardando ? 'Guardando...' : 'Registrar Ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}