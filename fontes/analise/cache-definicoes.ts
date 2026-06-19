import { Declaracao } from '@designliquido/delegua/declaracoes';

import { EntradaCacheDefinicoesInterface, OpcoesCacheDefinicoesInterface } from "../interfaces/caches";

export const TEMPO_VIDA_PADRAO_CACHE_DEFINICOES_MS = 60 * 60 * 1000;

const cache = new Map<string, EntradaCacheDefinicoesInterface>();

function obterEntradaValida(chave: string): EntradaCacheDefinicoesInterface | undefined {
    const entrada = cache.get(chave);
    if (!entrada) {
        return undefined;
    }

    if (Date.now() > entrada.expiraEm) {
        cache.delete(chave);
        return undefined;
    }

    return entrada;
}

export function definirDefinicoes(chave: string, definicoes: { [nomeTipo: string]: Declaracao }, opcoes?: OpcoesCacheDefinicoesInterface): void {
    const agora = Date.now();
    const tempoVidaMs = opcoes?.tempoVidaMs ?? TEMPO_VIDA_PADRAO_CACHE_DEFINICOES_MS;

    cache.set(chave, {
        definicoes,
        criadoEm: agora,
        expiraEm: agora + tempoVidaMs,
        tempoVidaMs: tempoVidaMs,
        motivo: opcoes?.motivo,
    });
}

export function obterDefinicoes(chave: string): { [nomeTipo: string]: Declaracao } | undefined {
    return obterEntradaValida(chave)?.definicoes;
}

export function obterDefinicoesPorContexto(contexto: 'normal' | 'liquido'): { [nomeTipo: string]: Declaracao } {
    const tiposMergeados: { [nomeTipo: string]: Declaracao } = {};

    for (const [chave] of cache.entries()) {
        if (!chave.endsWith(`::${contexto}`)) {
            continue;
        }

        const entradaValida = obterEntradaValida(chave);
        if (entradaValida) {
            Object.assign(tiposMergeados, entradaValida.definicoes);
        }
    }

    return tiposMergeados;
}

export function expirarDefinicoes(chave: string, _motivo?: string): void {
    cache.delete(chave);
}

export function expirarTodasDefinicoes(_motivo?: string): void {
    cache.clear();
}

export function limparDefinicoesExpiradas(): number {
    let removidos = 0;

    for (const [chave, entrada] of cache.entries()) {
        if (Date.now() > entrada.expiraEm) {
            cache.delete(chave);
            removidos++;
        }
    }

    return removidos;
}

export function obterEstatisticasCacheDefinicoes() {
    return {
        totalEntradas: cache.size,
    };
}
