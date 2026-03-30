// =============================================================
// CongregaFiel — Middleware: Logger Estruturado
// Registra cada requisição com request-id, método, path,
// status HTTP e duração em milissegundos.
// =============================================================

const CORES = {
  reset: "\x1b[0m",
  verde: "\x1b[32m",
  amarelo: "\x1b[33m",
  vermelho: "\x1b[31m",
  ciano: "\x1b[36m",
  cinza: "\x1b[90m",
};

function corPorStatus(status) {
  if (status < 300) return CORES.verde;
  if (status < 400) return CORES.amarelo;
  return CORES.vermelho;
}

function logger(req, res, next) {
  const inicio = Date.now();

  // Capturar o momento em que a resposta é finalizada
  res.on("finish", () => {
    const duracao = Date.now() - inicio;
    const status = res.statusCode;
    const id = req.requestId || "-";

    if (process.env.NODE_ENV === "production") {
      // JSON estruturado para produção (fácil de parsear em serviços de log)
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        requestId: id,
        method: req.method,
        path: req.originalUrl,
        status,
        durationMs: duracao,
        ip: req.ip,
      }));
    } else {
      // Log colorido para desenvolvimento
      const cor = corPorStatus(status);
      console.log(
        `${CORES.cinza}[${new Date().toISOString()}]${CORES.reset} ` +
        `${CORES.ciano}${id.substring(0, 8)}${CORES.reset} ` +
        `${req.method.padEnd(7)} ${req.originalUrl} ` +
        `${cor}${status}${CORES.reset} ` +
        `${CORES.cinza}${duracao}ms${CORES.reset}`
      );
    }
  });

  next();
}

module.exports = logger;
