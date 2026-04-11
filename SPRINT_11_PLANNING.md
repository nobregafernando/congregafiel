# Sprint 11 - Plano de Execução: Gateway de Pagamento Online

**Data:** 11 de abril de 2026  
**Responsáveis:** Gabriel, João Pedro  
**Período:** Semana 9-10  
**Entregável:** v11.0.0-RC1

---

## 📋 Sumário Executivo

Sprint 11 integra **Mercado Pago** como gateway de pagamento principal com suporte a **Pix** (0% taxa) e **Cartão de Crédito** (3,99% taxa). Novo microserviço payment-service, webhooks de confirmação e interface de checkout. Quebrada em **4 tasks principais** com 14 subtarefas.

### Objetivos
1. ✅ Integração Mercado Pago API
2. ✅ Fluxo Pix com QR Code dinâmico
3. ✅ Fluxo Cartão de Crédito com validação
4. ✅ Webhooks de confirmação
5. ✅ Novo microserviço: payment-service

### Métricas
- **Testes**: 16+ novos (total passando ~161)
- **Cobertura**: Manter ≥85%
- **Taxa sucesso pagamentos**: ≥98%
- **Versão**: v11.0.0-RC1

### Dependências Críticas
- ✅ Sprint 9 (Auth + PWA) **CONCLUÍDA**
- ✅ Sprint 10 Task 3 (Gatilho 6: Alerta Atraso) **DEVE estar 100%**
- 🟡 Sprint 10 Tasks 4-5 (Preferências + WebSocket) podem rodar em paralelo

---

## 🎯 Task Breakdown

### **Task 1: Configurar Mercado Pago + API** (5-6h)

#### Objetivo
Registrar conta Mercado Pago, obter credenciais e implementar client SDK.

#### Subtasks

**1.1 - Criar conta Mercado Pago Business** (1h)
- **Status**: `not-started`
- **O que fazer**:
  - Signup em mercadopago.com.br
  - Validar documento CPF/CNPJ da igreja
  - Ativar Pix como meio de recebimento
  - Ativar integração por API
  - Gerar credenciais:
    - `MERCADO_PAGO_ACCESS_TOKEN`
    - `MERCADO_PAGO_PUBLIC_KEY`
    - `MERCADO_PAGO_WEBHOOK_TOKEN`

**Validação**: ✅ Credenciais obtidas, account ativ

a no sandbox Mercado Pago

---

**1.2 - Criar payment-service microserviço** (1h)
- **Status**: `not-started`
- **Arquivo**: `microservices/services/payment-service/`
- **Estrutura**:
```
payment-service/
├── index.js (server)
├── package.json
├── .env.example
├── mercado-pago-client.js
├── pagamento-utils.js
├── supabase.js
└── routes/
    ├── criar-preferencia.js (POST Pix/Cartão)
    ├── webhook.js (PUT confirmação)
    ├── status.js (GET status pagamento)
    └── relatorio.js (GET relatório financeiro)
```

**Validação**: ✅ payment-service inicia, health check funciona

---

**1.3 - Integrar SDK Mercado Pago no backend** (0.5h)
- **Status**: `not-started`
- **Arquivo**: `microservices/services/payment-service/mercado-pago-client.js`
- **Conteúdo**:
```javascript
const MercadoPagoConfig = require("mercadopago");

const client = new MercadoPagoConfig.Configuration({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  regionName: MercadoPagoConfig.RegionName.BR,
});

const paymentClient = new MercadoPagoConfig.Payment(client);
const preferenceClient = new MercadoPagoConfig.Preference(client);

module.exports = {
  paymentClient,
  preferenceClient,
};
```

**Validação**: ✅ Cliente Mercado Pago conecta sem errors

---

**1.4 - Criar rota POST /api/pagamentos/preferencia (Pix + Cartão)** (2.5h)
- **Status**: `not-started`
- **Arquivo**: `microservices/services/payment-service/routes/criar-preferencia.js`
- **O que fazer**:
  - Receber:
    - `usuario_id` (UUID) 
    - `valor` (number em reais)
    - `tipo` (string: "pix_copia_cola" | "pix_qr_code" | "cartao_credito")
    - `descricao` (string)
  - Criar "Preference" no Mercado Pago
  - Retornar:
    - Para Pix: QR Code (base64) + copy-paste string
    - Para Cartão: URL de checkout Mercado Pago
  - Registrar em `pagamentos_abertos` (Supabase)

