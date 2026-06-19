import { Classe, Const, Declaracao, Var } from '@designliquido/delegua/declaracoes';
import { Location, Position } from 'vscode-languageserver-types';

import { obterResultado } from '../analise/cache-analise';
import { obterDefinicoesPorContexto } from '../analise/cache-definicoes';
import { AmbienteLSPInterface } from '../interfaces/ambiente-lsp-interface';
import { DocumentoLSPInterface } from '../interfaces/documento-lsp-interface';
import { obterPalavraNoIntervalo } from '../utilitarios/texto';

function normalizarCaminho(ambiente: AmbienteLSPInterface, caminho: string): string {
    return ambiente.caminhos.normalizar(caminho).replace(/\\/g, '/').toLowerCase();
}

function caminhoParaUri(caminho: string): string {
    const normalizado = caminho.replace(/\\/g, '/');
    return normalizado.startsWith('/') ? `file://${normalizado}` : `file:///${normalizado}`;
}

function obterDefinicoesEmCache(): string[] {
    const todosTipos = {
        ...obterDefinicoesPorContexto('normal'),
        ...obterDefinicoesPorContexto('liquido'),
    };

    return Array.from(new Set(
        Object.values(todosTipos)
            .map((d: any) => d.caminhoArquivoDefinicao as string | undefined)
            .filter((c): c is string => Boolean(c))
    ));
}

function obterUriDeclaracao(declaracao: Declaracao, uriPadrao: string): string {
    const caminhoArquivoDefinicao = (declaracao as any).caminhoArquivoDefinicao as string | undefined;
    if (caminhoArquivoDefinicao) {
        return caminhoParaUri(caminhoArquivoDefinicao);
    }
    return uriPadrao;
}

function localizarEmDeclaracoes(declaracoes: Declaracao[], palavra: string, uriPadrao: string): Location | undefined {
    for (const declaracao of declaracoes) {
        const uriDeclaracao = obterUriDeclaracao(declaracao, uriPadrao);
        const simbolo = (declaracao as any).simbolo;
        if (simbolo?.lexema === palavra) {
            const linha = Number(simbolo.linha) - 1;
            const coluna = simbolo.colunaInicio ?? 0;
            return { uri: uriDeclaracao, range: { start: { line: linha, character: coluna }, end: { line: linha, character: coluna + palavra.length } } };
        }

        if (declaracao instanceof Classe) {
            for (const metodo of declaracao.metodos) {
                if (metodo.simbolo.lexema === palavra) {
                    const linha = Number(metodo.simbolo.linha) - 1;
                    const coluna = metodo.simbolo.colunaInicio ?? 0;
                    return { uri: uriDeclaracao, range: { start: { line: linha, character: coluna }, end: { line: linha, character: coluna + palavra.length } } };
                }
            }
        }
    }
    return undefined;
}

