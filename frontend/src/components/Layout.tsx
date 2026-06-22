import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEmpresa } from '../context/EmpresaContext';
import { useState, useEffect } from 'react';

export default function Layout() {
  const { empresa, setEmpresa } = useEmpresa();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<{ id: string; message: string }[]>([]);

  const handleCambiarEmpresa = () => {
    localStorage.removeItem('companyCen');
    setEmpresa(null);
    navigate('/');
  };

  useEffect(() => {
    const companyCen = localStorage.getItem('companyCen') || empresa?.id;
    if (!companyCen) return;

    let inventoryUrl = import.meta.env.VITE_INVENTORY_API_URL || 'http://localhost:5143';
    if (inventoryUrl.endsWith('/')) {
      inventoryUrl = inventoryUrl.slice(0, -1);
    }
    const sseUrl = inventoryUrl.endsWith('/api/inventory')
      ? `${inventoryUrl}/companies/${companyCen}/restock-events`
      : `${inventoryUrl}/api/inventory/companies/${companyCen}/restock-events`;
      
    const source = new EventSource(sseUrl);
    
    source.onmessage = (event) => {
      try {
        const restock = JSON.parse(event.data);
        const id = Math.random().toString(36).substring(2, 9);
        const msg = `📦 Restock: Se agregaron ${restock.quantity} unidades de "${restock.productName}" (Código: ${restock.productCode}) en la bodega. Nuevo Stock: ${restock.newStock}.`;
        
        setAlerts(prev => [...prev, { id, message: msg }]);
        
        // Auto-remove after 6 seconds
        setTimeout(() => {
          setAlerts(prev => prev.filter(a => a.id !== id));
        }, 6000);
      } catch (err) {
        console.error("Error parsing restock event", err);
      }
    };

    source.onerror = (err) => {
      console.error("SSE connection error, retrying...", err);
    };

    return () => source.close();
  }, []);

  const nav = [
    { to: '/dashboard', label: '📊 Dashboard' },
    { to: '/catalogo',  label: '📦 Catálogo' },
    { to: '/stock',     label: '🏪 Stock' },
    { to: '/compras',   label: '📥 Compras' },
    { to: '/pdv',       label: '🧾 PDV' },
    { to: '/kds',       label: '👨‍🍳 Cocina / Bar' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />

      {/* Container for floating notifications */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 350 }}>
        {alerts.map(alert => (
          <div
            key={alert.id}
            style={{
              padding: '16px',
              background: '#0f172a',
              color: 'white',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
              borderLeft: '4px solid #3b82f6',
              fontSize: '13px',
              lineHeight: '1.4',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '12px',
              animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            <span>{alert.message}</span>
            <button
              onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, fontSize: '16px', fontWeight: 'bold', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <aside style={{ width: 220, background: '#1e293b', color: 'white', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>RESTAURANTE</div>
          <div style={{ fontWeight: 'bold', fontSize: 14 }}>{empresa?.nombre}</div>
        </div>

        {nav.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'block',
              padding: '10px 12px',
              borderRadius: 8,
              color: 'white',
              textDecoration: 'none',
              background: isActive ? '#3b82f6' : 'transparent',
              fontSize: 14,
            })}
          >
            {label}
          </NavLink>
        ))}

        <button
          onClick={handleCambiarEmpresa}
          style={{ marginTop: 'auto', padding: '10px 12px', background: '#334155', border: 'none', color: 'white', borderRadius: 8, cursor: 'pointer', fontSize: 14, textAlign: 'left' }}
        >
          🔄 Cambiar empresa
        </button>
      </aside>

      <main style={{ flex: 1, padding: 32, background: '#f8fafc' }}>
        <Outlet />
      </main>
    </div>
  );
}
