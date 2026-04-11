# Sprint 10 - Plano de Execução: Notificações Push

**Data:** 11 de abril de 2026  
**Responsáveis:** João Pedro, Gabriel  
**Período:** Semana 7-8  
**Entregável:** v10.0.0-RC1

---

## 📋 Sumário Executivo

Sprint 10 implementa notificações push em tempo real com Firebase Cloud Messaging (FCM), novo microserviço de notificações e 6 gatilhos automatizados. Quebrada em **5 tasks principais** com 16 subtarefas.

### Objetivos
1. ✅ FCM integrado no frontend + backend
2. ✅ Novo microserviço: notification-service
3. ✅ 6 gatilhos de notificação automatizados
4. ✅ Preferências de notificação por membro
5. ✅ WebSockets para notificações em tempo real

### Métricas
- **Testes**: 18+ novos (total passando ~145)
- **Cobertura**: Manter ≥85%
- **Latência Push**: <2s do evento ao device
- **Versão**: v10.0.0-RC1

---

## 🎯 Task Breakdown

### **Task 1: Integração Firebase Cloud Messaging (FCM)** (6-7h)

#### Objetivo
Integrar FCM no frontend para receber notificações push via browser/mobile.

#### Subtasks

**1.1 - Configurar Firebase Project com FCM** (1.5h)
- **Status**: `not-started`
- **O que fazer**:
  - Criar/ativar FCM no Firebase Console
  - Gerar `google-services.json` e `firebase-config.js`
  - Copiar credenciais para `.env`:
    - `FIREBASE_API_KEY`
    - `FIREBASE_MESSAGING_SENDER_ID`
    - `FIREBASE_APP_ID`
  - Criar chave de servidor em Firebase Admin SDK

**Validação**: ✅ Firebase console mostra FCM ativo

---

**1.2 - Criar firebase-config.js no frontend** (1h)
- **Status**: `not-started`
- **Arquivo**: `public/js/firebase-config.js` (novo)
- **Conteúdo**:
```javascript
// Firebase initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

// Get registration token
export async function obterTokenFCM() {
  try {
    const token = await getToken(messaging, {
      vapidKey: process.env.FIREBASE_VAPID_KEY,
    });
    if (token) {
      console.log("🔔 FCM Token:", token);
      return token;
    }
  } catch (err) {
    console.error("❌ Erro ao obter FCM token:", err);
  }
}

// Listen for incoming messages
export function configurarListenerMensagens() {
  onMessage(messaging, (payload) => {
    console.log("📬 Mensagem recebida:", payload);
    mostrarNotificacao(payload.notification);
  });
}

function mostrarNotificacao(notification) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = notification.title;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 5000);
  }
}
```

**Validação**: ✅ Arquivo faz import sem erros, firebase inicializa

---

**1.3 - Registrar token FCM no backend ao fazer login** (1.5h)
- **Status**: `not-started`
- **Arquivo**: `microservices/services/auth-service/index.js`
- **O que fazer**:
  - Ao fazer login com sucesso, cliente chama:
    - `POST /api/auth/register-fcm-token` com `{ fcmToken, deviceType: "web|ios|android" }`
  - Backend armazena em tabela `usuario_tokens_fcm`:
    - usuario_id (UUID)
    - fcm_token (texto)
    - device_type (web, ios, android)
    - criado_em (timestamp)
    - atualizado_em (timestamp)
  - Validar JWT antes de aceitar

**Rota esperada**:
```javascript
app.post("/api/auth/register-fcm-token", verificarJwt, async (req, res) => {
  const { fcmToken, deviceType } = req.body;
  
  if (!fcmToken) {
    return res.status(400).json({ erro: "FCM token obrigatório" });
  }

  // Insert ou update no Supabase
  const { data, error } = await supabase
    .from("usuario_tokens_fcm")
    .upsert({
      usuario_id: req.usuario.id,
      fcm_token: fcmToken,
      device_type: deviceType,
      atualizado_em: new Date().toISOString(),
    });

  if (error) {
    return res.status(500).json({ erro: "Erro ao salvar token FCM" });
  }

  res.json({ mensagem: "FCM token registrado com sucesso" });
});
```

**Validação**: ✅ Rota POST responde 200, token armazenado no Supabase

---

