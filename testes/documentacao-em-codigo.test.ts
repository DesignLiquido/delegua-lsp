import { Classe, Const, FuncaoDeclaracao, Var } from '@designliquido/delegua/declaracoes';
import { FuncaoConstruto } from '@designliquido/delegua/construtos';
import { MarkupContent } from 'vscode-languageserver-types';

import { expirarTudo, definirResultado } from '../fontes/analise/cache-analise';
import { proverDocumentacaoEmCodigo } from '../fontes/capacidades/documentacao-em-codigo';
import { DocumentoLSP } from '../fontes/interfaces/documento-lsp-interface';

function criarSimbolo(lexema: string): any {
    return { lexema, tipo: 'IDENTIFICADOR', literal: null, linha: 1, hashArquivo: 0 };
}

function criarVarDeclaracao(lexema: string, tipo: string): Var {
    return new Var(criarSimbolo(lexema), undefined, tipo);
}

function criarFuncaoDeclaracao(lexema: string, parametros: { nome: string; tipo: string }[], tipoRetorno: string): FuncaoDeclaracao {
    const parametrosConstruto = parametros.map(p => ({
        abrangencia: 'padrao',
        nome: criarSimbolo(p.nome),
        tipoDado: p.tipo,
    })) as any;
    const funcao = new FuncaoConstruto(0, 1, parametrosConstruto, []);
    return new FuncaoDeclaracao(criarSimbolo(lexema), funcao, tipoRetorno);
}

function criarClasseDeclaracao(lexema: string): Classe {
    return new Classe(criarSimbolo(lexema), [], []);
}

function criarDocumento(linhas: string[], uri = 'file:///teste.delegua', nomeArquivo = 'teste.delegua', languageId = 'delegua'): DocumentoLSP {
    const texto = linhas.join('\n');
    return {
        uri,
        nomeArquivo,
        texto,
        linhas,
        versao: 1,
        languageId,
    };
}

function valorMarkdown(hover: ReturnType<typeof proverDocumentacaoEmCodigo>): string {
    expect(hover).not.toBeNull();
    const conteudo = hover!.contents as MarkupContent;
    return conteudo.value;
}

