import { expirarTudo } from '../fontes/analise/cache-analise';
import { executarAnalises } from '../fontes/analisador';
import { DocumentoLSPInterface } from '../fontes/interfaces/documento-lsp-interface';

function criarDocumento(texto: string, extensao: string, versao = 1): DocumentoLSPInterface {
    const uri = `file:///teste.${extensao}`;
    return {
        uri,
        nomeArquivo: `teste.${extensao}`,
        texto,
        linhas: texto.split('\n'),
        versao,
        languageId: extensao,
    };
}

describe('analisador', () => {
    beforeEach(() => {
        expirarTudo();
    });

    describe('executarAnalises()', () => {
        describe('Delégua', () => {
            it('retorna lista vazia de diagnósticos para código válido', async () => {
                const doc = criarDocumento('escreva("oi")', 'delegua');
                const diagnosticos = await executarAnalises(doc, '');
                expect(diagnosticos).toHaveLength(0);
            });

            it('retorna diagnóstico de erro para código inválido', async () => {
                const doc = criarDocumento('var = 10', 'delegua');
                const diagnosticos = await executarAnalises(doc, '');
                expect(diagnosticos.length).toBeGreaterThan(0);
                expect(diagnosticos[0].source).toBe('delegua');
            });

            it('retorna diagnósticos para múltiplos erros sintáticos', async () => {
                const doc = criarDocumento('var = \nconst =', 'delegua');
                const diagnosticos = await executarAnalises(doc, '');
                expect(diagnosticos.length).toBeGreaterThan(0);
            });

            it('usa cache na segunda chamada com mesmo hash', async () => {
                const doc = criarDocumento('var x = 1', 'delegua');
                const primeira = await executarAnalises(doc, '');
                const segunda = await executarAnalises(doc, '');
                expect(primeira).toEqual(segunda);
            });

            it('armazena declarações no cache após análise', async () => {
                const { obterResultado } = await import('../fontes/analise/cache-analise');
                const doc = criarDocumento('var nome = "Delégua"', 'delegua');
                await executarAnalises(doc, '');
                const resultado = obterResultado(doc.uri);
                expect(resultado).toBeDefined();
                expect(resultado!.avaliadorSintatico.declaracoes.length).toBeGreaterThan(0);
            });
        });

        describe('Extensões não suportadas', () => {
            it('retorna lista vazia para extensão desconhecida', async () => {
                const doc = criarDocumento('anything', 'js');
                const diagnosticos = await executarAnalises(doc, '');
                expect(diagnosticos).toHaveLength(0);
            });

            it('retorna lista vazia para extensão .txt', async () => {
                const doc = criarDocumento('hello world', 'txt');
                const diagnosticos = await executarAnalises(doc, '');
                expect(diagnosticos).toHaveLength(0);
            });
        });

        describe('Dialeto VisuAlg', () => {
            it('analisa código VisuAlg válido sem erros', async () => {
                const codigo = [
                    'algoritmo "teste"',
                    'var',
                    '   x: inteiro',
                    'inicio',
                    '   x <- 1',
                    'fimalgoritmo',
                ].join('\n');
                const doc = criarDocumento(codigo, 'alg');
                const diagnosticos = await executarAnalises(doc, '');
                expect(diagnosticos).toHaveLength(0);
            });
        });
    });
});