**1.4 - Criar tabela usuario_tokens_fcm (Supabase)** (0.5h)
- **Status**: `not-started`
- **Arquivo**: `database/migrations/create-usuario-tokens-fcm.sql` (novo)
- **Schema**:
```sql
CREATE TABLE usuario_tokens_fcm (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('web', 'ios', 'android')),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_fcm_token ON usuario_tokens_fcm(fcm_token);
CREATE INDEX idx_fcm_usuario ON usuario_tokens_fcm(usuario_id);
```

**Validação**: ✅ Tabela criada, índices ativos

---

**1.5 - Testes FCM frontend + backend** (1.5h)
- **Status**: `not-started`
- **Arquivo**: `tests/unit/public/fcm.test.js` (novo)
- **Testes**:
  - T1: Firebase inicializa sem erros
  - T2: obterTokenFCM retorna string válida
  - T3: configurarListenerMensagens registra listener
  - T4: POST /register-fcm-token salva token
  - T5: Token FCM no Supabase verificável
  - T6: Logout limpa token FCM
  - T7: onMessage dispara callback com payload

**Validação**: ✅ `npm test -- fcm.test.js` = 7/7 passando

---

### **Task 2: Criar Microserviço notification-service** (5-6h)

#### Objetivo
Novo microserviço dedicado a enviar notificações para usuários.

#### Subtasks

**2.1 - Setup notification-service + Express boilerplate** (1h)
- **Status**: `not-started`
- **Arquivo**: `microservices/services/notification-service/`
- **Estrutura**:
```
notification-service/
├── index.js (server)
├── package.json
├── .env.example
├── supabase.js (client)
├── firebase-admin-config.js
├── notificacao-utils.js (helpers)
└── routes/
    ├── enviar.js (POST /api/notificacoes)
    └── status.js (GET /api/notificacoes/:id)
```

**Código index.js**:
```javascript
require("dotenv").config();
const express = require("express");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 4009;

// Firebase Admin initialization
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ servico: "notification-service", status: "ok" });
});

// Routes
app.use("/api/notificacoes", require("./routes/enviar"));
app.use("/api/notificacoes", require("./routes/status"));

app.listen(PORT, () => {
  console.log(`🔔 Notification Service rodando em porta ${PORT}`);
});
```

**Validação**: ✅ notification-service inicia sem erros

---

**2.2 - Implementar rota POST /api/notificacoes** (1.5h)
- **Status**: `not-started`
- **Arquivo**: `microservices/services/notification-service/routes/enviar.js`
- **O que fazer**:
  - Receber:
    - `usuario_id` (UUID)
    - `titulo` (string)
    - `corpo` (string)
    - `tipo` (string: "contribute", "event", "announcement", "payment", "system")
    - `dados_extra` (object opcional)
  - Buscar tokens FCM do usuário em `usuario_tokens_fcm`
  - Para cada token, enviar via FCM Admin SDK
  - Registrar em tabela `notificacoes_log` para auditoria
  - Retornar status de envio

**Código esperado**:
```javascript
const express = require("express");
const admin = require("firebase-admin");
const { supabase } = require("../supabase");

const router = express.Router();

router.post("/", async (req, res) => {
  const { usuario_id, titulo, corpo, tipo, dados_extra } = req.body;

  if (!usuario_id || !titulo || !corpo) {
    return res.status(400).json({ erro: "Campos obrigatórios faltam" });
  }

  try {
    // Buscar tokens FCM do usuário
    const { data: tokens, error } = await supabase
      .from("usuario_tokens_fcm")
      .select("fcm_token, device_type")
      .eq("usuario_id", usuario_id);

    if (!tokens || tokens.length === 0) {
      return res.status(404).json({ mensagem: "Usuário sem tokens FCM" });
    }

    // Enviar para cada dispositivo
    const resultados = [];
    for (const { fcm_token } of tokens) {
      try {
        const respostaPush = await admin.messaging().send({
          token: fcm_token,
          notification: {
            title: titulo,
            body: corpo,
          },
          data: {
            tipo,
            ...dados_extra,
          },
          webpush: {
            fcmOptions: { link: "/" },
          },
        });
        resultados.push({ fcm_token, status: "sucesso", id: respostaPush });
      } catch (err) {
        resultados.push({ fcm_token, status: "erro", erro: err.message });
      }
    }

    // Log em BD
    await supabase.from("notificacoes_log").insert({
      usuario_id,
      titulo,
      tipo,
      total_enviadas: resultados.length,
      criado_em: new Date().toISOString(),
    });

    res.json({ mensagem: "Notificações enviadas", resultados });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
```

**Validação**: ✅ POST /api/notificacoes envia para múltiplos devices

---

