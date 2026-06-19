import { Classe, Const, Declaracao, FuncaoDeclaracao, Var } from '@designliquido/delegua/declaracoes';
import { Hover, MarkupKind, Position, Range } from 'vscode-languageserver-types';

import { obterResultado } from '../analise/cache-analise';
import { funcoesNativasDelegua } from '../bibliotecas/formatadores';
import { FuncaoNativaOuMetodoPrimitiva } from '../bibliotecas/tipos';
import { DocumentoLSPInterface } from '../interfaces/documento-lsp-interface';
import { obterPalavraNoIntervalo } from '../utilitarios/texto';

function obterTextoDeConteudo(conteudo: unknown): string {
    if (!conteudo) return '';
    if (typeof conteudo === 'string') return conteudo;
    if (Array.isArray(conteudo)) return conteudo.join('\n');
    return '';
}

function obterDocumentacaoDeclaracao(declaracao: any): string {
    return (
        obterTextoDeConteudo(declaracao?.documentacao?.conteudo) ||
        obterTextoDeConteudo(declaracao?.documentacao) ||
        obterTextoDeConteudo(declaracao?.descricao)
    );
}

function montarConteudoHover(assinatura: string, documentacao: string): string {
    const blocoAssinatura = '```delegua\n' + assinatura + '\n```';
    return documentacao ? `${blocoAssinatura}\n\n---\n\n${documentacao}` : blocoAssinatura;
}

function construirAssinaturaFuncao(declaracao: FuncaoDeclaracao): string {
    const parametros = (declaracao.funcao?.parametros || [])
        .map((parametro: any) => {
            const nome = parametro?.nome?.lexema ?? '';
            const tipo = parametro?.tipoDado;
            return tipo ? `${nome}: ${tipo}` : nome;
        })
        .join(', ');
    const tipoRetorno = declaracao.tipo ? `: ${declaracao.tipo}` : '';
    return `funcao ${declaracao.simbolo.lexema}(${parametros})${tipoRetorno}`;
}

function construirConteudoParaDeclaracao(declaracao: Declaracao): string | undefined {
    if (declaracao instanceof Const) {
        const tipo = declaracao.tipo ? `: ${declaracao.tipo}` : '';
        return montarConteudoHover(`(constante) ${declaracao.simbolo.lexema}${tipo}`, obterDocumentacaoDeclaracao(declaracao));
    }

    if (declaracao instanceof Var) {
        const tipo = declaracao.tipo ? `: ${declaracao.tipo}` : '';
        return montarConteudoHover(`(variável) ${declaracao.simbolo.lexema}${tipo}`, obterDocumentacaoDeclaracao(declaracao));
    }

    if (declaracao instanceof FuncaoDeclaracao) {
        return montarConteudoHover(construirAssinaturaFuncao(declaracao), obterDocumentacaoDeclaracao(declaracao));
    }

    if (declaracao instanceof Classe) {
        return montarConteudoHover(`classe ${declaracao.simbolo.lexema}`, obterDocumentacaoDeclaracao(declaracao));
    }

    return undefined;
}

function localizarDeclaracaoPorNome(declaracoes: Declaracao[], palavra: string): Declaracao | undefined {
    return declaracoes.find(declaracao => (declaracao as any)?.simbolo?.lexema === palavra);
}

function localizarFuncaoNativa(palavra: string): FuncaoNativaOuMetodoPrimitiva | undefined {
    return funcoesNativasDelegua.find(funcao => funcao.nome === palavra);
}

function construirConteudoParaFuncaoNativa(funcaoNativa: FuncaoNativaOuMetodoPrimitiva): string {
    const assinatura = funcaoNativa.assinaturas?.[0]?.formato ?? `${funcaoNativa.nome}()`;
    return montarConteudoHover(assinatura, funcaoNativa.documentacao);
}

/**
 * Fornece informações de _hover_ (tipo, assinatura ou documentação) para o
 * símbolo na posição dada dentro do documento.
 */
export function proverDocumentacaoEmCodigo(documento: DocumentoLSPInterface, posicao: Position): Hover | null {
    const resultado = obterResultado(documento.uri);
    if (!resultado) {
        return null;
    }

    const linha = documento.linhas[posicao.line] ?? '';
    const intervalo = obterPalavraNoIntervalo(linha, posicao.character);
    if (!intervalo) {
        return null;
    }

    const { palavra, inicio, fim } = intervalo;
    const range: Range = {
        start: { line: posicao.line, character: inicio },
        end: { line: posicao.line, character: fim },
    };

    const declaracoes = [
        ...(resultado.declaracoesPreCarregadas || []),
        ...(resultado.avaliadorSintatico?.declaracoes || []),
    ];

    const declaracao = localizarDeclaracaoPorNome(declaracoes, palavra);
    if (declaracao) {
        const conteudo = construirConteudoParaDeclaracao(declaracao);
        if (conteudo) {
            return { contents: { kind: MarkupKind.Markdown, value: conteudo }, range };
        }
    }

    const funcaoNativa = localizarFuncaoNativa(palavra);
    if (funcaoNativa) {
        return { contents: { kind: MarkupKind.Markdown, value: construirConteudoParaFuncaoNativa(funcaoNativa) }, range };
    }

    return null;
}
