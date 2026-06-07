// Ponto de entrada público do pacote @designliquido/delegua-lsp
export { executarAnalises } from './analisador';
export { proverItensCompletude, proverDefinicao, proverReferencias, prepareRename, provideRenameEdits } from './capacidades';
export * from './interfaces/ambiente-lsp-interface';
export * from './interfaces/documento-lsp-interface';
export * from './interfaces/manipulador-caminhos-interface';
export * from './interfaces/resultado-analise-interface';
export * from './interfaces/sistema-arquivos-interface';
