# Matriz de Regras do Template Final

Template oficial:
`templates/FOR.CRC.GRH.007. Solicitação de Cadastro e Admissão - SCA.xlsx`

Objetivo:
- consolidar regras de negócio extraídas do próprio template;
- indicar onde cada regra aparece na planilha;
- registrar como o sistema trata cada caso hoje.

## Decisão de escopo atual

Nesta fase do projeto, entram apenas regras que possam ser aplicadas com base em campos já existentes no formulário web.

Isso significa:
- não criar novos campos apenas para atender comentários da planilha;
- não tornar obrigatórios campos que hoje não fazem parte do fluxo validado no formulário;
- priorizar consistência entre formulário, validação e geração da planilha com o conjunto atual de dados.

Ficam fora do escopo atual:
- bloco de ex-colaborador SEMEP;
- regras que dependam de novos dados não coletados;
- obrigatoriedade condicional de `Data de casamento`;
- obrigatoriedade condicional de `Nome do pai` para cônjuge ou dependentes.

## Campos com códigos e listas oficiais

| Área | Campo | Referência no template | Regra do template | Implementação atual | Status |
| --- | --- | --- | --- | --- | --- |
| Funcionário | Estado civil | `AM7` | `C`, `D`, `Q`, `S`, `V`; união estável não é casamento | frontend usa select por código; backend converte e grava código | Implementado |
| Funcionário | Raça | `F19:G19` + comentário `F19` | códigos `1`, `2`, `4`, `6`, `8`, `9` | select oficial e validação no front/back | Implementado |
| Funcionário | Grau de instrução | `AE13` + validação `BE77:BE89` | opções oficiais do template | select usa lista oficial; payload mantém código; Excel grava texto completo da planilha | Implementado |
| Funcionário | Sexo | validação em `AQ77:AQ78` aplicada a `AK7` | valor curto | frontend envia `M`/`F`; Excel grava código | Implementado |
| Cônjuge | Grau de parentesco | comentário `U44` | opções oficiais de parentesco | select oficial e validação front/back | Implementado |
| Cônjuge | IR | comentário `W44` + validação `AY77:AY80` | códigos `1..4` | select oficial e validação front/back | Implementado |
| Dependentes | Grau de parentesco | comentários `U48/U50/U52/U54/U56` | opções oficiais de parentesco | select oficial e validação front/back | Implementado |
| Dependentes | IR | validação em `BI54:BI55` aplicada a `V48/V50/V52/V54/V56` e comentário `W48/W50/...` | códigos `1..4` | select oficial e validação front/back | Implementado |
| Cônjuge/dependentes | Sexo | validação em `AQ77:AQ78` aplicada a `T44/T48/...` | valor curto | frontend envia `M`/`F`; Excel grava código | Implementado |

## Campos numéricos e formatação

| Área | Campo | Referência no template | Regra do template | Implementação atual | Status |
| --- | --- | --- | --- | --- | --- |
| Funcionário | CPF | `F26:K26` | somente números | frontend aceita só dígitos; valida DV; Excel grava sem máscara | Implementado |
| Funcionário | PIS/PASEP | `L26:Q26` | somente números sem caracteres especiais | frontend aceita só números e completa zeros; backend valida 11 dígitos | Implementado |
| Funcionário | CEP | `Y41:AB41` | somente números sem caracteres especiais | frontend aceita só números; backend valida 8 dígitos; Excel grava sem máscara | Implementado |
| Funcionário | DDD celular | `AI41` | DDD separado | frontend aceita 2 dígitos; Excel grava só números | Implementado |
| Funcionário | Celular | `AK41:AN41` | telefone separado do DDD | frontend aceita só 9 dígitos; backend valida 9 dígitos | Implementado |
| Funcionário | Conta para pagamento | comentário `AD19` | sem hífen; preenchimento com zeros à esquerda; comprimento fixo | frontend aceita só números e aplica padding; backend padroniza antes do Excel | Implementado |
| Funcionário | Banco | comentário `Y19` | `001 = Brasil` | campo fixo `001` no formulário | Implementado |
| Funcionário | C.eSocial | comentário `AI19` | `101 Empregado Geral`, `103 Aprendiz` | preservado no template; sistema não sobrescreve | Implementado |
| Funcionário | CNH | `F29:M29` | numérico | frontend aceita só números; Excel grava só números | Implementado |
| Funcionário | Reservista | `Q29:Y29` | somente números | frontend aceita só números; Excel grava só números | Implementado |
| Funcionário | Título de eleitor | `Z29:AF29` | somente números | frontend aceita só números; backend valida comprimento; Excel grava só números | Implementado |
| Funcionário | Zona | `AG29` | numérico curto | frontend aceita só números; backend valida faixa | Implementado |
| Funcionário | Seção | `AK29` | numérico curto | frontend aceita só números; backend valida faixa | Implementado |
| Dependentes | CPF do dependente | comentários `AE48/AE50/AE52/AE54/AE56` | somente números, sem ponto ou caracteres | frontend aceita só números; backend valida CPF; Excel grava sem máscara | Implementado |
| Dependentes | DNV | comentários `AJ48/AJ50/AJ52/AJ54/AJ56` | obrigatório para nascidos após janeiro/2010 | frontend aceita só números; front/back exigem DNV para nascidos a partir de fevereiro/2010 e validam comprimento | Implementado |

