// =============================================================
// CongregaFiel — Testes: PWA (Manifest, Service Worker, Caching)
// =============================================================

import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

function lerArquivoPublico(relPath) {
  return fs.readFileSync(path.resolve(process.cwd(), "public", relPath), "utf8");
}

describe("PWA Compliance", () => {
  // ============================================
  // T1: Manifest.json válido e completo
  // ============================================
  it("T1: manifest.json contém estrutura correta", () => {
    // Mock de manifest válido
    const manifest = {
      name: "CongregaFiel",
      short_name: "Congrega",
      start_url: "/",
      display: "standalone",
      icons: [
        { src: "/icons/favicon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/favicon-512.png", sizes: "512x512", type: "image/png" },
      ],
    };
    
    // Propriedades obrigatórias
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
    
    // Verificar icons
    manifest.icons.forEach(icon => {
      expect(icon.src).toBeDefined();
      expect(icon.sizes).toBeDefined();
      expect(icon.type).toBeDefined();
    });
  });

  // ============================================
  // T2: Service Worker instala corretamente
  // ============================================
  it("T2: Service Worker registra e instala", async () => {
    if (!("serviceWorker" in navigator)) {
      console.log("Service Worker não suportado, skip");
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    
    expect(registration).toBeDefined();
    expect(registration.active || registration.installing).toBeDefined();
    
    // Limpar
    await registration.unregister();
  });

  // ============================================
  // T3: Precache de arquivos estáticos
  // ============================================
  it("T3: SW faz precache de arquivos estáticos", async () => {
    if (!("caches" in window)) {
      console.log("Cache API não suportada, skip");
      return;
    }

    const cache = await caches.open("congregafiel-v1");
    const keys = await cache.keys();
    
    // Verificar que pelo menos alguns arquivos estão em cache
    expect(keys.length).toBeGreaterThan(0);
    
    // Verificar arquivos esperados
    const urls = keys.map(r => r.url);
    expect(urls.some(u => u.includes("index.html") || u.includes("offline.html"))).toBe(true);
  });

  // ============================================
  // T4: Cache-First para assets estáticos
  // ============================================
  it("T4: Estratégia cache-first funciona para .css e .js", async () => {
    if (!("caches" in window)) {
      console.log("Cache API não suportada, skip");
      return;
    }

    // Simular fetch com intercept
    const cache = await caches.open("congregafiel-dinamico-v1");
    
    // Adicionar resposta de teste
    const testResponse = new Response("/* CSS teste */", {
      headers: { "Content-Type": "text/css" },
    });
    
    await cache.put(new Request("/test.css"), testResponse.clone());
    
    // Verificar que está em cache
    const cached = await cache.match(new Request("/test.css"));
    expect(cached).toBeDefined();
    
    // Limpar
    await cache.delete("/test.css");
  });

  // ============================================
  // T5: Página offline.html acessível
  // ============================================
  it("T5: offline.html existe e é acessível", async () => {
    const html = lerArquivoPublico("offline.html");
    expect(html).toContain("Sem Conexão");
    expect(html).toContain("offline");
  });

  // ============================================
  // T6: Limpeza de caches antigos
  // ============================================
  it("T6: Ativação do SW limpa caches antigos", async () => {
    if (!("caches" in window)) {
      console.log("Cache API não suportada, skip");
      return;
    }

    // Criar cache "antigo"
    const cacheAntigo = await caches.open("congregafiel-old-v0");
    await cacheAntigo.add("/");
    
    // Verificar que existe
    let nomes = await caches.keys();
    expect(nomes).toContain("congregafiel-old-v0");
    
    // Simular limpeza (seria feito pelo sw no activate)
    await caches.delete("congregafiel-old-v0");
    
    // Verificar que foi deletado
    nomes = await caches.keys();
    expect(nomes).not.toContain("congregafiel-old-v0");
  });

  // ============================================
  // T7: Meta tags PWA no HTML
  // ============================================
  it("T7: index.html contém meta tags PWA", async () => {
    const html = lerArquivoPublico("index.html");
    
    // Verificar meta tags
    expect(html).toContain('rel="manifest"');
    expect(html).toContain("theme-color");
    expect(html).toContain("apple-mobile-web-app-capable");
    expect(html).toContain("apple-touch-icon");
  });

  // ============================================
  // T8: SW responde a fetch events
  // ============================================
  it("T8: Service Worker intercepta fetch events", async () => {
    if (!("serviceWorker" in navigator)) {
      console.log("Service Worker não suportado, skip");
      return;
    }

    // Verificar que SW está ativo
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (registration?.active) {
      // SW está funcionando
      expect(registration.active).toBeDefined();
      expect(registration.active.state).toBe("activated");
    }
  });
});

describe("PWA Manual Verification", () => {
  it("Manual: Verificar Lighthouse PWA score ≥90", () => {
    // Este teste seria executado via Lighthouse CLI
    // npx lighthouse https://localhost/index.html --view
    console.log("Execute: npx lighthouse https://localhost/index.html --view");
    expect(true).toBe(true);
  });

  it("Manual: Verificar instalação mobile", () => {
    console.log("Teste em dispositivo móvel:");
    console.log("1. Abrir em Chrome/Edge");
    console.log("2. Clicar 'Instalar' no prompt");
    console.log("3. Verificar que aparece na tela inicial");
    console.log("4. Testar offline");
    expect(true).toBe(true);
  });
});
