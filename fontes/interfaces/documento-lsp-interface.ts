/**
 * Representa um documento de texto aberto no editor LSP.
 * Substitui `vscode.TextDocument` sem dependência do VS Code API.
 */
export interface DocumentoLSP {
    /** URI do documento (ex: file:///caminho/arquivo.delegua) */
    uri: string;
    /** Caminho do arquivo no sistema de arquivos */
    nomeArquivo: string;
    /** Conteúdo completo do documento */
    texto: string;
    /** Linhas do documento (texto.split('\n')) */
    linhas: string[];
    /** Versão do documento (incrementada a cada edição) */
    versao: number;
    /** Identificador da linguagem (ex: 'delegua', 'pitugues') */
    languageId: string;
}
