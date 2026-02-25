# -*- coding: utf-8 -*-
"""
Script para gerar a documentação ABNT do projeto Congrega Fiel em Word (.docx)
Faculdade INSTED - Campo Grande/MS - Curso Superior
"""

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml, OxmlElement
import os

# ============================================================
# CONFIGURAÇÕES
# ============================================================
FONT_NAME = "Times New Roman"
FONT_SIZE_BODY = 12
FONT_SIZE_TITLE = 14
FONT_SIZE_COVER = 16
LINE_SPACING = 1.5

INSTITUICAO = "FACULDADE INSTED"
CURSO = "Curso Superior de Tecnologia em Análise e Desenvolvimento de Sistemas"
CIDADE = "Campo Grande – MS"
ANO = "2025"

doc = Document()

# ============================================================
# CONFIGURAÇÃO DE MARGENS ABNT (3cm sup/esq, 2cm inf/dir)
# ============================================================
for section in doc.sections:
    section.top_margin = Cm(3)
    section.bottom_margin = Cm(2)
    section.left_margin = Cm(3)
    section.right_margin = Cm(2)
    section.page_height = Cm(29.7)
    section.page_width = Cm(21)

# ============================================================
# FORÇAR ATUALIZAÇÃO AUTOMÁTICA DE CAMPOS (para o sumário)
# ============================================================
settings = doc.settings.element
update_fields = OxmlElement("w:updateFields")
update_fields.set(qn("w:val"), "true")
settings.append(update_fields)

# ============================================================
# ESTILOS
# ============================================================
style_normal = doc.styles["Normal"]
style_normal.font.name = FONT_NAME
style_normal.font.size = Pt(FONT_SIZE_BODY)
style_normal.font.color.rgb = RGBColor(0, 0, 0)
style_normal.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
style_normal.paragraph_format.line_spacing = LINE_SPACING
style_normal.paragraph_format.space_after = Pt(0)
style_normal.paragraph_format.space_before = Pt(0)

# Forçar fonte padrão via XML
rPr = style_normal.element.get_or_add_rPr()
rFonts_el = parse_xml(
    f'<w:rFonts {nsdecls("w")} w:ascii="{FONT_NAME}" '
    f'w:hAnsi="{FONT_NAME}" w:cs="{FONT_NAME}" w:eastAsia="{FONT_NAME}"/>'
)
rPr.append(rFonts_el)

# --- Configurar estilos de Heading para o sumário automático ---
for level, style_name in enumerate(["Heading 1", "Heading 2", "Heading 3"], start=1):
    h_style = doc.styles[style_name]
    h_style.font.name = FONT_NAME
    h_style.font.size = Pt(FONT_SIZE_BODY)
    h_style.font.color.rgb = RGBColor(0, 0, 0)
    h_style.paragraph_format.line_spacing = LINE_SPACING
    h_style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
    h_style.paragraph_format.space_before = Pt(18 if level == 1 else 12 if level == 2 else 8)
    h_style.paragraph_format.space_after = Pt(12 if level == 1 else 6 if level == 2 else 4)
    h_style.paragraph_format.first_line_indent = Cm(0)
    h_style.paragraph_format.left_indent = Cm(0)
    # Heading 1: bold, uppercase será feito no texto
    # Heading 2: bold
    # Heading 3: italic, não bold
    h_style.font.bold = level <= 2
    h_style.font.italic = level == 3
    # Remover numeração/bullet automático dos headings
    pPr = h_style.element.get_or_add_pPr()
    numPr = pPr.find(qn("w:numPr"))
    if numPr is not None:
        pPr.remove(numPr)
    # Forçar fonte via XML no heading
    h_rPr = h_style.element.get_or_add_rPr()
    h_rFonts = parse_xml(
        f'<w:rFonts {nsdecls("w")} w:ascii="{FONT_NAME}" '
        f'w:hAnsi="{FONT_NAME}" w:cs="{FONT_NAME}" w:eastAsia="{FONT_NAME}"/>'
    )
    h_rPr.append(h_rFonts)
    # Cor preta explícita
    color_el = parse_xml(f'<w:color {nsdecls("w")} w:val="000000"/>')
    h_rPr.append(color_el)


# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================
def add_empty_paragraphs(count=1):
    for _ in range(count):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.space_before = Pt(0)
        run = p.add_run()
        run.font.size = Pt(FONT_SIZE_BODY)
        run.font.name = FONT_NAME


def add_centered_text(text, size=FONT_SIZE_BODY, bold=False, upper=False):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.line_spacing = LINE_SPACING
    run = p.add_run(text.upper() if upper else text)
    run.font.size = Pt(size)
    run.font.name = FONT_NAME
    run.bold = bold
    return p


def add_justified_text(text, size=FONT_SIZE_BODY, bold=False, indent_first=True):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.line_spacing = LINE_SPACING
    if indent_first:
        p.paragraph_format.first_line_indent = Cm(1.25)
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.font.name = FONT_NAME
    run.bold = bold
    return p


