import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmpresa } from '../../context/EmpresaContext';
import { getTickets, crearTicket, cancelarTicket } from '../../api/tickets';

interface Ticket {
  id: string; numero: number; estado: string;
  createdAt: string; totalItems: number;
}

const estadoColor: Record<string, { bg: string; color: string }> = {
  ABIERTO:   { bg: '#dbeafe', color: '#1e40af' },
  PAGADO:    { bg: '#dcfce7', color: '#166534' },
  CANCELADO: { bg: '#fee2e2', color: '#991b1b' },
};

export default function PDV() {
  const { empresa } = useEmpresa();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);

  const cargar = () => {
    if (!empresa) return;
    setLoading(true);
    getTickets(empresa.id)
      .then(setTickets)
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [empresa]);

  const handleNuevoTicket = async () => {
    if (!empresa) return;
    setCreando(true);
    try {
      const ticket = await crearTicket(empresa.id);
      navigate(`/pdv/${ticket.id}`);
    } finally {
      setCreando(false);
    }
  };

  const handleCancelar = async (id: string) => {
    if (!confirm('¿Cancelar este ticket?')) return;
    await cancelarTicket(id);
    cargar();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, color: '#1e293b', fontSize: 28 }}>Punto de Venta</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{empresa?.nombre}</p>
        </div>
        <button onClick={handleNuevoTicket} disabled={creando} style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 'bold' }}>
          {creando ? 'Creando...' : '+ Nueva Cuenta'}
        </button>
      </div>

      {loading ? <p style={{ color: '#94a3b8' }}>Cargando...</p> : tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🧾</div>
          <p>No hay tickets. Crea una nueva cuenta para comenzar.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {tickets.map(t => {
            const estilo = estadoColor[t.estado] ?? { bg: '#f1f5f9', color: '#475569' };
            return (
              <div key={t.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: t.estado === 'ABIERTO' ? '2px solid #3b82f6' : '2px solid transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 20, fontWeight: 'bold', color: '#1e293b' }}>#{t.numero}</span>
                  <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: estilo.bg, color: estilo.color }}>{t.estado}</span>
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{t.totalItems} ítem(s)</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
                  {new Date(t.createdAt).toLocaleString('es-PE')}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => navigate(`/pdv/${t.id}`)} style={{ flex: 1, padding: '8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                    {t.estado === 'ABIERTO' ? '👁️ Abrir' : '👁️ Ver'}
                  </button>
                  {t.estado === 'ABIERTO' && (
                    <button onClick={() => handleCancelar(t.id)} style={{ padding: '8px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
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