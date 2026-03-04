# =============================================================
# CongregaFiel — API REST com FastAPI + Supabase
# Servidor principal com todas as rotas RESTful
# Documentação automática em /docs (Swagger) e /redoc
# =============================================================

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from datetime import datetime
import random
import re

from modelos import (
    IgrejaCriar, IgrejaAtualizar,
    MembroCriar, MembroAtualizar,
    EventoCriar, EventoAtualizar,
    ContribuicaoCriar,
    ComunicadoCriar, ComunicadoAtualizar,
    PedidoOracaoCriar, PedidoOracaoAtualizar,
    RegistrarIgrejaReq, RegistrarMembroReq,
    LoginReq, RecuperarSenhaReq,
)
from supabase_client import supabase, criar_cliente_auth

# -------------------- Configuração --------------------
app = FastAPI(
    title="CongregaFiel API",
    description="API REST para gestão de comunidades eclesiásticas (com Supabase)",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================
# FUNÇÕES AUXILIARES
# =============================================

def gerar_codigo_igreja(nome_igreja: str) -> str:
    """Gera um código único para a igreja (2 letras + 4 dígitos)."""
    letras = re.sub(r'[^A-Za-z]', '', nome_igreja).upper()
    prefixo = letras[:2] if len(letras) >= 2 else "CF"
    sufixo = random.randint(1000, 9999)
    return f"{prefixo}{sufixo}"


# =============================================
# ROTAS — AUTENTICAÇÃO
# =============================================

@app.post("/api/auth/registrar-igreja", status_code=201, tags=["Autenticação"], summary="Registrar nova igreja")
def registrar_igreja(dados: RegistrarIgrejaReq):
    """Cria conta de igreja (pastor) com autenticação Supabase."""
    try:
        # 1. Criar usuário no Supabase Auth
        auth_resp = supabase.auth.admin.create_user({
            "email": dados.email,
            "password": dados.senha,
            "email_confirm": True,
            "user_metadata": {
                "tipo": "igreja",
                "nome": dados.nome_pastor,
            },
        })
        usuario_id = auth_resp.user.id

        # 2. Gerar código da igreja
        codigo = gerar_codigo_igreja(dados.nome_igreja)

        # 3. Inserir na tabela igrejas
        try:
            igreja_resp = supabase.table("igrejas").insert({
                "id": usuario_id,
                "nome": dados.nome_igreja,
                "nome_pastor": dados.nome_pastor,
                "email": dados.email,
                "codigo": codigo,
            }).execute()

            # 4. Inserir pastor como membro
            supabase.table("membros").insert({
                "id": usuario_id,
                "nome_completo": dados.nome_pastor,
                "email": dados.email,
                "telefone": "",
                "tipo": "pastor",
                "igreja_id": usuario_id,
                "codigo_igreja": codigo,
            }).execute()

        except Exception:
            # Rollback: remover usuário do Auth se falhar no banco
            supabase.auth.admin.delete_user(usuario_id)
            raise HTTPException(status_code=500, detail="Erro ao salvar dados da igreja. Tente novamente.")

        igreja = igreja_resp.data[0]
        return {
            "mensagem": "Igreja registrada com sucesso",
            "usuario": {
                "id": usuario_id,
                "tipo": "igreja",
                "nome": dados.nome_pastor,
                "email": dados.email,
                "igrejaId": usuario_id,
                "nomeIgreja": igreja["nome"],
                "codigoIgreja": codigo,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        msg = str(e)
        if "already been registered" in msg:
            raise HTTPException(status_code=409, detail="Este e-mail já está cadastrado")
        raise HTTPException(status_code=500, detail=f"Erro ao registrar igreja: {msg}")


@app.post("/api/auth/registrar-membro", status_code=201, tags=["Autenticação"], summary="Registrar novo membro")
def registrar_membro(dados: RegistrarMembroReq):
    """Cria conta de membro vinculado a uma igreja existente."""
    try:
        # 1. Verificar se o código da igreja existe
        igreja_resp = supabase.table("igrejas").select("*").eq("codigo", dados.codigo_igreja).execute()
        if not igreja_resp.data:
            raise HTTPException(status_code=404, detail="Código de igreja não encontrado")

        igreja = igreja_resp.data[0]

        # 2. Criar usuário no Supabase Auth
        auth_resp = supabase.auth.admin.create_user({
            "email": dados.email,
            "password": dados.senha,
            "email_confirm": True,
            "user_metadata": {
                "tipo": "membro",
                "nome": dados.nome_completo,
            },
        })
        usuario_id = auth_resp.user.id

        # 3. Inserir na tabela membros
        try:
            supabase.table("membros").insert({
                "id": usuario_id,
                "nome_completo": dados.nome_completo,
                "email": dados.email,
                "telefone": dados.telefone or "",
                "tipo": "membro",
                "igreja_id": igreja["id"],
                "codigo_igreja": dados.codigo_igreja,
            }).execute()
        except Exception:
            supabase.auth.admin.delete_user(usuario_id)
            raise HTTPException(status_code=500, detail="Erro ao salvar dados do membro. Tente novamente.")

        return {
            "mensagem": "Membro registrado com sucesso",
            "usuario": {
                "id": usuario_id,
                "tipo": "membro",
                "nome": dados.nome_completo,
                "email": dados.email,
                "igrejaId": igreja["id"],
                "nomeIgreja": igreja["nome"],
                "codigoIgreja": dados.codigo_igreja,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        msg = str(e)
        if "already been registered" in msg:
            raise HTTPException(status_code=409, detail="Este e-mail já está cadastrado")
        raise HTTPException(status_code=500, detail=f"Erro ao registrar membro: {msg}")


@app.post("/api/auth/login", tags=["Autenticação"], summary="Login de usuário")
def login(dados: LoginReq):
    """Autentica um usuário (igreja ou membro) e retorna token de acesso."""
    try:
        auth_client = criar_cliente_auth()
        auth_resp = auth_client.auth.sign_in_with_password({
            "email": dados.email,
            "password": dados.senha,
        })

        usuario_auth = auth_resp.user
        sessao = auth_resp.session
        tipo = usuario_auth.user_metadata.get("tipo", "membro")

        if tipo == "igreja":
            # Buscar dados da igreja
            igreja_resp = supabase.table("igrejas").select("*").eq("id", usuario_auth.id).execute()
            if not igreja_resp.data:
                raise HTTPException(status_code=404, detail="Dados da igreja não encontrados")
            igreja = igreja_resp.data[0]
            usuario = {
                "id": usuario_auth.id,
                "tipo": "igreja",
                "nome": igreja.get("nome_pastor", ""),
                "email": usuario_auth.email,
                "igrejaId": igreja["id"],
                "nomeIgreja": igreja["nome"],
                "codigoIgreja": igreja.get("codigo", ""),
            }
        else:
            # Buscar dados do membro + nome da igreja
            membro_resp = supabase.table("membros").select("*").eq("id", usuario_auth.id).execute()
            if not membro_resp.data:
                raise HTTPException(status_code=404, detail="Dados do membro não encontrados")
            membro = membro_resp.data[0]

            nome_igreja = ""
            if membro.get("igreja_id"):
                igreja_resp = supabase.table("igrejas").select("nome").eq("id", membro["igreja_id"]).execute()
                if igreja_resp.data:
                    nome_igreja = igreja_resp.data[0]["nome"]

            usuario = {
                "id": usuario_auth.id,
                "tipo": "membro",
                "nome": membro.get("nome_completo", ""),
                "email": usuario_auth.email,
                "igrejaId": membro.get("igreja_id", ""),
                "nomeIgreja": nome_igreja,
                "codigoIgreja": membro.get("codigo_igreja", ""),
            }

        return {
            "usuario": usuario,
            "access_token": sessao.access_token,
        }

    except HTTPException:
        raise
    except Exception as e:
        msg = str(e)
        if "Invalid login credentials" in msg:
            raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
        raise HTTPException(status_code=500, detail=f"Erro ao fazer login: {msg}")


@app.post("/api/auth/recuperar-senha", tags=["Autenticação"], summary="Recuperar senha")
def recuperar_senha(dados: RecuperarSenhaReq):
    """Envia e-mail de recuperação de senha para o usuário."""
    try:
        supabase.auth.reset_password_for_email(dados.email)
        return {"mensagem": "E-mail de recuperação enviado com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao enviar e-mail de recuperação: {str(e)}")


# =============================================
# ROTAS — IGREJAS
# =============================================

@app.get("/api/igrejas", tags=["Igrejas"], summary="Listar todas as igrejas")
def listar_igrejas():
    """Retorna a lista completa de igrejas cadastradas."""
    resposta = supabase.table("igrejas").select("*").order("criado_em").execute()
    return resposta.data


@app.get("/api/igrejas/{igreja_id}", tags=["Igrejas"], summary="Buscar igreja por ID")
def buscar_igreja(igreja_id: str):
    """Retorna os dados de uma igreja específica pelo seu ID."""
    resposta = supabase.table("igrejas").select("*").eq("id", igreja_id).execute()
    if not resposta.data:
        raise HTTPException(status_code=404, detail="Igreja não encontrada")
    return resposta.data[0]


@app.post("/api/igrejas", status_code=201, tags=["Igrejas"], summary="Criar nova igreja")
def criar_igreja(igreja: IgrejaCriar):
    """Cadastra uma nova igreja no sistema."""
    dados = {
        "nome": igreja.nome,
        "endereco": igreja.endereco or "",
        "descricao": igreja.descricao or "",
        "codigo": igreja.codigo,
        "nome_pastor": igreja.nome_pastor or "",
        "email": igreja.email,
    }
    resposta = supabase.table("igrejas").insert(dados).execute()
    return resposta.data[0]


@app.put("/api/igrejas/{igreja_id}", tags=["Igrejas"], summary="Atualizar igreja")
def atualizar_igreja(igreja_id: str, atualizacao: IgrejaAtualizar):
    """Atualiza os dados de uma igreja existente."""
    campos = {}
    if atualizacao.nome is not None:
        campos["nome"] = atualizacao.nome
    if atualizacao.endereco is not None:
        campos["endereco"] = atualizacao.endereco
    if atualizacao.descricao is not None:
        campos["descricao"] = atualizacao.descricao
    if atualizacao.nome_pastor is not None:
        campos["nome_pastor"] = atualizacao.nome_pastor
    if atualizacao.email is not None:
        campos["email"] = atualizacao.email

    resposta = supabase.table("igrejas").update(campos).eq("id", igreja_id).execute()
    if not resposta.data:
        raise HTTPException(status_code=404, detail="Igreja não encontrada")
    return resposta.data[0]


@app.delete("/api/igrejas/{igreja_id}", tags=["Igrejas"], summary="Remover igreja")
def remover_igreja(igreja_id: str):
    """Remove uma igreja do sistema pelo seu ID."""
    resposta = supabase.table("igrejas").delete().eq("id", igreja_id).execute()
    if not resposta.data:
        raise HTTPException(status_code=404, detail="Igreja não encontrada")
    return {"mensagem": "Igreja removida com sucesso", "igreja": resposta.data[0]}


# =============================================
# ROTAS — MEMBROS
# =============================================

@app.get("/api/membros", tags=["Membros"], summary="Listar membros")
def listar_membros(
    igreja_id: Optional[str] = Query(None, description="Filtrar por igreja (UUID)"),
    tipo: Optional[str] = Query(None, description="Filtrar por tipo: pastor ou membro"),
):
    """Retorna a lista de membros com filtros opcionais."""
    query = supabase.table("membros").select("*")
    if igreja_id is not None:
        query = query.eq("igreja_id", igreja_id)
    if tipo is not None:
        query = query.eq("tipo", tipo)
    resposta = query.order("criado_em").execute()
    return resposta.data


@app.get("/api/membros/{membro_id}", tags=["Membros"], summary="Buscar membro por ID")
def buscar_membro(membro_id: str):
    """Retorna os dados de um membro específico."""
    resposta = supabase.table("membros").select("*").eq("id", membro_id).execute()
    if not resposta.data:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    return resposta.data[0]


@app.post("/api/membros", status_code=201, tags=["Membros"], summary="Criar novo membro")
def criar_membro(membro: MembroCriar):
    """Cadastra um novo membro vinculado a uma igreja."""
    dados = {
        "nome_completo": membro.nome_completo,
        "email": membro.email,
        "telefone": membro.telefone or "",
        "tipo": membro.tipo or "membro",
        "igreja_id": membro.igreja_id,
        "codigo_igreja": membro.codigo_igreja,
    }
    resposta = supabase.table("membros").insert(dados).execute()
    return resposta.data[0]


@app.put("/api/membros/{membro_id}", tags=["Membros"], summary="Atualizar membro")
def atualizar_membro(membro_id: str, atualizacao: MembroAtualizar):
    """Atualiza os dados de um membro existente."""
    campos = {}
    if atualizacao.nome_completo is not None:
        campos["nome_completo"] = atualizacao.nome_completo
    if atualizacao.email is not None:
        campos["email"] = atualizacao.email
    if atualizacao.telefone is not None:
        campos["telefone"] = atualizacao.telefone
    if atualizacao.tipo is not None:
        campos["tipo"] = atualizacao.tipo

    resposta = supabase.table("membros").update(campos).eq("id", membro_id).execute()
    if not resposta.data:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    return resposta.data[0]


@app.delete("/api/membros/{membro_id}", tags=["Membros"], summary="Remover membro")
def remover_membro(membro_id: str):
    """Remove um membro do sistema."""
    resposta = supabase.table("membros").delete().eq("id", membro_id).execute()
    if not resposta.data:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    return {"mensagem": "Membro removido com sucesso", "membro": resposta.data[0]}


# =============================================
# ROTAS — EVENTOS
# =============================================

@app.get("/api/eventos", tags=["Eventos"], summary="Listar eventos")
def listar_eventos(
    igreja_id: Optional[str] = Query(None, description="Filtrar por igreja (UUID)"),
):
    """Retorna a lista de eventos ordenados por data."""
    query = supabase.table("eventos").select("*")
    if igreja_id is not None:
        query = query.eq("igreja_id", igreja_id)
    resposta = query.order("data").execute()
    return resposta.data


@app.get("/api/eventos/{evento_id}", tags=["Eventos"], summary="Buscar evento por ID")
def buscar_evento(evento_id: str):
    """Retorna os dados de um evento específico."""
    resposta = supabase.table("eventos").select("*").eq("id", evento_id).execute()
    if not resposta.data:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    return resposta.data[0]


@app.post("/api/eventos", status_code=201, tags=["Eventos"], summary="Criar novo evento")
def criar_evento(evento: EventoCriar):
    """Cria um novo evento vinculado a uma igreja."""
    dados = {
        "titulo": evento.titulo,
        "descricao": evento.descricao or "",
        "data": evento.data,
        "horario": evento.horario or "",
        "local": evento.local or "",
        "igreja_id": evento.igreja_id,
    }
    resposta = supabase.table("eventos").insert(dados).execute()
    return resposta.data[0]


@app.put("/api/eventos/{evento_id}", tags=["Eventos"], summary="Atualizar evento")
def atualizar_evento(evento_id: str, atualizacao: EventoAtualizar):
    """Atualiza os dados de um evento existente."""
    campos = {}
    if atualizacao.titulo is not None:
        campos["titulo"] = atualizacao.titulo
    if atualizacao.descricao is not None:
        campos["descricao"] = atualizacao.descricao
    if atualizacao.data is not None:
        campos["data"] = atualizacao.data
    if atualizacao.horario is not None:
        campos["horario"] = atualizacao.horario
    if atualizacao.local is not None:
        campos["local"] = atualizacao.local

    resposta = supabase.table("eventos").update(campos).eq("id", evento_id).execute()
    if not resposta.data:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    return resposta.data[0]


@app.delete("/api/eventos/{evento_id}", tags=["Eventos"], summary="Remover evento")
def remover_evento(evento_id: str):
    """Remove um evento do sistema."""
    resposta = supabase.table("eventos").delete().eq("id", evento_id).execute()
    if not resposta.data:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    return {"mensagem": "Evento removido com sucesso", "evento": resposta.data[0]}


# =============================================
# ROTAS — CONTRIBUIÇÕES
# =============================================

@app.get("/api/contribuicoes", tags=["Contribuições"], summary="Listar contribuições")
def listar_contribuicoes(
    igreja_id: Optional[str] = Query(None, description="Filtrar por igreja (UUID)"),
    membro_id: Optional[str] = Query(None, description="Filtrar por membro (UUID)"),
    tipo: Optional[str] = Query(None, description="Filtrar por tipo"),
):
    """Retorna a lista de contribuições com filtros opcionais."""
    query = supabase.table("contribuicoes").select("*")
    if igreja_id is not None:
        query = query.eq("igreja_id", igreja_id)
    if membro_id is not None:
        query = query.eq("membro_id", membro_id)
    if tipo is not None:
        query = query.eq("tipo", tipo)
    resposta = query.order("data", desc=True).execute()
    return resposta.data


@app.get("/api/contribuicoes/{contribuicao_id}", tags=["Contribuições"], summary="Buscar contribuição por ID")
def buscar_contribuicao(contribuicao_id: str):
    """Retorna os dados de uma contribuição específica."""
    resposta = supabase.table("contribuicoes").select("*").eq("id", contribuicao_id).execute()
    if not resposta.data:
        raise HTTPException(status_code=404, detail="Contribuição não encontrada")
    return resposta.data[0]


@app.post("/api/contribuicoes", status_code=201, tags=["Contribuições"], summary="Registrar contribuição")
def criar_contribuicao(contribuicao: ContribuicaoCriar):
    """Registra uma nova contribuição financeira."""
    dados = {
        "membro_id": contribuicao.membro_id,
        "igreja_id": contribuicao.igreja_id,
        "membro_nome": contribuicao.membro_nome or "",
        "tipo": contribuicao.tipo,
        "valor": contribuicao.valor,
        "data": contribuicao.data or datetime.now().strftime("%Y-%m-%d"),
        "descricao": contribuicao.descricao or "",
    }
    resposta = supabase.table("contribuicoes").insert(dados).execute()
    return resposta.data[0]


@app.delete("/api/contribuicoes/{contribuicao_id}", tags=["Contribuições"], summary="Remover contribuição")
def remover_contribuicao(contribuicao_id: str):
    """Remove uma contribuição do sistema."""
    resposta = supabase.table("contribuicoes").delete().eq("id", contribuicao_id).execute()
    if not resposta.data:
        raise HTTPException(status_code=404, detail="Contribuição não encontrada")
    return {"mensagem": "Contribuição removida com sucesso", "contribuicao": resposta.data[0]}


# =============================================
# ROTAS — COMUNICADOS
# =============================================

@app.get("/api/comunicados", tags=["Comunicados"], summary="Listar comunicados")
def listar_comunicados(
    igreja_id: Optional[str] = Query(None, description="Filtrar por igreja (UUID)"),
):
    """Retorna a lista de comunicados."""
    query = supabase.table("comunicados").select("*")
    if igreja_id is not None:
        query = query.eq("igreja_id", igreja_id)
    resposta = query.order("criado_em", desc=True).execute()
    return resposta.data


@app.get("/api/comunicados/{comunicado_id}", tags=["Comunicados"], summary="Buscar comunicado por ID")
def buscar_comunicado(comunicado_id: str):
    """Retorna os dados de um comunicado específico."""
    resposta = supabase.table("comunicados").select("*").eq("id", comunicado_id).execute()
    if not resposta.data:
        raise HTTPException(status_code=404, detail="Comunicado não encontrado")
    return resposta.data[0]


@app.post("/api/comunicados", status_code=201, tags=["Comunicados"], summary="Criar comunicado")
def criar_comunicado(comunicado: ComunicadoCriar):
    """Cria um novo comunicado para a igreja."""
    dados = {
        "igreja_id": comunicado.igreja_id,
        "titulo": comunicado.titulo,
        "conteudo": comunicado.conteudo,
        "prioridade": comunicado.prioridade or "normal",
    }
    resposta = supabase.table("comunicados").insert(dados).execute()
    return resposta.data[0]


@app.put("/api/comunicados/{comunicado_id}", tags=["Comunicados"], summary="Atualizar comunicado")
def atualizar_comunicado(comunicado_id: str, atualizacao: ComunicadoAtualizar):
    """Atualiza os dados de um comunicado existente."""
    campos = {}
    if atualizacao.titulo is not None:
        campos["titulo"] = atualizacao.titulo
    if atualizacao.conteudo is not None:
        campos["conteudo"] = atualizacao.conteudo
    if atualizacao.prioridade is not None:
        campos["prioridade"] = atualizacao.prioridade

    resposta = supabase.table("comunicados").update(campos).eq("id", comunicado_id).execute()
    if not resposta.data:
        raise HTTPException(status_code=404, detail="Comunicado não encontrado")
    return resposta.data[0]


@app.delete("/api/comunicados/{comunicado_id}", tags=["Comunicados"], summary="Remover comunicado")
def remover_comunicado(comunicado_id: str):
    """Remove um comunicado do sistema."""
    resposta = supabase.table("comunicados").delete().eq("id", comunicado_id).execute()
    if not resposta.data:
        raise HTTPException(status_code=404, detail="Comunicado não encontrado")
    return {"mensagem": "Comunicado removido com sucesso", "comunicado": resposta.data[0]}


# =============================================
# ROTAS — PEDIDOS DE ORAÇÃO
# =============================================

@app.get("/api/pedidos-oracao", tags=["Pedidos de Oração"], summary="Listar pedidos de oração")
def listar_pedidos_oracao(
    igreja_id: Optional[str] = Query(None, description="Filtrar por igreja (UUID)"),
    membro_id: Optional[str] = Query(None, description="Filtrar por membro (UUID)"),
    status: Optional[str] = Query(None, description="Filtrar por status"),
):
    """Retorna a lista de pedidos de oração com filtros opcionais."""
    query = supabase.table("pedidos_oracao").select("*")
    if igreja_id is not None:
        query = query.eq("igreja_id", igreja_id)
    if membro_id is not None:
        query = query.eq("membro_id", membro_id)
    if status is not None:
        query = query.eq("status", status)
    resposta = query.order("criado_em", desc=True).execute()
    return resposta.data


@app.get("/api/pedidos-oracao/{pedido_id}", tags=["Pedidos de Oração"], summary="Buscar pedido por ID")
def buscar_pedido_oracao(pedido_id: str):
    """Retorna os dados de um pedido de oração específico."""
    resposta = supabase.table("pedidos_oracao").select("*").eq("id", pedido_id).execute()
    if not resposta.data:
        raise HTTPException(status_code=404, detail="Pedido de oração não encontrado")
    return resposta.data[0]


@app.post("/api/pedidos-oracao", status_code=201, tags=["Pedidos de Oração"], summary="Criar pedido de oração")
def criar_pedido_oracao(pedido: PedidoOracaoCriar):
    """Cria um novo pedido de oração."""
    dados = {
        "igreja_id": pedido.igreja_id,
        "membro_id": pedido.membro_id,
        "membro_nome": pedido.membro_nome or "",
        "pedido": pedido.pedido,
        "status": "pendente",
    }
    resposta = supabase.table("pedidos_oracao").insert(dados).execute()
    return resposta.data[0]


@app.put("/api/pedidos-oracao/{pedido_id}", tags=["Pedidos de Oração"], summary="Atualizar pedido de oração")
def atualizar_pedido_oracao(pedido_id: str, atualizacao: PedidoOracaoAtualizar):
    """Atualiza os dados de um pedido de oração."""
    campos = {}
    if atualizacao.pedido is not None:
        campos["pedido"] = atualizacao.pedido
    if atualizacao.status is not None:
        campos["status"] = atualizacao.status

    resposta = supabase.table("pedidos_oracao").update(campos).eq("id", pedido_id).execute()
    if not resposta.data:
        raise HTTPException(status_code=404, detail="Pedido de oração não encontrado")
    return resposta.data[0]


@app.delete("/api/pedidos-oracao/{pedido_id}", tags=["Pedidos de Oração"], summary="Remover pedido de oração")
def remover_pedido_oracao(pedido_id: str):
    """Remove um pedido de oração do sistema."""
    resposta = supabase.table("pedidos_oracao").delete().eq("id", pedido_id).execute()
    if not resposta.data:
        raise HTTPException(status_code=404, detail="Pedido de oração não encontrado")
    return {"mensagem": "Pedido removido com sucesso", "pedido": resposta.data[0]}


# =============================================
# ROTA RAIZ
# =============================================

@app.get("/", tags=["Info"], summary="Informações da API")
def raiz():
    """Retorna informações gerais sobre a API."""
    return {
        "nome": "CongregaFiel API (FastAPI + Supabase)",
        "versao": "2.0.0",
        "documentacao": "/docs",
        "endpoints": {
            "auth_registrar_igreja": "/api/auth/registrar-igreja",
            "auth_registrar_membro": "/api/auth/registrar-membro",
            "auth_login": "/api/auth/login",
            "auth_recuperar_senha": "/api/auth/recuperar-senha",
            "igrejas": "/api/igrejas",
            "membros": "/api/membros",
            "eventos": "/api/eventos",
            "contribuicoes": "/api/contribuicoes",
            "comunicados": "/api/comunicados",
            "pedidos_oracao": "/api/pedidos-oracao",
        },
    }
