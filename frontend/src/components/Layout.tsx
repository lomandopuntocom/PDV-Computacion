import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useEmpresa } from '../context/EmpresaContext';

export default function Layout() {
  const { empresa, setEmpresa } = useEmpresa();
  const navigate = useNavigate();

  const handleCambiarEmpresa = () => {
    setEmpresa(null);
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#1e293b', color: 'white', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>EMPRESA ACTIVA</div>
          <div style={{ fontWeight: 'bold', fontSize: 14 }}>{empresa?.nombre}</div>
        </div>

        {[
          { to: '/dashboard', label: '📊 Dashboard' },
          { to: '/productos', label: '📦 Productos' },
          { to: '/stock', label: '🏪 Stock' },
          { to: '/documentos', label: '📋 Documentos' },
        ].map(({ to, label }) => (
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

      {/* Contenido */}
      <main style={{ flex: 1, padding: 32, background: '#f8fafc' }}>
        <Outlet />
      </main>
    </div>
  );
}