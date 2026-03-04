from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
import os

doc = Document()

style = doc.styles['Normal']
font = style.font
font.name = 'Times New Roman'
font.size = Pt(12)
style.paragraph_format.line_spacing = 1.5
style.paragraph_format.space_after = Pt(0)

for section in doc.sections:
    section.top_margin = Cm(3)
    section.bottom_margin = Cm(2)
    section.left_margin = Cm(3)
    section.right_margin = Cm(2)

def add_cover_line(text, size=12, bold=False, space_after=0):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(space_after)
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.bold = bold
    run.font.name = 'Times New Roman'
    return p

def add_heading_custom(text, level=1):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.color.rgb = RGBColor(0, 0, 0)
        run.font.name = 'Times New Roman'
    return h

def add_body(text, bold=False, indent=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    if indent:
        p.paragraph_format.first_line_indent = Cm(1.25)
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    run.bold = bold
    return p

def add_bullet(text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_after = Pt(4)
    p.clear()
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    return p

def make_table(headers, data):
    table = doc.add_table(rows=len(data) + 1, cols=len(headers))
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = h
        for paragraph in cell.paragraphs:
            for run in paragraph.runs:
                run.bold = True
                run.font.name = 'Times New Roman'
                run.font.size = Pt(10)
    for row_idx, row_data in enumerate(data):
        for col_idx, text in enumerate(row_data):
            cell = table.rows[row_idx + 1].cells[col_idx]
            cell.text = text
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(10)
    doc.add_paragraph()
    return table

# ==================== CAPA ====================
for _ in range(3):
    doc.add_paragraph()
add_cover_line('FACULDADE INSTED', 14, True, 6)
add_cover_line('Curso Superior de Tecnologia em Analise e Desenvolvimento de Sistemas', 12, False, 40)
add_cover_line('CONGREGA FIEL', 16, True, 6)
add_cover_line('Sistema Web para Gestao de', 14, False, 0)
add_cover_line('Comunidades Eclesiasticas', 14, False, 30)
add_cover_line('Relatorio da Sprint 2 - Semana 2', 13, True, 40)
add_cover_line('Catieli Gama Cora', 12, False, 2)
add_cover_line('Fernando Alves da Nobrega', 12, False, 2)
add_cover_line('Gabriel Franklin Barcellos', 12, False, 2)
add_cover_line('Jhenniffer Lopes da Silva Vargas', 12, False, 2)
add_cover_line('Joao Pedro Aranda', 12, False, 40)
add_cover_line('Campo Grande - MS', 12, False, 2)
add_cover_line('2026', 12, False, 0)
doc.add_page_break()

# ==================== FOLHA DE ROSTO ====================
for _ in range(3):
    doc.add_paragraph()
add_cover_line('CONGREGA FIEL', 16, True, 6)
add_cover_line('Sistema Web para Gestao de Comunidades Eclesiasticas', 13, False, 20)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
p.paragraph_format.left_indent = Cm(8)
p.paragraph_format.space_after = Pt(20)
run = p.add_run('Relatorio tecnico da Sprint 2 apresentado como requisito parcial para aprovacao no Curso Superior de Tecnologia em Analise e Desenvolvimento de Sistemas da FACULDADE INSTED.')
run.font.name = 'Times New Roman'
run.font.size = Pt(11)
add_cover_line('Equipe de Desenvolvimento', 12, True, 10)
add_cover_line('Catieli Gama Cora', 12, False, 2)
add_cover_line('Fernando Alves da Nobrega', 12, False, 2)
add_cover_line('Gabriel Franklin Barcellos', 12, False, 2)
add_cover_line('Jhenniffer Lopes da Silva Vargas', 12, False, 2)
add_cover_line('Joao Pedro Aranda', 12, False, 40)
add_cover_line('Campo Grande - MS', 12, False, 2)
add_cover_line('2026', 12, False, 0)
doc.add_page_break()

# ==================== SUMARIO ====================
add_heading_custom('SUMARIO', 1)
add_body('Abra no Word e pressione F9 para gerar o sumario linkado.')
doc.add_page_break()

# ==================== 1 INTRODUCAO ====================
add_heading_custom('1  INTRODUCAO', 1)
add_body('Este documento apresenta o relatorio tecnico da Sprint 2 do projeto Congrega Fiel, correspondente ao periodo de 03 a 09 de marco de 2026. Nesta etapa, o foco principal foi a implantacao da infraestrutura de producao do sistema, abrangendo quatro grandes entregas: a hospedagem do front-end com Firebase Hosting (deploy online), a criacao do banco de dados relacional com Supabase (PostgreSQL na nuvem), e a implementacao de duas Web APIs REST - uma com Express.js (Node.js) e outra com FastAPI (Python) - ambas conectadas ao banco de dados Supabase.', indent=True)
add_body('Alem disso, foram mantidas as melhorias da arquitetura orientada a servicos (SOA) implementadas anteriormente, com a separacao completa de responsabilidades nos arquivos do projeto e a eliminacao de codigo duplicado por meio de servicos compartilhados.', indent=True)
add_body('A Sprint 2 marca a transicao do projeto da fase de prototipacao (Sprint 1) para a fase de desenvolvimento tecnico efetivo, com a aplicacao saindo do ambiente local para um ambiente de producao real, com banco de dados na nuvem e APIs funcionais.', indent=True)

# ==================== 2 OBJETIVOS ====================
add_heading_custom('2  OBJETIVOS DA SPRINT 2', 1)
add_body('Os objetivos definidos para esta sprint foram:', indent=True)
add_bullet('Hospedar o sistema online utilizando Firebase Hosting (deploy em producao);')
add_bullet('Criar o banco de dados relacional na nuvem com Supabase (PostgreSQL);')
add_bullet('Modelar e implementar o schema do banco com 6 tabelas, indices, triggers e RLS;')
add_bullet('Implementar uma API REST completa com Express.js (Node.js) conectada ao Supabase;')
add_bullet('Implementar uma API REST equivalente com FastAPI (Python) conectada ao Supabase;')
add_bullet('Criar endpoints CRUD para todos os 6 modulos do sistema;')
add_bullet('Implementar a Arquitetura Orientada a Servicos (SOA) com servicos compartilhados no front-end;')
add_bullet('Separar CSS e JavaScript inline em arquivos externos nas paginas de autenticacao;')
add_bullet('Garantir o padrao de um arquivo HTML, um CSS e um JS por pagina;')
add_bullet('Documentar os endpoints, modelos de dados e instrucoes de execucao.')

# ==================== 3 FIREBASE HOSTING ====================
add_heading_custom('3  FIREBASE HOSTING - DEPLOY EM PRODUCAO', 1)
add_body('Para viabilizar o acesso online ao sistema, foi configurado o Firebase Hosting como plataforma de hospedagem. O Firebase Hosting e um servico de hospedagem de conteudo estatico fornecido pelo Google, que oferece CDN global, certificado SSL automatico e deploy rapido via linha de comando.', indent=True)

add_heading_custom('3.1  Processo de Configuracao', 2)
add_body('O processo de implantacao envolveu as seguintes etapas:', indent=True)
add_bullet('Instalacao do Firebase SDK: npm install firebase;')
add_bullet('Instalacao do Firebase CLI: npm install -g firebase-tools;')
add_bullet('Autenticacao na conta Google via firebase login;')
add_bullet('Inicializacao do projeto com firebase init, selecionando o servico Hosting;')
add_bullet('Configuracao do diretorio publico como /public/;')
add_bullet('Migracao de todos os arquivos do site para a pasta public/;')
add_bullet('Deploy em producao via firebase deploy.')

add_heading_custom('3.2  Configuracao (firebase.json)', 2)
add_body('O arquivo firebase.json foi configurado com suporte a clean URLs, que permite navegar sem a extensao .html nas URLs (ex: /login em vez de /login.html):', indent=True)
add_body('{ "hosting": { "public": "public", "ignore": ["firebase.json", "**/.*", "**/node_modules/**"], "cleanUrls": true } }')

add_heading_custom('3.3  Resultado', 2)
add_body('Apos o deploy, o sistema ficou acessivel publicamente via URL fornecida pelo Firebase, com certificado HTTPS ativo automaticamente. O projeto foi registrado no Firebase com o identificador "congregafiel".', indent=True)

# ==================== 4 SUPABASE ====================
add_heading_custom('4  SUPABASE - BANCO DE DADOS NA NUVEM', 1)
add_body('O Supabase e uma plataforma open-source que oferece banco de dados PostgreSQL na nuvem, autenticacao, APIs em tempo real e armazenamento de arquivos. Foi escolhido como solucao de banco de dados do projeto por oferecer uma camada gratuita generosa, interface visual para gerenciamento, e integracao simples com APIs REST.', indent=True)

add_heading_custom('4.1  Configuracao do Projeto', 2)
add_body('Foi criado um projeto no Supabase com as seguintes credenciais de acesso:', indent=True)
add_bullet('URL do projeto: https://wrhcwejbvbxjymnhiywy.supabase.co;')
add_bullet('Chave publica (anon key): utilizada pelo front-end para operacoes publicas;')
add_bullet('Chave secreta (service role key): utilizada pelo back-end para operacoes administrativas que contornam o RLS.')
add_body('As credenciais sao armazenadas em arquivos .env (nao versionados) seguindo boas praticas de seguranca. Um arquivo .env.example foi criado como modelo.', indent=True)

add_heading_custom('4.2  Schema do Banco de Dados', 2)
add_body('O banco de dados foi modelado com 6 tabelas relacionais que refletem os modulos do sistema:', indent=True)

make_table(
    ['Tabela', 'Descricao', 'Chave Primaria', 'Relacionamentos'],
    [
        ['igrejas', 'Cadastro das igrejas', 'UUID (auto)', 'Referenciada por todas as outras tabelas'],
        ['membros', 'Membros das igrejas', 'UUID (auto)', 'FK igreja_id -> igrejas(id) ON DELETE CASCADE'],
        ['eventos', 'Eventos das igrejas', 'UUID (auto)', 'FK igreja_id -> igrejas(id) ON DELETE CASCADE'],
        ['contribuicoes', 'Dizimos, ofertas e doacoes', 'UUID (auto)', 'FK membro_id -> membros(id), FK igreja_id -> igrejas(id)'],
        ['comunicados', 'Comunicados das igrejas', 'UUID (auto)', 'FK igreja_id -> igrejas(id) ON DELETE CASCADE'],
        ['pedidos_oracao', 'Pedidos de oracao', 'UUID (auto)', 'FK membro_id -> membros(id), FK igreja_id -> igrejas(id)'],
    ]
)

add_heading_custom('4.3  Detalhamento das Tabelas', 2)

add_body('4.3.1  Tabela: igrejas', bold=True)
make_table(
    ['Campo', 'Tipo', 'Restricao', 'Descricao'],
    [
        ['id', 'UUID', 'PK, DEFAULT uuid_generate_v4()', 'Identificador unico'],
        ['nome', 'VARCHAR(200)', 'NOT NULL', 'Nome da igreja'],
        ['endereco', 'TEXT', 'DEFAULT vazio', 'Endereco completo'],
        ['descricao', 'TEXT', 'DEFAULT vazio', 'Descricao da igreja'],
        ['codigo', 'VARCHAR(10)', 'UNIQUE, NOT NULL', 'Codigo unico (ex: CF1234)'],
        ['nome_pastor', 'VARCHAR(200)', 'DEFAULT vazio', 'Nome do pastor responsavel'],
        ['email', 'VARCHAR(200)', '-', 'E-mail de contato'],
        ['senha_hash', 'TEXT', '-', 'Hash da senha para autenticacao'],
        ['criado_em', 'TIMESTAMPTZ', 'DEFAULT NOW()', 'Data de criacao'],
        ['atualizado_em', 'TIMESTAMPTZ', 'DEFAULT NOW()', 'Data da ultima atualizacao'],
    ]
)

add_body('4.3.2  Tabela: membros', bold=True)
make_table(
    ['Campo', 'Tipo', 'Restricao', 'Descricao'],
    [
        ['id', 'UUID', 'PK, DEFAULT uuid_generate_v4()', 'Identificador unico'],
        ['nome_completo', 'VARCHAR(200)', 'NOT NULL', 'Nome completo do membro'],
        ['email', 'VARCHAR(200)', '-', 'E-mail do membro'],
        ['telefone', 'VARCHAR(20)', 'DEFAULT vazio', 'Telefone de contato'],
        ['tipo', 'VARCHAR(20)', 'CHECK (pastor, membro)', 'Tipo de usuario'],
        ['senha_hash', 'TEXT', '-', 'Hash da senha'],
        ['igreja_id', 'UUID', 'FK NOT NULL, CASCADE', 'Igreja vinculada'],
        ['codigo_igreja', 'VARCHAR(10)', '-', 'Codigo da igreja'],
        ['criado_em', 'TIMESTAMPTZ', 'DEFAULT NOW()', 'Data de criacao'],
        ['atualizado_em', 'TIMESTAMPTZ', 'DEFAULT NOW()', 'Data da ultima atualizacao'],
    ]
)

add_body('4.3.3  Tabela: eventos', bold=True)
make_table(
    ['Campo', 'Tipo', 'Restricao', 'Descricao'],
    [
        ['id', 'UUID', 'PK, DEFAULT uuid_generate_v4()', 'Identificador unico'],
        ['titulo', 'VARCHAR(200)', 'NOT NULL', 'Titulo do evento'],
        ['descricao', 'TEXT', 'DEFAULT vazio', 'Descricao do evento'],
        ['data', 'DATE', 'NOT NULL', 'Data no formato AAAA-MM-DD'],
        ['horario', 'VARCHAR(10)', 'DEFAULT vazio', 'Horario do evento'],
        ['local', 'VARCHAR(300)', 'DEFAULT vazio', 'Local de realizacao'],
        ['igreja_id', 'UUID', 'FK NOT NULL, CASCADE', 'Igreja organizadora'],
        ['criado_em', 'TIMESTAMPTZ', 'DEFAULT NOW()', 'Data de criacao'],
        ['atualizado_em', 'TIMESTAMPTZ', 'DEFAULT NOW()', 'Data da ultima atualizacao'],
    ]
)

add_body('4.3.4  Tabela: contribuicoes', bold=True)
make_table(
    ['Campo', 'Tipo', 'Restricao', 'Descricao'],
    [
        ['id', 'UUID', 'PK, DEFAULT uuid_generate_v4()', 'Identificador unico'],
        ['membro_id', 'UUID', 'FK NOT NULL, CASCADE', 'Membro contribuinte'],
        ['igreja_id', 'UUID', 'FK NOT NULL, CASCADE', 'Igreja vinculada'],
        ['membro_nome', 'VARCHAR(200)', 'DEFAULT vazio', 'Nome do membro'],
        ['tipo', 'VARCHAR(20)', 'CHECK (dizimo, oferta, doacao, outro)', 'Tipo da contribuicao'],
        ['valor', 'DECIMAL(10,2)', 'NOT NULL, CHECK > 0', 'Valor da contribuicao'],
        ['data', 'DATE', 'DEFAULT CURRENT_DATE', 'Data da contribuicao'],
        ['descricao', 'TEXT', 'DEFAULT vazio', 'Descricao adicional'],
        ['criado_em', 'TIMESTAMPTZ', 'DEFAULT NOW()', 'Data de criacao'],
        ['atualizado_em', 'TIMESTAMPTZ', 'DEFAULT NOW()', 'Data da ultima atualizacao'],
    ]
)

add_body('4.3.5  Tabela: comunicados', bold=True)
make_table(
    ['Campo', 'Tipo', 'Restricao', 'Descricao'],
    [
        ['id', 'UUID', 'PK, DEFAULT uuid_generate_v4()', 'Identificador unico'],
        ['igreja_id', 'UUID', 'FK NOT NULL, CASCADE', 'Igreja vinculada'],
        ['titulo', 'VARCHAR(200)', 'NOT NULL', 'Titulo do comunicado'],
        ['conteudo', 'TEXT', 'NOT NULL', 'Conteudo do comunicado'],
        ['prioridade', 'VARCHAR(10)', 'CHECK (normal, urgente)', 'Nivel de prioridade'],
        ['criado_em', 'TIMESTAMPTZ', 'DEFAULT NOW()', 'Data de criacao'],
        ['atualizado_em', 'TIMESTAMPTZ', 'DEFAULT NOW()', 'Data da ultima atualizacao'],
    ]
)

add_body('4.3.6  Tabela: pedidos_oracao', bold=True)
make_table(
    ['Campo', 'Tipo', 'Restricao', 'Descricao'],
    [
        ['id', 'UUID', 'PK, DEFAULT uuid_generate_v4()', 'Identificador unico'],
        ['igreja_id', 'UUID', 'FK NOT NULL, CASCADE', 'Igreja vinculada'],
        ['membro_id', 'UUID', 'FK NOT NULL, CASCADE', 'Membro solicitante'],
        ['membro_nome', 'VARCHAR(200)', 'DEFAULT vazio', 'Nome do membro'],
        ['pedido', 'TEXT', 'NOT NULL', 'Texto do pedido de oracao'],
        ['status', 'VARCHAR(20)', 'CHECK (pendente, orado, respondido)', 'Status do pedido'],
        ['criado_em', 'TIMESTAMPTZ', 'DEFAULT NOW()', 'Data de criacao'],
        ['atualizado_em', 'TIMESTAMPTZ', 'DEFAULT NOW()', 'Data da ultima atualizacao'],
    ]
)

add_heading_custom('4.4  Indices de Performance', 2)
add_body('Foram criados 8 indices para otimizar as consultas mais frequentes do sistema:', indent=True)
make_table(
    ['Indice', 'Tabela', 'Campo', 'Finalidade'],
    [
        ['idx_membros_igreja_id', 'membros', 'igreja_id', 'Buscar membros por igreja'],
        ['idx_eventos_igreja_id', 'eventos', 'igreja_id', 'Buscar eventos por igreja'],
        ['idx_eventos_data', 'eventos', 'data', 'Ordenar eventos por data'],
        ['idx_contribuicoes_igreja_id', 'contribuicoes', 'igreja_id', 'Buscar contribuicoes por igreja'],
        ['idx_contribuicoes_membro_id', 'contribuicoes', 'membro_id', 'Buscar contribuicoes por membro'],
        ['idx_comunicados_igreja_id', 'comunicados', 'igreja_id', 'Buscar comunicados por igreja'],
        ['idx_pedidos_oracao_igreja_id', 'pedidos_oracao', 'igreja_id', 'Buscar pedidos por igreja'],
        ['idx_pedidos_oracao_membro_id', 'pedidos_oracao', 'membro_id', 'Buscar pedidos por membro'],
    ]
)

add_heading_custom('4.5  Triggers e Funcoes', 2)
add_body('Foi criada a funcao atualizar_atualizado_em() em PL/pgSQL que atualiza automaticamente o campo atualizado_em com a data/hora atual toda vez que um registro e modificado. Essa funcao foi associada a triggers BEFORE UPDATE em todas as 6 tabelas, garantindo rastreabilidade das alteracoes sem necessidade de logica adicional no back-end.', indent=True)

add_heading_custom('4.6  Row Level Security (RLS)', 2)
add_body('O Row Level Security foi habilitado em todas as tabelas para garantir que os dados so possam ser acessados de forma controlada. O back-end utiliza a SUPABASE_SECRET_KEY (service role) que contorna o RLS automaticamente, enquanto futuros acessos diretos do front-end poderao ter politicas especificas definidas.', indent=True)

add_heading_custom('4.7  Dados Iniciais de Exemplo', 2)
add_body('O schema inclui insercoes de dados iniciais para facilitar testes e demonstracoes:', indent=True)
add_bullet('2 igrejas: Igreja Batista Central (SP) e Comunidade Evangelica Graca (RJ);')
add_bullet('4 membros: 2 pastores e 2 membros, vinculados as respectivas igrejas;')
add_bullet('3 eventos: culto dominical, estudo biblico e encontro de jovens;')
add_bullet('3 contribuicoes: dizimos e ofertas de diferentes membros;')
add_bullet('3 comunicados: com prioridades normal e urgente;')
add_bullet('3 pedidos de oracao: com status pendente e respondido.')

# ==================== 5 EXPRESS.JS ====================
add_heading_custom('5  WEB API COM EXPRESS.JS + SUPABASE', 1)

add_heading_custom('5.1  Visao Geral', 2)
add_body('Express.js e o framework web mais popular para Node.js, com mais de 60 mil estrelas no GitHub. Criado em 2010, e conhecido por sua abordagem minimalista e flexivel, permitindo criar APIs REST de forma rapida. Nesta sprint, a API Express.js foi implementada com conexao direta ao banco de dados Supabase, substituindo o armazenamento local por persistencia real na nuvem.', indent=True)

add_heading_custom('5.2  Configuracao e Dependencias', 2)
make_table(
    ['Pacote', 'Versao', 'Finalidade'],
    [
        ['express', '4.21.0', 'Framework web para criacao de rotas e middlewares'],
        ['cors', '2.8.5', 'Middleware para permitir requisicoes cross-origin'],
        ['@supabase/supabase-js', '2.45.0', 'Cliente oficial do Supabase para JavaScript'],
        ['dotenv', '16.4.0', 'Carregamento de variaveis de ambiente do .env'],
    ]
)

add_heading_custom('5.3  Estrutura de Arquivos', 2)
make_table(
    ['Arquivo', 'Descricao'],
    [
        ['api-express/package.json', 'Configuracao do projeto e dependencias npm'],
        ['api-express/servidor.js', 'Servidor principal com todas as rotas RESTful'],
        ['api-express/supabase.js', 'Cliente Supabase configurado com as credenciais do .env'],
        ['api-express/.env', 'Variaveis de ambiente (SUPABASE_URL, SUPABASE_SECRET_KEY)'],
    ]
)

add_heading_custom('5.4  Conexao com o Supabase', 2)
add_body('O arquivo supabase.js configura o cliente Supabase utilizando a biblioteca @supabase/supabase-js. As credenciais (URL e chave secreta) sao carregadas do arquivo .env pelo dotenv. Caso as variaveis nao estejam definidas, o servidor exibe uma mensagem de erro e encerra a execucao, evitando operacoes sem banco de dados.', indent=True)

add_heading_custom('5.5  Arquitetura do Servidor', 2)
add_body('O servidor Express.js segue uma arquitetura monolitica simples, adequada para o MVP. O arquivo servidor.js concentra a configuracao dos middlewares e todas as rotas organizadas por recurso. Todas as operacoes sao assincronas (async/await) e se comunicam diretamente com o Supabase via seu SDK.', indent=True)
add_body('Os middlewares configurados sao:', indent=True)
add_bullet('cors(): permite que o front-end acesse a API de qualquer origem;')
add_bullet('express.json(): interpreta automaticamente o corpo das requisicoes em JSON.')

add_heading_custom('5.6  Endpoints Implementados', 2)
add_body('A API Express implementa CRUD completo para 6 recursos mais 4 endpoints de autenticacao, totalizando 33 endpoints:', indent=True)

add_body('5.6.1  Igrejas (/api/igrejas)', bold=True)
make_table(
    ['Metodo', 'Endpoint', 'Descricao'],
    [
        ['GET', '/api/igrejas', 'Listar todas as igrejas'],
        ['GET', '/api/igrejas/:id', 'Buscar igreja por ID (UUID)'],
        ['POST', '/api/igrejas', 'Criar nova igreja (nome e codigo obrigatorios)'],
        ['PUT', '/api/igrejas/:id', 'Atualizar dados da igreja'],
        ['DELETE', '/api/igrejas/:id', 'Remover igreja e dados associados (CASCADE)'],
    ]
)

add_body('5.6.2  Membros (/api/membros)', bold=True)
make_table(
    ['Metodo', 'Endpoint', 'Descricao'],
    [
        ['GET', '/api/membros', 'Listar membros (filtros: igreja_id, tipo)'],
        ['GET', '/api/membros/:id', 'Buscar membro por ID (UUID)'],
        ['POST', '/api/membros', 'Criar novo membro (nome, email, igreja_id obrigatorios)'],
        ['PUT', '/api/membros/:id', 'Atualizar dados do membro'],
        ['DELETE', '/api/membros/:id', 'Remover membro'],
    ]
)

add_body('5.6.3  Eventos (/api/eventos)', bold=True)
make_table(
    ['Metodo', 'Endpoint', 'Descricao'],
    [
        ['GET', '/api/eventos', 'Listar eventos (filtro: igreja_id)'],
        ['GET', '/api/eventos/:id', 'Buscar evento por ID (UUID)'],
        ['POST', '/api/eventos', 'Criar evento (titulo, data, igreja_id obrigatorios)'],
        ['PUT', '/api/eventos/:id', 'Atualizar dados do evento'],
        ['DELETE', '/api/eventos/:id', 'Remover evento'],
    ]
)

add_body('5.6.4  Contribuicoes (/api/contribuicoes)', bold=True)
make_table(
    ['Metodo', 'Endpoint', 'Descricao'],
    [
        ['GET', '/api/contribuicoes', 'Listar contribuicoes (filtros: igreja_id, membro_id, tipo)'],
        ['GET', '/api/contribuicoes/:id', 'Buscar contribuicao por ID (UUID)'],
        ['POST', '/api/contribuicoes', 'Registrar contribuicao (membro_id, igreja_id, tipo, valor)'],
        ['DELETE', '/api/contribuicoes/:id', 'Remover contribuicao'],
    ]
)

add_body('5.6.5  Comunicados (/api/comunicados)', bold=True)
make_table(
    ['Metodo', 'Endpoint', 'Descricao'],
    [
        ['GET', '/api/comunicados', 'Listar comunicados (filtro: igreja_id)'],
        ['GET', '/api/comunicados/:id', 'Buscar comunicado por ID (UUID)'],
        ['POST', '/api/comunicados', 'Criar comunicado (igreja_id, titulo, conteudo obrigatorios)'],
        ['PUT', '/api/comunicados/:id', 'Atualizar comunicado'],
        ['DELETE', '/api/comunicados/:id', 'Remover comunicado'],
    ]
)

add_body('5.6.6  Pedidos de Oracao (/api/pedidos-oracao)', bold=True)
make_table(
    ['Metodo', 'Endpoint', 'Descricao'],
    [
        ['GET', '/api/pedidos-oracao', 'Listar pedidos (filtros: igreja_id, membro_id, status)'],
        ['GET', '/api/pedidos-oracao/:id', 'Buscar pedido por ID (UUID)'],
        ['POST', '/api/pedidos-oracao', 'Criar pedido (igreja_id, membro_id, pedido obrigatorios)'],
        ['PUT', '/api/pedidos-oracao/:id', 'Atualizar pedido/status'],
        ['DELETE', '/api/pedidos-oracao/:id', 'Remover pedido'],
    ]
)

add_body('5.6.7  Autenticacao (/api/auth)', bold=True)
make_table(
    ['Metodo', 'Endpoint', 'Descricao'],
    [
        ['POST', '/api/auth/registrar-igreja', 'Cadastrar nova igreja (cria conta Supabase Auth + igreja + pastor)'],
        ['POST', '/api/auth/registrar-membro', 'Cadastrar novo membro (valida codigo da igreja)'],
        ['POST', '/api/auth/login', 'Login unificado (identifica tipo: igreja ou membro)'],
        ['POST', '/api/auth/recuperar-senha', 'Enviar e-mail de recuperacao de senha via Supabase'],
    ]
)

add_heading_custom('5.7  Exemplo de Requisicao e Resposta', 2)
add_body('Exemplo de criacao de um membro via POST /api/membros:', indent=True)
add_body('Requisicao:', bold=True)
add_body('POST http://localhost:3000/api/membros')
add_body('Content-Type: application/json')
add_body('{ "nome_completo": "Ana Paula Silva", "email": "ana@email.com", "telefone": "(67) 99999-0004", "tipo": "membro", "igreja_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }')
add_body('Resposta (201 Created):', bold=True)
add_body('{ "id": "uuid-gerado-automaticamente", "nome_completo": "Ana Paula Silva", "email": "ana@email.com", "telefone": "(67) 99999-0004", "tipo": "membro", "igreja_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "criado_em": "2026-03-03T14:30:00+00:00", "atualizado_em": "2026-03-03T14:30:00+00:00" }')

# ==================== 6 FASTAPI ====================
add_heading_custom('6  WEB API COM FASTAPI + SUPABASE', 1)

add_heading_custom('6.1  Visao Geral', 2)
add_body('FastAPI e um framework moderno e de alta performance para criacao de APIs em Python, lancado em 2018. Baseado no padrao ASGI e no framework Starlette, utiliza tipagem nativa do Python e a biblioteca Pydantic para validacao automatica de dados. Seu principal diferencial e a geracao automatica de documentacao interativa nos padroes Swagger (OpenAPI) e ReDoc. Assim como a versao Express, esta API conecta-se diretamente ao banco de dados Supabase.', indent=True)

add_heading_custom('6.2  Configuracao e Dependencias', 2)
make_table(
    ['Pacote', 'Versao', 'Finalidade'],
    [
        ['fastapi', '0.115.0', 'Framework web com validacao automatica e documentacao'],
        ['uvicorn', '0.30.0', 'Servidor ASGI para executar a aplicacao'],
        ['pydantic', '2.9.0', 'Validacao e serializacao de dados com tipagem'],
        ['supabase', '2.9.1', 'Cliente oficial do Supabase para Python'],
        ['python-dotenv', '1.0.1', 'Carregamento de variaveis de ambiente do .env'],
    ]
)

add_heading_custom('6.3  Estrutura de Arquivos', 2)
make_table(
    ['Arquivo', 'Descricao'],
    [
        ['api-fastapi/servidor.py', 'Servidor principal com todas as rotas RESTful'],
        ['api-fastapi/modelos.py', 'Schemas Pydantic para validacao de dados'],
        ['api-fastapi/supabase_client.py', 'Cliente Supabase configurado com credenciais do .env'],
        ['api-fastapi/requirements.txt', 'Lista de dependencias Python'],
        ['api-fastapi/.env', 'Variaveis de ambiente (SUPABASE_URL, SUPABASE_SECRET_KEY)'],
    ]
)

add_heading_custom('6.4  Conexao com o Supabase', 2)
add_body('O arquivo supabase_client.py configura o cliente Supabase utilizando a biblioteca oficial supabase-py. As credenciais sao carregadas do .env pelo python-dotenv. Caso as variaveis nao estejam definidas, o sistema levanta um RuntimeError imediatamente, impedindo a inicializacao sem banco de dados.', indent=True)

add_heading_custom('6.5  Modelos de Dados (Pydantic)', 2)
add_body('O FastAPI utiliza modelos Pydantic para definir a estrutura dos dados esperados em cada requisicao. Isso garante validacao automatica: se um campo obrigatorio estiver ausente ou com tipo incorreto, a API retorna um erro 422 detalhado automaticamente, sem necessidade de codigo manual de validacao.', indent=True)

make_table(
    ['Recurso', 'Modelo de Criacao', 'Modelo de Atualizacao', 'Campos Validados'],
    [
        ['Igreja', 'IgrejaCriar', 'IgrejaAtualizar', 'nome (min 2 chars), codigo (obrigatorio)'],
        ['Membro', 'MembroCriar', 'MembroAtualizar', 'nome_completo (min 2), email, igreja_id'],
        ['Evento', 'EventoCriar', 'EventoAtualizar', 'titulo (min 2), data, igreja_id'],
        ['Contribuicao', 'ContribuicaoCriar', '-', 'membro_id, igreja_id, tipo, valor (> 0)'],
        ['Comunicado', 'ComunicadoCriar', 'ComunicadoAtualizar', 'igreja_id, titulo (min 2), conteudo'],
        ['Pedido de Oracao', 'PedidoOracaoCriar', 'PedidoOracaoAtualizar', 'igreja_id, membro_id, pedido'],
        ['Registrar Igreja', 'RegistrarIgrejaReq', '-', 'nome_pastor, nome_igreja, email, senha'],
        ['Registrar Membro', 'RegistrarMembroReq', '-', 'nome_completo, email, codigo_igreja, senha'],
        ['Login', 'LoginReq', '-', 'email, senha'],
        ['Recuperar Senha', 'RecuperarSenhaReq', '-', 'email'],
    ]
)

add_heading_custom('6.6  Endpoints Implementados', 2)
add_body('Os endpoints do FastAPI sao identicos aos do Express.js em termos de funcionalidade, com os mesmos 33 endpoints (29 CRUD + 4 autenticacao). A diferenca esta na nomenclatura dos campos (snake_case nativo do Python), na validacao automatica via Pydantic, e na organizacao por tags para a documentacao Swagger.', indent=True)
add_body('As tags organizam os endpoints em grupos na documentacao: Igrejas, Membros, Eventos, Contribuicoes, Comunicados, Pedidos de Oracao e Autenticacao.', indent=True)

add_body('6.6.1  Autenticacao (/api/auth)', bold=True)
add_body('Alem dos 29 endpoints CRUD identicos ao Express, o FastAPI tambem implementa os endpoints de autenticacao com validacao Pydantic:', indent=True)
make_table(
    ['Metodo', 'Endpoint', 'Modelo Pydantic'],
    [
        ['POST', '/api/auth/registrar-igreja', 'RegistrarIgrejaReq (nome_pastor, nome_igreja, email, senha)'],
        ['POST', '/api/auth/registrar-membro', 'RegistrarMembroReq (nome_completo, email, codigo_igreja, senha)'],
        ['POST', '/api/auth/login', 'LoginReq (email, senha)'],
        ['POST', '/api/auth/recuperar-senha', 'RecuperarSenhaReq (email)'],
    ]
)

add_heading_custom('6.7  Documentacao Automatica (Swagger e ReDoc)', 2)
add_body('Um dos principais diferenciais do FastAPI e a geracao automatica de documentacao interativa. Ao acessar http://localhost:8000/docs, o desenvolvedor tem acesso a uma interface Swagger completa onde e possivel visualizar todos os endpoints, seus parametros, schemas de entrada e saida, e testar as requisicoes diretamente pelo navegador.', indent=True)
add_body('A documentacao tambem esta disponivel no formato ReDoc em http://localhost:8000/redoc, que apresenta uma visao mais detalhada e formatada dos endpoints e modelos de dados.', indent=True)

# ==================== 7 COMPARATIVO ====================
add_heading_custom('7  COMPARATIVO ENTRE OS FRAMEWORKS', 1)
add_body('A implementacao das mesmas funcionalidades em dois frameworks distintos, ambos conectados ao mesmo banco de dados Supabase, permite uma analise comparativa objetiva:', indent=True)

make_table(
    ['Criterio', 'Express.js', 'FastAPI'],
    [
        ['Linguagem', 'JavaScript (Node.js)', 'Python 3.12'],
        ['Banco de dados', 'Supabase via @supabase/supabase-js', 'Supabase via supabase-py'],
        ['Paradigma', 'Callbacks e middlewares', 'Decorators e tipagem nativa'],
        ['Validacao de dados', 'Manual (if/else no codigo)', 'Automatica (Pydantic models)'],
        ['Documentacao da API', 'Manual (rota raiz customizada)', 'Automatica (Swagger + ReDoc)'],
        ['Performance', 'Alta (event loop V8)', 'Muito alta (ASGI assincrono)'],
        ['Curva de aprendizado', 'Baixa', 'Baixa a media'],
        ['Integracao com front-end', 'Mesma linguagem (JavaScript)', 'Linguagem diferente (Python)'],
        ['Tratamento de erros', 'Manual (if/return)', 'Automatico (HTTPException + Pydantic)'],
        ['Tipagem', 'Dinamica (sem TypeScript)', 'Type hints nativos + Pydantic'],
        ['Total de endpoints', '29', '29'],
    ]
)

add_heading_custom('7.1  Quando Usar Cada Framework', 2)
add_body('Express.js e mais indicado quando a equipe ja trabalha com JavaScript no front-end e deseja manter uma unica linguagem em todo o projeto (full-stack JavaScript). Sua simplicidade e vasto ecossistema de middlewares o tornam ideal para prototipagem rapida e MVPs.', indent=True)
add_body('FastAPI e mais indicado quando se deseja validacao automatica de dados, documentacao gerada automaticamente, e alta performance. A tipagem nativa do Python e os modelos Pydantic reduzem significativamente a quantidade de codigo de validacao manual e tornam a API mais robusta e auto-documentada.', indent=True)

add_heading_custom('7.2  Escolha para o Projeto', 2)
add_body('Para o CongregaFiel, ambas as APIs foram implementadas com conexao real ao banco de dados Supabase como demonstracao academica de dominio em multiplas tecnologias. Ambas acessam as mesmas tabelas e retornam os mesmos dados, provando a versatilidade da equipe no uso de diferentes linguagens e frameworks para resolver o mesmo problema.', indent=True)

# ==================== 8 SOA ====================
add_heading_custom('8  ARQUITETURA ORIENTADA A SERVICOS (FRONT-END)', 1)
add_body('Complementando a infraestrutura de back-end, foi implementada a Arquitetura Orientada a Servicos (SOA) no front-end. Foram criados tres servicos compartilhados que centralizam as funcionalidades comuns a todas as paginas do sistema, eliminando a duplicacao de codigo. Todas as paginas se comunicam diretamente com a API REST via o Servico de API, sem camadas intermediarias de cache local.', indent=True)

add_heading_custom('8.1  Servico de Sessao (sessao-servico.js)', 2)
add_body('Responsavel por toda a logica de autenticacao e gerenciamento de sessao do usuario:', indent=True)
add_bullet('Obtencao da sessao atual do localStorage;')
add_bullet('Validacao de autenticacao com redirecionamento automatico;')
add_bullet('Salvamento e encerramento de sessao;')
add_bullet('Diferenciacao entre perfis de pastor (igreja) e fiel (membro).')

add_heading_custom('8.2  Servico de Interface (ui-servico.js)', 2)
add_body('Centraliza as funcoes utilitarias de interface do usuario:', indent=True)
add_bullet('Exibicao de notificacoes toast;')
add_bullet('Escape de HTML para prevencao de XSS;')
add_bullet('Formatacao de datas, horarios e valores monetarios;')
add_bullet('Configuracao da sidebar responsiva e botao de logout;')
add_bullet('Populacao do cabecalho com dados do usuario;')
add_bullet('Validacao de e-mail.')

add_heading_custom('8.3  Servico de API (api-servico.js)', 2)
add_body('Gerencia toda a comunicacao entre o front-end e a API REST, sendo o unico ponto de acesso aos dados do sistema:', indent=True)
add_bullet('Requisicoes HTTP (GET, POST, PUT, DELETE) com headers de autenticacao automaticos;')
add_bullet('Metodos de autenticacao: registrarIgreja, registrarMembro, login, recuperarSenha;')
add_bullet('Metodos de consulta: obterMembros, obterEventos, obterContribuicoes, obterComunicados, obterPedidosOracao;')
add_bullet('Metodos de criacao: criarEvento, criarContribuicao, criarComunicado, criarPedidoOracao;')
add_bullet('Metodos de atualizacao e remocao: atualizarMembro, atualizarPedidoOracao, removerEvento, removerContribuicao, etc;')
add_bullet('Mapeamento automatico de campos snake_case (API) para camelCase (front-end);')
add_bullet('Inclusao automatica do token de acesso (Authorization: Bearer) em todas as requisicoes.')

# ==================== 9 AUTENTICACAO ====================
add_heading_custom('9  AUTENTICACAO COM SUPABASE AUTH', 1)

add_heading_custom('9.1  Visao Geral', 2)
add_body('A autenticacao e o processo que garante que apenas pessoas autorizadas acessem o sistema. No Congrega Fiel, foi implementado um sistema completo de autenticacao utilizando o Supabase Auth, que funciona em conjunto com o banco de dados. Quando alguem cria uma conta ou faz login, os dados sao salvos tanto no sistema de autenticacao do Supabase quanto nas tabelas do banco de dados.', indent=True)
add_body('O sistema possui dois tipos de usuario: igreja (pastor/administrador) e membro. Cada tipo tem acesso a diferentes funcionalidades. A igreja pode gerenciar membros, eventos, comunicados e contribuicoes. O membro pode visualizar informacoes, fazer contribuicoes e enviar pedidos de oracao.', indent=True)

add_heading_custom('9.2  Fluxo de Cadastro', 2)
add_body('O cadastro funciona de forma diferente para igrejas e membros:', indent=True)

add_body('Cadastro de Igreja:', bold=True)
add_bullet('O pastor preenche: nome, nome da igreja, e-mail e senha;')
add_bullet('A API cria uma conta no Supabase Auth (sistema de autenticacao);')
add_bullet('A API cria o registro da igreja no banco com um codigo unico (ex: CF1234);')
add_bullet('A API cria o registro do pastor como primeiro membro da igreja (tipo: pastor);')
add_bullet('Se qualquer etapa falhar, tudo e desfeito automaticamente (rollback).')

add_body('Cadastro de Membro:', bold=True)
add_bullet('O membro preenche: nome, e-mail, codigo da igreja e senha;')
add_bullet('A API verifica se o codigo da igreja existe no banco de dados;')
add_bullet('Se o codigo for valido, cria a conta no Supabase Auth;')
add_bullet('Cria o registro do membro vinculado a igreja correta;')
add_bullet('Se o codigo for invalido, o cadastro e recusado com mensagem de erro.')

add_heading_custom('9.3  Fluxo de Login', 2)
add_body('O login e unificado — tanto igrejas quanto membros usam a mesma tela, informando apenas e-mail e senha. O sistema identifica automaticamente o tipo de usuario e redireciona para o painel correto.', indent=True)

add_body('Processo de login:', bold=True)
add_bullet('O usuario informa e-mail e senha na tela de login;')
add_bullet('A API verifica as credenciais no Supabase Auth (signInWithPassword);')
add_bullet('Se correto, busca os dados completos do usuario na tabela correspondente;')
add_bullet('Retorna os dados do usuario e um access token (JWT);')
add_bullet('O front-end salva a sessao e sincroniza todos os dados da igreja;')
add_bullet('O usuario e redirecionado para o painel correto (igreja ou membro).')

add_body('O access token funciona como um cracha digital: e enviado automaticamente em todas as proximas requisicoes, permitindo que a API identifique o usuario sem pedir a senha novamente.', indent=True)

add_heading_custom('9.4  Recuperacao de Senha', 2)
add_body('O usuario pode solicitar recuperacao de senha informando seu e-mail. O Supabase envia automaticamente um e-mail com link para criar nova senha. Por seguranca, o sistema sempre exibe "e-mail enviado com sucesso" mesmo que o e-mail nao esteja cadastrado, evitando que terceiros descubram quais e-mails existem no sistema.', indent=True)

add_heading_custom('9.5  Integracao Frontend-Backend', 2)
add_body('O front-end utiliza o ApiServico para toda comunicacao com a API. Cada pagina faz requisicoes assincronas diretamente ao servidor, sem camadas intermediarias de cache. Quando o usuario acessa uma pagina, os dados sao carregados da API em tempo real. Quando adiciona ou remove algo, a operacao e enviada diretamente ao servidor e a interface e atualizada apos a confirmacao.', indent=True)

add_heading_custom('9.6  Seguranca', 2)
add_body('O sistema de autenticacao implementa diversas camadas de seguranca:', indent=True)

make_table(
    ['Recurso', 'Descricao'],
    [
        ['Supabase Auth', 'Sistema profissional de autenticacao com criptografia bcrypt'],
        ['Access Token (JWT)', 'Token temporario com validade limitada para identificar o usuario'],
        ['Rollback automatico', 'Se o cadastro falhar apos criar a conta, a conta e removida automaticamente'],
        ['Row Level Security', 'Protecao por linha no banco de dados PostgreSQL'],
        ['Variaveis de ambiente', 'Credenciais protegidas em arquivo .env (nao versionado)'],
        ['Ocultacao de e-mail', 'Recuperacao de senha nao revela se o e-mail existe no sistema'],
    ]
)

# ==================== 10 REESTRUTURACAO ====================
add_heading_custom('10  ESTRUTURA FINAL DO PROJETO', 1)
add_body('A estrutura de diretorios do projeto ficou organizada da seguinte forma:', indent=True)

make_table(
    ['Caminho', 'Descricao'],
    [
        ['public/', 'Front-end servido pelo Firebase Hosting'],
        ['public/index.html + css + js', 'Landing page do sistema'],
        ['public/autenticacao/', 'Login, cadastro e recuperacao de senha (1 HTML+CSS+JS cada)'],
        ['public/igreja/', 'Painel administrativo do pastor (6 paginas)'],
        ['public/membros/', 'Painel dos membros/fieis (6 paginas)'],
        ['public/js/servicos/', 'Servicos compartilhados SOA (3 arquivos: sessao, ui, api)'],
        ['api-express/', 'API REST com Express.js + Supabase'],
        ['api-fastapi/', 'API REST com FastAPI + Supabase'],
        ['database/', 'Schema SQL do banco de dados (PostgreSQL)'],
        ['docs/', 'Documentacao do projeto (relatorios por sprint)'],
        ['firebase.json', 'Configuracao do Firebase Hosting'],
        ['.env / .env.example', 'Variaveis de ambiente (Supabase)'],
    ]
)

# ==================== 11 REQUISITOS ====================
add_heading_custom('11  REQUISITOS ATENDIDOS NESTA SPRINT', 1)
add_body('A Sprint 2 contribuiu para o atendimento dos seguintes requisitos do sistema:', indent=True)

make_table(
    ['ID', 'Requisito', 'Status'],
    [
        ['RNF07', 'Disponibilidade - Deploy em producao via Firebase Hosting', 'Concluido'],
        ['RNF08', 'Persistencia - Banco de dados relacional na nuvem (Supabase)', 'Concluido'],
        ['RNF09', 'API REST - Endpoints CRUD para todos os modulos', 'Concluido'],
        ['RNF06', 'Manutenibilidade - Separacao HTML/CSS/JS + SOA', 'Concluido'],
        ['RNF02', 'Responsividade - CSS responsivo em todas as paginas', 'Concluido'],
        ['RF04', 'Autenticacao - Login real com Supabase Auth + tokens JWT', 'Concluido'],
        ['RF04.1', 'Cadastro de igrejas com geracao de codigo unico', 'Concluido'],
        ['RF04.2', 'Cadastro de membros com validacao de codigo da igreja', 'Concluido'],
        ['RF04.3', 'Recuperacao de senha via e-mail (Supabase Auth)', 'Concluido'],
        ['RNF10', 'Integracao frontend-backend com ApiServico e sincronizacao', 'Concluido'],
        ['RF06', 'Painel do Pastor - Dashboard com resumo de dados', 'Concluido'],
        ['RF12', 'Area do Fiel - Acesso a perfil, contribuicoes e eventos', 'Concluido'],
    ]
)

# ==================== 12 INSTRUCOES ====================
add_heading_custom('12  INSTRUCOES DE EXECUCAO', 1)

add_heading_custom('12.1  Pre-requisitos', 2)
add_bullet('Node.js versao 18 ou superior;')
add_bullet('Python versao 3.10 ou superior;')
add_bullet('npm (gerenciador de pacotes do Node.js);')
add_bullet('pip (gerenciador de pacotes do Python);')
add_bullet('Conta no Supabase com projeto configurado;')
add_bullet('Firebase CLI instalado globalmente (npm install -g firebase-tools).')

add_heading_custom('12.2  Configuracao do Ambiente', 2)
add_body('Copie o arquivo .env.example para .env e preencha com as credenciais do seu projeto Supabase:', indent=True)
add_body('SUPABASE_URL=https://seu-projeto.supabase.co')
add_body('SUPABASE_ANON_KEY=sua_chave_publica')
add_body('SUPABASE_SECRET_KEY=sua_chave_secreta')

add_heading_custom('12.3  Executando o Schema no Supabase', 2)
add_body('Acesse o SQL Editor do Supabase e execute o conteudo do arquivo database/schema.sql. Isso criara todas as tabelas, indices, triggers e dados de exemplo.', indent=True)

add_heading_custom('12.4  Executando a API Express.js', 2)
add_body('cd api-express')
add_body('npm install')
add_body('npm start')
add_body('Servidor disponivel em http://localhost:3000', indent=True)

add_heading_custom('12.5  Executando a API FastAPI', 2)
add_body('cd api-fastapi')
add_body('pip install -r requirements.txt')
add_body('uvicorn servidor:app --reload')
add_body('Servidor disponivel em http://localhost:8000', indent=True)
add_body('Documentacao Swagger: http://localhost:8000/docs', indent=True)
add_body('Documentacao ReDoc: http://localhost:8000/redoc', indent=True)

add_heading_custom('12.6  Deploy do Front-end (Firebase)', 2)
add_body('firebase login')
add_body('firebase deploy')

# ==================== 13 DEPLOY ONLINE DAS APIs ====================
add_heading_custom('13  DEPLOY ONLINE DAS APIs', 1)
add_body('Para garantir que o sistema funcione 24 horas por dia, sem depender de um computador local ligado, ambas as APIs foram publicadas na plataforma Vercel, um servico gratuito de hospedagem para aplicacoes web.', indent=True)

add_heading_custom('13.1  Configuracao para Deploy', 2)
add_body('Express.js: A porta do servidor foi alterada de um valor fixo (3000) para uma porta dinamica fornecida pelo ambiente de hospedagem (process.env.PORT). Foi adicionado um arquivo vercel.json para configurar o roteamento e a exportacao do modulo Express.', indent=True)
add_body('FastAPI: O arquivo requirements.txt foi atualizado com as versoes compativeis das dependencias (supabase 2.28.0, pydantic >= 2.11.7). Foi adicionado um arquivo vercel.json para configurar o deploy Python com o runtime @vercel/python.', indent=True)

add_heading_custom('13.2  URLs dos Servicos Online', 2)
make_table(
    ['Servico', 'URL', 'Tecnologia'],
    [
        ['API Express.js', 'https://api-express-tau.vercel.app', 'Node.js 22 + Express 4'],
        ['API FastAPI', 'https://api-fastapi.vercel.app', 'Python 3.12 + FastAPI'],
        ['Swagger (FastAPI)', 'https://api-fastapi.vercel.app/docs', 'Documentacao automatica'],
        ['Frontend', 'https://congregafiel.web.app', 'Firebase Hosting'],
    ]
)

add_heading_custom('13.3  Variaveis de Ambiente', 2)
add_body('As credenciais do Supabase (SUPABASE_URL e SUPABASE_SECRET_KEY) foram configuradas como variaveis de ambiente no painel do Vercel, garantindo que dados sensiveis nao fiquem expostos no codigo-fonte.', indent=True)

add_heading_custom('13.4  Deteccao Automatica de Ambiente', 2)
add_body('O frontend foi configurado para detectar automaticamente o ambiente de execucao. Quando acessado via localhost (desenvolvimento), as requisicoes sao direcionadas para http://localhost:3000. Quando acessado via o dominio de producao (congregafiel.web.app), as requisicoes sao direcionadas para a API no Vercel.', indent=True)

add_heading_custom('13.5  Banco de Dados na Nuvem', 2)
add_body('As 6 tabelas do sistema (igrejas, membros, eventos, contribuicoes, comunicados e pedidos_oracao) foram criadas no Supabase/PostgreSQL com dados iniciais de exemplo. O banco esta acessivel 24/7 pelas APIs hospedadas no Vercel, sem necessidade de infraestrutura local.', indent=True)

# ==================== 14 PROXIMOS PASSOS ====================
add_heading_custom('14  PROXIMOS PASSOS (SPRINT 3)', 1)
add_body('Para a Sprint 3 (10 a 16 de marco de 2026), estao previstas as seguintes atividades:', indent=True)
add_bullet('Testes funcionais completos dos endpoints com dados reais no Supabase;')
add_bullet('Refinamento da interface do usuario nos paineis de igreja e membro;')
add_bullet('Validacoes avancadas nos formularios do front-end;')
add_bullet('Implementacao de notificacoes em tempo real;')
add_bullet('Melhorias na experiencia do usuario (UX) baseadas em testes de usabilidade.')

# ==================== 15 CONSIDERACOES FINAIS ====================
add_heading_custom('15  CONSIDERACOES FINAIS', 1)
add_body('A Sprint 2 representou um avanco significativo na maturidade tecnica do projeto Congrega Fiel. O sistema deixou de funcionar apenas localmente e passou a ter uma infraestrutura completa de producao, com hospedagem online (Firebase Hosting), banco de dados relacional na nuvem (Supabase/PostgreSQL) e duas APIs REST funcionais conectadas a esse banco.', indent=True)
add_body('A criacao do banco de dados com Supabase trouxe persistencia real ao sistema, com 6 tabelas relacionais, chaves estrangeiras com exclusao em cascata, indices de performance, triggers automaticos e Row Level Security. O schema SQL foi projetado seguindo boas praticas de modelagem relacional.', indent=True)
add_body('A implementacao de duas Web APIs REST (Express.js e FastAPI), ambas conectadas ao mesmo banco Supabase, demonstra a versatilidade da equipe no uso de diferentes linguagens e frameworks. O Express.js mostrou-se eficiente e direto para criacao de APIs em JavaScript, enquanto o FastAPI trouxe beneficios em validacao automatica (Pydantic) e documentacao integrada (Swagger/ReDoc).', indent=True)
add_body('A implementacao da autenticacao com Supabase Auth completou o ciclo de seguranca do sistema. Igrejas e membros possuem contas reais com senhas criptografadas (bcrypt), tokens de acesso JWT e recuperacao de senha por e-mail. O cadastro de igrejas gera automaticamente um codigo unico que permite que membros se vinculem a igreja correta, enquanto o login unificado identifica automaticamente o tipo de usuario e redireciona para o painel correto.', indent=True)
add_body('A integracao entre frontend e backend foi implementada atraves do ApiServico, um modulo JavaScript que gerencia toda a comunicacao com a API. O sistema sincroniza automaticamente os dados do Supabase para o navegador apos o login, e envia as alteracoes feitas pelo usuario de volta para o servidor em segundo plano, garantindo uma experiencia fluida e dados sempre atualizados.', indent=True)
add_body('No front-end, a Arquitetura Orientada a Servicos (SOA) com 3 servicos compartilhados (sessao, interface e API) eliminou a duplicacao de codigo e estabeleceu uma base solida e modular para evolucoes futuras do sistema. Todas as paginas se comunicam diretamente com a API REST via o ApiServico, sem camadas intermediarias de cache local.', indent=True)

doc.add_page_break()

# ==================== REFERENCIAS ====================
add_heading_custom('REFERENCIAS', 1)
refs = [
    'EXPRESS.JS. Express - Node.js web application framework. Disponivel em: https://expressjs.com/. Acesso em: 03 mar. 2026.',
    'FASTAPI. FastAPI - modern, fast web framework for building APIs with Python. Disponivel em: https://fastapi.tiangolo.com/. Acesso em: 03 mar. 2026.',
    'FIREBASE. Firebase Hosting Documentation. Disponivel em: https://firebase.google.com/docs/hosting. Acesso em: 03 mar. 2026.',
    'SUPABASE. Supabase - The Open Source Firebase Alternative. Disponivel em: https://supabase.com/docs. Acesso em: 03 mar. 2026.',
    'POSTGRESQL. PostgreSQL Documentation. Disponivel em: https://www.postgresql.org/docs/. Acesso em: 03 mar. 2026.',
    'PYDANTIC. Pydantic - Data validation using Python type annotations. Disponivel em: https://docs.pydantic.dev/. Acesso em: 03 mar. 2026.',
    'MOZILLA DEVELOPER NETWORK. HTTP Methods. Disponivel em: https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Methods. Acesso em: 03 mar. 2026.',
    'NODE.JS. Node.js - JavaScript runtime. Disponivel em: https://nodejs.org/. Acesso em: 03 mar. 2026.',
    'ERL, T. SOA: Principles of Service Design. Boston: Prentice Hall, 2008.',
    'FIELDING, R. T. Architectural Styles and the Design of Network-based Software Architectures. Dissertacao (Doutorado) - University of California, Irvine, 2000.',
    'PRESSMAN, R. S.; MAXIM, B. R. Engenharia de software: uma abordagem profissional. 9. ed. Porto Alegre: AMGH, 2021.',
    'SOMMERVILLE, I. Engenharia de software. 10. ed. Sao Paulo: Pearson, 2019.',
    'VERCEL. Vercel - Develop. Preview. Ship. Disponivel em: https://vercel.com/docs. Acesso em: 03 mar. 2026.',
]
for ref in refs:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(12)
    run = p.add_run(ref)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)

output_path = os.path.join('docs', 'Semana 2.docx')
doc.save(output_path)
print(f'Documento salvo em: {output_path}')
