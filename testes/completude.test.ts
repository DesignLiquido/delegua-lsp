import { CompletionItemKind, InsertTextFormat } from 'vscode-languageserver-types';
import { Var } from '@designliquido/delegua/declaracoes';

import { expirarTudo, definirResultado } from '../fontes/analise/cache-analise';
import { proverItensCompletude } from '../fontes/capacidades/completude';
import { DocumentoLSP } from '../fontes/interfaces/documento-lsp-interface';

function criarVarDeclaracao(lexema: string, tipo: string): Var {
    const simbolo: any = { lexema, tipo: 'IDENTIFICADOR', literal: null, linha: 1, hashArquivo: 0 };
    return new Var(simbolo, undefined, tipo);
}

function criarDocumento(linhas: string[], uri = 'file:///teste.delegua'): DocumentoLSP {
    const texto = linhas.join('\n');
    return {
        uri,
        nomeArquivo: 'teste.delegua',
        texto,
        linhas,
        versao: 1,
        languageId: 'delegua',
    };
}

describe('completude', () => {
    beforeEach(() => {
        expirarTudo();
    });

    describe('proverItensCompletude()', () => {
        describe('Sem contexto especial', () => {
            it('retorna funções nativas de Delégua quando não há ponto antes do cursor', () => {
                const doc = criarDocumento(['es']);
                const itens = proverItensCompletude(doc, { line: 0, character: 2 });

                const nomes = itens.map(i => i.label);
                expect(nomes).toContain('escreva');
            });

            it('retorna função escreva com kind Function', () => {
                const doc = criarDocumento(['']);
                const itens = proverItensCompletude(doc, { line: 0, character: 0 });

                const escreva = itens.find(i => i.label === 'escreva');
                expect(escreva).toBeDefined();
                expect(escreva!.kind).toBe(CompletionItemKind.Function);
            });
        });

        describe('Completude após ponto (tipo de variável)', () => {
            it('retorna primitivas de texto quando variável é do tipo texto', () => {
                const doc = criarDocumento(['var nome: texto = "abc"', 'nome.']);
                definirResultado(doc.uri, {
                    lexador: { simbolos: [], erros: [] } as any,
                    avaliadorSintatico: {
                        declaracoes: [criarVarDeclaracao('nome', 'texto')],
                        erros: [],
                    } as any,
                    analisadorSemantico: { diagnosticos: [] } as any,
                });

                const itens = proverItensCompletude(doc, { line: 1, character: 5 });
                expect(itens.length).toBeGreaterThan(0);
            });

            it('retorna primitivas de vetor quando variável é do tipo vetor', () => {
                const doc = criarDocumento(['var lista: vetor = []', 'lista.']);
                definirResultado(doc.uri, {
                    lexador: { simbolos: [], erros: [] } as any,
                    avaliadorSintatico: {
                        declaracoes: [criarVarDeclaracao('lista', 'vetor')],
                        erros: [],
                    } as any,
                    analisadorSemantico: { diagnosticos: [] } as any,
                });

                const itens = proverItensCompletude(doc, { line: 1, character: 6 });
                expect(itens.length).toBeGreaterThan(0);
            });

            it('retorna primitivas de dicionário quando variável é do tipo dicionario', () => {
                const doc = criarDocumento(['var mapa: dicionário = {}', 'mapa.']);
                definirResultado(doc.uri, {
                    lexador: { simbolos: [], erros: [] } as any,
                    avaliadorSintatico: {
                        declaracoes: [criarVarDeclaracao('mapa', 'dicionário')],
                        erros: [],
                    } as any,
                    analisadorSemantico: { diagnosticos: [] } as any,
                });

                const itens = proverItensCompletude(doc, { line: 1, character: 5 });
                expect(itens.length).toBeGreaterThan(0);
            });

            it('retorna lista vazia para tipo não reconhecido após ponto', () => {
                const doc = criarDocumento(['var x: tipoDesconhecido = nulo', 'x.']);
                definirResultado(doc.uri, {
                    lexador: { simbolos: [], erros: [] } as any,
                    avaliadorSintatico: {
                        declaracoes: [{
                            simbolo: { lexema: 'x', linha: 1 },
                            tipo: 'tipoDesconhecido',
                        }],
                        erros: [],
                    } as any,
                    analisadorSemantico: { diagnosticos: [] } as any,
                });

                const itens = proverItensCompletude(doc, { line: 1, character: 2 });
                expect(itens).toHaveLength(0);
            });
        });

        describe('Documentário', () => {
            it('retorna etiquetas de documentário dentro de bloco /**', () => {
                const linhas = [
                    '/**',
                    ' * @',
                    ' */',
                    'funcao teste() {}',
                ];
                const doc = criarDocumento(linhas);
                const itens = proverItensCompletude(doc, { line: 1, character: 4 });

                expect(itens.length).toBeGreaterThan(0);
                expect(itens.every(i => i.label.toString().startsWith('@'))).toBe(true);
            });

            it('retorna etiquetas filtradas pelo prefixo @param', () => {
                const linhas = ['/**', ' * @param', ' */', 'funcao f() {}'];
                const doc = criarDocumento(linhas);
                const itens = proverItensCompletude(doc, { line: 1, character: 9 });

                expect(itens.length).toBeGreaterThan(0);
                expect(itens.every(i => i.label.toString().startsWith('@param'))).toBe(true);
            });

            it('etiquetas de documentário usam InsertTextFormat.Snippet', () => {
                const linhas = ['/**', ' * @', ' */'];
                const doc = criarDocumento(linhas);
                const itens = proverItensCompletude(doc, { line: 1, character: 4 });

                expect(itens.every(i => i.insertTextFormat === InsertTextFormat.Snippet)).toBe(true);
            });
        });

        describe('Completude com variáveis do cache', () => {
            it('inclui variáveis declaradas no documento atual', () => {
                const doc = criarDocumento(['var minhaVariavel = 42', '']);
                definirResultado(doc.uri, {
                    lexador: { simbolos: [], erros: [] } as any,
                    avaliadorSintatico: {
                        declaracoes: [{
                            constructor: { name: 'Var' },
                            simbolo: { lexema: 'minhaVariavel', linha: 1 },
                            tipo: 'numero',
                        }],
                        erros: [],
                    } as any,
                    analisadorSemantico: { diagnosticos: [] } as any,
                });

                const itens = proverItensCompletude(doc, { line: 1, character: 0 });
                const nomes = itens.map(i => i.label);
                // funções nativas devem continuar aparecendo
                expect(nomes).toContain('escreva');
            });
        });

        describe('Liquido — completude dentro de rota', () => {
            it('retorna primitivas de liquido quando texto termina com "liquido."', () => {
                const doc = criarDocumento(['liquido.']);
                const itens = proverItensCompletude(doc, { line: 0, character: 8 });

                const nomes = itens.map(i => i.label);
                expect(nomes).toContain('rotaGet');
                expect(nomes).toContain('rotaPost');
            });

            it('completude de rotaGet usa InsertTextFormat.Snippet', () => {
                const doc = criarDocumento(['liquido.']);
                const itens = proverItensCompletude(doc, { line: 0, character: 8 });

                const rotaGet = itens.find(i => i.label === 'rotaGet');
                expect(rotaGet).toBeDefined();
                expect(rotaGet!.insertTextFormat).toBe(InsertTextFormat.Snippet);
            });
        });
    });
});
