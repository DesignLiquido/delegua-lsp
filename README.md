# delegua-lsp

Implementação do LSP (Language Server Protocol) para Delégua e dialetos, usada em extensões de editores como o [VSCode](https://github.com/DesignLiquido/vscode) e [Jetbrains](https://github.com/DesignLiquido/jetbrains). Fornece funcionalidades como completude, navegação, formatação, documentação em código, referências e renomeação de símbolos. Projetado para ser usado tanto como servidor LSP standalone quanto como biblioteca importável por extensões web.

## Funcionalidades

O servidor oferece as seguintes capacidades de linguagem:

- **Completude** (`textDocument/completion`) — funções nativas, primitivas por tipo de variável, etiquetas de documentário, variáveis do documento, etc.
- **Definição** (`textDocument/definition`) — navegação até a declaração de um símbolo, incluindo símbolos importados de outros arquivos.
- **Formatação** (`textDocument/formatting`) — formatação de documento via Estilizador de cada dialeto.
- **Hover / documentação em código** (`textDocument/hover`) — tipo, assinatura ou documentação do símbolo sob o cursor.
- **Referências** (`textDocument/references`) — ocorrências de um símbolo no documento atual e em todo o workspace.
- **Renomeação** (`textDocument/rename`, `textDocument/prepareRename`) — renomeia um símbolo e gera as edições correspondentes em todo o workspace.

Dialetos suportados (conforme as extensões de arquivo reconhecidas em `executarAnalises`): Delégua, BIRL, Mapler, Pitugues, Potigol, VisuAlg e Portugol Studio.

## Uso como biblioteca e o `AmbienteLSP`

Além de rodar como servidor LSP autônomo (_standalone_, `bin: delegua-lsp`, ver [fontes/servidor.ts](fontes/servidor.ts)), `delegua-lsp` pode ser importado diretamente como biblioteca — por exemplo, por uma extensão web do VSCode rodando em navegador, sem acesso a `fs`/`path` do Node.js.

Para isso, as capacidades que precisam ler arquivos ou manipular caminhos (`proverReferencias`, `provideRenameEdits`, `proverDefinicao`) não importam `fs`/`path` diretamente — elas recebem essas APIs por injeção, através de um objeto `AmbienteLSP`:

```ts
interface AmbienteLSP {
    sistemaArquivos: SistemaArquivosInterface; // lerArquivoTexto, listarDiretorio — assíncronas, compatíveis com vscode.workspace.fs
    caminhos: ManipuladorCaminhosInterface;    // juntar, dirname, resolver, normalizar
}
```

O ponto de entrada público ([fontes/index.ts](fontes/index.ts)) exporta somente os *tipos* dessas interfaces — importar o pacote não carrega nenhuma dependência de `fs`/`path` do Node.js. Uma implementação pronta para Node.js (`criarAmbienteNode`, em [fontes/ambiente/ambiente-node.ts](fontes/ambiente/ambiente-node.ts)) é usada pelo servidor _standalone_; outros ambientes (ex.: `vscode.workspace.fs` em extensões web) fornecem seu próprio `AmbienteLSP` com as mesmas assinaturas.

## Scripts

- `yarn empacotar` — compila e empacota o projeto em `dist/`
- `yarn servidor` — inicia o servidor LSP standalone
- `yarn testes-unitarios` — executa a suíte de testes (Jest, com cobertura)
