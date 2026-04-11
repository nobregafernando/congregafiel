# ROADMAP CONGREGA FIEL - Sprint 7-12

**Status:** Sprint 7 ✅ Concluída | Sprint 8 ✅ Concluída | Sprint 9-12 Em Planejamento  
**Data de Início:** 10 de abril de 2026  
**Horizonte:** 12 semanas (3 meses)  
**Última Atualização:** 10 de abril de 2026 - Sprint 8 Concluída

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Iniciativas Priorizadas](#iniciativas-priorizadas)
3. [Roadmap Sprint por Sprint](#roadmap-sprint-por-sprint)
4. [Detalhamento Técnico](#detalhamento-técnico)
5. [Dependências](#dependências)
6. [Verificação e Validação](#verificação-e-validação)
7. [Getting Started - Sprint 7](#getting-started---sprint-7)
8. [Arquivos e Responsabilidades](#arquivos-e-responsabilidades)

---

## 🎯 Visão Geral

Após a conclusão bem-sucedida das 6 sprints iniciais, o CongregaFiel possui uma base sólida:
- ✅ Frontend publicado (HTML/CSS/JS vanilla)
- ✅ Duas APIs REST (Express + FastAPI)
- ✅ Banco de dados em nuvem (Supabase)
- ✅ API Gateway Edge com microserviços
- ✅ Testes unitários (9 arquivos com Vitest)

**Próximas 6 sprints focam em:** Estabilidade → Funcionalidades → Segurança → Mobile → Monetização.

### Status Atual
| Métrica | Valor |
|---------|-------|
| **Sprints Concluídas** | 8 |
| **Testes Unitários** | 10 arquivos com 91 testes |
| **Cobertura de Testes** | ~85% (aumento com Sprint 8) |
| **APIs Operacionais** | 2 (Express + FastAPI) com 12+ endpoints |
| **Microserviços** | 7 (em arquitetura) |
| **Bugs Pagamentos** | ✅ 4/4 Corrigidos |
| **Relatórios Financeiros** | ✅ 6/6 Implementados |

---

## 🏆 Iniciativas Priorizadas

| # | Iniciativa | Prioridade | Complexidade | Sprints | Responsáveis | Status |
|---|-----------|-----------|-------------|---------|--------------|--------|
| 1 | Correção de Bugs - Pagamentos | ⚠️ **ALTA** | Baixa | 1 | Fernando, Catieli, Jhenniffer | ✅ Concluído |
| 2 | Relatórios Financeiros | ⚠️ **ALTA** | Média | 2 | Fernando, Gabriel | ✅ Concluído |
| 3 | Integração Gateway de Pagamento | 🟡 Média | Alta | 2-3 | Gabriel, João Pedro | 🟡 Não Iniciado |
| 4 | Aplicativo Mobile (PWA) | 🟡 Média | Alta | 4-6 | Toda equipe | 🟡 Não Iniciado |
| 5 | Notificações Push | 🟡 Média | Média | 1-2 | João Pedro, Gabriel | 🟡 Não Iniciado |
| 6 | Autenticação na Borda | ⚠️ **ALTA** | Média | 1 | João Pedro, Gabriel | 🟡 Não Iniciado |
| 7 | Ampliação da Cobertura de Testes | ⚠️ **ALTA** | Média | 1-2 | João Pedro | 🟡 Não Iniciado |

---

## 📅 Roadmap Sprint por Sprint

### Sprint 7: Correção de Bugs - Pagamentos ⚡

**Período:** Semana 1-2 (10-23 de abril de 2026)  
**Prioridade:** ⚠️ ALTA  
**Status:** ✅ Concluído (10 de abril)  
**Responsável:** Fernando, Catieli, Jhenniffer

#### Objetivo
Corrigir 4 bugs críticos que comprometem a integridade dos dados financeiros.

#### Tasks

##### Task 1.1: Bug - Filtragem por Nome ao Invés de ID
**Descrição:** Sistema filtra contribuições pelo nome (texto), causando conflitos com membros homônimos.

**Impacto:** Registros financeiros atribuídos ao membro errado.

**Solução Técnica:**
- [ ] Alterar `public/igreja/pagamentos.html` - converter input text para select dropdown
- [ ] Backend validar `membro_id` (UUID) em vez de string
- [ ] DB: adicionar foreign key em `contribuicoes.membro_id` → `membros.id`
- [ ] Testes unitários atualizados

**Arquivos Afetados:**
- `public/igreja/pagamentos.html` (form)
- `api-express/servidor.js` (POST /api/contribuicoes)
- `api-express/utils/regras-auth.js` (validação)

**Esforço:** 2-3 horas

---

##### Task 1.2: Bug - Sem Validação de Existência do Membro
**Descrição:** Sistema não verifica se membro existe antes de registrar pagamento.

**Impacto:** Registros órfãos sem membro associado, integridade referencial comprometida.

**Solução Técnica:**
- [ ] Implementar `validarMembroExiste(membro_id)` em `regras-auth.js`
- [ ] Consultar Supabase antes de INSERT
- [ ] Retornar erro 404 se membro_id inválido
- [ ] Adicionar ON DELETE RESTRICT na foreign key

**Arquivos Afetados:**
- `api-express/utils/regras-auth.js` (nova função)
- `api-express/servidor.js` (aplicar na rota)
- `api-express/utils/regras-auth.test.js` (testes)

**Esforço:** 1-2 horas

---

##### Task 1.3: Bug - Pagamentos Não Editáveis
**Descrição:** Uma vez registrado, pagamento só pode ser deletado, não editado.

**Impacto:** Difícil correção de erros de digitação, frustra usuários.

**Solução Técnica:**
- [ ] Criar endpoint `PUT /api/contribuicoes/:id` (Express + FastAPI)
- [ ] Adicionar botão "Editar" na tabela de pagamentos
- [ ] Modal com campos pré-preenchidos
- [ ] Auditoria: campos `editado_em` e `editado_por`
- [ ] Testes E2E do fluxo de edição

**Arquivos Afetados:**
- `api-express/servidor.js` (nova rota PUT)
- `public/igreja/pagamentos.html` (UI edição)
- `public/igreja/pagamentos.js` (handlers)
- `tests/unit/api-express/utils/regras-auth.test.js`

**Esforço:** 3-4 horas

---

##### Task 1.4: Bug - Sem Verificação de Lançamentos Duplicados
**Descrição:** Sistema permite registrar o mesmo pagamento multiple vezes.

**Impacto:** Receita inflada fraudulentamente ou por erro.

**Solução Técnica:**
- [ ] Implementar `verificarDuplicacao(membro_id, tipo, valor, data)` em `regras-auth.js`
- [ ] Buscar contribuições com tolerância de 1 dia
- [ ] Retornar **warning** (não erro) para confirmação do usuário
- [ ] Adicionar optional `hash_verificacao` na tabela

**Arquivos Afetados:**
- `api-express/utils/regras-auth.js` (nova função)
- `api-express/servidor.js` (aplicar na rota)
- `tests/unit/api-express/utils/regras-auth.test.js`

**Esforço:** 2-3 horas

---

#### Validação Sprint 7
- ✅ 55 testes em `regras-auth.test.js` passando
- ✅ Bug 1: Filtragem por ID (UUID) ✅ Implementado
- ✅ Bug 2: Validação de Membro ✅ Implementado
- ✅ Bug 3: Rota PUT para edição ✅ Implementado
- ✅ Bug 4: Detecção de duplicação ✅ Implementado
- ✅ Foreign keys configuradas no Supabase
- ✅ Formulário usando select com UUIDs
- ✅ Modal de edição com suporte a atualização parcial
- ✅ Modal de aviso para contribuições duplicadas
- ✅ Testes de hash para verificação de duplicação

#### Entregável
- ✅ Versão `v7.0.0` com todos os 4 bugs corrigidos e testes passando

---

### Sprint 8: Relatórios Financeiros + Ampliação de Testes 📊

**Período:** Semana 3-4  
**Prioridade:** ⚠️ ALTA  
**Status:** ✅ Concluído (10 de abril)  
**Responsável:** Fernando, Gabriel

#### Objetivo
Entregar 6 relatórios financeiros consolidados + aumentar cobertura de testes para 85%+.

#### Implementação Concluída

**Backend - 6 Endpoints REST:**
- ✅ GET /api/relatorios/resumo-mensal (agregação mensal com tipos)
- ✅ GET /api/relatorios/historico/:membro_id (histórico detalhado)
- ✅ GET /api/relatorios/comparativo-anual (year-over-year com %)
- ✅ GET /api/relatorios/top-contribuintes (ranking de contribuidores)
- ✅ GET /api/relatorios/inadimplentes (membros com atraso)
- ✅ GET /api/relatorios/fluxo-caixa (dia a dia com saldo acumulado)

**Tecnologias Integradas:**
- ✅ FastAPI: api-fastapi/servidor.py + api-fastapi/relatorios_utils.py
- ✅ Express.js: api-express/routes/relatorios.js + api-express/utils/relatorios-utils.js
- ✅ Chart.js 4.4.1: gráficos interativos (bar, line, table)
- ✅ jsPDF 2.5.1: exportação para PDF com paginação automática
- ✅ html2canvas 1.4.1: captura de elementos para PDF

**Frontend - Interface Completa:**
- ✅ public/igreja/relatorios.html: seletor de 6 tipos de relatórios
- ✅ public/igreja/relatorios.js: lógica de geração, visualização e exportação
- ✅ public/igreja/relatorios.css: estilos responsivos (mobile, tablet, desktop)
- ✅ Filtros dinâmicos por tipo (data, período, limite, etc)
- ✅ 6 gráficos diferentes renderizados com Chart.js
- ✅ Exportação PDF com cabeçalho, data e paginação

**Testes (36 novos - Sprint 8 + 55 Sprint 7 = 91 total):**
- ✅ tests/unit/api-fastapi/relatorios.test.js: 36 testes abrangentes
  - T1-T5: Resumo Mensal (testes de agrupamento, totalizações)
  - T6-T11: Histórico Membro (validação, filtros, ordenação)
  - T12-T16: Comparativo Anual (anos, meses, % variação)
  - T17-T22: Top Contribuintes (ranking, limite, período)
  - T23-T28: Inadimplentes (dias atraso, datas, totalizações)
  - T29-T34: Fluxo de Caixa (saldo acumulado, detalhes)
  - T35-T36: Tratamento de erros (consistência)
  - I1-I2: Testes de integração (compatibilidade entre endpoints)

**Cobertura de Testes Alcançada:**
- Sprint 7 + 8: 91 testes total passando
- Cobertura geral: ~85%
  - Backend (FastAPI/Express): 90% cobertura
  - Utilitários: 85% cobertura
  - Rotas: 80% cobertura
  - Frontend: 70% cobertura

**Validação Sprint 8 ✅:**
- ✅ 36 novos testes passando 100%
- ✅ 6 endpoints gerando dados corretamente
- ✅ PDFs exportáveis com qualidade
- ✅ Gráficos Chart.js renderizam sem erros
- ✅ Filtros de período funcionam
- ✅ Cobertura testes ≥ 85%
- ✅ npm test = 91 testes passando
- ✅ Commit git concluído

**Entregável:** v8.0.0 ✅ Concluído

---

### Sprint 9: Autenticação na Borda + PWA 🔐

**Período:** Semana 5-6  
**Status:** 🟡 Não Iniciado  

**Tasks:**
- Centralizar JWT na API Gateway
- Implementar token blacklist (revogação)
- Criar Service Worker + manifest.json
- PWA instalável offline

**Entregável:** v9.0.0-RC1

---

### Sprint 10: Notificações Push 🔔

**Período:** Semana 7-8  
**Status:** 🟡 Não Iniciado  

**Tasks:**
- Firebase Cloud Messaging integrado
- Novo microserviço: notification-service
- 6 gatilhos de notificação
- Preferências por membro

**Entregável:** v10.0.0-RC1

---

### Sprint 11: Gateway de Pagamento Online 💳

**Período:** Semana 9-10  
**Status:** 🟡 Não Iniciado  

**Tasks:**
- Integrar Mercado Pago (recomendado)
- Novo microserviço: payment-service
- Fluxo Pix (QR Code 0%)
- Fluxo Cartão de Crédito (3,99%)
- Webhook de confirmação

**Entregável:** v11.0.0-RC1

---

### Sprint 12: Testes E2E + Refinamento Final ✅

**Período:** Semana 11-12  
**Status:** 🟡 Não Iniciado  

**Tasks:**
- 5 cenários E2E com Playwright
- Audit Lighthouse (Performance ≥ 90)
- Stress test (100 usuários)
- Documentação final
- **RELEASE PRODUÇÃO**

**Entregável:** v12.0.0 (Produção)

---

## 🔗 Dependências Entre Sprints

```
Sprint 7 (Bugs) → Libera Sprint 8
Sprint 8 (Relatórios) → Libera Sprint 11 (Payment)
Sprint 9 (Auth + PWA) → Libera Sprint 10 (Notificações)
Sprint 10, 11 → Libera Sprint 12 (E2E)
```

**Parallelização possível:**
- Sprint 8 e 9 podem rodar em paralelo
- Sprint 10 e 11 podem rodar em paralelo

---

## ✅ Verificação e Validação

### Por Sprint

#### Sprint 7 Checklist
- [ ] Testes `regras-auth.test.js` passando 100%
- [ ] Foreign keys criadas no Supabase
- [ ] Formulário usando UUIDs (não strings)
- [ ] Rota PUT testada
- [ ] Modal de edição funcional
- [ ] Contribuições duplicadas detectadas
- [ ] Deploy staging OK
- [ ] Equipe validou todos os bugs

#### Sprint 8 Checklist
- [ ] 6 relatórios gerando dados
- [ ] PDFs exportáveis
- [ ] Gráficos Chart.js renderizam
- [ ] Filtros período funcionam
- [ ] Cobertura testes ≥ 85%
- [ ] `npm test` 100% passing
- [ ] Deploy staging OK

---

## 🚀 Getting Started - Sprint 7

### Pré-requisitos

- Git instalado
- Node.js 18+
- npm 9+
- Acesso ao repositório
- Credenciais Supabase configuradas

### Setup Inicial

1. **Clonar e atualizar repo:**
   ```bash
   cd /home/garf/Projetos/estudos/congregafiel
   git fetch origin
   git checkout develop
   git pull origin develop
   ```

2. **Criar feature branch:**
   ```bash
   git checkout -b feature/sprint-7-bugs-pagamentos
   ```

3. **Instalar dependências:**
   ```bash
   npm install
   cd api-express && npm install && cd ..
   ```

4. **Validar baseline:**
   ```bash
   npm test
   # Deve exibir: 9 testes passando
   ```

---

## 📂 Arquivos Críticos

### Sprint 7 - Bugs Pagamentos
```
public/igreja/pagamentos.html
public/igreja/pagamentos.js
public/igreja/pagamentos.css
api-express/servidor.js
api-express/utils/regras-auth.js
api-express/utils/regras-auth.test.js
database/schema.sql
```

---

## 📊 Métricas de Progresso

| Sprint | Status | Testes | Cobertura |
|--------|--------|--------|-----------|
| 7 | ✅ Concluído | +22 novos (total 55) | ~60% |
| 8 | 🟡 Não Iniciado | +3 | 80% |
| 9 | 🟡 Não Iniciado | +1 | 80% |
| 10 | 🟡 Não Iniciado | +1 | 80% |
| 11 | 🟡 Não Iniciado | +1 | 85% |
| 12 | 🟡 Não Iniciado | 5 E2E | 90% |

---

**Documento versão 1.1 - 10/04/2026**  
**Status:** Sprint 7 Concluída ✅ | Sprint 8-12 Em Planejamento
