import { useEffect, useState } from 'react';
import { useEmpresa } from '../../context/EmpresaContext';
import { getStock, registrarAjuste } from '../../api/stock';
import { getProductos } from '../../api/productos';

interface StockItem {
  id: string; nombre: string; cantidad: number;
  stockMinimo: number; agotado: boolean; stockBajo: boolean;
}

export default function StockPage() {
  const { empresa } = useEmpresa();
  const [stock, setStock] = useState<StockItem[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [ajuste, setAjuste] = useState({ productoId: '', tipo: 'ENTRADA', cantidad: 1, motivo: '' });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null);

  const cargar = () => {
    if (!empresa) return;
    setLoading(true);
    Promise.all([getStock(empresa.id), getProductos(empresa.id)])
      .then(([s, p]) => { setStock(s); setProductos(p); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [empresa]);

  const handleAjuste = async () => {
    if (!ajuste.productoId || !ajuste.motivo || ajuste.cantidad <= 0) {
      setMensaje({ texto: 'Completa todos los campos', tipo: 'error' });
      return;
    }
    setGuardando(true);
    try {
      await registrarAjuste(ajuste);
      setMensaje({ texto: '✅ Ajuste registrado', tipo: 'ok' });
      setModal(false);
      setAjuste({ productoId: '', tipo: 'ENTRADA', cantidad: 1, motivo: '' });
      cargar();
    } catch (e: any) {
      setMensaje({ texto: e.response?.data ?? '❌ Error al registrar', tipo: 'error' });
    } finally {
      setGuardando(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' as const };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, color: '#1e293b', fontSize: 28 }}>Stock</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{empresa?.nombre}</p>
        </div>
        <button onClick={() => { setModal(true); setMensaje(null); }} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>
          ⚙️ Registrar Ajuste
        </button>
      </div>

      {mensaje && !modal && (
        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14, background: mensaje.tipo === 'ok' ? '#dcfce7' : '#fee2e2', color: mensaje.tipo === 'ok' ? '#166534' : '#991b1b' }}>
          {mensaje.texto}
        </div>
      )}

      {loading ? <p style={{ color: '#94a3b8' }}>Cargando...</p> : (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Producto', 'Cantidad', 'Stock Mínimo', 'Estado'].map(col => (
                  <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stock.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{s.nombre}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 'bold', color: '#1e293b' }}>{s.cantidad}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748b' }}>{s.stockMinimo}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {s.agotado && <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fee2e2', color: '#991b1b' }}>Agotado</span>}
                      {!s.agotado && s.stockBajo && <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fef9c3', color: '#854d0e' }}>⚠️ Stock bajo</span>}
                      {!s.agotado && !s.stockBajo && <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#166534' }}>✅ Normal</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 24px', color: '#1e293b' }}>Registrar Ajuste de Stock</h2>

            {mensaje && (
              <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: '#fee2e2', color: '#991b1b' }}>
                {mensaje.texto}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Producto</label>
                <select value={ajuste.productoId} onChange={e => setAjuste(a => ({ ...a, productoId: e.target.value }))} style={inputStyle}>
                  <option value="">Selecciona...</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Tipo</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(['ENTRADA', 'SALIDA'] as const).map(tipo => (
                    <button key={tipo} onClick={() => setAjuste(a => ({ ...a, tipo }))} style={{
                      padding: '10px', border: '2px solid',
                      borderColor: ajuste.tipo === tipo ? (tipo === 'ENTRADA' ? '#10b981' : '#ef4444') : '#e2e8f0',
                      borderRadius: 8,
                      background: ajuste.tipo === tipo ? (tipo === 'ENTRADA' ? '#dcfce7' : '#fee2e2') : 'white',
                      color: ajuste.tipo === tipo ? (tipo === 'ENTRADA' ? '#166534' : '#991b1b') : '#64748b',
                      cursor: 'pointer', fontWeight: 'bold', fontSize: 14
                    }}>
                      {tipo === 'ENTRADA' ? '+ Entrada' : '− Salida'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Cantidad</label>
                <input type="number" min={1} value={ajuste.cantidad} onChange={e => setAjuste(a => ({ ...a, cantidad: Number(e.target.value) }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Motivo</label>
                <input type="text" placeholder="Ej: Conteo físico, merma..." value={ajuste.motivo} onChange={e => setAjuste(a => ({ ...a, motivo: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={() => { setModal(false); setMensaje(null); }} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button onClick={handleAjuste} disabled={guardando} style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>
                {guardando ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}