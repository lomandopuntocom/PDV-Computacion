import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { EmpresaProvider } from './context/EmpresaContext';
import Layout from './components/Layout';
import SeleccionEmpresa from './pages/empresas/SeleccionEmpresa';
import Dashboard from './pages/dashboard/Dashboard';
import Catalogo from './pages/catalogo/Catalogo';
import StockPage from './pages/stock/StockPage';
import PDV from './pages/pdv/PDV';
import TicketDetalle from './pages/pdv/TicketDetalle';
import KDS from './pages/kds/KDS';
import Compras from './pages/compras/Compras';
import CompraDetalle from './pages/compras/CompraDetalle';

function App() {
  return (
    <EmpresaProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SeleccionEmpresa />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/pdv" element={<PDV />} />
            <Route path="/pdv/:id" element={<TicketDetalle />} />
            <Route path="/kds" element={<KDS />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/compras/:id" element={<CompraDetalle />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </EmpresaProvider>
  );
}

export default App;