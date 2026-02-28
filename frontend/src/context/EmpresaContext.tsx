import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface Empresa {
  id: string;
  nombre: string;
  ruc?: string;
}

interface EmpresaContextType {
  empresa: Empresa | null;
  setEmpresa: (empresa: Empresa | null) => void;
}

export const EmpresaContext = createContext<EmpresaContextType | null>(null);

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  return (
    <EmpresaContext.Provider value={{ empresa, setEmpresa }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const context = useContext(EmpresaContext);
  if (!context) throw new Error('useEmpresa debe usarse dentro de EmpresaProvider');
  return context;
}