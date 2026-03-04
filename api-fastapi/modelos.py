# =============================================================
# CongregaFiel — Modelos de Dados (Pydantic)
# Definição dos schemas de validação para a API
# =============================================================

from pydantic import BaseModel, Field
from typing import Optional


# -------------------- Igreja --------------------
class IgrejaCriar(BaseModel):
    nome: str = Field(..., min_length=2, description="Nome da igreja")
    endereco: Optional[str] = Field("", description="Endereço completo")
    descricao: Optional[str] = Field("", description="Descrição da igreja")
    codigo: str = Field(..., description="Código único da igreja (ex: CF1234)")
    nome_pastor: Optional[str] = Field("", description="Nome do pastor")
    email: Optional[str] = Field(None, description="E-mail da igreja")


class IgrejaAtualizar(BaseModel):
    nome: Optional[str] = Field(None, min_length=2)
    endereco: Optional[str] = None
    descricao: Optional[str] = None
    nome_pastor: Optional[str] = None
    email: Optional[str] = None


# -------------------- Membro --------------------
class MembroCriar(BaseModel):
    nome_completo: str = Field(..., min_length=2, description="Nome completo")
    email: str = Field(..., description="E-mail do membro")
    telefone: Optional[str] = Field("", description="Telefone de contato")
    tipo: Optional[str] = Field("membro", description="Tipo: pastor ou membro")
    igreja_id: str = Field(..., description="UUID da igreja vinculada")
    codigo_igreja: Optional[str] = Field(None, description="Código da igreja")


class MembroAtualizar(BaseModel):
    nome_completo: Optional[str] = Field(None, min_length=2)
    email: Optional[str] = None
    telefone: Optional[str] = None
    tipo: Optional[str] = None


# -------------------- Evento --------------------
class EventoCriar(BaseModel):
    titulo: str = Field(..., min_length=2, description="Título do evento")
    descricao: Optional[str] = Field("", description="Descrição do evento")
    data: str = Field(..., description="Data no formato AAAA-MM-DD")
    horario: Optional[str] = Field("", description="Horário do evento")
    local: Optional[str] = Field("", description="Local do evento")
    igreja_id: str = Field(..., description="UUID da igreja organizadora")


class EventoAtualizar(BaseModel):
    titulo: Optional[str] = Field(None, min_length=2)
    descricao: Optional[str] = None
    data: Optional[str] = None
    horario: Optional[str] = None
    local: Optional[str] = None


# -------------------- Contribuição --------------------
class ContribuicaoCriar(BaseModel):
    membro_id: str = Field(..., description="UUID do membro contribuinte")
    igreja_id: str = Field(..., description="UUID da igreja")
    membro_nome: Optional[str] = Field("", description="Nome do membro")
    tipo: str = Field(..., description="Tipo: dizimo, oferta, doacao ou outro")
    valor: float = Field(..., gt=0, description="Valor da contribuição")
    data: Optional[str] = Field(None, description="Data no formato AAAA-MM-DD")
    descricao: Optional[str] = Field("", description="Descrição adicional")


# -------------------- Comunicado --------------------
class ComunicadoCriar(BaseModel):
    igreja_id: str = Field(..., description="UUID da igreja")
    titulo: str = Field(..., min_length=2, description="Título do comunicado")
    conteudo: str = Field(..., description="Conteúdo do comunicado")
    prioridade: Optional[str] = Field("normal", description="Prioridade: normal ou urgente")


class ComunicadoAtualizar(BaseModel):
    titulo: Optional[str] = Field(None, min_length=2)
    conteudo: Optional[str] = None
    prioridade: Optional[str] = None


# -------------------- Pedido de Oração --------------------
class PedidoOracaoCriar(BaseModel):
    igreja_id: str = Field(..., description="UUID da igreja")
    membro_id: str = Field(..., description="UUID do membro")
    membro_nome: Optional[str] = Field("", description="Nome do membro")
    pedido: str = Field(..., description="Texto do pedido de oração")


class PedidoOracaoAtualizar(BaseModel):
    pedido: Optional[str] = None
    status: Optional[str] = Field(None, description="Status: pendente, orado ou respondido")


# -------------------- Autenticação --------------------
class RegistrarIgrejaReq(BaseModel):
    nome_pastor: str = Field(..., min_length=2, description="Nome do pastor responsável")
    nome_igreja: str = Field(..., min_length=2, description="Nome da igreja")
    email: str = Field(..., description="E-mail para login")
    senha: str = Field(..., min_length=6, description="Senha de acesso")


class RegistrarMembroReq(BaseModel):
    nome_completo: str = Field(..., min_length=2, description="Nome completo do membro")
    email: str = Field(..., description="E-mail para login")
    telefone: Optional[str] = Field("", description="Telefone de contato")
    codigo_igreja: str = Field(..., description="Código da igreja para vincular")
    senha: str = Field(..., min_length=6, description="Senha de acesso")


class LoginReq(BaseModel):
    email: str = Field(..., description="E-mail cadastrado")
    senha: str = Field(..., description="Senha de acesso")


class RecuperarSenhaReq(BaseModel):
    email: str = Field(..., description="E-mail cadastrado para recuperação")
