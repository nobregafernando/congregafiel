// =============================================================
// CongregaFiel — Middleware: Circuit Breaker
// Protege o gateway contra falhas consecutivas do backend.
//
// Estados:
//   FECHADO   → tudo normal, requisições passam
//   ABERTO    → backend indisponível, retorna 503 imediatamente
//   SEMI_ABERTO → permite 1 requisição de teste para verificar recuperação
// =============================================================

const ESTADOS = {
  FECHADO: "FECHADO",
  ABERTO: "ABERTO",
  SEMI_ABERTO: "SEMI_ABERTO",
};

class CircuitBreaker {
  /**
   * @param {Object} opcoes
   * @param {number} opcoes.limite   — falhas consecutivas para abrir o circuito (padrão: 5)
   * @param {number} opcoes.timeout  — ms para tentar reabrir (padrão: 30000)
   */
  constructor(opcoes = {}) {
    this.limite = opcoes.limite || parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD, 10) || 5;
    this.timeout = opcoes.timeout || parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT, 10) || 30000;
    this.estado = ESTADOS.FECHADO;
    this.falhas = 0;
    this.proximaTentativa = null;
  }

  /** Registra uma falha no backend */
  registrarFalha() {
    this.falhas++;
    if (this.falhas >= this.limite) {
      this.estado = ESTADOS.ABERTO;
      this.proximaTentativa = Date.now() + this.timeout;
      console.error(
        `[circuit-breaker] Circuito ABERTO após ${this.falhas} falhas. ` +
        `Próxima tentativa em ${this.timeout / 1000}s.`
      );
    }
  }

  /** Registra um sucesso no backend */
  registrarSucesso() {
    this.falhas = 0;
    if (this.estado !== ESTADOS.FECHADO) {
      console.log("[circuit-breaker] Circuito FECHADO — backend recuperado.");
    }
    this.estado = ESTADOS.FECHADO;
    this.proximaTentativa = null;
  }

  /** Retorna true se a requisição pode prosseguir */
  permitir() {
    if (this.estado === ESTADOS.FECHADO) return true;

    if (this.estado === ESTADOS.ABERTO && Date.now() >= this.proximaTentativa) {
      this.estado = ESTADOS.SEMI_ABERTO;
      console.log("[circuit-breaker] Circuito SEMI-ABERTO — testando backend...");
      return true;
    }

    return this.estado === ESTADOS.SEMI_ABERTO ? false : false;
  }

  /** Retorna o estado atual (para health-check) */
  status() {
    return {
      estado: this.estado,
      falhasConsecutivas: this.falhas,
      limite: this.limite,
      timeoutMs: this.timeout,
    };
  }
}

// Instância única compartilhada por todo o gateway
const circuitBreaker = new CircuitBreaker();

/**
 * Middleware Express que bloqueia requisições quando o circuito está aberto.
 */
function circuitBreakerMiddleware(req, res, next) {
  if (!circuitBreaker.permitir()) {
    return res.status(503).json({
      erro: "Backend temporariamente indisponível",
      detalhe: "O gateway detectou falhas consecutivas. Tente novamente em breve.",
      circuito: circuitBreaker.status(),
    });
  }

  next();
}

module.exports = { circuitBreaker, circuitBreakerMiddleware };
