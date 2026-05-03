# 🚀 Backend BNCC Planner - Sistema de Tokens

Backend para gerenciar pagamentos e tokens do sistema BNCC Planner usando Mercado Pago.

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
- Access Token do Mercado Pago

## 🔧 Configuração Inicial

### 1. Instale as dependências

```bash
cd backend
npm install
```

### 2. Configure as variáveis de ambiente

Copie o arquivo de exemplo e edite com suas credenciais:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
# Obtenha em: https://www.mercadopago.com.br/developers/panel/app
MP_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxx

# URL pública do seu backend (necessário para webhooks)
# Em desenvolvimento, use ngrok ou similar
BACKEND_URL=https://seu-backend.railway.app

PORT=3000
```

### 3. Obtenha seu Access Token no Mercado Pago

1. Acesse [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
2. Faça login com sua conta
3. Vá em "Painel" → "Suas integrações"
4. Clique em "Criar aplicação"
5. Dê um nome (ex: "BNCC Planner")
6. Em "Credenciais de produção", copie o **Access Token**

## ▶️ Como Rodar

### Desenvolvimento (com auto-reload)

```bash
npm run dev
```

### Produção

```bash
npm start
```

O servidor iniciará na porta `3000` (ou a porta configurada no `.env`).

## 🌐 Endpoints da API

### Health Check
```
GET /api/health
```

### Criar Preferência de Pagamento
```
POST /api/mp/criar-preferencia
Content-Type: application/json

{
  "titulo": "10 Planos — Planejador BNCC",
  "valor_centavos": 990,
  "ref_externa": "BNCC_123_1234567890_abc123",
  "qtd_tokens": 10,
  "professor_id": "123",
  "professor_email": "professor@email.com"
}
```

**Resposta:**
```json
{
  "init_point": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...",
  "id": "123456789",
  "ref_externa": "BNCC_123_1234567890_abc123"
}
```

### Verificar Status do Pagamento
```
GET /api/mp/verificar/:ref
```

**Resposta (aprovado):**
```json
{
  "aprovado": true,
  "qtd_tokens": 10,
  "status": "aprovado"
}
```

**Resposta (pendente):**
```json
{
  "aprovado": false,
  "status": "pendente",
  "aguardando": true
}
```

### Webhook do Mercado Pago
```
POST /api/mp/webhook
```

O Mercado Pago notifica esta endpoint quando o status de um pagamento muda.

## 🎯 Como Funciona o Fluxo

1. **Frontend** chama `POST /api/mp/criar-preferencia`
2. **Backend** cria uma preferência no Mercado Pago
3. **Backend** retorna a URL de checkout (`init_point`)
4. **Frontend** redireciona o usuário para o Mercado Pago
5. Usuário **paga no Mercado Pago**
6. **Mercado Pago** notifica o webhook `/api/mp/webhook`
7. **Backend** atualiza o status da transação
8. **Frontend** faz polling em `/api/mp/verificar/:ref` até receber confirmação
9. **Frontend** libera os tokens para o usuário

## ☁️ Deploy em Produção

### Opção 1: Railway (Recomendado)

1. Crie uma conta em [railway.app](https://railway.app)
2. Conecte seu repositório GitHub
3. Adicione as variáveis de ambiente no painel do Railway:
   - `MP_ACCESS_TOKEN`
   - `BACKEND_URL` (o Railway gera automaticamente)
4. Deploy automático!

### Opção 2: Render

1. Crie uma conta em [render.com](https://render.com)
2. Crie um novo "Web Service"
3. Conecte seu repositório
4. Configure as variáveis de ambiente
5. Deploy!

### Opção 3: Heroku

```bash
heroku create bncc-planner-backend
heroku config:set MP_ACCESS_TOKEN=seu_token
heroku config:set BACKEND_URL=https://bncc-planner-backend.herokuapp.com
git push heroku main
```

## 🔒 Segurança

### Em Produção:

1. **Nunca exponha seu Access Token** no frontend
2. Use **HTTPS** obrigatoriamente
3. Configure **CORS** apenas para seu domínio
4. Adicione autenticação nas rotas admin
5. Use um **banco de dados real** (não memória)

### Para configurar CORS restrito:

No `server.js`, altere:

```javascript
app.use(cors({
  origin: 'https://seu-dominio.com', // Domínio do seu frontend
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## 📊 Monitoramento

### Listar Transações
```
GET /api/admin/transacoes
```

### Limpar Transações Antigas (>24h)
```
DELETE /api/admin/limpar-transacoes
```

## 🛠️ Troubleshooting

### Erro: "Access token inválido"
- Verifique se copiou o token correto do painel do Mercado Pago
- Certifique-se de que não há espaços em branco no `.env`

### Webhook não funciona
- O webhook precisa de uma URL pública (use ngrok para testes locais)
- No Mercado Pago, configure a URL em: Painel → Notificações

### CORS error no frontend
- Verifique se a URL do backend está correta no frontend
- Configure o CORS no `server.js` para aceitar seu domínio

## 📦 Estrutura do Projeto

```
backend/
├── server.js          # Servidor principal
├── package.json       # Dependências
├── .env.example       # Modelo de configuração
├── .env               # Configuração real (não commitar!)
└── README.md          # Esta documentação
```

## 💡 Próximos Passos

1. **Banco de Dados**: Implemente PostgreSQL/MongoDB para persistência
2. **Autenticação**: Adicione JWT para proteger rotas admin
3. **Logs**: Integre com serviços como Datadog ou LogRocket
4. **Testes**: Adicione testes automatizados
5. **PIX**: Implemente geração de QR Code PIX

## 📞 Suporte

Para dúvidas sobre a integração com Mercado Pago:
- [Documentação Oficial](https://www.mercadopago.com.br/developers/pt/reference)
- [Fórum de Desenvolvedores](https://developers.mercadolivre.com.br/pt_br/forum)

---

**⚠️ IMPORTANTE**: Este backend usa armazenamento em memória. Em produção, implemente um banco de dados para persistir as transações!
