import { useEffect, useState } from 'react';
import { useEmpresa } from '../../context/EmpresaContext';
import { getDashboard } from '../../api/dashboard';
import { getProductos } from '../../api/productos';

interface DashboardData {
  totalVendido: number;
  cantidadTickets: number;
  ticketPromedio: number;
  topProductos: { producto: string; totalVendido: number }[];
  agotados: { id: string; nombre: string }[];
  stockBajo: { id: string; nombre: string; cantidad: number; stockMinimo: number }[];
  comandas: { pendiente: number; enPreparacion: number; listo: number };
  ventasMensuales: { mesActual: number; mesAnterior: number };
}

export default function Dashboard() {
  const { empresa } = useEmpresa();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [productos, setProductos] = useState<any[]>([]);

  useEffect(() => {
    if (!empresa) return;
    setLoading(true);
    Promise.all([
      getDashboard(empresa.id),
      getProductos(empresa.id)
    ])
      .then(([dashboardData, prods]) => {
        setData(dashboardData);
        setProductos(prods);
      })
      .finally(() => setLoading(false));
  }, [empresa]);

  if (loading) return <p style={{ color: '#94a3b8' }}>Cargando...</p>;
  if (!data) return null;

  return (
    <div>
      <h1 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: 28 }}>Dashboard</h1>
      <p style={{ margin: '0 0 32px', color: '#64748b' }}>{empresa?.nombre}</p>

      {/* Métricas principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
        {[
          { label: 'Total vendido hoy', valor: `Bs. ${data.totalVendido.toFixed(2)}`, color: '#10b981', icono: '💰' },
          { label: 'Ventas mes actual', valor: `Bs. ${data.ventasMensuales.mesActual.toFixed(2)}`, color: '#3b82f6', icono: '📅' },
          { label: 'Ventas mes anterior', valor: `Bs. ${data.ventasMensuales.mesAnterior.toFixed(2)}`, color: '#6366f1', icono: '⏮️' },
        ].map(({ label, valor, color, icono }) => (
          <div key={label} style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${color}` }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>{icono}</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1e293b' }}>{valor}</div>
            <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Top productos */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#1e293b' }}>🏆 Más vendidos hoy</h2>
          {data.topProductos.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 14 }}>Sin ventas hoy</p>
          ) : (
            data.topProductos.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, color: '#1e293b' }}>{productos.find(prod => prod.id === p.producto)?.nombre ?? p.producto}</span>
                <span style={{ fontSize: 14, fontWeight: 'bold', color: '#3b82f6' }}>{p.totalVendido} uds</span>
              </div>
            ))
          )}
        </div>

        {/* Estado comandas */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#1e293b' }}>👨‍🍳 Estado cocina</h2>
          {[
            { label: 'Pendiente', valor: data.comandas.pendiente, color: '#f59e0b' },
            { label: 'En preparación', valor: data.comandas.enPreparacion, color: '#3b82f6' },
            { label: 'Listo', valor: data.comandas.listo, color: '#10b981' },
          ].map(({ label, valor, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 14, color: '#1e293b' }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 'bold', color }}>{valor}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Agotados */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#1e293b' }}>🚫 Productos agotados</h2>
          {data.agotados.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 14 }}>Ninguno</p>
          ) : (
            data.agotados.map(p => (
              <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#ef4444' }}>
                {productos.find(prod => prod.id === p.id)?.nombre ?? p.nombre}
              </div>
            ))
          )}
        </div>

        {/* Stock bajo */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#1e293b' }}>⚠️ Stock bajo</h2>
          {data.stockBajo.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 14 }}>Ninguno</p>
          ) : (
            data.stockBajo.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, color: '#1e293b' }}>{productos.find(prod => prod.id === p.id)?.nombre ?? p.nombre}</span>
                <span style={{ fontSize: 14, color: '#f59e0b' }}>{p.cantidad} / {p.stockMinimo}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}