# 🎯 Guia Completo: Monetização do BNCC Planner

## ✅ O que já foi criado

Seu backend está pronto! Aqui está o resumo:

```
backend/
├── server.js          # API completa com Mercado Pago
├── package.json       # Dependências instaladas
├── .env.example       # Modelo de configuração
├── README.md          # Documentação detalhada
└── .gitignore         # Arquivos para ignorar no Git
```

---

## 🚀 Passo a Passo para Colocar no Ar

### PASSO 1: Obter Credenciais do Mercado Pago

1. Acesse https://www.mercadopago.com.br/developers
2. Faça login com sua conta
3. Vá em **Painel** → **Suas integrações**
4. Clique em **Criar aplicação**
5. Nome: "BNCC Planner"
6. Após criar, vá em **Credenciais de produção**
7. Copie o **Access Token** (começa com `APP_USR-`)

⏱️ Tempo: 5 minutos

---

### PASSO 2: Configurar Backend Localmente (Testes)

```bash
cd /workspace/backend

# Criar arquivo .env com suas credenciais
cp .env.example .env

# Edite o .env e coloque seu Access Token
nano .env
# ou use seu editor preferido
```

Conteúdo do `.env`:
```env
MP_ACCESS_TOKEN=APP_USR-SEU_TOKEN_AQUI
BACKEND_URL=http://localhost:3000
PORT=3000
```

Teste localmente:
```bash
npm start
```

Você verá:
```
╔════════════════════════════════════════════════════╗
║  🚀 Backend BNCC Planner iniciado!                ║
║  Porta: 3000                                      ║
...
```

⏱️ Tempo: 3 minutos

---

### PASSO 3: Deploy na Nuvem (Railway - Gratuito)

#### 3.1 Preparar repositório Git

```bash
cd /workspace
git add backend/
git commit -m "Adiciona backend de pagamentos"
git push
```

#### 3.2 Criar conta no Railway

1. Acesse https://railway.app
2. Faça login com GitHub
3. Clique em **New Project**
4. Escolha **Deploy from GitHub repo**
5. Selecione seu repositório

#### 3.3 Configurar Variáveis de Ambiente

No painel do Railway, em **Variables**, adicione:

| Variable | Value |
|----------|-------|
| `MP_ACCESS_TOKEN` | `APP_USR-...` (seu token) |
| `BACKEND_URL` | A URL que o Railway gerar (ex: `https://bncc-backend-production.up.railway.app`) |
| `NODE_ENV` | `production` |

#### 3.4 Aguardar Deploy

O Railway fará o deploy automaticamente. Quando terminar, você terá uma URL pública como:
```
https://bncc-backend-production.up.railway.app
```

⏱️ Tempo: 10 minutos

---

### PASSO 4: Configurar Webhook no Mercado Pago

