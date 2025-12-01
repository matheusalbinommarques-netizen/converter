
---

## 4. Criar um backlog inicial para a Fase 1

Cria `docs/02-backlog-fase1.md`:

```md
# Backlog – Fase 1 (Planejamento & Arquitetura)

## F1-01 – Refinar escopo de formatos para o MVP
- Listar 3–5 conversões iniciais que serão implementadas primeiro.
- Exemplo:
  - PNG → JPG
  - JPG → PNG
  - TXT → PDF (ou TXT → MD)
  - ZIP de múltiplos arquivos selecionados
- Definir o que **não** será feito no MVP (vídeo pesado, áudio complexo etc.).

## F1-02 – Definir estrutura de diretórios (implementação inicial)
- [x] Criar pastas: `core/`, `infra/`, `ui/`, `docs/`, `samples/`.
- Especificar em um parágrafo o papel de cada pasta (já descrito na visão geral).
- Garantir que o projeto ainda roda normalmente após a criação das pastas.

## F1-03 – Desenhar API interna de conversão (rascunho)
- No `core/`, criar um arquivo rascunho `core/conversion-api.md` ou `.ts` com ideias de função:
  - `convertFile(inputPath, desiredFormat, options)`
  - Tipos de retorno (sucesso, erro, logs).
- Não precisa implementar de verdade ainda, só o contrato.

## F1-04 – Mapear riscos técnicos
- Listar dúvidas como:
  - Como embutir ou depender de ffmpeg no Windows?
  - Qual limite de tamanho de arquivo é razoável?
  - Como mostrar progresso (porcentagem, barra etc.)?
- Anotar possíveis soluções ou caminhos para pesquisa.

## F1-05 – Planejar primeira “história” de MVP funcional
- Escolher **apenas uma** conversão simples para implementar primeiro.
- Detalhar passo a passo o que precisa existir:
  - UI mínima (botão selecionar arquivo, combo formato, botão converter).
  - Chamada ao core.
  - Core chamando uma função fake ou simples na infra.
