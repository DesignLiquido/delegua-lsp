import { Classe, Declaracao } from '@designliquido/delegua/declaracoes';
import { Location, Position } from 'vscode-languageserver-types';

import { obterResultado } from '../analise/cache-analise';
import { AmbienteLSP } from '../interfaces/ambiente-lsp-interface';
import { DocumentoLSP } from '../interfaces/documento-lsp-interface';
import { obterPalavraNoIntervalo } from '../utilitarios/texto';
import { caminhoParaUri, varrerArquivosWorkspace } from '../utilitarios/varredura-workspace';

function escaparRegex(texto: string): string {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function eCaracterPalavra(caractere: string): boolean {
    return /[_a-zA-Z0-9]/.test(caractere);
}

function encontrarOcorrenciasLinha(textoLinha: string, palavra: string): number[] {
    const ocorrencias: number[] = [];
    const regex = new RegExp(escaparRegex(palavra), 'g');
    let correspondencia: RegExpExecArray | null;

    while ((correspondencia = regex.exec(textoLinha)) !== null) {
        const indice = correspondencia.index;
        const antes = indice > 0 ? textoLinha[indice - 1] : '';
        const depois = textoLinha[indice + palavra.length] ?? '';

        if (!eCaracterPalavra(antes) && !eCaracterPalavra(depois)) {
            ocorrencias.push(indice);
        }
    }

    return ocorrencias;
}

function coletarPosicoesDeclaracao(declaracoes: Declaracao[], palavra: string, uriPadrao: string): Set<string> {
    const posicoes = new Set<string>();

    for (const declaracao of declaracoes) {
        const simbolo = (declaracao as any).simbolo;
        const uriStr = caminhoParaUri((declaracao as any).caminhoArquivoDefinicao || uriPadrao.replace(/^file:\/\/\//, '').replace(/^file:\/\//, ''));

        if (simbolo?.lexema === palavra) {
            posicoes.add(`${uriStr}#${Number(simbolo.linha) - 1}:${simbolo.colunaInicio ?? 0}`);
        }

        if (declaracao instanceof Classe) {
            if (declaracao.simbolo?.lexema === palavra) {
                posicoes.add(`${uriStr}#${Number(declaracao.simbolo.linha) - 1}:${declaracao.simbolo.colunaInicio ?? 0}`);
            }

            for (const metodo of declaracao.metodos || []) {
                if (metodo.simbolo?.lexema === palavra) {
                    posicoes.add(`${uriStr}#${Number(metodo.simbolo.linha) - 1}:${metodo.simbolo.colunaInicio ?? 0}`);
                }
            }

            for (const propriedade of declaracao.propriedades || []) {
                if (propriedade.nome?.lexema === palavra) {
                    posicoes.add(`${uriStr}#${Number(propriedade.nome.linha) - 1}:${propriedade.nome.colunaInicio ?? 0}`);
                }
            }
        }
    }

    return posicoes;
}

/**
 * Encontra todas as referências ao símbolo na posição dada.
 */
export async function proverReferencias(
    documento: DocumentoLSP,
    posicao: Position,
    incluirDeclaracao: boolean,
    pastaWorkspace: string,
    ambiente: AmbienteLSP
): Promise<Location[]> {
    const linhaTexto = documento.linhas[posicao.line] ?? '';
    const intervalo = obterPalavraNoIntervalo(linhaTexto, posicao.character);

    if (!intervalo?.palavra) {
        return [];
    }

    const { palavra } = intervalo;
    const extensoes = ['delegua'];
    const arquivos = await varrerArquivosWorkspace(ambiente, pastaWorkspace, extensoes);
    const localizacoes: Location[] = [];

    for (const caminhoArquivo of arquivos) {
        const conteudo = await ambiente.sistemaArquivos.lerArquivoTexto(caminhoArquivo);
        if (conteudo === undefined) {
            continue;
        }

        const linhasArquivo = conteudo.split('\n');
        const uriArquivo = caminhoParaUri(caminhoArquivo);

        for (let indiceLinha = 0; indiceLinha < linhasArquivo.length; indiceLinha++) {
            const textoLinha = linhasArquivo[indiceLinha];
            const ocorrencias = encontrarOcorrenciasLinha(textoLinha, palavra);

            for (const coluna of ocorrencias) {
                localizacoes.push({
                    uri: uriArquivo,
                    range: {
                        start: { line: indiceLinha, character: coluna },
                        end: { line: indiceLinha, character: coluna + palavra.length },
                    },
                });
            }
        }
    }

    if (incluirDeclaracao) {
        return localizacoes;
    }

    const resultado = obterResultado(documento.uri);
    const declaracoes = [
        ...(resultado?.declaracoesPreCarregadas || []),
        ...(resultado?.avaliadorSintatico?.declaracoes || []),
    ];
    const posicoesDeclaracao = coletarPosicoesDeclaracao(declaracoes, palavra, documento.uri);

    return localizacoes.filter(loc => {
        const chave = `${loc.uri}#${loc.range.start.line}:${loc.range.start.character}`;
        return !posicoesDeclaracao.has(chave);
    });
}
