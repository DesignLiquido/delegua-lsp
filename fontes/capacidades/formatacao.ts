import { Declaracao } from '@designliquido/delegua/declaracoes';
import { FormatadorDelegua, FormatadorPitugues } from '@designliquido/delegua/formatadores';
import { FormatadorMapler } from '@designliquido/mapler/formatador';
import { FormatadorPortugolStudio } from '@designliquido/portugol-studio/formatador';
import { FormatadorPotigol } from '@designliquido/potigol/formatador';
import { FormatadorVisuAlg } from '@designliquido/visualg';
import { Range, TextEdit } from 'vscode-languageserver-types';

import { obterResultado } from '../analise/cache-analise';
import { DocumentoLSP } from '../interfaces/documento-lsp-interface';
import { obterExtensao } from '../utilitarios/documento';

const TAMANHO_INDENTACAO_PADRAO = 4;

interface FormatadorComum {
    formatar(declaracoes: Declaracao[]): string | Promise<string>;
}

function detectarQuebraLinha(texto: string): string {
    return texto.includes('\r\n') ? '\r\n' : '\n';
}

/**
 * Seleciona o formatador do dialeto correspondente à extensão do arquivo.
 * Retorna `null` para dialetos sem formatador disponível ainda (ex.: BIRL),
 * caso em que nenhuma formatação é oferecida (silenciosamente).
 */
function obterFormatador(extensao: string, quebraLinha: string): FormatadorComum | null {
    switch (extensao) {
        case 'delegua':
            return new FormatadorDelegua(quebraLinha, TAMANHO_INDENTACAO_PADRAO);
        case 'pitu':
        case 'pitugues':
            return new FormatadorPitugues(quebraLinha, TAMANHO_INDENTACAO_PADRAO);
        case 'alg':
        case 'visualg':
            return new FormatadorVisuAlg(quebraLinha, TAMANHO_INDENTACAO_PADRAO);
        case 'por':
            return new FormatadorPortugolStudio(quebraLinha, TAMANHO_INDENTACAO_PADRAO);
        case 'mapler':
            return new FormatadorMapler(quebraLinha, TAMANHO_INDENTACAO_PADRAO);
        case 'poti':
        case 'potigol':
            return new FormatadorPotigol(quebraLinha, TAMANHO_INDENTACAO_PADRAO);
        default:
            return null;
    }
}

function obterIntervaloDocumentoCompleto(linhas: string[]): Range {
    const totalLinhas = linhas.length;
    const ultimaLinha = linhas[totalLinhas - 1] ?? '';
    return {
        start: { line: 0, character: 0 },
        end: { line: totalLinhas - 1, character: ultimaLinha.length },
    };
}

/**
 * Formata o documento inteiro a partir da AST em cache, usando o formatador
 * do dialeto correspondente, e devolve uma única edição substituindo todo o
 * texto. Opções de Estilizador (fortalecimento de tipos, convenções de
 * nomenclatura etc.) ainda não são lidas de `InitializationOptions`: por
 * ora o servidor aplica apenas formatação, sem transformações de AST.
 */
export async function proverFormatacao(documento: DocumentoLSP): Promise<TextEdit[] | null> {
    const extensao = obterExtensao(documento);
    const formatador = obterFormatador(extensao, detectarQuebraLinha(documento.texto));
    if (!formatador) {
        return null;
    }

    const resultado = obterResultado(documento.uri);
    if (!resultado) {
        return null;
    }

    let textoFormatado: string;
    try {
        textoFormatado = await formatador.formatar(resultado.avaliadorSintatico?.declaracoes || []);
    } catch (erro: any) {
        console.error(`Erro ao formatar documento com extensão ${extensao}:`, erro);
        return null;
    }

    if (textoFormatado === documento.texto) {
        return [];
    }

    return [TextEdit.replace(obterIntervaloDocumentoCompleto(documento.linhas), textoFormatado)];
}
