import { useEffect, useState, useCallback } from 'react';
import { useEmpresa } from '../../context/EmpresaContext';
import { getEstaciones } from '../../api/estaciones';
import { getKds, cambiarEstado } from '../../api/comandas';

interface Estacion { id: string; nombre: string; }
interface ComandaItem { id: string; producto: string; cantidad: number; nota?: string; estado: string; }
interface Comanda { id: string; ticketId: string; fechaEnvio: string; items: ComandaItem[]; }

const estadoSig: Record<string, string> = {
  PENDIENTE: 'EN_PREPARACION',
  EN_PREPARACION: 'LISTO',
};

const estadoColor: Record<string, { bg: string; color: string; label: string }> = {
  PENDIENTE:       { bg: '#fef9c3', color: '#854d0e', label: '⏳ Pendiente' },
  EN_PREPARACION:  { bg: '#dbeafe', color: '#1e40af', label: '🔥 En preparación' },
  LISTO:           { bg: '#dcfce7', color: '#166534', label: '✅ Listo' },
};

export default function KDS() {
  const { empresa } = useEmpresa();
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [estacionActiva, setEstacionActiva] = useState<string>('');
  const [comandas, setComanadas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!empresa) return;
    getEstaciones(empresa.id).then(ests => {
      setEstaciones(ests);
      if (ests.length > 0) setEstacionActiva(ests[0].id);
    });
  }, [empresa]);

  const cargar = useCallback(() => {
    if (!estacionActiva) return;
    setLoading(true);
    getKds(estacionActiva)
      .then(setComanadas)
      .finally(() => setLoading(false));
  }, [estacionActiva]);

  useEffect(() => { cargar(); }, [cargar]);

  // Auto-refresh cada 15 segundos
  useEffect(() => {
    const interval = setInterval(cargar, 15000);
    return () => clearInterval(interval);
  }, [cargar]);

  const handleCambiarEstado = async (itemId: string, estadoActual: string) => {
    const siguiente = estadoSig[estadoActual];
    if (!siguiente) return;
    await cambiarEstado(itemId, siguiente);
    cargar();
  };

  const estacionNombre = estaciones.find(e => e.id === estacionActiva)?.nombre ?? '';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, color: '#1e293b', fontSize: 28 }}>Pantalla de Cocina (KDS)</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{estacionNombre}</p>
        </div>
        <button onClick={cargar} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
          🔄 Actualizar
        </button>
      </div>

      {/* Selector de estación */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {estaciones.map(e => (
          <button key={e.id} onClick={() => setEstacionActiva(e.id)} style={{
            padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 'bold',
            background: estacionActiva === e.id ? '#1e293b' : '#f1f5f9',
            color: estacionActiva === e.id ? 'white' : '#475569',
          }}>
            {e.nombre === 'COCINA' ? '👨‍🍳' : '🍹'} {e.nombre}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: '#94a3b8' }}>Cargando...</p> :
        comandas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p>No hay comandas pendientes para esta estación.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {comandas.map(comanda => (
              <div key={comanda.id} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ background: '#1e293b', padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
                    Ticket #{comanda.ticketId.slice(-4).toUpperCase()}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>
                    {new Date(comanda.fechaEnvio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ padding: 16 }}>
                  {comanda.items.map(item => {
                    const estilo = estadoColor[item.estado] ?? estadoColor.PENDIENTE;
                    const siguiente = estadoSig[item.estado];
                    return (
                      <div key={item.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                          <div>
                            <span style={{ fontSize: 15, fontWeight: 'bold', color: '#1e293b' }}>{item.cantidad}x </span>
                            <span style={{ fontSize: 15, color: '#1e293b' }}>{item.producto}</span>
                            {item.nota && <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 2 }}>📝 {item.nota}</div>}
                          </div>
                          <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: estilo.bg, color: estilo.color, whiteSpace: 'nowrap' }}>
                            {estilo.label}
                          </span>
                        </div>
                        {siguiente && (
                          <button onClick={() => handleCambiarEstado(item.id, item.estado)} style={{
                            width: '100%', padding: '8px', marginTop: 4,
                            background: siguiente === 'EN_PREPARACION' ? '#fef9c3' : '#dcfce7',
                            color: siguiente === 'EN_PREPARACION' ? '#854d0e' : '#166534',
                            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 'bold'
                          }}>
                            {siguiente === 'EN_PREPARACION' ? '🔥 Iniciar preparación' : '✅ Marcar como listo'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}