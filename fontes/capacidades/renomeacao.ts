import * as fs from 'fs';
import * as path from 'path';

import { Position, Range, TextEdit, WorkspaceEdit } from 'vscode-languageserver-types';

import { DocumentoLSP } from '../interfaces/documento-lsp-interface';

function escaparRegex(texto: string): string {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function eCaracterPalavra(caractere: string): boolean {
    return /[_a-zA-Z0-9]/.test(caractere);
}

function obterPalavraNoIntervalo(linha: string, caractere: number): { palavra: string; inicio: number; fim: number } | undefined {
    const regex = /[_a-zA-Z][_a-zA-Z0-9]*/;
    let inicio = caractere;
    while (inicio > 0 && eCaracterPalavra(linha[inicio - 1])) {
        inicio--;
    }
    let fim = caractere;
    while (fim < linha.length && eCaracterPalavra(linha[fim])) {
        fim++;
    }

    if (fim <= inicio) {
        return undefined;
    }

    const palavra = linha.slice(inicio, fim);
    if (!/^[_a-zA-Z]/.test(palavra)) {
        return undefined;
    }

    return { palavra, inicio, fim };
}

function identificarOcorrenciasLinha(textoLinha: string, palavra: string): number[] {
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

function caminhoParaUri(caminho: string): string {
    const normalizado = caminho.replace(/\\/g, '/');
    return normalizado.startsWith('/') ? `file://${normalizado}` : `file:///${normalizado}`;
}

function coletarEdicoesDeLinhas(linhas: string[], palavra: string, novoNome: string): TextEdit[] {
    const edicoes: TextEdit[] = [];

    for (let indiceLinha = 0; indiceLinha < linhas.length; indiceLinha++) {
        const textoLinha = linhas[indiceLinha];
        const ocorrencias = identificarOcorrenciasLinha(textoLinha, palavra);

        for (const coluna of ocorrencias) {
            edicoes.push({
                range: {
                    start: { line: indiceLinha, character: coluna },
                    end: { line: indiceLinha, character: coluna + palavra.length },
                },
                newText: novoNome,
            });
        }
    }

    return edicoes;
}

function varrerArquivosWorkspace(pastaRaiz: string, extensoes: string[]): string[] {
    const arquivos: string[] = [];

    function varrer(diretorio: string): void {
        let entradas: fs.Dirent[];
        try {
            entradas = fs.readdirSync(diretorio, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entrada of entradas) {
            if (entrada.name === 'node_modules' || entrada.name.startsWith('.')) {
                continue;
            }
            const caminhoCompleto = path.join(diretorio, entrada.name);
            if (entrada.isDirectory()) {
                varrer(caminhoCompleto);
            } else if (extensoes.some(ext => entrada.name.endsWith(`.${ext}`))) {
                arquivos.push(caminhoCompleto);
            }
        }
    }

    varrer(pastaRaiz);
    return arquivos;
}

/**
 * Prepara o intervalo de renomeação (highlight da palavra atual).
 */
export function prepareRename(documento: DocumentoLSP, posicao: Position): Range | undefined {
    const linhaTexto = documento.linhas[posicao.line] ?? '';
    const intervalo = obterPalavraNoIntervalo(linhaTexto, posicao.character);
    if (!intervalo) {
        return undefined;
    }

    return {
        start: { line: posicao.line, character: intervalo.inicio },
        end: { line: posicao.line, character: intervalo.fim },
    };
}

/**
 * Produz as edições de renomeação em todos os arquivos do workspace.
 */
export function provideRenameEdits(
    documento: DocumentoLSP,
    posicao: Position,
    novoNome: string,
    pastaWorkspace: string
): WorkspaceEdit | undefined {
    if (!/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(novoNome)) {
        return undefined;
    }

    const linhaTexto = documento.linhas[posicao.line] ?? '';
    const intervalo = obterPalavraNoIntervalo(linhaTexto, posicao.character);
    if (!intervalo) {
        return undefined;
    }

    const { palavra } = intervalo;
    if (palavra === novoNome) {
        return { changes: {} };
    }

    const changes: { [uri: string]: TextEdit[] } = {};

    // Edições no documento atual
    const edicoesAtuais = coletarEdicoesDeLinhas(documento.linhas, palavra, novoNome);
    if (edicoesAtuais.length) {
        changes[documento.uri] = edicoesAtuais;
    }

    // Edições em outros arquivos do workspace
    const extensoes = ['delegua', 'egua'];
    const arquivos = varrerArquivosWorkspace(pastaWorkspace, extensoes);

    for (const caminhoArquivo of arquivos) {
        const uriArquivo = caminhoParaUri(caminhoArquivo);
        if (uriArquivo === documento.uri) {
            continue;
        }

        let conteudo: string;
        try {
            conteudo = fs.readFileSync(caminhoArquivo, 'utf-8');
        } catch {
            continue;
        }

        const linhasArquivo = conteudo.split('\n');
        const edicoes = coletarEdicoesDeLinhas(linhasArquivo, palavra, novoNome);

        if (edicoes.length) {
            changes[uriArquivo] = edicoes;
        }
    }

    return { changes };
}
