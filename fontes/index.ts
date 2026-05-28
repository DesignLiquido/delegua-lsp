// Ponto de entrada público do pacote @designliquido/delegua-lsp
export { executarAnalises } from './analisador';
export { provideCompletionItems, provideDefinition, provideReferences, prepareRename, provideRenameEdits } from './capacidades';
export * from './interfaces/documento-lsp-interface';
export * from './interfaces/resultado-analise-interface';
