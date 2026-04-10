function gerarCodigoIgreja(nomeIgreja, randomFn = Math.random) {
  const baseNome = typeof nomeIgreja === "string" ? nomeIgreja : "";
  const letras = baseNome.replace(/[^a-zA-ZÀ-ú]/g, "").substring(0, 2).toUpperCase();
  const prefixo = letras.length >= 2 ? letras : "CF";
  const digitos = String(Math.floor(1000 + randomFn() * 9000));
  return prefixo + digitos;
}

function validarPayloadRegistroIgreja(payload) {
  const { nome_pastor, nome_igreja, email, senha } = payload || {};
  if (!nome_pastor || !nome_igreja || !email || !senha) {
    return "Todos os campos são obrigatórios";
  }
  if (senha.length < 6) {
    return "A senha deve ter pelo menos 6 caracteres";
  }
  return null;
}

function validarPayloadRegistroMembro(payload) {
  const { nome_completo, email, codigo_igreja, senha } = payload || {};
  if (!nome_completo || !email || !codigo_igreja || !senha) {
    return "Todos os campos são obrigatórios";
  }
  if (senha.length < 6) {
    return "A senha deve ter pelo menos 6 caracteres";
  }
  return null;
}

function validarPayloadLogin(payload) {
  const { email, senha } = payload || {};
  if (!email || !senha) {
    return "E-mail e senha são obrigatórios";
  }
  return null;
}

function validarPayloadRecuperarSenha(payload) {
  const { email } = payload || {};
  if (!email) {
    return "E-mail é obrigatório";
  }
  return null;
}

function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function validarContribuicao(payload) {
  const { membro_id, tipo, valor, data, igreja_id } = payload || {};
  
  if (!membro_id || !isValidUUID(membro_id)) {
    return "Membro ID (UUID) é obrigatório e deve ser válido";
  }
  
  if (!igreja_id || !isValidUUID(igreja_id)) {
    return "Igreja ID (UUID) é obrigatório e deve ser válido";
  }
  
  if (!tipo || !["dizimo", "oferta", "doacao", "outro"].includes(tipo)) {
    return "Tipo deve ser um dos: dizimo, oferta, doacao, outro";
  }
  
  const valorNum = parseFloat(valor);
  if (!valor || isNaN(valorNum) || valorNum <= 0) {
    return "Valor deve ser um número maior que zero";
  }
  
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return "Data deve estar no formato YYYY-MM-DD";
  }
  
  return null;
}

function validarAtualizacaoContribuicao(payload) {
  const { tipo, valor, data } = payload || {};
  
  // Validações opcionais (qualquer campo pode estar ausente)
  if (tipo !== undefined && !["dizimo", "oferta", "doacao", "outro"].includes(tipo)) {
    return "Tipo deve ser um dos: dizimo, oferta, doacao, outro";
  }
  
  if (valor !== undefined) {
    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      return "Valor deve ser um número maior que zero";
    }
  }
  
  if (data !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return "Data deve estar no formato YYYY-MM-DD";
  }
  
  return null;
}

function hashVerificacaoContribuicao(membroId, tipo, valor, data) {
  // Gera um hash para verificação de duplicação
  const dados = `${membroId}|${tipo}|${valor}|${data}`;
  let hash = 0;
  for (let i = 0; i < dados.length; i++) {
    const char = dados.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

module.exports = {
  gerarCodigoIgreja,
  validarPayloadRegistroIgreja,
  validarPayloadRegistroMembro,
  validarPayloadLogin,
  validarPayloadRecuperarSenha,
  isValidUUID,
  validarContribuicao,
  validarAtualizacaoContribuicao,
  hashVerificacaoContribuicao,
};
