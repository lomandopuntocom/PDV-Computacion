import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmpresa } from '../../context/EmpresaContext';
import { getDocumentos } from '../../api/documentos';

interface Documento {
  id: string;
  tipo: string;
  estado: string;
  fecha: string;
  referencia?: string;
  totalItems: number;
}

const estadoEstilo: Record<string, { bg: string; color: string }> = {
  BORRADOR:   { bg: '#fef9c3', color: '#854d0e' },
  CONFIRMADO: { bg: '#dcfce7', color: '#166534' },
  ANULADO:    { bg: '#fee2e2', color: '#991b1b' },
};

const tipoEstilo: Record<string, { bg: string; color: string }> = {
  ENTRADA: { bg: '#dbeafe', color: '#1e40af' },
  SALIDA:  { bg: '#fce7f3', color: '#9d174d' },
};

export default function Documentos() {
  const { empresa } = useEmpresa();
  const navigate = useNavigate();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresa) return;
    getDocumentos(empresa.id)
      .then(setDocumentos)
      .finally(() => setLoading(false));
  }, [empresa]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, color: '#1e293b', fontSize: 28 }}>Documentos</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{empresa?.nombre}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate('/documentos/nuevo?tipo=ENTRADA')}
            style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}
          >
            📥 Nueva Entrada
          </button>
          <button
            onClick={() => navigate('/documentos/nuevo?tipo=SALIDA')}
            style={{ padding: '10px 20px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}
          >
            📤 Nueva Salida
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Cargando documentos...</p>
      ) : documentos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <p>No hay documentos. Crea una entrada o salida para comenzar.</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Tipo', 'Fecha', 'Referencia', 'Items', 'Estado', 'Acciones'].map(col => (
                  <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documentos.map((d, i) => {
                const eEstilo = estadoEstilo[d.estado] ?? { bg: '#f1f5f9', color: '#475569' };
                const tEstilo = tipoEstilo[d.tipo] ?? { bg: '#f1f5f9', color: '#475569' };
                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: tEstilo.bg, color: tEstilo.color }}>
                        {d.tipo}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748b' }}>
                      {new Date(d.fecha).toLocaleDateString('es-PE')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#1e293b' }}>{d.referencia || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748b' }}>{d.totalItems} ítem(s)</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: eEstilo.bg, color: eEstilo.color }}>
                        {d.estado}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => navigate(`/documentos/${d.id}`)}
                        style={{ padding: '6px 12px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#475569' }}
                      >
                        Ver detalle
                      </button>
                    </td>
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