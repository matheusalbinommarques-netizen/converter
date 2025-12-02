# Plano de Testes – Conversor de Arquivos Universal (MVP Desktop)

## 1. Objetivo

Validar se o MVP atende ao uso básico com qualidade aceitável:
- Converter imagens entre formatos mais comuns.
- Extrair áudio de vídeo (MP3).
- Gerar GIF a partir de vídeo.
- Gerar spritesheet (PNG + JSON) a partir de múltiplas imagens.
- Usar a interface com fila de tarefas sem travamentos.

---

## 2. Ambiente de Testes

- Sistema operacional: Windows 10/11
- Ferramentas:
  - Node.js + npm instalados
  - App Electron executando via `npm start`
- Dependências do projeto instaladas:
  - `npm install`

---

## 3. Casos de Teste Funcionais

### 3.1 Imagem → Formatos Web

| ID  | Funcionalidade         | Entrada                                      | Ação                                                                 | Resultado Esperado                                               | Status |
|-----|------------------------|----------------------------------------------|----------------------------------------------------------------------|------------------------------------------------------------------|--------|
| IM1 | PNG → JPG (UI)         | `imagem_png_1.png`                           | Tipo: *Imagem* → Formato: **JPG** → Adicionar arquivo → aguardar    | Arquivo `imagem_png_1.jpg` gerado na mesma pasta, sem erro      |        |
| IM2 | JPG → WebP (UI)        | `imagem_jpg_1.jpg`                           | Tipo: *Imagem* → Formato: **WebP** → Adicionar arquivo              | Arquivo `.webp` gerado, tamanho menor que o JPG original        |        |
| IM3 | Redimensionar largura  | `imagem_grande.png`                          | Tipo: *Imagem* → Formato: **JPG** → largura = 800 → Adicionar       | Arquivo `.jpg` gerado com largura ≈ 800 px (mantendo proporção) |        |
| IM4 | Conversão múltipla     | 3 imagens (*.png / *.jpg*)                   | Selecionar várias imagens em uma vez                                | 3 tarefas criadas, todas concluídas como **completed**          |        |
| IM5 | Erro formato não aceito| Arquivo `.txt` ou `.pdf`                     | Tentar adicionar em tipo *Imagem*                                   | Tarefas devem falhar ou não serem aceitas (mensagem de erro)    |        |

---

### 3.2 Vídeo → MP3

| ID  | Funcionalidade       | Entrada                         | Ação                                                                 | Resultado Esperado                                                     | Status |
|-----|----------------------|---------------------------------|----------------------------------------------------------------------|------------------------------------------------------------------------|--------|
| VD1 | MP4 → MP3 (UI)       | `video_curto.mp4`               | Tipo: *Vídeo → MP3* → Adicionar arquivo                             | Arquivo `.mp3` gerado na mesma pasta, sem erro                        |        |
| VD2 | Vários vídeos        | 2–3 arquivos `.mp4`             | Adicionar todos de uma vez                                          | 2–3 tarefas, todas **completed**, cada uma com seu `.mp3`             |        |
| VD3 | Formato não suportado| Arquivo `.wmv` ou outro estranho| Tentar adicionar em *Vídeo → MP3*                                   | Tarefa falha com mensagem de formato não suportado                   |        |

---

### 3.3 Vídeo → GIF

| ID  | Funcionalidade     | Entrada                   | Ação                                                                                   | Resultado Esperado                                                      | Status |
|-----|--------------------|---------------------------|----------------------------------------------------------------------------------------|-------------------------------------------------------------------------|--------|
| GF1 | GIF padrão         | `video_curto.mp4`         | Tipo: *Vídeo → GIF* → largura vazia, fps padrão → Adicionar arquivo                   | Arquivo `.gif` gerado, animação funcionando                            |        |
| GF2 | GIF otimizado      | `video_curto.mp4`         | Tipo: *Vídeo → GIF* → largura = 480, fps = 12                                         | GIF menor que o original de GF1, qualidade visual aceitável            |        |
| GF3 | Arquivo muito grande| vídeo longo (> 2 min)     | Gerar GIF com largura = 360, fps = 10                                                 | App não trava; se falhar, mensagem de erro compreensível               |        |

---

### 3.4 Spritesheet

| ID  | Funcionalidade           | Entrada                              | Ação                                                                   | Resultado Esperado                                                       | Status |
|-----|--------------------------|--------------------------------------|------------------------------------------------------------------------|---------------------------------------------------------------------------|
| SP1 | Spritesheet básica       | 4 imagens PNG do mesmo tamanho      | Tipo: *Spritesheet* → colunas vazias, nome vazio → Adicionar arquivos | Gera `spritesheet.png` + `spritesheet.json` na mesma pasta               |        |
| SP2 | Definir colunas e nome   | 6 imagens PNG do mesmo tamanho      | Tipo: *Spritesheet* → colunas = 3, nome = `guerreiro_ataque`          | Arquivos `guerreiro_ataque.png` e `guerreiro_ataque.json` gerados       |        |
| SP3 | Imagens de tamanhos diferentes | PNGs com dimensões diferentes | Gerar spritesheet                                                      | Resultado previsível (sheet gerada “torta”) ou erro claro informando    |        |

---

### 3.5 Fila, UI e estabilidade

| ID  | Funcionalidade            | Cenário                                                       | Ação                                                                                         | Resultado Esperado                                                                | Status |
|-----|---------------------------|---------------------------------------------------------------|----------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|--------|
| FL1 | Fila com múltiplos tipos  | 2 imagens + 1 vídeo MP4 + 1 vídeo GIF                        | Adicionar primeiro imagens, depois vídeos, observar fila                                    | Status mudando corretamente (pending → running → completed) sem travar           |        |
| FL2 | Abrir pasta               | Qualquer tarefa completed                                    | Clicar em “Abrir pasta”                                                                     | Explorer abre na pasta correta, com arquivo selecionado                          |        |
| FL3 | Limpar lista              | Várias tarefas na lista                                      | Clicar em “Limpar lista”                                                                    | Lista da GUI limpa, mas tarefas que já estavam em execução continuam normalmente |        |
| FL4 | Fechar e reabrir app      | App com algumas conversões já feitas                         | Fechar janela e abrir de novo com `npm start`                                              | App abre normalmente, sem erros de inicialização                                 |        |

---

## 4. Casos de Erro e Resiliência

- Tentar abrir arquivo inexistente (caminho apagado antes da conversão).
- Falta de espaço em disco (simular usando partição quase cheia, se possível).
- Cancelar seleção de arquivo no diálogo (não deve quebrar a UI).

---

## 5. Registro de Resultados

- Preencher a coluna **Status** com: `OK`, `Falhou`, `Não Executado`.
- Para falhas:
  - Anotar brevemente o problema no README ou em um arquivo `docs/bugs.md`.
  - Abrir issue no GitHub com: descrição + passos para reproduzir + prints.

---

## 6. Conclusão da Fase de Testes

A Fase 6 será considerada concluída quando:

- Todos os casos críticos (`IM1`, `IM2`, `VD1`, `GF1`, `SP1`, `FL1`, `FL2`) estiverem `OK`.
- Bugs conhecidos estiverem documentados e, se possível, corrigidos.
- O app estiver utilizável sem crashar, para os formatos descritos no MVP.