def add_section_title(number, title):
    """Título de seção usando Heading 1 (aparece no sumário automático)"""
    text = f"{number}  {title.upper()}" if number else title.upper()
    p = doc.add_paragraph(text, style="Heading 1")
    # Garantir formatação
    for run in p.runs:
        run.font.size = Pt(FONT_SIZE_BODY)
        run.font.name = FONT_NAME
        run.bold = True
        run.font.color.rgb = RGBColor(0, 0, 0)
    return p


def add_subsection_title(number, title):
    """Subtítulo usando Heading 2 (aparece no sumário automático)"""
    p = doc.add_paragraph(f"{number}  {title}", style="Heading 2")
    for run in p.runs:
        run.font.size = Pt(FONT_SIZE_BODY)
        run.font.name = FONT_NAME
        run.bold = True
        run.font.color.rgb = RGBColor(0, 0, 0)
    return p


def add_subsubsection_title(number, title):
    """Sub-subtítulo usando Heading 3 (aparece no sumário automático)"""
    p = doc.add_paragraph(f"{number}  {title}", style="Heading 3")
    for run in p.runs:
        run.font.size = Pt(FONT_SIZE_BODY)
        run.font.name = FONT_NAME
        run.bold = False
        run.italic = True
        run.font.color.rgb = RGBColor(0, 0, 0)
    return p


def add_bullet_item(text, level=0):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.line_spacing = LINE_SPACING
    indent = 1.25 + (level * 0.75)
    p.paragraph_format.left_indent = Cm(indent)
    p.paragraph_format.first_line_indent = Cm(-0.5)
    bullet = "\u2022" if level == 0 else "\u25E6"
    run = p.add_run(f"{bullet}  {text}")
    run.font.size = Pt(FONT_SIZE_BODY)
    run.font.name = FONT_NAME
    return p


def add_table(headers, rows, col_widths=None):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"

    # Cabeçalho
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = ""
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(header)
        run.font.size = Pt(10)
        run.font.name = FONT_NAME
        run.bold = True
        # Cor de fundo do cabeçalho
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="2C3E50" w:val="clear"/>')
        cell._element.get_or_add_tcPr().append(shading)
        run.font.color.rgb = RGBColor(255, 255, 255)

    # Dados
    for r, row_data in enumerate(rows):
        for c, cell_text in enumerate(row_data):
            cell = table.rows[r + 1].cells[c]
            cell.text = ""
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run(str(cell_text))
            run.font.size = Pt(10)
            run.font.name = FONT_NAME
            # Zebra striping
            if r % 2 == 1:
                shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="ECF0F1" w:val="clear"/>')
                cell._element.get_or_add_tcPr().append(shading)

    # Larguras de coluna
    if col_widths:
        for i, width in enumerate(col_widths):
            for row in table.rows:
                row.cells[i].width = Cm(width)

    add_empty_paragraphs(1)
    return table


def add_toc_field():
    """Insere um campo de sumário automático do Word (com hyperlinks)."""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.line_spacing = LINE_SPACING

    # Campo TOC: \o "1-3" = níveis 1-3, \h = hyperlinks, \z = oculta tab em web, \u = usa outline level
    run1 = p.add_run()
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    run1._element.append(fld_begin)

    run2 = p.add_run()
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = ' TOC \\o "1-3" \\h \\z \\u '
    run2._element.append(instr)

    run3 = p.add_run()
    fld_sep = OxmlElement("w:fldChar")
    fld_sep.set(qn("w:fldCharType"), "separate")
    run3._element.append(fld_sep)

    # Texto placeholder que será substituído ao abrir no Word
    run4 = p.add_run(
        "[Sumário automático — ao abrir no Word, clique aqui e pressione F9 "
        "ou clique com botão direito > Atualizar campo]"
    )
    run4.font.size = Pt(FONT_SIZE_BODY)
    run4.font.name = FONT_NAME
    run4.font.color.rgb = RGBColor(128, 128, 128)
    run4.italic = True

    run5 = p.add_run()
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    run5._element.append(fld_end)

    return p


def add_page_break():
    doc.add_page_break()


# ============================================================
# CAPA
# ============================================================
add_empty_paragraphs(2)
add_centered_text(INSTITUICAO, size=FONT_SIZE_COVER, bold=True, upper=True)
add_empty_paragraphs(1)
add_centered_text(CURSO, size=FONT_SIZE_TITLE, bold=False)
add_empty_paragraphs(6)
add_centered_text("CONGREGA FIEL", size=20, bold=True, upper=True)
add_centered_text("Sistema Web para Gestão de Comunidades Eclesiásticas", size=FONT_SIZE_TITLE, bold=False)
add_empty_paragraphs(4)
add_centered_text("Catieli Gama Cora", size=FONT_SIZE_BODY)
add_centered_text("Fernando Alves da Nóbrega", size=FONT_SIZE_BODY)
add_centered_text("Gabriel Franklin Barcellos", size=FONT_SIZE_BODY)
add_centered_text("Jhenniffer Lopes da Silva Vargas", size=FONT_SIZE_BODY)
add_centered_text("João Pedro Aranda", size=FONT_SIZE_BODY)
add_empty_paragraphs(6)
add_centered_text(CIDADE, size=FONT_SIZE_BODY)
add_centered_text(ANO, size=FONT_SIZE_BODY)

