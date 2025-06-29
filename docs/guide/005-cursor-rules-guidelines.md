# Guia: Geração e Manutenção de Cursor Rules

**Status:** Rascunho  
**Documento Pai:** [Fluxo de Trabalho](../WORKFLOW.md)

> Este guia descreve **quando**, **por que** e **como** criar ou atualizar regras do Cursor (arquivos `.mdc` em `.cursor/rules`). As regras auxiliam a IA na navegação do código, fornecendo contexto adicional ou atalhos para arquivos relevantes.

---

## 1. Quando criar uma Cursor Rule?

Crie ou atualize uma regra sempre que:

1. **Nova Estrutura ou Módulo Importante** – Ex.: adição de um diretório `payments/` com vários serviços.
2. **Lógica Complexa** – Quando um fluxo exigir explicação extra para que a IA encontre arquivos-chave rapidamente.
3. **Confusão Recorrente** – Se notar que a IA erra repetidamente ao localizar arquivos específicos.

> Mantenha o número de regras enxuto. Prefira refatorar ou renomear arquivos para uma hierarquia mais clara antes de criar muitas regras.

---

## 2. Padrões de Arquivo e Nomenclatura

- **Local:** `.cursor/rules/`
- **Extensão:** `.mdc`
- **Slug numérico opcional:** mantenha um prefixo incremental (ex.: `001-project-structure.mdc`) se desejar ordenar logicamente.
- **Título em H1** descrevendo o objetivo da regra.

Exemplo de estrutura:

```text
.cursor/
  rules/
    001-project-structure.mdc
    002-ai-service-hints.mdc
```

---

## 3. Sintaxe Especial do Cursor (.mdc)

1. **Referência de Arquivo**: Use `[caminho.ext](mdc:caminho.ext)` para apontar arquivos dentro do repositório.
2. **Apenas Markdown + extensões Cursor** – Evite HTML bruto.
3. **Não edite o _metadata_** gerado automáticamente no topo dos `.mdc`!
4. **Seções sucintas** – Regra deve focar no que ajuda a IA; evite verbosidade desnecessária.

Exemplo mínimo:

```md
# Project Structure Guide

A entry point principal é [src/app/layout.tsx](mdc:src/app/layout.tsx).  
A camada de API tRPC inicia em [src/server/api/root.ts](mdc:src/server/api/root.ts).
```

---

## 4. Passo a Passo para **Gerar** uma Cursor Rule

1. **Identifique a necessidade** (vide Seção 1).
2. **Navegue até o diretório** do projeto e crie o arquivo:
   ```bash
   mkdir -p .cursor/rules
   touch .cursor/rules/003-minha-regra.mdc
   ```
3. **Edite o arquivo** seguindo a sintaxe descrita.
4. **Commit & Push** usando a convenção conventional commits:
   ```bash
   git add .cursor/rules/003-minha-regra.mdc
   git commit -m "docs(cursor): adiciona regra 003 explicando fluxo X"
   git push origin feature/…
   ```
5. **Link no PR** – Na descrição do Pull Request, cite o novo arquivo para facilitar a revisão.

---

## 5. Manutenção e Boas Práticas

- **Revisão Periódica**: A cada **release maior**, revise as regras e remova as obsoletas.
- **Evite Duplicidade**: Se já existir uma regra cobrindo o mesmo contexto, atualize-a em vez de criar outra.
- **Clareza**: Lembre-se de que a IA lê essas regras – prefira instruções objetivas e exemplos claros.

---

## 6. Exemplo Completo de Regra

```mdc
# Estrutura do AI Service

Este guia ajuda a IA a localizar rapidamente os artefatos do AI Service.

- Implementação principal: [src/lib/ai-service.ts](mdc:src/lib/ai-service.ts)
- Rota de webhook que o aciona: [src/app/api/webhooks/zapi/route.ts](mdc:src/app/api/webhooks/zapi/route.ts)
- Design detalhado: [docs/design/004-ai-service-lld.md](mdc:docs/design/004-ai-service-lld.md)

Dica: Sempre que modificar o fluxo de conversação, atualize o LLD.
```

---

## 7. Checklist de Review

- [ ] Nome do arquivo segue padrão `.mdc`.
- [ ] Não há código ou lógica – apenas instruções.
- [ ] Todos os caminhos de arquivo referenciados existem.
- [ ] Linguagem clara e concisa em pt-BR.
- [ ] PR linka a regra na descrição.

> Seguindo este guia, garantimos que a **IA** permanecerá informada mesmo conforme a base de código evolui, reduzindo confusão e aumentando a produtividade da equipe. 