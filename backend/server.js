require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN 
});

// Middleware
app.use(cors());
app.use(express.json());

// --- BANCO DE DADOS SIMULADO (Em memória) ---
// Em produção real, use um banco como PostgreSQL ou MongoDB
const users = {}; // { "email": { tokens: 10, history: [] } }
const transactions = [];

// --- ENDPOINTS DE AUTENTICAÇÃO ---

// Login Simples (Cria ou recupera usuário)
app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email é obrigatório' });
  }

  if (!users[email]) {
    // Cria novo usuário com 0 tokens (ou 1 token de boas-vindas se quiser)
    users[email] = {
      email,
      tokens: 0, 
      createdAt: new Date(),
      history: []
    };
    console.log(`Novo usuário criado: ${email}`);
  }

  // Retorna um "token de sessão" simples (apenas o email codificado para demo)
  const sessionToken = Buffer.from(email).toString('base64');
  
  res.json({
    success: true,
    token: sessionToken,
    user: {
      email: users[email].email,
      tokens: users[email].tokens
    }
  });
});

// Buscar dados do usuário
app.get('/api/auth/user/:emailBase64', (req, res) => {
  try {
    const email = Buffer.from(req.params.emailBase64, 'base64').toString('utf-8');
    
    if (!users[email]) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      success: true,
      user: {
        email: users[email].email,
        tokens: users[email].tokens,
        history: users[email].history
      }
    });
  } catch (e) {
    res.status(400).json({ error: 'Token inválido' });
  }
});

// --- ENDPOINTS DE PAGAMENTO ---

// Criar preferência de pagamento
app.post('/api/mp/criar-preferencia', async (req, res) => {
  const { title, quantity, price, userEmail } = req.body;

  if (!userEmail) {
    return res.status(400).json({ error: 'User email is required for payment' });
  }

  try {
    const preference = new Preference(client);
    
    const result = await preference.create({
      body: {
        items: [
          {
            title: title || 'Pacote de Tokens BNCC',
            quantity: Number(quantity),
            unit_price: Number(price),
            currency_id: 'BRL',
          },
        ],
        external_reference: userEmail, // Usamos o email como referência para saber quem pagou
        metadata: {
          user_email: userEmail,
          quantity: quantity,
          type: 'tokens'
        },
        back_urls: {
          success: `${process.env.BACKEND_URL || 'http://localhost:3000'}/success`,
          failure: `${process.env.BACKEND_URL || 'http://localhost:3000'}/failure`,
          pending: `${process.env.BACKEND_URL || 'http://localhost:3000'}/pending`,
        },
        auto_return: 'approved',
      },
    });

    // Salva transação pendente
    transactions.push({
      id: result.id,
      userEmail,
      status: 'pending',
      amount: price * quantity,
      date: new Date()
    });

    res.json({ 
      id: result.id, 
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point
    });

  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    res.status(500).json({ error: 'Erro ao iniciar pagamento', details: error.message });
  }
});

// Verificar status do pagamento (Polling)
app.get('/api/mp/verificar/:preferenceId', async (req, res) => {
  const { preferenceId } = req.params;

  try {
    const preference = new Preference(client);
    const result = await preference.get({ id: preferenceId });
    
    // Busca transação local
    const transaction = transactions.find(t => t.id === preferenceId);
    
    // Se aprovado e ainda não liberado
    if (result.status === 'approved' && (!transaction || transaction.status !== 'released')) {
      const email = result.external_reference;
      const qty = result.metadata?.quantity || 1;

      if (users[email]) {
        users[email].tokens += parseInt(qty);
        users[email].history.push({
          type: 'compra',
          amount: qty,
          date: new Date(),
          id: preferenceId
        });
        
        if (transaction) transaction.status = 'released';
        
        console.log(`✅ Tokens liberados para ${email}: +${qty}`);
      }
    }

    res.json({
      status: result.status,
      tokens: result.external_reference ? users[result.external_reference]?.tokens : 0
    });

  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

// Webhook (Notificação automática)
app.post('/api/mp/webhook', async (req, res) => {
  const { action, data } = req.body;

  if (action === 'payment.created' || action === 'payment.updated') {
    // Lógica similar à de verificação, mas disparada pelo MP
    console.log('Webhook recebido:', data.id);
    // Em produção, consulte a API de Payments (não Preference) aqui para detalhes finais
  }

  res.status(200).send('OK');
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'bncc-planner-backend',
    users_count: Object.keys(users).length
  });
});

app.listen(PORT, () => {
  console.log(`╔════════════════════════════════════════════════════╗`);
  console.log(`║  🚀 Backend BNCC Planner iniciado!                ║`);
  console.log(`║  Porta: ${PORT}                                    ║`);
  console.log(`║  Ambiente: ${process.env.NODE_ENV || 'development'}                       ║`);
  console.log(`╠════════════════════════════════════════════════════╣`);
  console.log(`║  Endpoints principais:                            ║`);
  console.log(`║  POST /api/auth/login                             ║`);
  console.log(`║  POST /api/mp/criar-preferencia                   ║`);
  console.log(`║  GET  /api/mp/verificar/:ref                      ║`);
  console.log(`╚════════════════════════════════════════════════════╝`);
});
