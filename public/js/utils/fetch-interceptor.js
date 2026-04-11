// =============================================================
// CongregaFiel — Fetch Interceptor com Refresh Token
// Intercepta 401 e tenta renovar automaticamente
// =============================================================

/**
 * Wrapper ao fetch() nativo que intercepta 401 e tenta renovar token
 * Uso: await fetchComRefresh(url, options)
 */
window.fetchComRefresh = async function(url, options = {}) {
  let response = await fetch(url, options);

  // Se não for 401, retornar normalmente
  if (response.status !== 401) {
    return response;
  }

  // Tentar renovar token
  const renovado = await renovarAccessToken();
  if (!renovado) {
    // Falha na renovação, redirecionar para login
    redirectParaLogin();
    return response;
  }

  // Repetir request com novo token
  const novasOpcoes = {
    ...options,
    headers: {
      ...options.headers,
      "Authorization": `Bearer ${renovado}`,
    },
  };

  return fetch(url, novasOpcoes);
};

/**
 * Tenta renovar o access token usando refresh token
 * @returns {Promise<string|null>} Novo access token ou null se falhou
 */
async function renovarAccessToken() {
  try {
    const sessao = JSON.parse(localStorage.getItem("cf_sessao") || "{}");
    const refreshToken = sessao.refresh_token;

    if (!refreshToken) {
      console.warn("[Token] Nenhum refresh token disponível");
      return null;
    }

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      console.error("[Token] Falha ao renovar:", response.status);
      return null;
    }

    const data = await response.json();
    const novoToken = data.access_token;

    // Atualizar sessão com novo token
    sessao.access_token = novoToken;
    sessao.atualizado_em = new Date().toISOString();
    localStorage.setItem("cf_sessao", JSON.stringify(sessao));

    console.log("[Token] Access token renovado com sucesso");
    return novoToken;
  } catch (err) {
    console.error("[Token] Erro ao renovar:", err);
    return null;
  }
}

/**
 * Redireciona para login quando sessão expira
 */
function redirectParaLogin() {
  console.log("[Token] Redirecionando para login");
  localStorage.removeItem("cf_sessao");
  window.location.href = "/autenticacao/login.html?sessao_expirada=true";
}

/**
 * Configurar interceptor global de fetch (opcional)
 * Uncomment para interceptar TODOS os fetch() da aplicação
 */
// const fetchOriginal = window.fetch;
// window.fetch = function(...args) {
//   return fetchOriginal.apply(this, args)
//     .then(response => {
//       if (response.status === 401) {
//         return renovarAccessToken()
//           .then(novoToken => {
//             if (novoToken) {
//               const [url, options = {}] = args;
//               return fetch(url, {
//                 ...options,
//                 headers: {
//                   ...options.headers,
//                   Authorization: `Bearer ${novoToken}`,
//                 },
//               });
//             }
//             redirectParaLogin();
//             return response;
//           });
//       }
//       return response;
//     });
// };

export { renovarAccessToken, redirectParaLogin, fetchComRefresh };
