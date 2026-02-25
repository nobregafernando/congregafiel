# CongregaFiel

**Sistema Web para Gestao de Comunidades Eclesiasticas**

Plataforma digital que centraliza a gestao administrativa e pastoral de igrejas em um unico ambiente web, funcionando como uma rede social privada para cada congregacao.

> Produto Minimo Viavel (MVP) desenvolvido como requisito parcial para aprovacao no Curso Superior de Tecnologia em Analise e Desenvolvimento de Sistemas da **FACULDADE INSTED** - Campo Grande/MS, 2026.

---

## Sobre o Projeto

Igrejas de pequeno e medio porte enfrentam desafios na gestao de membros, controle financeiro, organizacao de eventos e comunicacao interna. O CongregaFiel resolve esses problemas oferecendo:

- **Centralizacao** - Membros, financas, eventos e comunicados em um so lugar
- **Privacidade** - Cada igreja possui seu ambiente isolado
- **Simplicidade** - Interface intuitiva para usuarios com diferentes niveis de familiaridade tecnologica
- **Acessibilidade** - Sistema responsivo para desktop, tablet e smartphone

---

## Funcionalidades do MVP

### Perfis de Acesso

| Perfil | Descricao |
|--------|-----------|
| **Pastor/Lider** (Admin) | Acesso completo: cadastra igreja, gerencia membros, registra pagamentos, cria eventos e envia comunicados |
| **Fiel/Membro** | Acesso ao perfil pessoal, visualizacao de eventos, historico de contribuicoes e comunicados |

### Modulos

- **Autenticacao** - Cadastro, login, logout e recuperacao de senha com diferenciacao de perfis
- **Gestao da Igreja** - Cadastro e configuracao da congregacao pelo pastor
- **Gestao de Membros** - Cadastro, listagem com filtros, edicao e exclusao de fieis
- **Gestao Financeira** - Registro de dizimos, ofertas e doacoes com historico por membro
- **Eventos** - Criacao e divulgacao de eventos com data, horario, local e descricao
- **Comunicados** - Envio de avisos e informacoes para os membros
- **Pedidos de Oracao** - Espaco para solicitacoes de oracao da comunidade

---

## Tecnologias

| Camada | Tecnologia |
|--------|------------|
| Estrutura | HTML5 |
| Estilizacao | CSS3 (Flexbox, Grid Layout) |
| Logica | JavaScript (ES6+) |
| Armazenamento (MVP) | LocalStorage / SessionStorage |
| API Simulada | JSON Server |

### Ferramentas de Apoio

| Ferramenta | Finalidade |
|------------|------------|
| VS Code | Editor de codigo |
| Git / GitHub | Controle de versao |
| Figma | Prototipacao de telas |
| Trello | Gerenciamento de tarefas |

---

## Estrutura do Projeto

```
congregafiel/
├── index.html                  # Landing page
├── index.css                   # Estilos da landing page
├── index.js                    # Logica da landing page
├── autenticacao/
│   ├── login.html              # Tela de login
│   ├── criar-conta.html        # Tela de cadastro
│   └── recuperar-senha.html    # Recuperacao de senha
├── igreja/                     # Area do Pastor (Admin)
│   ├── painel.html / .css / .js        # Painel administrativo
│   ├── fieis.html / .css / .js         # Gestao de membros
│   ├── pagamentos.html / .css          # Gestao financeira
│   ├── eventos.html / .css / .js       # Gestao de eventos
│   ├── comunicados.html / .css         # Comunicados
│   └── pedidos-oracao.html / .css      # Pedidos de oracao
├── membros/                    # Area do Fiel (Membro)
│   ├── painel.html / .css / .js        # Painel do membro
│   ├── pagamentos.html / .css / .js    # Historico de contribuicoes
│   ├── eventos.html / .css / .js       # Visualizacao de eventos
│   └── comunicados.html                # Comunicados recebidos
└── Documentacao_CongregaFiel_MVP.docx  # Documentacao tecnica
```

---

## Como Executar

1. Clone o repositorio:
   ```bash
   git clone https://github.com/nobregafernando/congregafiel.git
   ```

2. Abra o arquivo `index.html` no navegador ou utilize um servidor local:
   ```bash
   # Com Python
   python -m http.server 8000

   # Ou com VS Code Live Server
   # Instale a extensao "Live Server" e clique em "Go Live"
   ```

3. Acesse `http://localhost:8000` no navegador.

---

## Cronograma de Desenvolvimento

| Sprint | Periodo | Atividades |
|--------|---------|------------|
| Sprint 1 | 24/02 - 02/03 | Documentacao, requisitos, escopo e prototipacao (Figma) |
| Sprint 2 | 03/03 - 09/03 | Estrutura HTML, estilizacao CSS e modulo de autenticacao |
| Sprint 3 | 10/03 - 16/03 | Modulos de membros, financeiro e eventos; integracao com API |
| Sprint 4 | 17/03 - 23/03 | Integracao final, testes, correcoes e documentacao final |

---

## Equipe de Desenvolvimento

| Integrante | Area(s) |
|------------|---------|
| **Catieli Gama Cora** | Documentacao |
| **Fernando Alves da Nobrega** | Documentacao / Front-End |
| **Gabriel Franklin Barcellos** | Front-End / Back-End |
| **Jhenniffer Lopes da Silva Vargas** | Documentacao / Front-End |
| **Joao Pedro Aranda** | Back-End |

---

## Proximos Passos (Pos-MVP)

- Back-end robusto com banco de dados
- Integracao com gateways de pagamento online
- Aplicativo mobile nativo (Android/iOS)
- Chat/mensagens em tempo real
- Notificacoes push
- Geracao de relatorios em PDF
- Modulo de escola biblica
- Integracao com Google Calendar

---

## Licenca

Projeto academico desenvolvido na FACULDADE INSTED - Campo Grande/MS, 2026.
