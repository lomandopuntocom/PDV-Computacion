import { createContext, useContext, useState, useEffect } from 'react';
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

const STORAGE_KEY = 'empresa_sesion';

export const EmpresaContext = createContext<EmpresaContextType | null>(null);

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [empresa, setEmpresaState] = useState<Empresa | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar la empresa del localStorage al montar el componente
  useEffect(() => {
    const empresaGuardada = localStorage.getItem(STORAGE_KEY);
    if (empresaGuardada) {
      try {
        setEmpresaState(JSON.parse(empresaGuardada));
      } catch (error) {
        console.error('Error al cargar empresa del localStorage:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // Guardar la empresa en localStorage cuando cambia
  const setEmpresa = (nuevaEmpresa: Empresa | null) => {
    setEmpresaState(nuevaEmpresa);
    if (nuevaEmpresa) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevaEmpresa));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  if (isLoading) {
    return <div>Cargando...</div>;
  }

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