**Código esperado**:
```javascript
router.post("/", verificarJwt, async (req, res) => {
  const { valor, tipo, descricao } = req.body;

  if (!valor || !tipo) {
    return res.status(400).json({ erro: "valor e tipo obrigatórios" });
  }

  try {
    // Criar preference no Mercado Pago
    const preferenceBody = {
      items: [
        {
          title: descricao || "Contribuição CongregaFiel",
          quantity: 1,
          unit_price: valor,
        },
      ],
      payer: {
        email: req.usuario.email,
      },
      notification_url: `${process.env.PAYMENT_SERVICE_URL}/api/pagamentos/webhook`,
      statement_descriptor: "CONGREGAFIEL",
      external_reference: req.usuario.id,
    };

    if (tipo === "pix_qr_code") {
      preferenceBody.payment_methods = {
        default_payment_method_id: "pix",
        default_installments: 1,
      };
    }

    const preference = await preferenceClient.create({
      body: preferenceBody,
    });

    // Salvar em BD
    const { data: aberto } = await supabase
      .from("pagamentos_abertos")
      .insert({
        usuario_id: req.usuario.id,
        valor,
        tipo,
        mercado_pago_preference_id: preference.id,
        status: "pendente",
        criado_em: new Date().toISOString(),
      });

    // Retornar QR code ou link checkout
    let resultado = {
      preference_id: preference.id,
      tipo,
      valor,
    };

    if (tipo === "pix_qr_code" && preference.point_of_interaction?.qr_code?.image) {
      resultado.qr_code = preference.point_of_interaction.qr_code.image;
      resultado.qr_data = preference.point_of_interaction.qr_code.data;
    } else if (tipo === "cartao_credito") {
      resultado.checkout_url = preference.sandbox_init_point;
    }

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});
```

**Validação**: ✅ Rota POST responde com QR code ou checkout URL

---

**1.5 - Testes integração Mercado Pago** (1h)
- **Status**: `not-started`
- **Arquivo**: `tests/unit/microservices/mercado-pago.test.js`
- **Testes**:
  - T1: POST /preferencia com Pix retorna QR code
  - T2: POST /preferencia com Cartão retorna checkout URL
  - T3: Preference criada no Mercado Pago
  - T4: Payment registrado em pagamentos_abertos com status "pendente"
  - T5: Valor e descrição corretos no Mercado Pago

**Validação**: ✅ `npm test -- mercado-pago.test.js` = 5/5 passando

---

### **Task 2: Implementar Webhooks + Confirmação** (4-5h)

#### Objetivo
Receber confirmação de pagamento do Mercado Pago e atualizar status em tempo real.

#### Subtasks

**2.1 - Criar rota webhook POST /api/pagamentos/webhook** (1.5h)
- **Status**: `not-started`
- **Arquivo**: `microservices/services/payment-service/routes/webhook.js`
- **O que fazer**:
  - Mercado Pago envia POST com dados de pagamento
  - Validar assinatura com `MERCADO_PAGO_WEBHOOK_TOKEN`
  - Verificar status: `approved`, `pending`, `rejected`
  - Se `approved`: 
    - Atualizar `pagamentos_abertos` → `status: "confirmado"`
    - Inserir em `contribuicoes` (registrar contribuição)
    - Enviar notificação via notification-service (Gatilho "payment_confirmed")
  - Se `rejected`:
    - Atualizar status → `status: "recusado"`
    - Enviar notificação de erro