# ============================================================
# FOLHA DE ROSTO
# ============================================================
add_page_break()
add_empty_paragraphs(2)
add_centered_text("CONGREGA FIEL", size=20, bold=True, upper=True)
add_centered_text("Sistema Web para Gestão de Comunidades Eclesiásticas", size=FONT_SIZE_TITLE, bold=False)
add_empty_paragraphs(4)

# Texto descritivo (recuado à direita, conforme ABNT)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
p.paragraph_format.left_indent = Cm(8)
p.paragraph_format.space_after = Pt(0)
p.paragraph_format.line_spacing = 1.0
run = p.add_run(
    f"Documentação técnica do Produto Mínimo Viável (MVP) apresentada como "
    f"requisito parcial para aprovação no {CURSO} da {INSTITUICAO}."
)
run.font.size = Pt(10)
run.font.name = FONT_NAME

add_empty_paragraphs(3)

add_centered_text("Equipe de Desenvolvimento:", size=FONT_SIZE_BODY, bold=True)
add_empty_paragraphs(1)
add_centered_text("Catieli Gama Cora", size=FONT_SIZE_BODY)
add_centered_text("Fernando Alves da Nóbrega", size=FONT_SIZE_BODY)
add_centered_text("Gabriel Franklin Barcellos", size=FONT_SIZE_BODY)
add_centered_text("Jhenniffer Lopes da Silva Vargas", size=FONT_SIZE_BODY)
add_centered_text("João Pedro Aranda", size=FONT_SIZE_BODY)

add_empty_paragraphs(6)
add_centered_text(CIDADE, size=FONT_SIZE_BODY)
add_centered_text(ANO, size=FONT_SIZE_BODY)

# ============================================================
# SUMÁRIO (automático e linkado)
# ============================================================
add_page_break()
add_centered_text("SUMÁRIO", size=FONT_SIZE_TITLE, bold=True, upper=True)
add_empty_paragraphs(1)
add_toc_field()

# ============================================================
# 1. INTRODUÇÃO
# ============================================================
add_page_break()
add_section_title("1", "INTRODUÇÃO")

add_justified_text(
    "O presente documento descreve a documentação técnica inicial do projeto "
    "Congrega Fiel, um sistema web desenvolvido como Produto Mínimo Viável (MVP) "
    "com o objetivo de oferecer uma solução tecnológica para a gestão de comunidades "
    f"eclesiásticas. O projeto foi concebido no âmbito do {CURSO} "
    f"da {INSTITUICAO} e visa atender a uma demanda real identificada no "
    "cotidiano de igrejas e comunidades religiosas."
)

add_justified_text(
    "A gestão de uma comunidade religiosa envolve uma série de atividades "
    "administrativas e pastorais que, em muitos casos, ainda são realizadas de forma "
    "manual ou descentralizada. O cadastro de membros, o controle de contribuições "
    "financeiras, a organização de eventos e a comunicação entre líderes e fiéis são "
    "processos que demandam tempo, organização e, frequentemente, geram retrabalho "
    "ou perda de informações."
)

add_justified_text(
    "Nesse contexto, o Congrega Fiel surge como uma plataforma digital que centraliza "
    "essas atividades em um único ambiente web, proporcionando praticidade, segurança "
    "e transparência na administração eclesiástica. O sistema funciona como uma espécie "
    "de rede social privada para cada igreja, onde pastores podem cadastrar suas "
    "congregações, gerenciar seus membros e acompanhar as atividades da comunidade, "
    "enquanto os fiéis têm acesso a informações relevantes sobre eventos, contribuições "
    "e comunicados."
)

add_justified_text(
    "Este documento apresenta o escopo do MVP, os requisitos funcionais e não "
    "funcionais, as tecnologias selecionadas, a arquitetura proposta, a definição "
    "de papéis da equipe e o cronograma de desenvolvimento, servindo como base "
    "para todo o ciclo de vida do projeto."
)

# ============================================================
# 2. PROBLEMA IDENTIFICADO
# ============================================================
add_page_break()
add_section_title("2", "PROBLEMA IDENTIFICADO")

add_justified_text(
    "As comunidades religiosas, especialmente igrejas de pequeno e médio porte, "
    "enfrentam desafios significativos na gestão de suas atividades administrativas "
    "e pastorais. A partir de pesquisas informais e da vivência dos membros da equipe "
    "de desenvolvimento, foram identificados os seguintes problemas recorrentes:"
)

