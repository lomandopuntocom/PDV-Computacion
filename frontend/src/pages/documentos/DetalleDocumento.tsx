import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDocumento, confirmarDocumento } from '../../api/documentos';

interface Item {
  id: string;
  producto: string;
  codigo: string;
  almacen: string;
  cantidad: number;
}

interface Documento {
  id: string;
  tipo: string;
  estado: string;
  fecha: string;
  referencia?: string;
  observaciones?: string;
  items: Item[];
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

export default function DetalleDocumento() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Documento | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null);

  const cargar = () => {
    if (!id) return;
    setLoading(true);
    getDocumento(id)
      .then(setDoc)
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [id]);

  const handleConfirmar = async () => {
    if (!id) return;
    setConfirmando(true);
    setMensaje(null);
    try {
      await confirmarDocumento(id);
      setMensaje({ texto: '✅ Documento confirmado. El stock fue actualizado.', tipo: 'ok' });
      cargar();
    } catch (err: any) {
      const msg = err?.response?.data ?? 'Error al confirmar el documento';
      setMensaje({ texto: `❌ ${msg}`, tipo: 'error' });
    } finally {
      setConfirmando(false);
    }
  };

  if (loading) return <p style={{ color: '#94a3b8' }}>Cargando...</p>;
  if (!doc) return <p style={{ color: '#ef4444' }}>Documento no encontrado</p>;

  const eEstilo = estadoEstilo[doc.estado] ?? { bg: '#f1f5f9', color: '#475569' };
  const tEstilo = tipoEstilo[doc.tipo] ?? { bg: '#f1f5f9', color: '#475569' };

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/documentos')}
          style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
        >
          ← Volver
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, color: '#1e293b', fontSize: 28 }}>Detalle del Documento</h1>
        </div>
        {doc.estado === 'BORRADOR' && (
          <button
            onClick={handleConfirmar}
            disabled={confirmando}
            style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}
          >
            {confirmando ? 'Confirmando...' : '✅ Confirmar'}
          </button>
        )}
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

      {/* Info del documento */}
      <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>TIPO</div>
            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: tEstilo.bg, color: tEstilo.color }}>
              {doc.tipo}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>ESTADO</div>
            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: eEstilo.bg, color: eEstilo.color }}>
              {doc.estado}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>FECHA</div>
            <div style={{ fontSize: 14, color: '#1e293b' }}>{new Date(doc.fecha).toLocaleDateString('es-PE')}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>REFERENCIA</div>
            <div style={{ fontSize: 14, color: '#1e293b' }}>{doc.referencia || '—'}</div>
          </div>
        </div>
        {doc.observaciones && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>OBSERVACIONES</div>
            <div style={{ fontSize: 14, color: '#64748b' }}>{doc.observaciones}</div>
          </div>
        )}
      </div>

      {/* Items */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '2px solid #f1f5f9' }}>
          <h2 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>Productos ({doc.items.length})</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Código', 'Producto', 'Almacén', 'Cantidad'].map(col => (
                <th key={col} style={{ padding: '12px 24px', textAlign: 'left', fontSize: 13, color: '#64748b', fontWeight: 600 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {doc.items.map((item, i) => (
              <tr key={item.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '12px 24px', fontSize: 14, fontFamily: 'monospace', color: '#3b82f6' }}>{item.codigo}</td>
                <td style={{ padding: '12px 24px', fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{item.producto}</td>
                <td style={{ padding: '12px 24px', fontSize: 14, color: '#64748b' }}>{item.almacen}</td>
                <td style={{ padding: '12px 24px', fontSize: 14, fontWeight: 'bold', color: '#1e293b' }}>{item.cantidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}