describe('documentacao-em-codigo', () => {
    beforeEach(() => {
        expirarTudo();
    });

    describe('proverDocumentacaoEmCodigo()', () => {
        it('retorna null quando não há resultado em cache', () => {
            const doc = criarDocumento(['var nome = "Délegua"']);
            expect(proverDocumentacaoEmCodigo(doc, { line: 0, character: 5 })).toBeNull();
        });

        it('retorna null ao passar sobre espaço em branco', () => {
            const doc = criarDocumento(['var nome = "Délegua"']);
            definirResultado(doc.uri, {
                lexador: { simbolos: [], erros: [] } as any,
                avaliadorSintatico: { declaracoes: [criarVarDeclaracao('nome', 'texto')], erros: [] } as any,
                analisadorSemantico: { diagnosticos: [] } as any,
            });

            expect(proverDocumentacaoEmCodigo(doc, { line: 0, character: 3 })).toBeNull();
        });

        it('retorna null para símbolo desconhecido', () => {
            const doc = criarDocumento(['escreva(nada)']);
            definirResultado(doc.uri, {
                lexador: { simbolos: [], erros: [] } as any,
                avaliadorSintatico: { declaracoes: [], erros: [] } as any,
                analisadorSemantico: { diagnosticos: [] } as any,
            });

            expect(proverDocumentacaoEmCodigo(doc, { line: 0, character: 9 })).toBeNull();
        });

        it('mostra tipo de uma declaração var', () => {
            const doc = criarDocumento(['var nome: texto = "Délegua"', 'escreva(nome)']);
            definirResultado(doc.uri, {
                lexador: { simbolos: [], erros: [] } as any,
                avaliadorSintatico: { declaracoes: [criarVarDeclaracao('nome', 'texto')], erros: [] } as any,
                analisadorSemantico: { diagnosticos: [] } as any,
            });

            const hover = proverDocumentacaoEmCodigo(doc, { line: 1, character: 9 });
            const valor = valorMarkdown(hover);
            expect(valor).toContain('(variável) nome: texto');
        });

        it('mostra tipo de uma declaração constante', () => {
            const doc = criarDocumento(['constante PI: número = 3.14', 'escreva(PI)']);
            definirResultado(doc.uri, {
                lexador: { simbolos: [], erros: [] } as any,
                avaliadorSintatico: { declaracoes: [new Const(criarSimbolo('PI'), undefined as any, 'número')], erros: [] } as any,
                analisadorSemantico: { diagnosticos: [] } as any,
            });

            const hover = proverDocumentacaoEmCodigo(doc, { line: 1, character: 9 });
            const valor = valorMarkdown(hover);
            expect(valor).toContain('(constante) PI: número');
        });

        it('mostra assinatura completa de uma declaração de função', () => {
            const doc = criarDocumento(['funcao calcular(a: número, b: número): número {', '}', 'calcular(1, 2)']);
            definirResultado(doc.uri, {
                lexador: { simbolos: [], erros: [] } as any,
                avaliadorSintatico: {
                    declaracoes: [criarFuncaoDeclaracao('calcular', [
                        { nome: 'a', tipo: 'número' },
                        { nome: 'b', tipo: 'número' },
                    ], 'número')],
                    erros: [],
                } as any,
                analisadorSemantico: { diagnosticos: [] } as any,
            });

            const hover = proverDocumentacaoEmCodigo(doc, { line: 2, character: 2 });
            const valor = valorMarkdown(hover);
            expect(valor).toContain('funcao calcular(a: número, b: número): número');
        });

        it('mostra nome de uma declaração de classe', () => {
            const doc = criarDocumento(['classe Pessoa {', '}', 'var p = Pessoa()']);
            definirResultado(doc.uri, {
                lexador: { simbolos: [], erros: [] } as any,
                avaliadorSintatico: { declaracoes: [criarClasseDeclaracao('Pessoa')], erros: [] } as any,
                analisadorSemantico: { diagnosticos: [] } as any,
            });

            const hover = proverDocumentacaoEmCodigo(doc, { line: 2, character: 9 });
            const valor = valorMarkdown(hover);
            expect(valor).toContain('classe Pessoa');
        });

        it('mostra documentação de uma função nativa', () => {
            const doc = criarDocumento(['escreva("oi")']);
            definirResultado(doc.uri, {
                lexador: { simbolos: [], erros: [] } as any,
                avaliadorSintatico: { declaracoes: [], erros: [] } as any,
                analisadorSemantico: { diagnosticos: [] } as any,
            });

            const hover = proverDocumentacaoEmCodigo(doc, { line: 0, character: 2 });
            const valor = valorMarkdown(hover);
            expect(valor).toContain('escreva');
            expect(valor.toLowerCase()).toContain('escreve um ou mais argumentos na saída padrão da aplicação');
        });

        it('funciona em arquivos de dialeto (.visualg)', () => {
            const doc = criarDocumento(
                ['algoritmo "teste"', 'var', '   x: inteiro', 'inicio', '   x <- 1', 'escreval(x)', 'fimalgoritmo'],
                'file:///teste.visualg',
                'teste.visualg',
                'visualg'
            );
            definirResultado(doc.uri, {
                lexador: { simbolos: [], erros: [] } as any,
                avaliadorSintatico: { declaracoes: [criarVarDeclaracao('x', 'número')], erros: [] } as any,
                analisadorSemantico: { diagnosticos: [] } as any,
            });

            const hover = proverDocumentacaoEmCodigo(doc, { line: 5, character: 9 });
            const valor = valorMarkdown(hover);
            expect(valor).toContain('(variável) x: número');
        });
    });
});