1. Volte ao [Painel do Mercado Pago](https://www.mercadopago.com.br/developers/panel/app)
2. Selecione sua aplicação "BNCC Planner"
3. Vá em **Notificações**
4. Em **URLs de notificação**, adicione:
   ```
   https://SEU-BACKEND.railway.app/api/mp/webhook
   ```
5. Clique em **Salvar**

⏱️ Tempo: 2 minutos

---

### PASSO 5: Configurar Frontend

No seu `index.html`, o painel admin já está configurado. Siga estes passos:

1. Abra seu aplicativo no navegador
2. Faça login como administrador
3. Vá até o **Painel Admin** (ícone de engrenagem)
4. Em **Configuração do Mercado Pago**, cole a URL do backend:
   ```
   https://SEU-BACKEND.railway.app
   ```
5. Clique em **Salvar**
6. Teste a conexão

⏱️ Tempo: 2 minutos

---

## 💰 Planos Sugeridos

Baseado no seu código atual:

| Plano | Tokens | Preço | Valor por Token |
|-------|--------|-------|-----------------|
| Básico | 10 | R$ 9,90 | R$ 0,99 |
| Popular ⭐ | 30 | R$ 19,90 | R$ 0,66 |
| Premium | 100 | R$ 49,90 | R$ 0,50 |

**Dica**: O plano de 30 tokens tem o melhor custo-benefício e deve ser o mais vendido!

---

## 🔧 Como Funciona o Sistema de Tokens

### No Frontend (`index.html`):

1. Usuário clica em "Gerar Planejamento" → consome 1 token
2. Se tokens = 0 → modal de compra aparece
3. Usuário escolhe plano → redirect para Mercado Pago
4. Após pagamento → polling verifica status
5. Aprovado → tokens liberados automaticamente

### No Backend (`server.js`):

1. `/api/mp/criar-preferencia` → Cria checkout no MP
2. `/api/mp/verificar/:ref` → Frontend consulta status
3. `/api/mp/webhook` → MP notifica mudança de status

---

## 📊 Monitorando Vendas

### Opção 1: Painel do Mercado Pago
- Acesse https://www.mercadopago.com.br/developers/panel
- Veja todos os pagamentos em tempo real

### Opção 2: API Admin do Backend
```bash
curl https://SEU-BACKEND.railway.app/api/admin/transacoes
```

Resposta:
```json
{
  "transacoes": [
    {
      "ref": "BNCC_123_1234567890_abc",
      "professor_id": "123",
      "qtd_tokens": 30,
      "valor_centavos": 1990,
      "status": "aprovado",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

## 🛡️ Segurança e Boas Práticas

### ✅ Já implementado:
- Access Token nunca exposto no frontend
- CORS configurado
- Validação de parâmetros
- HTTPS obrigatório em produção

### ⚠️ Melhorias futuras:
- [ ] Banco de dados real (PostgreSQL/MongoDB)
- [ ] Autenticação JWT nas rotas admin
- [ ] Rate limiting para evitar abusos
- [ ] Logs em serviço externo (Datadog, Sentry)

---

## 🆘 Troubleshooting Comum

### Problema: "Backend não configurado"
**Solução**: Configure a URL no painel admin do frontend

### Problema: Pagamento não libera tokens
**Solução**: 
1. Verifique se o webhook está configurado no MP
2. Teste a URL do webhook: https://webhook.site
3. Confira logs no Railway

### Problema: CORS error
**Solução**: No `server.js`, altere:
```javascript
app.use(cors({
  origin: 'https://seu-dominio.com',
  // ...
}));
```

### Problema: Access token inválido
**Solução**: 
1. Verifique se copiou o token de **Produção** (não Sandbox)
2. Não inclua espaços em branco no `.env`

---

## 📈 Estratégias de Monetização

### 1. Plano Freemium (Já implementado)
- 5 planos gratuitos por usuário
- Depois disso, precisa comprar tokens

### 2. Descontos Progressivos
- Quanto mais tokens, menor o preço unitário
- Incentiva compras maiores

### 3. PIX com Desconto
- Adicione 5% de desconto para PIX
- Taxas menores que cartão de crédito

### 4. Assinatura Mensal (Futuro)
- R$ 29,90/mês → tokens ilimitados
- Receita recorrente garantida

### 5. Planos Institucionais
- Escolas compram tokens em bulk
- Desconto de 20-30% para 500+ tokens

---

## 🎯 Próximos Passos Recomendados

### Semana 1:
- [ ] Deploy no Railway
- [ ] Configurar webhook
- [ ] Testar fluxo completo de compra
- [ ] Compartilhar com 5-10 professores beta

### Semana 2:
- [ ] Coletar feedback dos usuários
- [ ] Ajustar preços se necessário
- [ ] Criar material de marketing

### Semana 3:
- [ ] Lançar oficialmente
- [ ] Divulgar em grupos de professores
- [ ] Monitorar vendas e ajustar estratégia

---

## 📞 Suporte Técnico

### Documentação Oficial:
- [Mercado Pago Developers](https://www.mercadopago.com.br/developers/pt/reference)
- [Railway Docs](https://docs.railway.app/)
- [Express.js Guide](https://expressjs.com/)

### Comunidades:
- [Fórum Mercado Pago](https://developers.mercadolivre.com.br/pt_br/forum)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/mercadopago)

---

## 🎉 Parabéns!

Você agora tem um sistema completo de monetização! 

**Resumo do que conquistou:**
✅ Backend profissional com Node.js  
✅ Integração segura com Mercado Pago  
✅ Sistema de tokens escalável  
✅ Pronto para deploy em produção  
✅ Documentação completa  

**Próxima ação**: Siga o PASSO 1 e obtenha suas credenciais do Mercado Pago!

Boa sorte com seu negócio! 🚀💰
