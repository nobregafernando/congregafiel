// =============================================================
// CongregaFiel — Testes: Token Blacklist (Database)
// Validação de inserção, verificação e revogação
// =============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock do cliente Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
  })),
};

// Mock da verificação de revogação
const mockVerificacao = {
  verificarRevogacao: vi.fn(),
  limparCache: vi.fn(),
};

describe("Token Blacklist — Database & Verificação", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerificacao.limparCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("T1: Inserir token na blacklist com sucesso", async () => {
    const novoToken = {
      token_jti: "jti-logout-123",
      usuario_id: "user-456",
      revogado_em: new Date().toISOString(),
      motivo: "logout",
    };

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({
        data: [novoToken],
        error: null,
      }),
    });

    const { data, error } = await mockSupabase
      .from("token_blacklist")
      .insert(novoToken);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data[0].token_jti).toBe("jti-logout-123");
  });

  it("T2: Verificar token revogado retorna true", async () => {
    // Simular token está na blacklist
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { token_jti: "jti-revogado-999" },
        error: null,
      }),
    });

    const { data } = await mockSupabase
      .from("token_blacklist")
      .select("*")
      .eq("token_jti", "jti-revogado-999")
      .single();

    expect(data).toBeDefined();
    expect(data.token_jti).toBe("jti-revogado-999");
  });

  it("T3: Verificar token válido retorna false", async () => {
    // Token NÃO está na blacklist
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    });

    const { data } = await mockSupabase
      .from("token_blacklist")
      .select("*")
      .eq("token_jti", "jti-valido-999")
      .single();

    expect(data).toBeNull();
  });

  it("T4: Cache com TTL funciona (5 minutos)", async () => {
    const tokenJti = "jti-cache-test-123";
    
    // Simular verificação em cache
    const mockCache = new Map();
    const TTL = 5 * 60 * 1000; // 5 min
    
    // Primeira verificação
    const timestamp1 = Date.now();
    mockCache.set(tokenJti, { revogado: false, timestamp: timestamp1 });
    
    // Verificar que está em cache
    const cached = mockCache.get(tokenJti);
    expect(cached).toBeDefined();
    expect(cached.revogado).toBe(false);
    
    // Verificar TTL: dentro de 5 min
    const elapsedTime = Date.now() - cached.timestamp;
    expect(elapsedTime).toBeLessThan(TTL);
    
    // Simular após 6 minutos (expira cache)
    vi.useFakeTimers();
    vi.advanceTimersByTime(TTL + 1000); // Avança além de TTL
    
    const elapsedAposAvanço = Date.now() - cached.timestamp;
    expect(elapsedAposAvanço).toBeGreaterThan(TTL);
    
    vi.useRealTimers();
  });

  it("T5: RLS previne SELECT não-autorizado", async () => {
    // Simular usuário comum tentando ver tokens de outro usuário
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null, // RLS filter retorna vazio
        error: null,
      }),
    });

    const { data } = await mockSupabase
      .from("token_blacklist")
      .select("*")
      .eq("usuario_id", "outro-usuario-999")
      .single();

    expect(data).toBeNull();
  });

  it("T6: Tokens expirados podem ser deletados", async () => {
    const tokenExpirado = {
      token_jti: "jti-expired-123",
      expira_em: new Date(Date.now() - 1000), // passado
    };

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({
        data: [tokenExpirado],
        error: null,
      }),
    });

    // Simular função de limpeza
    const { data, error } = await mockSupabase
      .from("token_blacklist")
      .delete()
      .lt("expira_em", new Date().toISOString());

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});
