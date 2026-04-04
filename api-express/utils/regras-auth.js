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

module.exports = {
  gerarCodigoIgreja,
  validarPayloadRegistroIgreja,
  validarPayloadRegistroMembro,
  validarPayloadLogin,
  validarPayloadRecuperarSenha,
};
