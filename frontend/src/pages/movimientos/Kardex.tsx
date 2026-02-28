import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getKardex } from '../../api/movimientos';

interface Movimiento {
  tipo: string;
  cantidad: number;
  saldoAnterior: number;
  saldoPosterior: number;
  motivo?: string;
  almacen: string;
  fecha: string;
}

const colorTipo: Record<string, { bg: string; color: string }> = {
  ENTRADA:  { bg: '#dcfce7', color: '#166534' },
  SALIDA:   { bg: '#fee2e2', color: '#991b1b' },
  AJUSTE:   { bg: '#fef9c3', color: '#854d0e' },
};

export default function Kardex() {
  const { productoId } = useParams<{ productoId: string }>();
  const navigate = useNavigate();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productoId) return;
    getKardex(productoId)
      .then(setMovimientos)
      .finally(() => setLoading(false));
  }, [productoId]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/stock')}
          style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
        >
          ← Volver
        </button>
        <div>
          <h1 style={{ margin: 0, color: '#1e293b', fontSize: 28 }}>Kardex</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Historial de movimientos del producto</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Cargando movimientos...</p>
      ) : movimientos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <p>No hay movimientos registrados para este producto.</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Fecha', 'Tipo', 'Almacén', 'Cantidad', 'Saldo Anterior', 'Saldo Posterior', 'Motivo'].map(col => (
                  <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m, i) => {
                const estilo = colorTipo[m.tipo] ?? { bg: '#f1f5f9', color: '#475569' };
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                      {new Date(m.fecha).toLocaleString('es-PE')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: estilo.bg, color: estilo.color }}>
                        {m.tipo}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748b' }}>{m.almacen}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 'bold', color: '#1e293b' }}>{m.cantidad}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#94a3b8' }}>{m.saldoAnterior}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 'bold', color: '#1e293b' }}>{m.saldoPosterior}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{m.motivo || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}