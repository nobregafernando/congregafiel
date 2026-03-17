# CongregaFiel - Instruções do Projeto

## Execução
- Sempre iniciar o Claude Code com: `claude --dangerously-skip-permissions`
- Isso permite execução automática de comandos sem pedir confirmação a cada passo

## Stack
- Frontend: HTML, CSS, JavaScript puro
- Backend: Firebase (Auth, Firestore, Hosting)
- Sem frameworks frontend

## Estrutura
- `/public/` - Todos os arquivos do site (servidos pelo Firebase Hosting)
  - `index.html` - Landing page
  - `index.css` - Estilos da landing page
  - `index.js` - Configuração Firebase e lógica principal
  - `favicon.svg` - Ícone do site
  - `/autenticacao/` - Páginas de login, cadastro, recuperação de senha
  - `/igreja/` - Painel administrativo da igreja
  - `/membros/` - Painel dos membros
- `firebase.json` - Configuração do Firebase Hosting

## Convenções
- Idioma do código e commits: Português (BR)
- Branch de desenvolvimento: `develop`
- Branch principal: `main`
