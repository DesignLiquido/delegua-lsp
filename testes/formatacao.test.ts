import { expirarTudo } from '../fontes/analise/cache-analise';
import { executarAnalises } from '../fontes/analisador';
import { proverFormatacao } from '../fontes/capacidades/formatacao';
import { DocumentoLSP } from '../fontes/interfaces/documento-lsp-interface';

function criarDocumento(texto: string, extensao: string, languageId = extensao): DocumentoLSP {
    const uri = `file:///teste.${extensao}`;
    return {
        uri,
        nomeArquivo: `teste.${extensao}`,
        texto,
        linhas: texto.split('\n'),
        versao: 1,
        languageId,
    };
}

describe('formatacao', () => {
    beforeEach(() => {
        expirarTudo();
    });

    describe('proverFormatacao()', () => {
        it('retorna null para extensão sem formatador (ex.: BIRL)', async () => {
            const doc = criarDocumento('escreva("oi")', 'birl');
            expect(await proverFormatacao(doc)).toBeNull();
        });

        it('retorna null quando não há resultado em cache', async () => {
            const doc = criarDocumento('escreva("oi")', 'delegua');
            expect(await proverFormatacao(doc)).toBeNull();
        });

        it('retorna lista vazia de edições para código já formatado', async () => {
            const texto = "var nome = 'Delegua'\nescreva(nome)\n";
            const doc = criarDocumento(texto, 'delegua');
            await executarAnalises(doc, '');

            expect(await proverFormatacao(doc)).toEqual([]);
        });

        it('retorna uma única edição substituindo o documento inteiro para código mal formatado', async () => {
            const texto = 'var   nome="Delegua"\n  escreva(  nome )';
            const doc = criarDocumento(texto, 'delegua');
            await executarAnalises(doc, '');

            const edicoes = await proverFormatacao(doc);
            expect(edicoes).toHaveLength(1);
            expect(edicoes![0].newText).toBe("var nome = 'Delegua'\nescreva(nome)\n");
            expect(edicoes![0].range).toEqual({
                start: { line: 0, character: 0 },
                end: { line: 1, character: doc.linhas[1].length },
            });
        });

        it('formata arquivos de dialeto VisuAlg', async () => {
            const texto = [
                'algoritmo "teste"',
                'var',
                '   x: inteiro',
                'inicio',
                '   x <- 1',
                '   escreval(x)',
                'fimalgoritmo',
                '',
            ].join('\n');
            const doc = criarDocumento(texto, 'alg', 'visualg');
            await executarAnalises(doc, '');

            const edicoes = await proverFormatacao(doc);
            expect(edicoes).toHaveLength(1);
            expect(edicoes![0].newText).toContain('    x: inteiro');
            expect(edicoes![0].range.start).toEqual({ line: 0, character: 0 });
        });
    });
});