problemas = [
    "Gestão manual de membros: o cadastro e o acompanhamento dos fiéis são realizados "
    "em planilhas, cadernos ou sistemas genéricos que não atendem às necessidades "
    "específicas de uma comunidade religiosa, resultando em dados desatualizados, "
    "duplicados ou perdidos.",

    "Controle financeiro precário: as contribuições (dízimos, ofertas e doações) "
    "são registradas de forma manual, sem padronização, dificultando a prestação "
    "de contas e a transparência junto aos membros da igreja.",

    "Comunicação fragmentada: a divulgação de eventos, cultos, reuniões e comunicados "
    "depende de grupos em redes sociais genéricas (WhatsApp, Facebook), que misturam "
    "informações pessoais com as da igreja, gerando ruído e perda de informações "
    "importantes.",

    "Ausência de centralização: não existe uma plataforma unificada que permita ao "
    "pastor ou líder religioso gerenciar todos os aspectos da comunidade — membros, "
    "finanças, eventos e comunicação — em um único lugar.",

    "Falta de privacidade: o uso de redes sociais públicas para comunicação interna "
    "da igreja expõe informações sensíveis da comunidade, como dados pessoais dos "
    "membros e informações financeiras.",
]

for prob in problemas:
    add_bullet_item(prob)

add_justified_text(
    "Diante desse cenário, evidencia-se a necessidade de uma ferramenta digital "
    "específica que atenda às particularidades da gestão eclesiástica, promovendo "
    "organização, eficiência e privacidade."
)

# ============================================================
# 3. SOLUÇÃO PROPOSTA
# ============================================================
add_page_break()
add_section_title("3", "SOLUÇÃO PROPOSTA")

add_justified_text(
    "Para resolver os problemas identificados, propõe-se o desenvolvimento do "
    "Congrega Fiel, um sistema web que funciona como uma plataforma privada de "
    "gestão para comunidades eclesiásticas. A solução foi projetada com foco na "
    "simplicidade, acessibilidade e na experiência do usuário, considerando o "
    "perfil diversificado dos potenciais usuários."
)

add_subsection_title("3.1", "Conceito do Sistema")

add_justified_text(
    "O Congrega Fiel opera como uma rede social privada voltada para igrejas. "
    "Cada congregação possui seu próprio espaço digital, gerenciado pelo pastor "
    "ou líder responsável, que cadastra a igreja e, posteriormente, registra os "
    "membros da comunidade. O sistema possui dois perfis de acesso distintos:"
)

add_bullet_item(
    "Pastor/Líder (Administrador): possui acesso completo ao sistema, podendo "
    "cadastrar a igreja, gerenciar membros, registrar e acompanhar pagamentos, "
    "criar eventos e enviar comunicados."
)
add_bullet_item(
    "Fiel/Membro: possui acesso ao seu perfil, pode visualizar eventos, "
    "consultar seu histórico de contribuições e receber comunicados da igreja."
)

add_subsection_title("3.2", "Principais Funcionalidades do MVP")

funcionalidades = [
    "Cadastro e autenticação de usuários (pastores e fiéis);",
    "Cadastro e configuração de igrejas por parte do pastor;",
    "Cadastro e gestão de membros vinculados a cada igreja;",
    "Registro e controle de contribuições financeiras (dízimos e ofertas);",
    "Criação e divulgação de eventos da comunidade;",
    "Painel administrativo para o pastor com visão geral da igreja;",
    "Área do fiel com acesso às suas informações e atividades da igreja.",
]

for func in funcionalidades:
    add_bullet_item(func)

add_subsection_title("3.3", "Diferenciais da Solução")

add_justified_text(
    "O Congrega Fiel se diferencia das ferramentas genéricas disponíveis no mercado "
    "por ter sido projetado especificamente para o contexto eclesiástico, oferecendo: "
    "privacidade por padrão (cada igreja possui seu ambiente isolado), interface "
    "intuitiva adaptada para usuários com diferentes níveis de familiaridade "
    "tecnológica, e funcionalidades que atendem diretamente às demandas reais de "
    "uma comunidade religiosa."
)

# ============================================================
# 4. ESCOPO DO PROJETO (MVP)
# ============================================================
add_page_break()
add_section_title("4", "ESCOPO DO PROJETO (MVP)")

add_justified_text(
    "O escopo deste projeto está delimitado ao desenvolvimento de um Produto Mínimo "
    "Viável (MVP), ou seja, uma versão funcional do sistema contendo as funcionalidades "
    "essenciais para validação do conceito. O MVP permite avaliar a viabilidade técnica "
    "e a aceitação do produto pelos usuários-alvo, servindo como base para futuras "
    "iterações e melhorias."
)

add_subsection_title("4.1", "Funcionalidades Incluídas no MVP")

add_subsubsection_title("4.1.1", "Módulo de Autenticação e Cadastro")
for item in [
    "Cadastro de pastor com validação de dados;",
    "Cadastro de fiel vinculado a uma igreja;",
    "Login e logout com controle de sessão;",
    "Recuperação de senha;",
    "Diferenciação de perfis (pastor e fiel).",
]:
    add_bullet_item(item)

