# Backlog – Fase 3 (Config & Presets)

## F3-01 – Padronizar config do usuário em disco

- Garantir que o módulo de config use um diretório de usuário dedicado:
  - Windows: `C:\Users\<user>\.converter\config.json`
- Campos mínimos:
  - `defaultOutputDir: string | null`
  - `lastPreset: { [kind: string]: any } | null`
  - `lastFormat: string | null` (se fizer sentido para imagem)
- Requisitos:
  - Se o arquivo não existir, criar com defaults.
  - Em caso de erro de leitura, logar warning e seguir com defaults.
  - Função centralizada para merge e persistência.

## F3-02 – API de presets no backend (infra/configService)

- Implementar funções (ou revisar se já existirem):
  - `rememberLastPreset(kind, options)`
    - Faz merge na config e persiste.
  - `getLastPreset(kind)`
    - Retorna as opções salvas para aquele tipo de conversão, ou `null`.
- Regras:
  - Ignorar opções `undefined` na hora de salvar.
  - Não travar o app se a escrita falhar (somente logar warning).

## F3-03 – Expor presets via IPC para a UI

- Criar handlers no `main.js`:
  - `ipcMain.handle('get-last-preset', async (event, kind) => { ... })`
  - (Opcional) `ipcMain.handle('get-config', ...)` se quiser algo mais amplo.
- Atualizar `preload.js` para expor:
  - `getLastPreset: (kind) => ipcRenderer.invoke('get-last-preset', kind)`
- Garantir que a API exposta em `window.api` fique tipada de forma consistente.

## F3-04 – Aplicar presets na inicialização da tela (index.html)

- No script da página:
  - Ao carregar (`window.addEventListener('DOMContentLoaded', ...)` ou logo após o preload), chamar:
    - `const preset = await window.api.getLastPreset(kindSelect.value);`
  - Se existir `preset`, preencher:
    - `image-format`, `image-width`, `image-quality`
    - `gif-width`, `gif-fps`
    - `sheet-columns`, `sheet-name`
    - `vs-width`, `vs-frames`, `vs-columns`, `vs-name`
    - `sv-fps`
- Regra:
  - Se algum campo não existir no preset, manter o valor default atual do input.

## F3-05 – Atualizar presets sempre que o usuário enfileirar tarefas

- Garantir que, antes de criar as tasks, `enqueue-tasks`:
  - Recebe `kind` e `options` do renderer (já acontece).
  - Chama `rememberLastPreset(kind, options)` (já está comentado no código).
- Critério:
  - Qualquer mudança na UI (ex.: qualidade 80 → 90) passa a ser a nova config “lembrada”.

## F3-06 – Testes rápidos (script + manual)

- Criar/ajustar `samples/test-config.js` para:
  - Gravar um preset fake.
  - Ler e logar no console.
  - Validar que o JSON em disco está bem-formado.
- Casos de teste manual:
  1. Abrir app pela primeira vez ⇒ inputs vêm com defaults.
  2. Selecionar `Imagem → WebP`, `largura=1024`, `qualidade=75`, rodar conversão.
  3. Fechar o app, abrir de novo:
     - `Tipo de conversão` = imagem.
     - `Formato` = WebP.
     - Largura e qualidade preenchidos com 1024 e 75.
  4. Repetir para vídeo→GIF e vídeo→spritesheet.

## F3-07 – Documentar comportamento de presets no README

- Adicionar seção no `README.md`:
  - “Configuração do usuário & Presets”
- Explicar:
  - Onde o arquivo de config é salvo.
  - Como limpar presets (apagando `config.json`).
  - Que a app lembra o último conjunto de opções para cada tipo de conversão.

## F3-08 – Critério de encerramento da Fase 3

- Todos os presets funcionam para:
  - `image`
  - `video-mp3` (se tiver opções)
  - `video-gif`
  - `spritesheet`
  - `video-spritesheet`
  - `spritesheet-video`
- Nenhum erro fatal é lançado se o arquivo de config estiver corrompido:
  - O app volta a defaults e apenas loga o problema.
- README atualizado.