**2.3 - Criar tabela notificacoes_log (Supabase)** (0.5h)
- **Status**: `not-started`
- **Arquivo**: `database/migrations/create-notificacoes-log.sql`
- **Schema**:
```sql
CREATE TABLE notificacoes_log (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  corpo TEXT,
  tipo TEXT CHECK (tipo IN ('contribute', 'event', 'announcement', 'payment', 'system')),
  total_enviadas INT DEFAULT 1,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_usuario ON notificacoes_log(usuario_id);
CREATE INDEX idx_notif_tipo ON notificacoes_log(tipo);
```

**Validação**: ✅ Tabela criada, índices ativos

---

**2.4 - Criar preferences table (preferências de membro)** (1h)
- **Status**: `not-started`
- **Arquivo**: `database/migrations/create-notificacao-preferences.sql`
- **Schema**:
```sql
CREATE TABLE notificacao_preferences (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo_notificacao TEXT NOT NULL CHECK (tipo_notificacao IN ('contribute', 'event', 'announcement', 'payment', 'system')),
  habilitada BOOLEAN DEFAULT TRUE,
  som BOOLEAN DEFAULT TRUE,
  vibrar BOOLEAN DEFAULT TRUE,
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(usuario_id, tipo_notificacao)
);

CREATE INDEX idx_prefs_usuario ON notificacao_preferences(usuario_id);
```

**Validação**: ✅ Tabela criada com constraints

---

**2.5 - Testes notification-service** (1h)
- **Status**: `not-started`
- **Arquivo**: `tests/unit/microservices/notification-service.test.js`
- **Testes**:
  - T1: POST /api/notificacoes com usuário válido
  - T2: Notificação registrada em log
  - T3: POST com usuário sem tokens retorna 404
  - T4: GET /notification-preferences retorna preferências
  - T5: PUT /notification-preferences atualiza
  - T6: Typ de notificação válido/inválido

**Validação**: ✅ `npm test -- notification-service.test.js` = 6/6 passando

---

### **Task 3: Implementar 6 Gatilhos de Notificação** (6-7h)

#### Objetivo
Disparar notificações automaticamente em eventos específicos.

#### Subtasks

**3.1 - Gatilho 1: Nova Contribuição Registrada** (1h)
- **Status**: `not-started`
- **O que fazer**:
  - Quando POST /api/contribuicoes sucesso
  - Enviar notificação para:
    - 📨 Donativo: "Nova contribuição de R$ X recebida"
    - 👥 Admin: "[Membro] contribuiu R$ X"
  - Tipos: "contribute"