add_subsubsection_title("4.1.2", "Módulo de Gestão da Igreja")
for item in [
    "Cadastro de nova igreja pelo pastor;",
    "Edição de informações da igreja (nome, endereço, descrição);",
    "Visualização do painel da igreja com dados resumidos.",
]:
    add_bullet_item(item)

add_subsubsection_title("4.1.3", "Módulo de Gestão de Membros")
for item in [
    "Cadastro de novos membros pelo pastor;",
    "Listagem de membros com filtros de busca;",
    "Edição e exclusão de cadastros de membros;",
    "Visualização de perfil individual do membro.",
]:
    add_bullet_item(item)

add_subsubsection_title("4.1.4", "Módulo de Gestão Financeira")
for item in [
    "Registro de contribuições (dízimos, ofertas, doações);",
    "Histórico de pagamentos por membro;",
    "Relatório financeiro resumido para o pastor;",
    "Consulta de contribuições pelo fiel (apenas as próprias).",
]:
    add_bullet_item(item)

add_subsubsection_title("4.1.5", "Módulo de Eventos")
for item in [
    "Criação de eventos pelo pastor;",
    "Listagem de eventos para os fiéis;",
    "Detalhes do evento (data, horário, local, descrição).",
]:
    add_bullet_item(item)

add_subsection_title("4.2", "Funcionalidades Fora do Escopo do MVP")

add_justified_text(
    "As seguintes funcionalidades foram identificadas como relevantes, porém não "
    "serão implementadas nesta primeira versão do sistema, ficando reservadas para "
    "versões futuras:"
)

for item in [
    "Aplicativo mobile nativo (Android/iOS);",
    "Sistema de chat/mensagens em tempo real entre membros;",
    "Integração com gateways de pagamento online;",
    "Geração de relatórios avançados em PDF;",
    "Sistema de notificações push;",
    "Módulo de escola bíblica/estudos;",
    "Integração com calendários externos (Google Calendar).",
]:
    add_bullet_item(item)

# ============================================================
# 5. REQUISITOS DO SISTEMA
# ============================================================
add_page_break()
add_section_title("5", "REQUISITOS DO SISTEMA")

add_justified_text(
    "Os requisitos do sistema foram levantados com base na análise do problema "
    "identificado e nas funcionalidades definidas no escopo do MVP. Estão organizados "
    "em requisitos funcionais (o que o sistema deve fazer) e requisitos não funcionais "
    "(como o sistema deve se comportar)."
)

add_subsection_title("5.1", "Requisitos Funcionais")

rf_data = [
    ["RF01", "Cadastro de Pastor", "O sistema deve permitir que um pastor se cadastre informando nome completo, e-mail, telefone e senha."],
    ["RF02", "Cadastro de Igreja", "O sistema deve permitir que o pastor cadastre sua igreja informando nome, endereço, denominação e descrição."],
    ["RF03", "Cadastro de Fiel", "O sistema deve permitir que o pastor cadastre fiéis vinculados à sua igreja, informando nome, e-mail, telefone e data de nascimento."],
    ["RF04", "Autenticação", "O sistema deve permitir login e logout para ambos os perfis (pastor e fiel) com validação de credenciais."],
    ["RF05", "Recuperação de Senha", "O sistema deve oferecer mecanismo de recuperação de senha via e-mail cadastrado."],
    ["RF06", "Painel do Pastor", "O sistema deve exibir um painel administrativo com resumo de membros, contribuições recentes e próximos eventos."],
    ["RF07", "Gestão de Membros", "O sistema deve permitir ao pastor listar, buscar, editar e excluir membros cadastrados."],
    ["RF08", "Registro de Contribuições", "O sistema deve permitir ao pastor registrar contribuições financeiras vinculadas a um membro específico."],
    ["RF09", "Histórico Financeiro", "O sistema deve exibir o histórico de contribuições, filtrável por período e tipo."],
    ["RF10", "Criação de Eventos", "O sistema deve permitir ao pastor criar eventos com título, descrição, data, horário e local."],
    ["RF11", "Listagem de Eventos", "O sistema deve exibir a lista de eventos para os fiéis, ordenados por data."],
    ["RF12", "Área do Fiel", "O sistema deve oferecer ao fiel acesso ao seu perfil, histórico de contribuições e eventos da igreja."],
    ["RF13", "Controle de Acesso", "O sistema deve restringir funcionalidades administrativas apenas ao perfil de pastor."],
]

add_table(
    headers=["ID", "Requisito", "Descrição"],
    rows=rf_data,
    col_widths=[2, 3.5, 10.5]
)

add_subsection_title("5.2", "Requisitos Não Funcionais")

