import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmpresa } from '../../context/EmpresaContext';
import { getEmpresas } from '../../api/empresa.ts';

interface Empresa {
  id: string;
  nombre: string;
}

export default function SeleccionEmpresa() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const { setEmpresa } = useEmpresa();
  const navigate = useNavigate();

  useEffect(() => {
    getEmpresas()
      .then(setEmpresas)
      .finally(() => setLoading(false));
  }, []);

  const handleSeleccionar = (empresa: Empresa) => {
    localStorage.setItem('companyCen', empresa.id);
    setEmpresa(empresa);
    navigate('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 24, color: '#1e293b' }}>Sistema PDV</h1>
        <p style={{ margin: '0 0 32px', color: '#64748b', fontSize: 14 }}>Selecciona un restaurante para continuar</p>

        {loading ? (
          <p style={{ color: '#94a3b8', textAlign: 'center' }}>Cargando...</p>
        ) : empresas.length === 0 ? (
          <p style={{ color: '#ef4444', textAlign: 'center' }}>No hay empresas disponibles</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {empresas.map(empresa => (
              <button
                key={empresa.id}
                onClick={() => handleSeleccionar(empresa)}
                style={{
                  padding: '16px 20px', border: '2px solid #e2e8f0',
                  borderRadius: 10, background: 'white', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#3b82f6')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
              >
                <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{empresa.nombre}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
