import { createContext, useContext, useState, useEffect } from 'react';

const TokenContext = createContext();

export function TokenProvider({ children }) {
  const [tokens, setTokens] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);

  // Carrega tokens salvos ao iniciar
  useEffect(() => {
    const savedTokens = localStorage.getItem('bncc_tokens');
    if (savedTokens) {
      setTokens(parseInt(savedTokens, 10));
    }
    setLoading(false);
  }, []);

  // Salva tokens sempre que mudar
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('bncc_tokens', tokens.toString());
    }
  }, [tokens, loading]);

  // Função para gastar tokens
  const useTokens = (amount) => {
    if (tokens >= amount) {
      setTokens(prev => prev - amount);
      return true;
    }
    // Se não tiver tokens suficientes, abre modal de compra
    setShowBuyModal(true);
    return false;
  };

  // Função para adicionar tokens (após compra)
  const addTokens = (amount) => {
    setTokens(prev => prev + amount);
  };

  const value = {
    tokens,
    loading,
    useTokens,
    addTokens,
    showBuyModal,
    setShowBuyModal
  };

  return (
    <TokenContext.Provider value={value}>
      {children}
    </TokenContext.Provider>
  );
}

export function useTokens() {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error('useTokens must be used within a TokenProvider');
  }
  return context;
}
