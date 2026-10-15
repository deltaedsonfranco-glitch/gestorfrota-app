# GestorFrota Transporte — telas (GitHub Pages)

Telas do sistema GestorFrota Transporte, publicadas pelo GitHub Pages em
**https://deltaedsonfranco-glitch.github.io/gestorfrota-app/**

- Este repositório é **público** e contém **somente as telas** (HTML, CSS e JS).
- **Nenhum dado** fica aqui. Os dados ficam na planilha do Google.
- O servidor (regras, login, acesso à planilha) fica no Apps Script, com o
  código no repositório **privado** `gestorfrota-transporte`.

## Arquivos

| Arquivo | O que é |
|---|---|
| `config.js` | **Endereço da API** (URL `/exec` do Apps Script) — único arquivo de configuração |
| `index.html` | Tela de login |
| `gestor.html` | Painel do gestor |
| `motorista.html` | Painel do motorista |
| `assets/api.js` | Comunicação com o servidor e controle da sessão |
| `assets/util.js`, `assets/ui.js`, `assets/styles.css` | Funções e estilos compartilhados |
| `manifest.webmanifest`, `icons/` | Ícone e "Instalar app" no celular |

## Atualizar

As telas são geradas a partir do repositório privado com
`python3 ferramentas/gerar_app.py <pasta>`. Depois, suba os arquivos
alterados aqui (Add file › Upload files). **Não sobrescreva o `config.js`.**