rnf_data = [
    ["RNF01", "Usabilidade", "A interface deve ser intuitiva e acessível para usuários com diferentes níveis de letramento digital."],
    ["RNF02", "Responsividade", "O sistema deve ser responsivo, adaptando-se a diferentes tamanhos de tela (desktop, tablet e smartphone)."],
    ["RNF03", "Desempenho", "As páginas devem carregar em no máximo 3 segundos em conexões padrão."],
    ["RNF04", "Segurança", "As senhas devem ser armazenadas de forma criptografada e o sistema deve prevenir ataques comuns (XSS, SQL Injection)."],
    ["RNF05", "Compatibilidade", "O sistema deve ser compatível com os navegadores Chrome, Firefox, Edge e Safari em suas versões mais recentes."],
    ["RNF06", "Manutenibilidade", "O código deve seguir boas práticas de desenvolvimento, com separação clara entre HTML, CSS e JavaScript."],
    ["RNF07", "Disponibilidade", "O sistema deve estar disponível 99% do tempo em ambiente de produção."],
]

add_table(
    headers=["ID", "Categoria", "Descrição"],
    rows=rnf_data,
    col_widths=[2, 3, 11]
)

# ============================================================
# 6. TECNOLOGIAS UTILIZADAS
# ============================================================
add_page_break()
add_section_title("6", "TECNOLOGIAS UTILIZADAS")

add_justified_text(
    "A escolha das tecnologias para o desenvolvimento do Congrega Fiel foi orientada "
    "pelos seguintes critérios: adequação ao escopo do MVP, curva de aprendizado da "
    "equipe, disponibilidade de recursos e documentação, e capacidade de entrega "
    "dentro do cronograma estabelecido. Por se tratar de um MVP acadêmico, optou-se "
    "por tecnologias fundamentais da web, amplamente utilizadas e documentadas."
)

add_subsection_title("6.1", "Front-End")

tech_front = [
    ("HTML5", "Linguagem de marcação para estruturação do conteúdo das páginas web. "
     "Utilizada para definir a semântica e a hierarquia dos elementos da interface."),
    ("CSS3", "Linguagem de estilização responsável pelo layout, tipografia, cores e "
     "responsividade da aplicação. Utilizada em conjunto com técnicas de Flexbox e "
     "Grid Layout para garantir uma experiência visual agradável e adaptável."),
    ("JavaScript (ES6+)", "Linguagem de programação utilizada para implementar a "
     "lógica de interação no lado do cliente, incluindo validações de formulários, "
     "manipulação do DOM, requisições assíncronas e controle de navegação."),
]

for tech, desc in tech_front:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.line_spacing = LINE_SPACING
    p.paragraph_format.first_line_indent = Cm(1.25)
    run_bold = p.add_run(f"{tech}: ")
    run_bold.font.size = Pt(FONT_SIZE_BODY)
    run_bold.font.name = FONT_NAME
    run_bold.bold = True
    run_desc = p.add_run(desc)
    run_desc.font.size = Pt(FONT_SIZE_BODY)
    run_desc.font.name = FONT_NAME

add_subsection_title("6.2", "Back-End e Armazenamento")

add_justified_text(
    "Para o MVP, o armazenamento de dados será implementado utilizando "
    "LocalStorage e SessionStorage do navegador e, conforme a evolução do projeto, "
    "poderá ser migrado para uma solução de back-end com banco de dados. "
    "O JavaScript será utilizado tanto no front-end quanto para a lógica de "
    "persistência de dados no lado do cliente."
)

add_subsection_title("6.3", "Ferramentas de Apoio")

tools_data = [
    ["Visual Studio Code", "Editor de código principal da equipe"],
    ["Git / GitHub", "Controle de versão e repositório remoto"],
    ["Figma", "Prototipação de telas e design de interface"],
    ["Trello", "Gerenciamento de tarefas e acompanhamento do projeto"],
    ["Google Docs", "Elaboração colaborativa da documentação"],
]

add_table(
    headers=["Ferramenta", "Finalidade"],
    rows=tools_data,
    col_widths=[5, 11]
)

# ============================================================
# 7. ARQUITETURA DO SISTEMA
# ============================================================
add_page_break()
add_section_title("7", "ARQUITETURA DO SISTEMA")

add_justified_text(
    "A arquitetura do Congrega Fiel segue o padrão de aplicação web client-side, "
    "onde toda a lógica de apresentação e interação é processada no navegador do "
    "usuário. Essa abordagem é adequada para o MVP, pois permite entregas rápidas "
    "e foco na experiência do usuário."
)

add_subsection_title("7.1", "Estrutura de Camadas")

add_justified_text(
    "O sistema é organizado em três camadas lógicas, seguindo a separação de "
    "responsabilidades:"
)

for c in [
    "Camada de Apresentação (HTML): responsável pela estrutura e semântica das "
    "páginas, definindo os elementos visuais com os quais o usuário interage.",
    "Camada de Estilização (CSS): responsável pela aparência visual, incluindo "
    "layout responsivo, tipografia, paleta de cores e animações.",
    "Camada de Lógica (JavaScript): responsável pelo comportamento dinâmico da "
    "aplicação, incluindo validações, manipulação de dados, controle de rotas "
    "e comunicação com o armazenamento local.",
]:
    add_bullet_item(c)

