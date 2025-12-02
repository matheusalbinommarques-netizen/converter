# Conversor de Arquivos Universal

> MVP Desktop – Fase 1

Aplicativo **desktop para Windows**, focado em converter arquivos de um formato para outro (imagens, documentos, áudio, vídeo, compactação etc.), começando por um conjunto pequeno de conversões e evoluindo em fases.

Este repositório contém o **MVP em Electron**, com foco em:

- Provar o conceito de app desktop rodando.
- Definir uma **arquitetura organizada** (core, infra, ui).
- Começar um **backlog claro** de funcionalidades.

---

## Arquitetura em alto nível (MVP)

- `main.js` – Processo principal do Electron (cria a janela, carrega a UI).
- `preload.js` – Camada de ponte entre Electron e a interface (expor APIs seguras).
- `index.html` – Tela inicial estática (Hello World do MVP).

Pastas planejadas:

- `core/` – Regras de negócio de conversão (pipelines, fila de jobs, presets).
- `infra/` – Integração com bibliotecas externas (ex.: ffmpeg, libs de imagem, zip).
- `ui/` – Interface gráfica (layouts, componentes, navegação).
- `docs/` – Documentação de visão, arquitetura, backlog, decisões.
- `samples/` – Arquivos de exemplo para testes manuais e automáticos.

---

## Como rodar o projeto

Pré-requisitos:

- Node.js instalado (versão LTS).
- npm instalado (vem junto com o Node).

Comandos principais:

```bash
# instalar dependências
npm install

# rodar o app desktop
npm start
