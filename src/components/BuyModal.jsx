import { useState } from 'react';
import { useTokens } from '../context/TokenContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function BuyModal() {
  const { setShowBuyModal, addTokens } = useTokens();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preferenceId, setPreferenceId] = useState(null);

  const plans = [
    { id: 1, tokens: 10, price: 9.90, label: 'Básico', popular: false },
    { id: 2, tokens: 30, price: 19.90, label: 'Popular ⭐', popular: true },
    { id: 3, tokens: 100, price: 49.90, label: 'Premium', popular: false },
  ];

  const handleBuy = async (plan) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/mp/criar-preferencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Pacote ${plan.tokens} Tokens - BNCC Planner`,
          quantity: 1,
          price: plan.price,
          reference_id: `tokens_${plan.id}_${Date.now()}`
        })
      });

      const data = await response.json();

      if (data.init_point) {
        // Abre checkout do Mercado Pago em nova aba
        window.open(data.init_point, '_blank');
        
        // Inicia polling para verificar pagamento
        startPolling(plan.tokens, data.reference_id);
      } else {
        alert('Erro ao criar pagamento. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro na compra:', error);
      alert('Erro de conexão. Verifique sua internet.');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (tokensAmount, referenceId) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_URL}/api/mp/verificar/${referenceId}`);
        const data = await response.json();

        if (data.status === 'approved') {
          clearInterval(interval);
          addTokens(tokensAmount);
          setShowBuyModal(false);
          alert(`✅ Pagamento aprovado! ${tokensAmount} tokens adicionados.`);
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
          clearInterval(interval);
          alert('❌ Pagamento não aprovado.');
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
      }
    }, 3000); // Verifica a cada 3 segundos
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Comprar Tokens</h2>
            <button
              onClick={() => setShowBuyModal(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => handleBuy(plan)}
                className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                  plan.popular
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                {plan.popular && (
                  <span className="inline-block bg-blue-500 text-white text-xs px-2 py-1 rounded-full mb-2">
                    Mais Popular
                  </span>
                )}
                <div className="text-3xl font-bold text-gray-800 mb-2">
                  {plan.tokens}
                </div>
                <div className="text-sm text-gray-600 mb-3">tokens</div>
                <div className="text-xl font-semibold text-blue-600 mb-3">
                  R$ {plan.price.toFixed(2).replace('.', ',')}
                </div>
                <button
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Processando...' : 'Comprar'}
                </button>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Como funciona:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Cada plano de aula gerado consome 1 token</li>
              <li>• Os tokens são vitalícios (não expiram)</li>
              <li>• Pagamento seguro via Mercado Pago</li>
              <li>• Liberação automática após confirmação</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