add_subsection_title("7.2", "Estrutura de Diretórios")

dir_structure = [
    ["congregafiel/", "Diretório raiz do projeto"],
    ["  index.html", "Página inicial / Landing page"],
    ["  pages/", "Páginas HTML do sistema"],
    ["    login.html", "Tela de login"],
    ["    cadastro.html", "Tela de cadastro"],
    ["    painel-pastor.html", "Painel administrativo do pastor"],
    ["    area-fiel.html", "Área do fiel"],
    ["    membros.html", "Gestão de membros"],
    ["    financeiro.html", "Gestão financeira"],
    ["    eventos.html", "Gestão de eventos"],
    ["  css/", "Folhas de estilo"],
    ["    global.css", "Estilos globais e variáveis CSS"],
    ["    [pagina].css", "Estilos específicos de cada página"],
    ["  js/", "Scripts JavaScript"],
    ["    auth.js", "Lógica de autenticação"],
    ["    membros.js", "Lógica de gestão de membros"],
    ["    financeiro.js", "Lógica financeira"],
    ["    eventos.js", "Lógica de eventos"],
    ["  assets/", "Recursos estáticos (imagens, ícones)"],
]

add_table(
    headers=["Caminho", "Descrição"],
    rows=dir_structure,
    col_widths=[5.5, 10.5]
)

# ============================================================
# 8. DEFINIÇÃO DA EQUIPE E PAPÉIS
# ============================================================
add_page_break()
add_section_title("8", "DEFINIÇÃO DA EQUIPE E PAPÉIS")

add_justified_text(
    "A equipe de desenvolvimento do Congrega Fiel é composta por cinco integrantes, "
    "organizados em três frentes de trabalho complementares: Documentação, Front-End "
    "e Back-End. Essa divisão permite que as atividades sejam executadas em paralelo, "
    "otimizando o tempo de desenvolvimento e garantindo a cobertura de todas as áreas "
    "necessárias para a entrega do MVP."
)

add_subsection_title("8.1", "Composição da Equipe")

equipe_data = [
    ["Catieli Gama Cora", "Documentação", "Elaboração e revisão da documentação técnica"],
    ["Fernando Alves da Nóbrega", "Documentação / Front-End", "Documentação técnica e desenvolvimento de interfaces"],
    ["Gabriel Franklin Barcellos", "Front-End / Back-End", "Desenvolvimento de interfaces e lógica de negócios"],
    ["Jhenniffer Lopes da Silva Vargas", "Documentação / Front-End", "Documentação técnica e desenvolvimento de interfaces"],
    ["João Pedro Aranda", "Back-End", "Desenvolvimento da lógica de negócios e persistência de dados"],
]

add_table(
    headers=["Integrante", "Área(s)", "Responsabilidades"],
    rows=equipe_data,
    col_widths=[5, 4, 7]
)

add_subsection_title("8.2", "Descrição das Frentes de Trabalho")

add_subsubsection_title("8.2.1", "Frente de Documentação")

add_justified_text(
    "Responsável pela elaboração de toda a documentação do projeto, incluindo: "
    "levantamento de requisitos, escopo do MVP, diagramas, manuais de uso e "
    "relatórios de acompanhamento. Integrantes: Fernando Alves da Nóbrega, "
    "Jhenniffer Lopes da Silva Vargas e Catieli Gama Cora."
)

add_subsubsection_title("8.2.2", "Frente de Front-End")

add_justified_text(
    "Responsável pelo desenvolvimento de todas as interfaces visuais do sistema, "
    "garantindo responsividade, acessibilidade e fidelidade ao protótipo definido. "
    "Integrantes: Fernando Alves da Nóbrega, Jhenniffer Lopes da Silva Vargas e "
    "Gabriel Franklin Barcellos."
)

add_subsubsection_title("8.2.3", "Frente de Back-End")

add_justified_text(
    "Responsável pela implementação da lógica de negócios, validações, persistência "
    "de dados e integração entre os módulos do sistema. Integrantes: João Pedro "
    "Aranda e Gabriel Franklin Barcellos."
)

# ============================================================
# 9. CRONOGRAMA DO MVP
# ============================================================
add_page_break()
add_section_title("9", "CRONOGRAMA DO MVP")

add_justified_text(
    "O cronograma a seguir apresenta as principais etapas do desenvolvimento do MVP "
    "do Congrega Fiel, organizadas em sprints quinzenais. O planejamento considera a "
    "disponibilidade da equipe e a complexidade de cada módulo."
)

