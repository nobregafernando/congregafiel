# =============================================================
# Utilitários de Relatórios Financeiros
# Funções para gerar relatórios consolidados
# =============================================================

from datetime import datetime, timedelta
from typing import List, Dict, Any
from supabase_client import supabase


def resumo_mensal(data_inicio: str, data_fim: str) -> Dict[str, Any]:
    """
    Retorna resumo mensal de contribuições.
    Agrupa por mês e soma valores.
    """
    try:
        # Query contribuições no período
        resp = supabase.table("contribuicoes").select(
            "id,membro_id,tipo,valor,data,membros(nome_completo)"
        ).gte("data", data_inicio).lte("data", data_fim).execute()

        contribuicoes = resp.data or []

        # Agrupar por mês
        resumo = {}
        for contrib in contribuicoes:
            # Extrair mês (YYYY-MM)
            data_parts = contrib["data"].split("-")
            mes_key = f"{data_parts[0]}-{data_parts[1]}"

            if mes_key not in resumo:
                resumo[mes_key] = {"total": 0, "quantidade": 0, "tipos": {}}

            resumo[mes_key]["total"] += contrib["valor"]
            resumo[mes_key]["quantidade"] += 1

            tipo = contrib["tipo"]
            if tipo not in resumo[mes_key]["tipos"]:
                resumo[mes_key]["tipos"][tipo] = 0
            resumo[mes_key]["tipos"][tipo] += contrib["valor"]

        # Ordenar por mês
        resumo_ordenado = {k: resumo[k] for k in sorted(resumo.keys())}

        return {
            "tipo": "resumo_mensal",
            "periodo": {"inicio": data_inicio, "fim": data_fim},
            "dados": resumo_ordenado,
            "total_geral": sum(item["total"] for item in resumo_ordenado.values()),
        }
    except Exception as e:
        return {"erro": str(e)}


def historico_membro(membro_id: str, data_inicio: str = None, data_fim: str = None) -> Dict[str, Any]:
    """
    Retorna histórico de contribuições de um membro específico.
    """
    try:
        # Buscar membro
        resp_membro = supabase.table("membros").select("*").eq("id", membro_id).execute()
        if not resp_membro.data:
            return {"erro": "Membro não encontrado", "status": 404}

        membro = resp_membro.data[0]

        # Query contribuições
        query = supabase.table("contribuicoes").select("*").eq("membro_id", membro_id)

        if data_inicio:
            query = query.gte("data", data_inicio)
        if data_fim:
            query = query.lte("data", data_fim)

        resp = query.order("data", desc=True).execute()
        contribuicoes = resp.data or []

        # Calcular totais por tipo
        totais = {}
        for contrib in contribuicoes:
            tipo = contrib["tipo"]
            if tipo not in totais:
                totais[tipo] = 0
            totais[tipo] += contrib["valor"]

        return {
            "tipo": "historico_membro",
            "membro": {
                "id": membro["id"],
                "nome": membro["nome_completo"],
                "email": membro.get("email", ""),
            },
            "periodo": {"inicio": data_inicio or "indefinido", "fim": data_fim or "indefinido"},
            "contribuicoes": contribuicoes,
            "totais_por_tipo": totais,
            "total_geral": sum(totais.values()),
            "quantidade": len(contribuicoes),
        }
    except Exception as e:
        return {"erro": str(e)}


def comparativo_anual(ano1: str, ano2: str) -> Dict[str, Any]:
    """
    Compara contribuições entre dois anos.
    """
    try:
        data1_inicio = f"{ano1}-01-01"
        data1_fim = f"{ano1}-12-31"
        data2_inicio = f"{ano2}-01-01"
        data2_fim = f"{ano2}-12-31"

        # Query ano 1
        resp1 = supabase.table("contribuicoes").select("data,valor,tipo").gte(
            "data", data1_inicio
        ).lte("data", data1_fim).execute()

        # Query ano 2
        resp2 = supabase.table("contribuicoes").select("data,valor,tipo").gte(
            "data", data2_inicio
        ).lte("data", data2_fim).execute()

        contrib1 = resp1.data or []
        contrib2 = resp2.data or []

        # Agrupar por mês
        def agrupar_por_mes(contribuicoes, ano):
            grupo = {}
            for contrib in contribuicoes:
                mes = contrib["data"][5:7]  # MM
                chave = f"mes_{mes}"
                if chave not in grupo:
                    grupo[chave] = 0
                grupo[chave] += contrib["valor"]
            return grupo

        meses1 = agrupar_por_mes(contrib1, ano1)
        meses2 = agrupar_por_mes(contrib2, ano2)

        # Comparação
        comparacao = {}
        for i in range(1, 13):
            mes_key = f"mes_{i:02d}"
            comparacao[mes_key] = {
                ano1: meses1.get(mes_key, 0),
                ano2: meses2.get(mes_key, 0),
                "diferenca": meses2.get(mes_key, 0) - meses1.get(mes_key, 0),
                "percentual": (
                    ((meses2.get(mes_key, 0) - meses1.get(mes_key, 0)) / meses1.get(mes_key, 1)) * 100
                    if meses1.get(mes_key, 0) > 0
                    else 0
                ),
            }

        return {
            "tipo": "comparativo_anual",
            "anos": [ano1, ano2],
            "por_mes": comparacao,
            "total_ano1": sum(meses1.values()),
            "total_ano2": sum(meses2.values()),
        }
    except Exception as e:
        return {"erro": str(e)}


