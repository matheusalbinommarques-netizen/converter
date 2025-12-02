
---

## 3. Criar um doc de visão/arquitetura

Cria dentro de `docs/` um arquivo chamado  
`docs/01-visao-e-arquitetura.md`:

```md
# Visão e Arquitetura – Conversor de Arquivos Universal

## Objetivo

Criar um aplicativo **desktop para Windows**, capaz de converter arquivos entre vários formatos, com uma arquitetura modular que facilite:

- Adicionar novos tipos de conversão sem reescrever o app inteiro.
- Isolar dependências pesadas (ex.: ffmpeg, bibliotecas de imagem).
- Manter a UI simples: arrastar/soltar arquivo, escolher formato alvo e converter.

## Restrições iniciais

- Foco inicial em **Windows**.
- Sem dependência obrigatória de internet para converter.
- No começo, suportar **poucos tipos de conversão**, por exemplo:
  - Imagens: PNG ↔ JPG, redimensionar.
  - Documentos: TXT → PDF ou algo bem simples.
- Depois evoluir para coisas mais pesadas (vídeo, áudio, spritesheet etc.).

## Módulos principais

### 1. UI (Renderer / Frontend)

Responsável por:

- Mostrar a tela principal.
- Permitir ao usuário:
  - Escolher arquivos (file picker / drag & drop).
  - Selecionar formato de saída.
  - Ver progresso e resultado (ok/erro).

Vai conversar com o **core** através de uma camada exposta pelo `preload.js` (IPC seguro).

### 2. Core (Regras de Negócio)

Responsável por:

- Orquestrar **jobs de conversão**.
- Validar parâmetros (formatos permitidos, tamanho máximo etc.).
- Definir “pipelines” de conversão:
  - Exemplo: `entrada -> validação -> conversão -> pós-processamento -> saída`.

O core não conhece detalhes de bibliotecas externas (isso fica na infra).

### 3. Infra (Integrações técnicas)

Responsável por:

- Encapsular bibliotecas externas (ffmpeg, libs de imagem, zip, pdf etc.).
- Fornecer funções do tipo:

  ```ts
  convertImage(inputPath, outputPath, { format: 'png', width: 800 })
  convertVideo(inputPath, outputPath, { format: 'gif' })