## Regras condicionais

| Área | Campo | Referência no template | Regra do template | Implementação atual | Status |
| --- | --- | --- | --- | --- | --- |
| Cônjuge | Nome da mãe | comentário `F45` | obrigatório somente para inclusão em plano de saúde/odonto | checkboxes no formulário; front/back exigem quando marcado | Implementado |
| Cônjuge | Nome do pai | comentário `X45` | obrigatório somente para inclusão em plano de saúde/odonto | campo existe, mas a obrigatoriedade ficou fora do escopo atual | Fora do escopo atual |
| Cônjuge | Data casamento | comentário `AJ44` | obrigatório somente para inclusão em plano de saúde/odonto | campo existe, mas a obrigatoriedade ficou fora do escopo atual | Fora do escopo atual |
| Dependentes | Nome da mãe | comentários `F49/F51/F53/F55/F57` | obrigatório somente para inclusão em plano de saúde/odonto | front/back exigem quando marcado | Implementado |
| Dependentes | Nome do pai | comentários `X49/X51/X53/X55/X57` | obrigatório somente para inclusão em plano de saúde/odonto | campo existe, mas a obrigatoriedade ficou fora do escopo atual | Fora do escopo atual |
| Dependentes | DNV | comentários `AJ48/AJ50/AJ52/AJ54/AJ56` | obrigatório somente para nascidos após janeiro/2010 | front/back exigem DNV para nascidos a partir de fevereiro/2010 e validam comprimento | Implementado |
| Funcionário | Ex-colaborador SEMEP | comentários `J60` e `M60` | se sim, verificar recontratação e motivo | não implementado no formulário e fora do escopo atual | Fora do escopo atual |

## Regras de consistência implementadas no sistema

Essas regras vêm da lógica do sistema e ajudam a proteger o preenchimento:

| Regra | Implementação atual | Status |
| --- | --- | --- |
| CPF do titular com dígito verificador | front/back | Implementado |
| CPF do cônjuge com dígito verificador | front/back | Implementado |
| CPF dos dependentes com dígito verificador | front/back | Implementado |
| CPF não pode repetir entre titular, cônjuge e dependentes | front/back | Implementado |
| Dependente em plano exige nome da mãe | front/back | Implementado |
| Cônjuge em plano exige nome da mãe | front/back | Implementado |
| Dependente nascido a partir de fevereiro/2010 exige DNV | front/back | Implementado |
| Limite máximo de dependentes conforme planilha | front/back | Implementado |

## Mapeamentos já sensíveis que merecem atenção em qualquer ajuste futuro

- Bloco bancário da linha `19`: `Banco`, `Agência`, `Conta Pagto` e `C.eSocial`.
- Linha do cônjuge `44/45`.
- Linhas dos dependentes `48/49`, `50/51`, `52/53`, `54/55`, `56/57`.
- Bloco de contato `41`, onde `DDD celular` e `Celular` ficam separados.

## Itens recomendados para próxima rodada

1. Revisar comentários ainda não traduzidos em regra apenas para campos já existentes no formulário.
2. Refinar defaults, padding e normalização dos campos numéricos já cobertos.
3. Manter esta matriz atualizada conforme novas decisões de escopo do processo.