def top_contribuintes(limite: int = 10, data_inicio: str = None, data_fim: str = None) -> Dict[str, Any]:
    """
    Retorna ranking dos maiores contribuintes.
    """
    try:
        query = supabase.table("contribuicoes").select(
            "membro_id,valor,membros(nome_completo),membros(email)"
        )

        if data_inicio:
            query = query.gte("data", data_inicio)
        if data_fim:
            query = query.lte("data", data_fim)

        resp = query.execute()
        contrib = resp.data or []

        # Agrupar por membro
        por_membro = {}
        for c in contrib:
            membro_id = c["membro_id"]
            if membro_id not in por_membro:
                por_membro[membro_id] = {
                    "membro_id": membro_id,
                    "nome": c.get("membros", {}).get("nome_completo", "Desconhecido"),
                    "email": c.get("membros", {}).get("email", ""),
                    "total": 0,
                    "contribuicoes": 0,
                }
            por_membro[membro_id]["total"] += c["valor"]
            por_membro[membro_id]["contribuicoes"] += 1

        # Ordenar e limitar
        top = sorted(por_membro.values(), key=lambda x: x["total"], reverse=True)[:limite]

        return {
            "tipo": "top_contribuintes",
            "limite": limite,
            "periodo": {"inicio": data_inicio, "fim": data_fim},
            "ranking": top,
            "total_geral": sum(item["total"] for item in top),
        }
    except Exception as e:
        return {"erro": str(e)}


def inadimplentes(dias_atraso: int = 30) -> Dict[str, Any]:
    """
    Retorna membros com pagamentos atrasados.
    (Implementação simplificada - assume data limite do mês)
    """
    try:
        # Data limite (30 dias atrás)
        data_limite = (datetime.now() - timedelta(days=dias_atraso)).strftime("%Y-%m-%d")

        # Buscar membros sem contribuições recentes
        resp_membros = supabase.table("membros").select("*").execute()
        membros = resp_membros.data or []

        inadimplentes_list = []

        for membro in membros:
            # Verificar última contribuição
            resp_contrib = supabase.table("contribuicoes").select("*").eq(
                "membro_id", membro["id"]
            ).order("data", desc=True).limit(1).execute()

            if not resp_contrib.data:
                # Sem nenhuma contribuição
                inadimplentes_list.append({
                    "membro_id": membro["id"],
                    "nome": membro["nome_completo"],
                    "email": membro.get("email", ""),
                    "dias_atraso": "Nunca contribuiu",
                    "ultima_contribuicao": None,
                })
            else:
                ultima_contrib = resp_contrib.data[0]
                ultima_data = datetime.strptime(ultima_contrib["data"], "%Y-%m-%d")
                if ultima_data.strftime("%Y-%m-%d") < data_limite:
                    dias = (datetime.now() - ultima_data).days
                    inadimplentes_list.append({
                        "membro_id": membro["id"],
                        "nome": membro["nome_completo"],
                        "email": membro.get("email", ""),
                        "dias_atraso": dias,
                        "ultima_contribuicao": ultima_contrib["data"],
                    })

        return {
            "tipo": "inadimplentes",
            "dias_limite": dias_atraso,
            "data_limite": data_limite,
            "total": len(inadimplentes_list),
            "membros": inadimplentes_list,
        }
    except Exception as e:
        return {"erro": str(e)}


def fluxo_caixa(data_inicio: str, data_fim: str) -> Dict[str, Any]:
    """
    Retorna fluxo de caixa dia a dia.
    """
    try:
        resp = supabase.table("contribuicoes").select("*").gte(
            "data", data_inicio
        ).lte("data", data_fim).order("data").execute()

        contrib = resp.data or []

        # Agrupar por dia
        fluxo = {}
        for c in contrib:
            data = c["data"]
            if data not in fluxo:
                fluxo[data] = {"entrada": 0, "quantidade": 0, "detalhes": []}
            fluxo[data]["entrada"] += c["valor"]
            fluxo[data]["quantidade"] += 1
            fluxo[data]["detalhes"].append({
                "membro_id": c["membro_id"],
                "tipo": c["tipo"],
                "valor": c["valor"],
            })

        # Calcular saldo acumulado
        fluxo_ordenado = {}
        saldo_acumulado = 0
        for data in sorted(fluxo.keys()):
            saldo_acumulado += fluxo[data]["entrada"]
            fluxo_ordenado[data] = {
                **fluxo[data],
                "saldo_acumulado": saldo_acumulado,
            }

        return {
            "tipo": "fluxo_caixa",
            "periodo": {"inicio": data_inicio, "fim": data_fim},
            "por_dia": fluxo_ordenado,
            "total_periodo": sum(item["entrada"] for item in fluxo_ordenado.values()),
        }
    except Exception as e:
        return {"erro": str(e)}
