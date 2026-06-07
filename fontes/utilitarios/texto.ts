export interface IntervaloPalavra {
    palavra: string;
    inicio: number;
    fim: number;
}

const REGEX_CARACTERE_PALAVRA = /[_a-zA-Z0-9]/;

/**
 * Identifica a palavra (sequência de caracteres `[_a-zA-Z0-9]`) que contém a
 * posição informada na linha. Retorna `undefined` se a posição não estiver
 * sobre um caractere de palavra.
 */
export function obterPalavraNoIntervalo(linha: string, caractere: number): IntervaloPalavra | undefined {
    if (!REGEX_CARACTERE_PALAVRA.test(linha[caractere] ?? '')) {
        return undefined;
    }

    let inicio = caractere;
    while (inicio > 0 && REGEX_CARACTERE_PALAVRA.test(linha[inicio - 1])) {
        inicio--;
    }

    let fim = caractere;
    while (fim < linha.length && REGEX_CARACTERE_PALAVRA.test(linha[fim])) {
        fim++;
    }

    return { palavra: linha.slice(inicio, fim), inicio, fim };
}
