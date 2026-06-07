import { DocumentoLSP } from '../interfaces/documento-lsp-interface';

/**
 * Obtém a extensão do arquivo associada ao documento, usada para selecionar
 * lexador/avaliador/analisador/formatador específicos do dialeto.
 */
export function obterExtensao(documento: DocumentoLSP): string {
    if (documento.languageId === 'delegua-testes') {
        return 'delegua';
    }

    const partes = documento.nomeArquivo.split('.');
    return partes.length > 1 ? partes[partes.length - 1] : '';
}
