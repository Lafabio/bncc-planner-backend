/**
 * Backend para Sistema de Tokens - BNCC Planner
 * 
 * Este servidor gerencia:
 * 1. Criação de preferências de pagamento no Mercado Pago
 * 2. Verificação do status dos pagamentos
 * 3. Webhook para notificações automáticas
 * 4. API para gerenciamento de tokens
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

// Middleware
app.use(cors({
  origin: '*', // Em produção, especifique o domínio do seu frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ===== ARMAZENAMENTO EM MEMÓRIA (em produção, use um banco de dados) =====
// Estrutura: { [ref_externa]: { professor_id, qtd_tokens, status, created_at } }
const transacoes = new Map();

// ===== ROTAS DA API =====

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'bncc-planner-backend'
  });
});

/**
 * POST /api/mp/criar-preferencia
 * Cria uma preferência de pagamento no Mercado Pago
 */
app.post('/api/mp/criar-preferencia', async (req, res) => {
  try {
    const { 
      titulo, 
      valor_centavos, 
      ref_externa, 
      qtd_tokens, 
      professor_id, 
      professor_email 
    } = req.body;

    // Validações básicas
    if (!titulo || !valor_centavos || !ref_externa || !qtd_tokens || !professor_id) {
      return res.status(400).json({ erro: 'Parâmetros obrigatórios faltando' });
    }

    if (valor_centavos < 100) {
      return res.status(400).json({ erro: 'Valor mínimo é R$ 1,00' });
    }

    // Armazena a transação como pendente
    transacoes.set(ref_externa, {
      professor_id,
      professor_email,
      qtd_tokens,
      valor_centavos,
      status: 'pendente',
      created_at: new Date().toISOString(),
      payment_id: null
    });

    // Cria a preferência no Mercado Pago
    const preference = new Preference(client);
    
    const preferenceData = {
      body: {
        items: [
          {
            title: titulo,
            quantity: 1,
            unit_price: valor_centavos / 100, // Mercado Pago usa valor em reais
            currency_id: 'BRL'
          }
        ],
        external_reference: ref_externa,
        notification_url: `${process.env.BACKEND_URL || 'http://localhost:' + PORT}/api/mp/webhook`,
        metadata: {
          professor_id,
          qtd_tokens: String(qtd_tokens)
        },
        back_urls: {
          success: `${process.env.BACKEND_URL || 'http://localhost:' + PORT}/api/mp/sucesso`,
          failure: `${process.env.BACKEND_URL || 'http://localhost:' + PORT}/api/mp/falha`,
          pending: `${process.env.BACKEND_URL || 'http://localhost:' + PORT}/api/mp/pendente`
        },
        auto_return: 'approved' // Retorna automaticamente após aprovação
      }
    };

    const result = await preference.create(preferenceData);

    // Retorna a URL de checkout para o frontend
    res.json({
      init_point: result.init_point,
      id: result.id,
      ref_externa
    });

  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    res.status(500).json({ 
      erro: 'Erro ao criar preferência de pagamento',
      detalhes: error.message 
    });
  }
});

/**
 * GET /api/mp/verificar/:ref
 * Verifica o status de uma transação específica
 */
app.get('/api/mp/verificar/:ref', async (req, res) => {
  try {
    const { ref } = req.params;
    
    const transacao = transacoes.get(ref);
    
    if (!transacao) {
      return res.status(404).json({ erro: 'Transação não encontrada' });
    }

    // Se já estiver aprovado, retorna imediatamente
    if (transacao.status === 'aprovado') {
      return res.json({ 
        aprovado: true, 
        qtd_tokens: transacao.qtd_tokens,
        status: transacao.status 
      });
    }

    // Consulta o status atualizado no Mercado Pago
    if (transacao.payment_id) {
      try {
        const mercadopago = require('mercadopago');
        const payment = await mercadopago.payment.get(transacao.payment_id);
        
        if (payment.status === 'approved') {
          // Atualiza a transação local
          transacao.status = 'aprovado';
          transacoes.set(ref, transacao);
          
          return res.json({ 
            aprovado: true, 
            qtd_tokens: transacao.qtd_tokens,
            status: 'aprovado'
          });
        }
      } catch (err) {
        console.error('Erro ao consultar pagamento:', err);
        // Continua e retorna status atual mesmo sem conseguir consultar MP
      }
    }

    // Retorna status atual (ainda pendente)
    res.json({ 
      aprovado: false, 
      status: transacao.status,
      aguardando: true
    });

  } catch (error) {
    console.error('Erro ao verificar transação:', error);
    res.status(500).json({ 
      erro: 'Erro ao verificar status do pagamento',
      detalhes: error.message 
    });
  }
});