**Código esperado** (em api-express/servidor.js):
```javascript
app.post("/api/contribuicoes", verificarJwt, async (req, res) => {
  // ... validação ...
  
  // Registrar contribuição
  const contribuicao = await salvarContribuicao(req.body);
  
  // 🔔 DISPARA NOTIFICAÇÃO
  const notificacaoService = process.env.NOTIFICATION_SERVICE_URL;
  await fetch(`${notificacaoService}/api/notificacoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usuario_id: contribuicao.membro_id,
      titulo: "✅ Contribuição Registrada",
      corpo: `Contribuição de R$ ${contribuicao.valor} recebida`,
      tipo: "contribute",
      dados_extra: { contribuicao_id: contribuicao.id },
    }),
  });
  
  res.json(contribuicao);
});
```

---

**3.2 - Gatilho 2: Novo Evento Criado** (1h)
- **Status**: `not-started`
- **Disparo**: POST /api/eventos sucesso
- **Notificação**: "Novo evento: [nome] em [data]"
- **Tipo**: "event"

---

**3.3 - Gatilho 3: Comunicado Postado** (1h)
- **Status**: `not-started`
- **Disparo**: POST /api/comunicados sucesso
- **Notificação**: "Novo comunicado: [título]"
- **Tipo**: "announcement"
- **Broadcast**: Para TODOS os membros

---

**3.4 - Gatilho 4: Pedido de Oração Recebido** (1h)
- **Status**: `not-started`
- **Disparo**: POST /api/pedidos-oracao sucesso
- **Notificação**: "Novo pedido de oração: [resumo]"
- **Tipo**: "system"
- **Broadcast**: Para lideres/pastores

---

**3.5 - Gatilho 5: Relatório Financeiro Disponível** (1h)
- **Status**: `not-started`
- **Disparo**: GET /api/relatorios/* (gerar relatório)
- **Notificação**: "Seu relatório está pronto"
- **Tipo**: "payment"

---

**3.6 - Gatilho 6: Alerta de Atraso** (1h)
- **Status**: `not-started`
- **Disparo**: Cron job diário (00:00)
- **Verificar**: Membros com atraso > 30 dias
- **Notificação**: "Você tem [N] contribuições vencidas"
- **Tipo**: "payment"

---

**3.7 - Testes dos 6 gatilhos** (1h)
- **Status**: `not-started`
- **Arquivo**: `tests/unit/gateways/notificacao-gateways.test.js`
- **Testes**:
  - T1-T6: Cada gatilho dispara corretamente
  - T7: Respeita preferências do usuário
  - T8: Falha de notificação não bloqueia evento

---

### **Task 4: Implementar Preferências de Notificação** (3-4h)

#### Objetivo
Permitir que membros gerenciem suas notificações.

#### Subtasks

**4.1 - Criar UI de Preferências** (1.5h)
- **Status**: `not-started`
- **Arquivo**: `public/membros/preferencias-notificacoes.html` + `.js` + `.css`
- **Features**:
  - Toggles para cada tipo de notificação
  - Opções: som, vibração
  - Salvar em /api/notification-preferences
  - Toast de confirmação

---

**4.2 - Criar API GET/PUT preferences** (1h)
- **Status**: `not-started`
- **Rotas**:
  - GET /api/notification-preferences → retorna prefs do usuário
  - PUT /api/notification-preferences → atualiza prefs

---

**4.3 - Validar preferências ao enviar** (0.5h)
- **Status**: `not-started`
- **Lógica**: notification-service verifica preferências antes de enviar

---

**4.4 - Testes de preferências** (1h)
- **Status**: `not-started`
- **Arquivo**: `tests/unit/api-express/preferences.test.js`
- **Testes**: GET, PUT, validação, respeito de preferências

---

### **Task 5: WebSockets para Notificações em Tempo Real** (4-5h)

#### Objetivo
Implementar notificações instantâneas via WebSocket (além de Background Service).

#### Subtasks

**5.1 - Adicionar Socket.io ao notification-service** (1.5h)
- **Status**: `not-started`
- **O que fazer**:
  - Novo servidor Socket.io em notification-service
  - Eventos: `notificacao-enviada`, `usuario-conectado`, `usuario-desconectado`

---

**5.2 - Conectar frontend ao Socket.io** (1h)
- **Status**: `not-started`
- **Arquivo**: `public/js/servicos/socket-notificacoes.js`
- **Lógica**: Conectar após login, escutar eventos

---

**5.3 - UI de notificações toast em tempo real** (0.5h)
- **Status**: `not-started`
- **Receptor**: Mostrar toast ao receber via Socket.io

---

**5.4 - Testes Socket.io** (1h)
- **Status**: `not-started`

---

## ✅ Checklist de Conclusão Sprint 10

### Pre-Deploy
- [ ] Task 1-5 100% completas
- [ ] npm test = 145+ testes passando
- [ ] Cobertura código ≥85%
- [ ] GitHub commits PT-BR
- [ ] Branch `feature/sprint-10-notificacoes` pronta

### Deploy Staging
- [ ] v10.0.0-RC1 taggeada
- [ ] FCM funcionando em Chrome + Safari
- [ ] 6 gatilhos disparando automaticamente
- [ ] WebSocket em tempo real
- [ ] Preferências respeitadas
- [ ] Zero bugs críticos

### Post-Deploy
- [ ] Release notes v10.0.0-RC1
- [ ] Equipe testou em mobile
- [ ] Ready para Sprint 11 (Payment Gateway)

---

## 📊 Dependências e Bloqueadores

### Dependências Internas
- Sprint 9 (Auth + PWA) ✅ Concluída
- Express.js running (`npm start`)
- Supabase com JWT

### Dependências Externas
- Firebase Project com FCM ativado
- Firebase Admin SDK credenciais
- Navegadores suportam Service Worker Notifications

### Possíveis Bloqueadores
- ⚠️ Se Firebase não configurado → FCM não funciona
- ⚠️ Se Supabase table tiver erro → logs não salvam
- ⚠️ Se WebSocket falha → notificações em tempo real falhararão

---

## 🚀 Próximas Sprints

**Sprint 11 (Payment Gateway)** depende de:
- ✅ Notificações funcionando (Sprint 10 Task 3)

**Sprint 12 (E2E)** dependerá de:
- ✅ Todos os microserviços rodando

---

**Documento: Sprint 10 Planning** | Última atualização: 11/04/2026  
**Status**: 🟡 Ready para Execução