**Código esperado**:
```javascript
router.post("/", async (req, res) => {
  const { data, id } = req.body;

  // Validar assinatura
  const signature = req.headers["x-signature"];
  if (!validarAssinaturaMP(signature, data)) {
    return res.status(401).json({ erro: "Assinatura inválida" });
  }

  try {
    // Buscar pagamento no Mercado Pago
    const payment = await paymentClient.get({ id });

    // Atualizar BD baseado em status
    let novoStatus = "pendente";
    if (payment.status === "approved") {
      novoStatus = "confirmado";
      
      // Registrar como contribuição
      await supabase.from("contribuicoes").insert({
        usuario_id: payment.external_reference,
        valor: payment.transaction_amount,
        tipo: "cartao", // ou "pix"
        metodo_pagamento: "mercado_pago",
        referencia_externa: payment.id,
        recebido_em: new Date().toISOString(),
      });

      // Notificar usuário
      await fetch(`${process.env.NOTIFICATION_SERVICE_URL}/api/notificacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: payment.external_reference,
          titulo: "✅ Pagamento Confirmado",
          corpo: `Sua contribuição de R$ ${payment.transaction_amount} foi confirmada`,
          tipo: "payment",
        }),
      });
    } else if (payment.status === "rejected") {
      novoStatus = "recusado";
      
      // Notificar falha
      await fetch(`${process.env.NOTIFICATION_SERVICE_URL}/api/notificacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: payment.external_reference,
          titulo: "❌ Pagamento Recusado",
          corpo: "Seu pagamento foi recusado. Tente novamente.",
          tipo: "payment",
        }),
      });
    }

    // Atualizar pagamento_aberto
    await supabase
      .from("pagamentos_abertos")
      .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
      .eq("mercado_pago_payment_id", payment.id);

    res.json({ mensagem: "Webhook processado com sucesso" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});
```

**Validação**: ✅ Webhook recebe, valida, atualiza BD

---

**2.2 - Criar tabelas pagamentos_abertos + pagamentos_log (Supabase)** (1h)
- **Status**: `not-started`
- **Arquivo**: `database/migrations/create-pagamentos-tables.sql`
- **Schemas**:
```sql
-- Pagamentos em aberto (aguardando confirmação)
CREATE TABLE pagamentos_abertos (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  valor NUMERIC(10, 2) NOT NULL,
  tipo TEXT CHECK (tipo IN ('pix_copia_cola', 'pix_qr_code', 'cartao_credito')),
  mercado_pago_preference_id TEXT,
  mercado_pago_payment_id TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'recusado')),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  expira_em TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_pagto_aberto_usuario ON pagamentos_abertos(usuario_id);
CREATE INDEX idx_pagto_aberto_status ON pagamentos_abertos(status);
CREATE INDEX idx_pagto_aberto_mp_id ON pagamentos_abertos(mercado_pago_payment_id);

-- Log de todas as transações
CREATE TABLE pagamentos_log (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  valor NUMERIC(10, 2) NOT NULL,
  tipo TEXT,
  metodo_pagamento TEXT,
  status TEXT,
  referencia_mp TEXT,
  erro_msg TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_log_usuario ON pagamentos_log(usuario_id);
CREATE INDEX idx_log_status ON pagamentos_log(status);
```

**Validação**: ✅ Tabelas criadas, índices ativos

---

**2.3 - Integrar webhook com notification-service** (1h)
- **Status**: `not-started`
- **O que fazer**:
  - Webhook dispara notificação via POST /api/notificacoes
  - Tipo: "payment"
  - Respeita preferências do usuário (Sprint 10 Task 4)
  - Log em `pagamentos_log` para auditoria

**Validação**: ✅ Notificação enviada ao confirmar pagamento

---

**2.4 - Testes webhook + confirmação** (1h)
- **Status**: `not-started`
- **Arquivo**: `tests/unit/microservices/webhook-pagamento.test.js`
- **Testes**:
  - T1: Webhook com assinatura válida processa
  - T2: Webhook com assinatura inválida retorna 401
  - T3: Status "approved" → insere contribuição
  - T4: Status "rejected" → não insere contribuição
  - T5: Notificação enviada ao confirmar
  - T6: Log registra transação

**Validação**: ✅ `npm test -- webhook-pagamento.test.js` = 6/6 passando

---

### **Task 3: Criar UI de Checkout** (5-6h)

#### Objetivo
Interface frontend para solicitar pagamento com Pix ou Cartão.

#### Subtasks

**3.1 - Criar página checkout.html + css** (1.5h)
- **Status**: `not-started`
- **Arquivo**: `public/pagamentos/checkout.html` + `.css`
- **Features**:
  - Tabs: Pix vs Cartão
  - Aba Pix:
    - Exibir QR code dinamicamente
    - Botão copiar copy-paste string
    - Contador regressivo 24h
  - Aba Cartão:
    - Iframe Mercado Pago checkout
  - Validação de valor
  - Toast de status

---

**3.2 - Criar checkout.js (lógica frontend)** (2h)
- **Status**: `not-started`
- **Arquivo**: `public/pagamentos/checkout.js`
- **Lógica**:
  - GET /api/pagamentos/preferencia ao selecionar Pix/Cartão
  - Renderizar QR code (via lib qrcode.js)
  - Submit form → redirect para Mercado Pago (cartão)
  - Atualizar status em tempo real via GET /api/pagamentos/status/:id
  - Polling POST a cada 3s até confirmação ou timeout 24h

**Código esperado**:
```javascript
async function criarPreferenciaPix() {
  const valor = document.getElementById('valor').value;
  
  const response = await fetch('/api/pagamentos/preferencia', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${obterToken()}`
    },
    body: JSON.stringify({
      valor,
      tipo: 'pix_qr_code',
      descricao: 'Contribuição CongregaFiel'
    })
  });

  const { qr_code, qr_data, preference_id } = await response.json();

  // Renderizar QR code
  const qrContainer = document.getElementById('qr-container');
  qrContainer.innerHTML = '';
  QRCode.toCanvas(qrContainer, qr_data, { width: 300 });

  // Copiar texto
  document.getElementById('btn-copiar').onclick = () => {
    navigator.clipboard.writeText(qr_data);
    toast('Copiado para clipboard!');
  };

  // Poll status
  pollPagamentoStatus(preference_id);
}

