# CongregaFiel

**Sistema web para gestao de comunidades eclesiasticas**

O CongregaFiel centraliza a gestao administrativa e pastoral de igrejas em um unico ambiente web. O projeto evoluiu do MVP estatico inicial para uma arquitetura com frontend em JavaScript puro, APIs separadas e camada de gateway.

> Projeto academico desenvolvido como requisito parcial para aprovacao no Curso Superior de Tecnologia em Analise e Desenvolvimento de Sistemas da Faculdade INSTED, Campo Grande/MS, 2026.

## Visao Geral

O sistema atende dois perfis principais:

- `Pastor/Lider`: cadastra igreja, gerencia membros, eventos, contribuicoes, comunicados e pedidos de oracao.
- `Fiel/Membro`: acessa perfil, acompanha eventos, historico financeiro, comunicados e pedidos de oracao.

## Funcionalidades

- Autenticacao com cadastro, login e recuperacao de senha.
- Cadastro e administracao de igrejas e membros.
- Registro de contribuicoes financeiras.
- Gestao de eventos e comunicados.
- Pedidos de oracao com filtros e respostas.
- Mapa interativo de igrejas com geolocalizacao.
- Convite por QR Code.
- Linha do tempo de eventos.
- Perfil do membro com edicao de dados.
- Testes unitarios para servicos e utilitarios centrais.

## Arquitetura Atual

### Frontend

- `HTML5`, `CSS3` e `JavaScript` puro.
- Paginas em [`public`](/C:/github/rep/congregafiel/public) para autenticacao, painel da igreja e painel do membro.
- Servicos compartilhados em [`public/js/servicos`](/C:/github/rep/congregafiel/public/js/servicos).
- Utilitarios de interface e regras de negocio em [`public/js/utils`](/C:/github/rep/congregafiel/public/js/utils).

### Backends

- [`api-express`](/C:/github/rep/congregafiel/api-express): API Gateway em `Express.js`, com `JWT`, `rate limit`, `logging`, `request id` e `circuit breaker`.
- [`api-fastapi`](/C:/github/rep/congregafiel/api-fastapi): backend principal em `FastAPI`.
- [`microservices`](/C:/github/rep/congregafiel/microservices): evolucao da arquitetura para gateway dedicado e servicos separados por dominio.

### Persistencia e Infraestrutura

- `Supabase` para banco de dados e autenticacao.
- `Firebase Hosting` para frontend.
- Deploy de APIs em `Vercel` e configuracao adicional em [`render.yaml`](/C:/github/rep/congregafiel/render.yaml).

### Testes

- `Vitest` como framework de testes unitarios.
- Casos em [`tests/unit`](/C:/github/rep/congregafiel/tests/unit), cobrindo frontend e utilitarios da API Express.

## Estrutura do Repositorio

```text
congregafiel/
|-- public/               Frontend estatico do sistema
|-- api-express/          API Gateway em Express.js
|-- api-fastapi/          Backend principal em FastAPI
|-- microservices/        Gateway e servicos por dominio
|-- tests/                Testes unitarios
|-- docs/                 PDFs e documentos das sprints
|-- database/             Artefatos e scripts de banco
|-- render.yaml           Configuracao de deploy
`-- package.json          Scripts de teste do repositorio
```

## Como Executar

### Frontend

Abra [`public/index.html`](/C:/github/rep/congregafiel/public/index.html) no navegador ou sirva a pasta `public` com um servidor local.

### Instalar dependencias do repositorio raiz

```bash
npm install
```

### Rodar testes

```bash
npm test
```

Scripts disponiveis:

- `npm test`: roda toda a suite.
- `npm run test:frontend`: roda os testes do frontend.
- `npm run test:backend`: roda os testes da API Express.

### Subprojetos

Cada backend possui dependencias proprias:

- `api-express`: `npm install` e `npm start`
- `api-fastapi`: `pip install -r requirements.txt`
- `microservices/api-gateway`: `npm install` e `npm start`

## Linha do Tempo do Projeto

| Sprint | Periodo | Entregas principais |
|--------|---------|---------------------|
| 1 | 24/02/2026 a 02/03/2026 | Definicao do MVP, requisitos e arquitetura inicial |
| 2 | 03/03/2026 a 09/03/2026 | Deploy online, APIs Express/FastAPI, Supabase e autenticacao |
| 3 | 10/03/2026 a 16/03/2026 | Mapa interativo, QR Code, linha do tempo e melhorias de UX |
| 4 | 17/03/2026 a 23/03/2026 | Refinamentos, responsividade e consolidacao dos fluxos |
| 5 | 24/03/2026 a 30/03/2026 | Testes unitarios com Vitest |
| 6 | Pos-30/03/2026 | Evolucao para API Gateway Edge e microservicos no codigo atual |

## Equipe

| Integrante | Area(s) |
|------------|---------|
| Catieli Gama Cora | Documentacao |
| Fernando Alves da Nobrega | Documentacao / Front-End |
| Gabriel Franklin Barcellos | Front-End / Back-End |
| Jhenniffer Lopes da Silva Vargas | Documentacao / Front-End |
| Joao Pedro Aranda | Back-End / Testes |

## Situacao Atual da Documentacao

Os arquivos em [`docs`](/C:/github/rep/congregafiel/docs) e a documentacao em PDF consolidam o projeto ate a Sprint 5. O codigo atual ja inclui avancos adicionais de gateway e microservicos, por isso a linha do tempo do repositorio vai alem da documentacao academica consolidada.