cronograma_data = [
    ["Sprint 1", "Semana 1–2", "Levantamento de requisitos, definição de escopo e documentação inicial"],
    ["Sprint 2", "Semana 3–4", "Prototipação de telas (Figma) e estruturação HTML das páginas principais"],
    ["Sprint 3", "Semana 5–6", "Estilização CSS (layout responsivo) e implementação do módulo de autenticação"],
    ["Sprint 4", "Semana 7–8", "Desenvolvimento dos módulos de gestão de membros e gestão da igreja"],
    ["Sprint 5", "Semana 9–10", "Desenvolvimento do módulo financeiro e módulo de eventos"],
    ["Sprint 6", "Semana 11–12", "Integração entre módulos, testes e correções"],
    ["Sprint 7", "Semana 13–14", "Documentação final, ajustes de usabilidade e preparação para apresentação"],
]

add_table(
    headers=["Sprint", "Período", "Atividades"],
    rows=cronograma_data,
    col_widths=[2.5, 3, 10.5]
)

# ============================================================
# 10. CONSIDERAÇÕES FINAIS
# ============================================================
add_page_break()
add_section_title("10", "CONSIDERAÇÕES FINAIS")

add_justified_text(
    "O projeto Congrega Fiel representa uma iniciativa prática de aplicação dos "
    f"conhecimentos adquiridos ao longo do {CURSO} "
    f"da {INSTITUICAO}, aliando teoria e prática na construção de uma solução real "
    "para um problema concreto identificado no cotidiano de comunidades religiosas."
)

add_justified_text(
    "A abordagem de Produto Mínimo Viável foi escolhida estrategicamente para "
    "permitir a entrega de uma versão funcional do sistema dentro do prazo "
    "acadêmico, sem comprometer a qualidade e a usabilidade da aplicação. O MVP "
    "contempla as funcionalidades essenciais para a gestão de uma comunidade "
    "eclesiástica: cadastro de igrejas e membros, controle financeiro, gestão de "
    "eventos e diferenciação de perfis de acesso."
)

add_justified_text(
    "A utilização de tecnologias fundamentais da web (HTML, CSS e JavaScript) "
    "garante compatibilidade ampla, baixo custo de implantação e facilidade de "
    "manutenção, tornando a solução acessível para igrejas com diferentes níveis "
    "de infraestrutura tecnológica."
)

add_justified_text(
    "A divisão da equipe em frentes de trabalho especializadas — Documentação, "
    "Front-End e Back-End — permitiu a execução paralela de atividades, "
    "otimizando o tempo de desenvolvimento e garantindo a cobertura de todas as "
    "áreas essenciais do projeto."
)

add_justified_text(
    "Como próximos passos, prevê-se a evolução do sistema com a implementação "
    "de um back-end robusto com banco de dados, integração com serviços de "
    "pagamento online, desenvolvimento de aplicativo mobile e expansão das "
    "funcionalidades de comunicação entre membros."
)

# ============================================================
# REFERÊNCIAS
# ============================================================
add_page_break()
add_section_title("", "REFERÊNCIAS")

referencias = [
    'ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. ABNT NBR 6023: informação e '
    'documentação — referências — elaboração. Rio de Janeiro: ABNT, 2018.',

    'ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. ABNT NBR 14724: informação e '
    'documentação — trabalhos acadêmicos — apresentação. Rio de Janeiro: ABNT, 2011.',

    'MOZILLA DEVELOPER NETWORK. HTML: Linguagem de Marcação de HiperTexto. '
    'Disponível em: https://developer.mozilla.org/pt-BR/docs/Web/HTML. '
    'Acesso em: 24 fev. 2025.',

    'MOZILLA DEVELOPER NETWORK. CSS: Folhas de Estilo em Cascata. '
    'Disponível em: https://developer.mozilla.org/pt-BR/docs/Web/CSS. '
    'Acesso em: 24 fev. 2025.',

    'MOZILLA DEVELOPER NETWORK. JavaScript. '
    'Disponível em: https://developer.mozilla.org/pt-BR/docs/Web/JavaScript. '
    'Acesso em: 24 fev. 2025.',

    'PRESSMAN, R. S.; MAXIM, B. R. Engenharia de software: uma abordagem '
    'profissional. 9. ed. Porto Alegre: AMGH, 2021.',

    'RIES, E. A startup enxuta: como os empreendedores atuais utilizam a '
    'inovação contínua para criar empresas extremamente bem-sucedidas. São Paulo: '
    'Leya, 2012.',

    'SOMMERVILLE, I. Engenharia de software. 10. ed. São Paulo: Pearson, 2019.',
]

for ref in referencias:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_after = Pt(12)
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.line_spacing = 1.0  # Referências com espaçamento simples (ABNT)
    p.paragraph_format.left_indent = Cm(0)
    p.paragraph_format.first_line_indent = Cm(0)
    run = p.add_run(ref)
    run.font.size = Pt(FONT_SIZE_BODY)
    run.font.name = FONT_NAME

# ============================================================
# SALVAR DOCUMENTO
# ============================================================
output_path = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "Documentacao_CongregaFiel_MVP.docx"
)
doc.save(output_path)
print(f"Documento gerado com sucesso: {output_path}")
print("IMPORTANTE: Ao abrir no Word, pressione Ctrl+A e depois F9 para atualizar o sumário automaticamente.")
