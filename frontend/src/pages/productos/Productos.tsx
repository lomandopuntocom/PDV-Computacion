import { useEffect, useState, useRef } from 'react';
import { useEmpresa } from '../../context/EmpresaContext';
import { getProductos, importarProductos } from '../../api/productos';

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  categoria?: string;
  unidad?: string;
  stockMinimo: number;
  activo: boolean;
}

export default function Productos() {
  const { empresa } = useEmpresa();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [importando, setImportando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cargar = () => {
    if (!empresa) return;
    setLoading(true);
    getProductos(empresa.id)
      .then(setProductos)
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, [empresa]);

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo || !empresa) return;

    setImportando(true);
    setMensaje(null);
    try {
      const resultado = await importarProductos(empresa.id, archivo);
      setMensaje({ texto: `✅ ${resultado.importados} productos importados. ${resultado.omitidos} omitidos.`, tipo: 'ok' });
      cargar();
    } catch {
      setMensaje({ texto: '❌ Error al importar el archivo', tipo: 'error' });
    } finally {
      setImportando(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, color: '#1e293b', fontSize: 28 }}>Productos</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{empresa?.nombre}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            style={{ display: 'none' }}
            onChange={handleImportar}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importando}
            style={{
              padding: '10px 20px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 'bold'
            }}
          >
            {importando ? 'Importando...' : '📥 Importar Excel'}
          </button>
        </div>
      </div>

      {mensaje && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 20,
          background: mensaje.tipo === 'ok' ? '#dcfce7' : '#fee2e2',
          color: mensaje.tipo === 'ok' ? '#166534' : '#991b1b',
          fontSize: 14
        }}>
          {mensaje.texto}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Cargando productos...</p>
      ) : productos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <p>No hay productos. Importa un Excel para comenzar.</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Código', 'Nombre', 'Categoría', 'Unidad', 'Stock Mínimo', 'Estado'].map(col => (
                  <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productos.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontFamily: 'monospace', color: '#3b82f6' }}>{p.codigo}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{p.nombre}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748b' }}>{p.categoria || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748b' }}>{p.unidad || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748b' }}>{p.stockMinimo}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      background: p.activo ? '#dcfce7' : '#fee2e2',
                      color: p.activo ? '#166534' : '#991b1b'
                    }}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}