import { useEffect, useState } from 'react';
import { useEmpresa } from '../context/EmpresaContext';
import { getResumen } from '../api/stock';

interface Resumen {
  totalProductos: number;
  totalStock: number;
  alertasStockBajo: number;
}

export default function Dashboard() {
  const { empresa } = useEmpresa();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresa) return;
    getResumen(empresa.id)
      .then(setResumen)
      .finally(() => setLoading(false));
  }, [empresa]);

  if (loading) return <p style={{ color: '#94a3b8' }}>Cargando...</p>;

  return (
    <div>
      <h1 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: 28 }}>Dashboard</h1>
      <p style={{ margin: '0 0 32px', color: '#64748b' }}>{empresa?.nombre}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        <TarjetaMetrica
          titulo="Total Productos"
          valor={resumen?.totalProductos ?? 0}
          color="#3b82f6"
          icono="📦"
        />
        <TarjetaMetrica
          titulo="Total Stock"
          valor={resumen?.totalStock ?? 0}
          color="#10b981"
          icono="🏪"
        />
        <TarjetaMetrica
          titulo="Alertas Stock Bajo"
          valor={resumen?.alertasStockBajo ?? 0}
          color="#ef4444"
          icono="⚠️"
        />
      </div>
    </div>
  );
}

function TarjetaMetrica({ titulo, valor, color, icono }: {
  titulo: string;
  valor: number;
  color: string;
  icono: string;
}) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>{icono}</div>
      <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1e293b' }}>{valor}</div>
      <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{titulo}</div>
    </div>
  );
}