async function pollPagamentoStatus(preferenceId) {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/pagamentos/status/${preferenceId}`, {
      headers: { 'Authorization': `Bearer ${obterToken()}` }
    });
    const { status } = await response.json();

    if (status === 'confirmado') {
      clearInterval(interval);
      toast('✅ Pagamento confirmado!');
      window.location.href = '/membros/painel';
    } else if (status === 'recusado') {
      clearInterval(interval);
      toast('❌ Pagamento recusado');
    }
  }, 3000);
}
```

**Validação**: ✅ QR code renderiza, copiar funciona, polling atualiza

---

**3.3 - Integrar link checkout em pages de contribuição** (1h)
- **Status**: `not-started`
- **Arquivos afetados**:
  - `public/membros/painel.js` → botão "Contribuir Online"
  - `public/igreja/painel.js` → botão "Receber Contribuição"
- **O que fazer**:
  - Adicionar botão "💳 Contribuir Online"
  - Redirect para `/pagamentos/checkout?valor=X`

**Validação**: ✅ Botão aparece, redirect funciona

---

**3.4 - Testes UI checkout** (1h)
- **Status**: `not-started`
- **Arquivo**: `tests/unit/public/checkout.test.js`
- **Testes**:
  - T1: QR code renderiza com qrcode.js
  - T2: Botão copiar copia para clipboard
  - T3: Poll status atualiza UI a cada 3s
  - T4: Status "confirmado" redireciona
  - T5: Aba Cartão abre iframe
  - T6: Timeout 24h limpa interval

**Validação**: ✅ `npm test -- checkout.test.js` = 6/6 passando

---

### **Task 4: QA + Relatório Financeiro Integrado** (3-4h)

#### Objetivo
Integrar pagamentos online com relatórios financeiros existentes.

#### Subtasks

**4.1 - Atualizar relatórios para incluir Mercado Pago** (1h)
- **Status**: `not-started`
- **O que fazer**:
  - GET /api/relatorios/* agora incluir:
    - `total_pix` (sum contribuições via Pix)
    - `total_cartao` (sum via Cartão)
    - `taxa_cobrada` (3.99% de cartão)
    - `liquido_recebido` (total menos taxas)
  - Tabela `contribuicoes` tem nova coluna `metodo_pagamento`

**Validação**: ✅ Relatório mostra split Pix vs Cartão

---

**4.2 - Criar GET /api/pagamentos/relatorio (relatório pagamentos)** (1h)
- **Status**: `not-started`
- **Rota**: `microservices/services/payment-service/routes/relatorio.js`
- **Retorna**:
  - Total processado (Pix + Cartão)
  - Taxa média cobrada
  - Transações rejeitadas
  - Gráfico últimos 30 dias

**Validação**: ✅ GET /relatorio retorna dados consolidados

---

**4.3 - Testes integração pagamentos + relatórios** (1h)
- **Status**: `not-started`
- **Arquivo**: `tests/unit/microservices/pagamentos-relatorios.test.js`
- **Testes**:
  - T1: Contribuição via Pix aparece em relatório
  - T2: Contribuição via Cartão aparece com taxa
  - T3: Liquido = Total - Taxa (cálculo)
  - T4: Rejeitadas não aparecem em total
  - T5: GET /relatorio agrupa corretamente

**Validação**: ✅ 5 testes passando

---

**4.4 - QA e testes end-to-end** (1h)
- **Status**: `not-started`
- **Testes manuais**:
  - [ ] Flow completo Pix: criar → QR → confirmar
  - [ ] Flow completo Cartão: criar → checkout → callback
  - [ ] Timeout 24h → pagamento expira
  - [ ] Relatório consolidado funciona
  - [ ] Notificações disparam corretamente
  - [ ] Sem erros de segurança (OWASP)

**Validação**: ✅ 6 cenários passam sem bugs

---

## ✅ Checklist de Conclusão Sprint 11

### Pre-Deploy
- [ ] Task 1-4 100% completas
- [ ] npm test = 161+ testes passando (145 anterior + 16 novos)
- [ ] Cobertura código ≥85%
- [ ] GitHub commits PT-BR
- [ ] Branch `feature/sprint-11-payment-gateway` pronta

### Deploy Staging
- [ ] v11.0.0-RC1 taggeada
- [ ] Mercado Pago sandbox validando transações
- [ ] QR code gerado + webhook confirmando
- [ ] Relatório consolidado (Pix + Cartão)
- [ ] Notificações (Sprint 10) integradas
- [ ] Zero bugs críticos ou security issues

### Post-Deploy
- [ ] Release notes v11.0.0-RC1
- [ ] Equipe testou flow completo (Pix + Cartão)
- [ ] Ready para produção (Mercado Pago account real)
- [ ] Ready para Sprint 12 (E2E final)

---

## 📊 Dependências Críticas

### Deve estar 100% antes iniciar Sprint 11:
- ✅ Sprint 9 (Auth + PWA) ✅ CONCLUÍDA
- ✅ Sprint 10 Task 3 (6 Gatilhos) — **CRITICAL**
  - Gatilho 5: Relatório Disponível
  - Gatilho 6: Alerta Atraso (CRON job diário)

### Pode estar em progresso (não bloqueia Sprint 11):
- 🟡 Sprint 10 Task 4: Preferências UI
- 🟡 Sprint 10 Task 5: WebSocket

### Após Sprint 11 pronta:
- ✅ Libera Sprint 12 (E2E tests + produção)

---

## 🚀 Timeline (10 dias)

```
DIA 1-2:   Task 1 (Mercado Pago setup)         → 5-6h
DIA 2-3:   Task 2 (Webhooks)                   → 4-5h
DIA 4-5:   Task 3 (UI Checkout)                → 5-6h
DIA 6-7:   Task 4 (Integração + QA)            → 3-4h
DIA 8:     Testes integração E2E              → 4h
DIA 9:     Release v11.0.0-RC1                → 2-3h
DIA 10:    Sprint 12 Kickoff
```

**Total:** 28-33h (within 2 weeks budget)

---

## ⚠️ Riscos & Mitigações

| Risco | Severidade | Mitigação |
|-------|-----------|----------|
| Mercado Pago API instável | 🟠 MÉDIA | Implementar retry com backoff exponencial |
| Webhook não recebe confirmação | 🔴 ALTA | Polling + timeout, manual verification em BD |
| Cartão recusado > 10% | 🟡 BAIXA | Alertar usuário, sugerir Pix |
| Taxa 3.99% muda | 🟡 BAIXA | Hardcode dinâmico em .env |
| Relatório não consolida | 🟠 MÉDIA | Testes de integração TUDO antes deploy |

---

**Documento: Sprint 11 Planning** | Última atualização: 11/04/2026  
**Status**: 🟡 Ready para Execução (após Sprint 10 Task 3 concluída)
