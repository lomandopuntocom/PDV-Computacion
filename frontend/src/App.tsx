import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EmpresaProvider } from './context/EmpresaContext';
import SeleccionEmpresa from './pages/empresas/SeleccionEmpresa.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Productos from './pages/productos/Productos.tsx';
import StockPage from './pages/stock/StockPage.tsx';
import Kardex from './pages/movimientos/Kardex.tsx';
import Documentos from './pages/documentos/Documentos.tsx';
import DetalleDocumento from './pages/documentos/DetalleDocumento.tsx';
import CrearDocumento from './pages/documentos/CrearDocumentos.tsx';
import Layout from './components/Layout.tsx';

function App() {
  return (
    <EmpresaProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SeleccionEmpresa />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/kardex/:productoId" element={<Kardex />} />
            <Route path="/documentos" element={<Documentos />} />
            <Route path="/documentos/nuevo" element={<CrearDocumento />} />
            <Route path="/documentos/:id" element={<DetalleDocumento />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </EmpresaProvider>
  );
}

export default App;