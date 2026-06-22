import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmpresa } from '../../context/EmpresaContext';
import { getOrdenes, cancelarOrden } from '../../api/compras';

interface OrdenCompra {
  id: string;
  cen: string;
  proveedor: string;
  estado: string;
  fecha: string;
  totalItems: number;
}

const estadoColor: Record<string, { bg: string; color: string }> = {
  PENDIENTE:  { bg: '#fef9c3', color: '#854d0e' },
  CONFIRMADA: { bg: '#dcfce7', color: '#166534' },
  CANCELADA:  { bg: '#fee2e2', color: '#991b1b' },
};

const cenCorto = (cen: string) => cen.slice(0, 8).toUpperCase();

export default function Compras() {
  const { empresa } = useEmpresa();
  const navigate = useNavigate();
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    if (!empresa) return;
    setLoading(true);
    const statusApi = filtroEstado === 'PENDIENTE' ? 'DRAFT'
      : filtroEstado === 'CONFIRMADA' ? 'CONFIRMED'
      : filtroEstado === 'CANCELADA' ? 'CANCELLED'
      : undefined;
    getOrdenes(empresa.id, statusApi)
      .then(setOrdenes)
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [empresa, filtroEstado]);

  const handleCancelar = async (id: string) => {
    if (!empresa || !confirm('¿Cancelar esta orden de compra?')) return;
    try {
      await cancelarOrden(empresa.id, id);
      cargar();
    } catch (e: any) {
      alert(e.response?.data ?? 'No se pudo cancelar la orden');
    }
  };

  const selectStyle = {
    padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
    fontSize: 14, background: 'white',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, color: '#1e293b', fontSize: 28 }}>Compras</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Entradas de mercadería — al confirmar se incrementa el stock en inventario
          </p>
        </div>
        <button
          onClick={() => navigate('/compras/nueva')}
          style={{ padding: '12px 24px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 'bold' }}
        >
          + Nueva compra
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={selectStyle}>
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="CONFIRMADA">Confirmada</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Cargando...</p>
      ) : ordenes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📥</div>
          <p>No hay órdenes de compra. Registra una nueva entrada de productos.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {ordenes.map(o => {
            const estilo = estadoColor[o.estado] ?? { bg: '#f1f5f9', color: '#475569' };
            return (
              <div
                key={o.id}
                style={{
                  background: 'white', borderRadius: 12, padding: 20,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: o.estado === 'PENDIENTE' ? '2px solid #8b5cf6' : '2px solid transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#64748b' }}>Orden #{cenCorto(o.cen)}</span>
                  <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: estilo.bg, color: estilo.color }}>
                    {o.estado}
                  </span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 }}>{o.proveedor}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{o.totalItems} producto(s)</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
                  {new Date(o.fecha).toLocaleString('es-PE')}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => navigate(`/compras/${o.id}`)}
                    style={{ flex: 1, padding: '8px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                  >
                    {o.estado === 'PENDIENTE' ? '📋 Abrir' : '👁️ Ver'}
                  </button>
                  {o.estado === 'PENDIENTE' && (
                    <button
                      onClick={() => handleCancelar(o.id)}
                      style={{ padding: '8px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