function localizarSimboloImportado(
    ambiente: AmbienteLSPInterface,
    declaracoes: Declaracao[],
    palavra: string,
    linhaTexto: string,
    uriDocumento: string
): Location | undefined {
    const correspondencia = linhaTexto.match(/importar\s*\{([^}]*)\}\s*de\s*(["'])([^"']+)\2/);
    if (!correspondencia) {
        return undefined;
    }

    const simbolosImportados = correspondencia[1].split(',').map(s => s.trim());
    if (!simbolosImportados.includes(palavra)) {
        return undefined;
    }

    const caminhoRelativo = correspondencia[3];
    const diretorioAtual = ambiente.caminhos.dirname(uriDocumento.replace(/^file:\/\/\//, '').replace(/^file:\/\//, ''));
    let caminhoAbsoluto: string;

    if (caminhoRelativo.startsWith('./') || caminhoRelativo.startsWith('../')) {
        caminhoAbsoluto = ambiente.caminhos.resolver(diretorioAtual, caminhoRelativo);
    } else {
        caminhoAbsoluto = ambiente.caminhos.juntar(diretorioAtual, 'node_modules', caminhoRelativo);
    }

    const caminhosCandidatos = new Set<string>([
        normalizarCaminho(ambiente, caminhoAbsoluto),
        normalizarCaminho(ambiente, `${caminhoAbsoluto}.delegua`),
    ]);

    if (!caminhoRelativo.startsWith('./') && !caminhoRelativo.startsWith('../')) {
        const fragmentoNodeModules = normalizarCaminho(ambiente, `/node_modules/${caminhoRelativo}/`);
        for (const definicaoCache of obterDefinicoesEmCache()) {
            const caminhoNormalizado = normalizarCaminho(ambiente, definicaoCache);
            if (caminhoNormalizado.includes(fragmentoNodeModules)) {
                caminhosCandidatos.add(caminhoNormalizado);
            }
        }
    }

    const declaracao = declaracoes.find(d => {
        const simbolo = (d as any).simbolo;
        const caminho = (d as any).caminhoArquivoDefinicao as string | undefined;
        if (simbolo?.lexema !== palavra || !caminho) {
            return false;
        }
        return caminhosCandidatos.has(normalizarCaminho(ambiente, caminho));
    });

    if (!declaracao) {
        return undefined;
    }

    const uriDeclaracao = obterUriDeclaracao(declaracao, uriDocumento);
    const simbolo = (declaracao as any).simbolo;
    return {
        uri: uriDeclaracao,
        range: { start: { line: Number(simbolo.linha) - 1, character: simbolo.colunaInicio ?? 0 }, end: { line: Number(simbolo.linha) - 1, character: (simbolo.colunaInicio ?? 0) + palavra.length } },
    };
}

function obterTipoVariavel(declaracoes: Declaracao[], nomeVariavel: string): string | undefined {
    for (const declaracao of declaracoes) {
        const simbolo = (declaracao as any).simbolo;
        if (simbolo?.lexema !== nomeVariavel) {
            continue;
        }
        if (declaracao instanceof Var || declaracao instanceof Const) {
            return (declaracao as any).tipo as string | undefined;
        }
    }
    return undefined;
}

function localizarMetodoEmClasse(declaracoes: Declaracao[], nomeClasse: string, nomeMetodo: string, uriPadrao: string): Location | undefined {
    for (const declaracao of declaracoes) {
        if (!(declaracao instanceof Classe)) {
            continue;
        }
        const simbolo = (declaracao as any).simbolo;
        if (simbolo?.lexema !== nomeClasse) {
            continue;
        }
        const metodo = declaracao.metodos.find(m => m.simbolo.lexema === nomeMetodo);
        if (!metodo) {
            return undefined;
        }
        const uriDeclaracao = obterUriDeclaracao(declaracao, uriPadrao);
        const linha = Number(metodo.simbolo.linha) - 1;
        const coluna = metodo.simbolo.colunaInicio ?? 0;
        return { uri: uriDeclaracao, range: { start: { line: linha, character: coluna }, end: { line: linha, character: coluna + nomeMetodo.length } } };
    }
    return undefined;
}

function localizarPropriedadeClasse(declaracoes: Declaracao[], palavra: string, linhaAtual: number, uriPadrao: string): Location | undefined {
    const classesLocais = declaracoes.filter(
        d => d instanceof Classe && !(d as any).caminhoArquivoDefinicao
    ) as Classe[];

    const classesAnteriores = classesLocais.filter(c => Number(c.simbolo.linha) <= linhaAtual);
    if (!classesAnteriores.length) {
        return undefined;
    }

    const classeAtual = classesAnteriores.reduce((prev, curr) =>
        Number(curr.simbolo.linha) > Number(prev.simbolo.linha) ? curr : prev
    );

    const propriedade = classeAtual.propriedades.find(p => p.nome.lexema === palavra);
    if (!propriedade) {
        return undefined;
    }

    const linha = Number(propriedade.nome.linha) - 1;
    const coluna = propriedade.nome.colunaInicio ?? 0;
    return { uri: uriPadrao, range: { start: { line: linha, character: coluna }, end: { line: linha, character: coluna + palavra.length } } };
}

/**
 * Localiza a definição do símbolo na posição dada dentro do documento.
 */
export function proverDefinicao(documento: DocumentoLSPInterface, posicao: Position, ambiente: AmbienteLSPInterface): Location | undefined {
    const linhaTexto = documento.linhas[posicao.line] ?? '';
    const intervalo = obterPalavraNoIntervalo(linhaTexto, posicao.character);
    if (!intervalo) {
        return undefined;
    }

    const { palavra } = intervalo;
    const resultado = obterResultado(documento.uri);
    const declaracoes = [
        ...(resultado?.declaracoesPreCarregadas || []),
        ...(resultado?.avaliadorSintatico?.declaracoes || []),
    ];

    if (!declaracoes.length) {
        return undefined;
    }

    const localizacaoImportado = localizarSimboloImportado(ambiente, declaracoes, palavra, linhaTexto, documento.uri);
    if (localizacaoImportado) {
        return localizacaoImportado;
    }

    const textoAntesPalavra = linhaTexto.substring(0, intervalo.inicio);
    if (textoAntesPalavra.trimEnd().endsWith('isto.')) {
        const localizacao = localizarPropriedadeClasse(declaracoes, palavra, posicao.line + 1, documento.uri);
        if (localizacao) {
            return localizacao;
        }
    }

    const correspondenciaObjeto = textoAntesPalavra.match(/(\w+)\s*\.\s*$/);
    if (correspondenciaObjeto && correspondenciaObjeto[1] !== 'isto') {
        const nomeObjeto = correspondenciaObjeto[1];
        const tipoObjeto = obterTipoVariavel(declaracoes, nomeObjeto);
        if (tipoObjeto) {
            return localizarMetodoEmClasse(declaracoes, tipoObjeto, palavra, documento.uri);
        }
    }

    return localizarEmDeclaracoes(declaracoes, palavra, documento.uri);
}