/**
 * POST /api/mp/webhook
 * Recebe notificações do Mercado Pago sobre mudanças no status dos pagamentos
 */
app.post('/api/mp/webhook', async (req, res) => {
  try {
    const { action, data } = req.body;

    console.log('Webhook recebido:', { action, data });

    // Apenas processa notificações de pagamento
    if (action !== 'payment.created' && action !== 'payment.updated') {
      return res.status(200).send('OK');
    }

    const paymentId = data.id;
    
    // Consulta os detalhes do pagamento
    const mercadopago = require('mercadopago');
    const payment = await mercadopago.payment.get(paymentId);
    
    const externalRef = payment.external_reference;
    
    if (!externalRef || !transacoes.has(externalRef)) {
      console.log('Transação não encontrada ou sem referência:', externalRef);
      return res.status(200).send('OK');
    }

    const transacao = transacoes.get(externalRef);

    // Atualiza o status baseado na resposta do MP
    if (payment.status === 'approved') {
      transacao.status = 'aprovado';
      transacao.payment_id = paymentId;
      transacao.approved_at = new Date().toISOString();
      
      console.log(`✅ Pagamento aprovado! Ref: ${externalRef}, Tokens: ${transacao.qtd_tokens}`);
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      transacao.status = payment.status;
      console.log(`❌ Pagamento ${payment.status}. Ref: ${externalRef}`);
    }

    transacoes.set(externalRef, transacao);

    res.status(200).send('OK');

  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).send('Erro interno');
  }
});

/**
 * Rotas de callback (opcional - para redirecionamento após pagamento)
 */
app.get('/api/mp/sucesso', (req, res) => {
  const { collection_id, external_reference } = req.query;
  res.send(`
    <html>
      <head><title>Pagamento Aprovado!</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #27ae60;">✅ Pagamento Aprovado!</h1>
        <p>Seus tokens serão liberados em instantes.</p>
        <p>Referência: ${external_reference}</p>
        <script>
          setTimeout(() => window.close(), 3000);
        </script>
      </body>
    </html>
  `);
});

app.get('/api/mp/falha', (req, res) => {
  res.send(`
    <html>
      <head><title>Pagamento Não Aprovado</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #e74c3c;">❌ Pagamento Não Aprovado</h1>
        <p>Você pode tentar novamente.</p>
        <script>
          setTimeout(() => window.close(), 3000);
        </script>
      </body>
    </html>
  `);
});

app.get('/api/mp/pendente', (req, res) => {
  res.send(`
    <html>
      <head><title>Pagamento Pendente</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #f39c12;">⏳ Aguardando Pagamento</h1>
        <p>Assim que o pagamento for confirmado, seus tokens serão liberados.</p>
        <script>
          setTimeout(() => window.close(), 3000);
        </script>
      </body>
    </html>
  `);
});

/**
 * GET /api/admin/transacoes
 * Lista todas as transações (para administração)
 */
app.get('/api/admin/transacoes', (req, res) => {
  // Em produção, adicione autenticação aqui
  const lista = Array.from(transacoes.entries()).map(([ref, dados]) => ({
    ref,
    ...dados
  }));
  
  res.json({ transacoes: lista, total: lista.length });
});

/**
 * DELETE /api/admin/limpar-transacoes
 * Limpa transações antigas (para administração)
 */
app.delete('/api/admin/limpar-transacoes', (req, res) => {
  // Em produção, adicione autenticação aqui
  const agora = new Date();
  let removidas = 0;
  
  transacoes.forEach((dados, ref) => {
    const criacao = new Date(dados.created_at);
    const diffHoras = (agora - criacao) / (1000 * 60 * 60);
    
    // Remove transações com mais de 24 horas
    if (diffHoras > 24) {
      transacoes.delete(ref);
      removidas++;
    }
  });
  
  res.json({ removidas, mensagem: `${removidas} transações antigas removidas` });
});

// ===== INICIALIZAÇÃO =====

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║  🚀 Backend BNCC Planner iniciado!                ║
║  Porta: ${PORT}                                    ║
║  Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}                       ║
╠════════════════════════════════════════════════════╣
║  Endpoints principais:                            ║
║  POST /api/mp/criar-preferencia                   ║
║  GET  /api/mp/verificar/:ref                      ║
║  POST /api/mp/webhook                             ║
╠════════════════════════════════════════════════════╣
║  ⚠️  LEMBRE-SE:                                   ║
║  1. Configure MP_ACCESS_TOKEN no .env             ║
║  2. Configure BACKEND_URL com URL pública         ║
║  3. Em produção, use HTTPS                        ║
╚════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
