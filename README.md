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


## Configuração do usuário & Presets

O app salva preferências simples do usuário em um arquivo JSON:

- **Windows**: `C:\Users\<seu-usuario>\.converter\config.json`

Atualmente são persistidos:

- Pasta padrão de saída:
  - `outputDirMode`: `"same-as-input"` ou `"custom"`.
  - `customOutputDir`: caminho da pasta, quando o modo é `custom`.
- Último preset usado:
  - `lastPreset`: objeto com `{ kind, options }`, onde:
    - `kind` é o tipo de conversão (`image`, `video-gif`, `spritesheet`, etc.).
    - `options` são as opções da UI (largura, qualidade, fps, nome de sheet etc.).
  - `lastPresetUpdatedAt`: data/hora em ISO string.

### Como funciona na prática

- Sempre que você enfileira tarefas (`Adicionar arquivos`), o app:
  - Lê o tipo de conversão atual (`kind`).
  - Lê as opções da UI.
  - Salva como **último preset** para aquele tipo.
- Quando o app abre (ou você muda o tipo no dropdown), a tela:
  - Chama o backend para buscar o último preset para aquele tipo.
  - Preenche apenas os campos que existirem no preset.
  - Mantém os valores padrão para os demais.

### Como limpar presets

Se quiser “resetar” todas as preferências, basta:

1. Fechar o app.
2. Apagar o arquivo `config.json` em `C:\Users\<seu-usuario>\.converter\`.
3. Abrir o app novamente – ele recriará o arquivo com valores default.