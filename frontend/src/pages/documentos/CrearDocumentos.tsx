import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEmpresa } from '../../context/EmpresaContext';
import { crearDocumento } from '../../api/documentos';
import { getProductos } from '../../api/productos';
import { getAlmacenes } from '../../api/almacenes';

interface Producto { id: string; codigo: string; nombre: string; }
interface Almacen { id: string; nombre: string; }
interface Item { productoId: string; almacenId: string; cantidad: number; }

export default function CrearDocumento() {
  const { empresa } = useEmpresa();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tipo = searchParams.get('tipo') ?? 'ENTRADA';

  const [productos, setProductos] = useState<Producto[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [referencia, setReferencia] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<Item[]>([{ productoId: '', almacenId: '', cantidad: 1 }]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!empresa) return;
    Promise.all([getProductos(empresa.id), getAlmacenes(empresa.id)])
      .then(([p, a]) => { setProductos(p); setAlmacenes(a); });
  }, [empresa]);

  const agregarItem = () =>
    setItems(prev => [...prev, { productoId: '', almacenId: '', cantidad: 1 }]);

  const eliminarItem = (i: number) =>
    setItems(prev => prev.filter((_, idx) => idx !== i));

  const actualizarItem = (i: number, campo: keyof Item, valor: string | number) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [campo]: valor } : item));

  const handleGuardar = async () => {
    if (!empresa) return;
    if (items.some(it => !it.productoId || !it.almacenId || it.cantidad <= 0)) {
      setError('Completa todos los ítems correctamente');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await crearDocumento({ empresaId: empresa.id, tipo, referencia, observaciones, items });
      navigate('/documentos');
    } catch {
      setError('Error al guardar el documento');
    } finally {
      setGuardando(false);
    }
  };

  const colorTipo = tipo === 'ENTRADA' ? '#10b981' : '#f59e0b';

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/documentos')}
          style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
        >
          ← Volver
        </button>
        <div>
          <h1 style={{ margin: 0, color: '#1e293b', fontSize: 28 }}>
            {tipo === 'ENTRADA' ? '📥 Nueva Entrada' : '📤 Nueva Salida'}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Se guardará en estado BORRADOR</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 20, background: '#fee2e2', color: '#991b1b', fontSize: 14 }}>
          ❌ {error}
        </div>
      )}

      {/* Cabecera */}
      <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#1e293b' }}>Datos del documento</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Referencia (opcional)</label>
            <input
              type="text"
              placeholder="Ej: Factura-001, OC-2024..."
              value={referencia}
              onChange={e => setReferencia(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Observaciones (opcional)</label>
            <input
              type="text"
              placeholder="Notas adicionales..."
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>Productos</h2>
          <button
            onClick={agregarItem}
            style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#475569' }}
          >
            + Agregar producto
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px 40px', gap: 12, alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Producto</label>
                <select
                  value={item.productoId}
                  onChange={e => actualizarItem(i, 'productoId', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}
                >
                  <option value="">Selecciona...</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Almacén</label>
                <select
                  value={item.almacenId}
                  onChange={e => actualizarItem(i, 'almacenId', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}
                >
                  <option value="">Selecciona...</option>
                  {almacenes.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Cantidad</label>
                <input
                  type="number"
                  min={1}
                  value={item.cantidad}
                  onChange={e => actualizarItem(i, 'cantidad', Number(e.target.value))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <button
                onClick={() => eliminarItem(i)}
                disabled={items.length === 1}
                style={{ padding: '10px', background: '#fee2e2', border: 'none', borderRadius: 8, cursor: items.length === 1 ? 'not-allowed' : 'pointer', color: '#991b1b', fontSize: 16 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={() => navigate('/documentos')}
          style={{ padding: '12px 24px', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
        >
          Cancelar
        </button>
        <button
          onClick={handleGuardar}
          disabled={guardando}
          style={{ padding: '12px 24px', background: colorTipo, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}
        >
          {guardando ? 'Guardando...' : 'Guardar en borrador'}
        </button>
      </div>
    </div>
  );
}