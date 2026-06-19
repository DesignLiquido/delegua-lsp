import {
    definirResultado,
    obterResultado,
    obterResultadoValido,
    obterDiagnosticos,
    expirarResultado,
    expirarResultadosPorDependenciaArquivo,
    expirarTudo,
    limparResultadosExpirados,
    obterEstatisticasCache,
    TEMPO_VIDA_PADRAO_CACHE_ANALISE_MS,
} from '../fontes/analise/cache-analise';
import { ResultadoAnaliseInterface } from '../fontes/interfaces/resultado-analise-interface';

function criarResultadoFake(label = 'teste'): ResultadoAnaliseInterface {
    return {
        lexador: { simbolos: [], erros: [] } as any,
        avaliadorSintatico: { declaracoes: [], erros: [] } as any,
        analisadorSemantico: { diagnosticos: [] } as any,
    };
}

describe('cache-analise', () => {
    beforeEach(() => {
        expirarTudo();
    });

    describe('definirResultado / obterResultado', () => {
        it('armazena e recupera resultado por URI', () => {
            const uri = 'file:///teste.delegua';
            const resultado = criarResultadoFake();

            definirResultado(uri, resultado);

            expect(obterResultado(uri)).toBe(resultado);
        });

        it('retorna undefined para URI desconhecida', () => {
            expect(obterResultado('file:///inexistente.delegua')).toBeUndefined();
        });

        it('sobrescreve entrada existente', () => {
            const uri = 'file:///arquivo.delegua';
            const primeiro = criarResultadoFake('primeiro');
            const segundo = criarResultadoFake('segundo');

            definirResultado(uri, primeiro);
            definirResultado(uri, segundo);

            expect(obterResultado(uri)).toBe(segundo);
        });

        it('armazena diagnósticos junto com o resultado', () => {
            const uri = 'file:///diag.delegua';
            const resultado = criarResultadoFake();
            const diagnosticos = [{ message: 'erro teste', severity: 1, range: {} }];

            definirResultado(uri, resultado, { diagnosticos: diagnosticos as any });

            expect(obterDiagnosticos(uri)).toEqual(diagnosticos);
        });
    });

    describe('obterResultadoValido', () => {
        it('retorna resultado quando versão bate', () => {
            const uri = 'file:///versao.delegua';
            const resultado = criarResultadoFake();

            definirResultado(uri, resultado, { versaoDocumento: 5 });

            expect(obterResultadoValido(uri, { versaoDocumento: 5 })).toBe(resultado);
        });

        it('retorna undefined quando versão não bate', () => {
            const uri = 'file:///versao2.delegua';
            definirResultado(uri, criarResultadoFake(), { versaoDocumento: 1 });

            expect(obterResultadoValido(uri, { versaoDocumento: 2 })).toBeUndefined();
        });

        it('retorna resultado quando hash bate', () => {
            const uri = 'file:///hash.delegua';
            const resultado = criarResultadoFake();

            definirResultado(uri, resultado, { hashConteudo: 12345 });

            expect(obterResultadoValido(uri, { hashConteudo: 12345 })).toBe(resultado);
        });

        it('retorna undefined quando hash não bate', () => {
            const uri = 'file:///hash2.delegua';
            definirResultado(uri, criarResultadoFake(), { hashConteudo: 100 });

            expect(obterResultadoValido(uri, { hashConteudo: 999 })).toBeUndefined();
        });

        it('expira entrada com TTL negativo', () => {
            const uri = 'file:///ttl.delegua';
            definirResultado(uri, criarResultadoFake(), { tempoVidaMs: -1 });

            // ttlMs=-1 garante expiraEm no passado
            expect(obterResultado(uri)).toBeUndefined();
        });
    });

    describe('expirarResultado', () => {
        it('remove entrada do cache', () => {
            const uri = 'file:///expirar.delegua';
            definirResultado(uri, criarResultadoFake());
            expirarResultado(uri);

            expect(obterResultado(uri)).toBeUndefined();
        });

        it('não lança erro para URI inexistente', () => {
            expect(() => expirarResultado('file:///inexistente.delegua')).not.toThrow();
        });
    });

    describe('expirarResultadosPorDependenciaArquivo', () => {
        it('expira entradas dependentes quando dependência é invalidada', () => {
            const uriA = 'file:///a.delegua';
            const uriDep = 'C:/projeto/dep.delegua';

            definirResultado(uriA, criarResultadoFake(), {
                dependenciasArquivos: [uriDep],
            });

            expirarResultadosPorDependenciaArquivo([uriDep]);

            expect(obterResultado(uriA)).toBeUndefined();
        });

        it('não afeta entradas sem a dependência especificada', () => {
            const uriB = 'file:///b.delegua';
            const resultado = criarResultadoFake();
            definirResultado(uriB, resultado, {
                dependenciasArquivos: ['C:/outro.delegua'],
            });

            expirarResultadosPorDependenciaArquivo(['C:/naoexiste.delegua']);

            expect(obterResultado(uriB)).toBe(resultado);
        });
    });

    describe('limparResultadosExpirados', () => {
        it('remove apenas entradas expiradas e retorna contagem', () => {
            definirResultado('file:///expirado.delegua', criarResultadoFake(), { tempoVidaMs: -1 });
            definirResultado('file:///valido.delegua', criarResultadoFake(), { tempoVidaMs: TEMPO_VIDA_PADRAO_CACHE_ANALISE_MS });

            const removidos = limparResultadosExpirados();

            expect(removidos).toBe(1);
            expect(obterResultado('file:///valido.delegua')).toBeDefined();
        });
    });

    describe('obterEstatisticasCache', () => {
        it('retorna contagem correta de entradas', () => {
            definirResultado('file:///est1.delegua', criarResultadoFake());
            definirResultado('file:///est2.delegua', criarResultadoFake());

            const stats = obterEstatisticasCache();

            expect(stats.totalEntradas).toBe(2);
        });
    });
});
