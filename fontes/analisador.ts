import * as path from 'path';
import * as fs from 'fs';

import { AnalisadorSemantico } from '@designliquido/delegua/analisador-semantico';
import { Lexador, LexadorPitugues } from '@designliquido/delegua/lexador';
import { AvaliadorSintatico, AvaliadorSintaticoPitugues } from '@designliquido/delegua/avaliador-sintatico';
import { AnalisadorSemanticoPitugues } from '@designliquido/delegua/analisador-semantico/dialetos';
import { AvaliadorSintaticoInterface, LexadorInterface, SimboloInterface } from '@designliquido/delegua/interfaces';
import { AnalisadorSemanticoInterface } from '@designliquido/delegua/interfaces/analisador-semantico-interface';
import { Classe, Declaracao } from '@designliquido/delegua/declaracoes';
import { cyrb53 } from '@designliquido/delegua';
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver-types';

import { LexadorBirl } from '@designliquido/birl/lexador';
import { AvaliadorSintaticoBirl } from '@designliquido/birl/avaliador-sintatico';
import { AnalisadorSemanticoBirl } from '@designliquido/birl/analisador-semantico';

import { LexadorMapler } from '@designliquido/mapler/lexador';
import { AvaliadorSintaticoMapler } from '@designliquido/mapler/avaliador-sintatico';
import { AnalisadorSemanticoMapler } from '@designliquido/mapler/analisador-semantico';

import { LexadorPotigol } from '@designliquido/potigol/lexador';
import { AvaliadorSintaticoPotigol } from '@designliquido/potigol/avaliador-sintatico';
import { AnalisadorSemanticoPotigol } from '@designliquido/potigol/analisador-semantico';

import { LexadorPortugolStudio } from '@designliquido/portugol-studio/lexador';
import { AvaliadorSintaticoPortugolStudio } from '@designliquido/portugol-studio/avaliador-sintatico';
import { AnalisadorSemanticoPortugolStudio } from '@designliquido/portugol-studio/analisador-semantico';

import { LexadorVisuAlg, AvaliadorSintaticoVisuAlg, AnalisadorSemanticoVisuAlg } from '@designliquido/visualg';

import { definirResultado, obterDiagnosticos, obterResultadoValido } from './analise/cache-analise';
import { definirDefinicoes } from './analise/cache-definicoes';
import { DocumentoLSP } from './interfaces/documento-lsp-interface';

const mapaSeveridadeDiagnosticos: Record<string | number, DiagnosticSeverity> = {
    0: DiagnosticSeverity.Error,
    1: DiagnosticSeverity.Warning,
    2: DiagnosticSeverity.Information,
    3: DiagnosticSeverity.Hint,
    'erro': DiagnosticSeverity.Error,
    'aviso': DiagnosticSeverity.Warning,
    'informacao': DiagnosticSeverity.Information,
    'dica': DiagnosticSeverity.Hint,
};

function obterExtensao(documento: DocumentoLSP): string {
    if (documento.languageId === 'delegua-testes') {
        return 'delegua';
    }

    const partes = documento.nomeArquivo.split('.');
    return partes.length > 1 ? partes[partes.length - 1] : '';
}

function formatarDiagnosticosAvaliacaoSintatica(
    erros: any[],
    linhas: string[]
): Diagnostic[] {
    const diagnosticos: Diagnostic[] = [];
    for (const erro of erros) {
        if (!erro?.simbolo?.linha) {
            continue;
        }
        const numeroLinha = Math.max(0, Number(erro.simbolo.linha) - 1);
        if (numeroLinha >= linhas.length) {
            continue;
        }
        const textoLinha = linhas[numeroLinha];
        const range: Range = {
            start: { line: numeroLinha, character: 0 },
            end: { line: numeroLinha, character: textoLinha.length },
        };
        diagnosticos.push({
            range,
            message: String(erro.message),
            severity: DiagnosticSeverity.Error,
            source: 'delegua',
        });
    }
    return diagnosticos;
}

function formatarDiagnosticosAnaliseSemantica(
    diagnosticosSemanticos: any[],
    linhas: string[]
): Diagnostic[] {
    const diagnosticos: Diagnostic[] = [];
    for (const diag of diagnosticosSemanticos) {
        if (!diag?.simbolo?.linha) {
            continue;
        }
        const numeroLinha = Math.max(0, Number(diag.simbolo.linha) - 1);
        if (numeroLinha >= linhas.length) {
            continue;
        }
        const textoLinha = linhas[numeroLinha];
        const colunaInicio = diag.simbolo.colunaInicio ?? 0;
        const colunaFim = diag.simbolo.colunaFim ?? textoLinha.length;
        const range: Range = {
            start: { line: numeroLinha, character: colunaInicio },
            end: { line: numeroLinha, character: colunaFim },
        };
        diagnosticos.push({
            range,
            message: String(diag.mensagem || diag.message || 'Erro semântico'),
            severity: mapaSeveridadeDiagnosticos[diag.tipo ?? 0] ?? DiagnosticSeverity.Warning,
            source: 'delegua',
        });
    }
    return diagnosticos;
}

/**
 * Executa análise léxica, sintática e semântica em um documento LSP.
 * Armazena o resultado no cache e retorna diagnósticos LSP para publicação.
 */
export async function executarAnalises(
    documento: DocumentoLSP,
    chaveWorkspace: string
): Promise<Diagnostic[]> {
    const extensaoArquivo = obterExtensao(documento);
    const extensoesSuportadas = ['alg', 'birl', 'delegua', 'mapler', 'pitu', 'pitugues', 'por', 'poti', 'potigol', 'visualg'];

    if (!extensoesSuportadas.includes(extensaoArquivo)) {
        return [];
    }

    const uriDocumento = documento.uri;
    const textoDocumento = documento.texto;
    const hashConteudo = cyrb53(textoDocumento);

    const resultadoEmCache = obterResultadoValido(uriDocumento, {
        versaoDocumento: documento.versao,
        hashConteudo,
    });

    if (resultadoEmCache) {
        return obterDiagnosticos(uriDocumento) || [];
    }

    let lexador: LexadorInterface<SimboloInterface> | undefined;
    let avaliadorSintatico: AvaliadorSintaticoInterface<SimboloInterface, Declaracao> | undefined;
    let analisadorSemantico: AnalisadorSemanticoInterface | undefined;
    let declaracoesPreCarregadas: Declaracao[] = [];
    let dependenciasArquivos: string[] = [];

    switch (extensaoArquivo) {
        case 'birl':
            lexador = new LexadorBirl();
            avaliadorSintatico = new AvaliadorSintaticoBirl();
            analisadorSemantico = new AnalisadorSemanticoBirl();
            break;

        case 'mapler':
            lexador = new LexadorMapler();
            avaliadorSintatico = new AvaliadorSintaticoMapler();
            analisadorSemantico = new AnalisadorSemanticoMapler();
            break;

        case 'delegua':
            lexador = new Lexador();
            avaliadorSintatico = new AvaliadorSintatico();
            analisadorSemantico = new AnalisadorSemantico();
            break;

        case 'pitu':
        case 'pitugues':
            lexador = new LexadorPitugues();
            avaliadorSintatico = new AvaliadorSintaticoPitugues();
            analisadorSemantico = new AnalisadorSemanticoPitugues();
            break;

        case 'poti':
        case 'potigol':
            lexador = new LexadorPotigol();
            avaliadorSintatico = new AvaliadorSintaticoPotigol();
            analisadorSemantico = new AnalisadorSemanticoPotigol();
            break;

        case 'alg':
        case 'visualg':
            lexador = new LexadorVisuAlg();
            avaliadorSintatico = new AvaliadorSintaticoVisuAlg();
            analisadorSemantico = new AnalisadorSemanticoVisuAlg();
            break;

        case 'por':
            lexador = new LexadorPortugolStudio();
            avaliadorSintatico = new AvaliadorSintaticoPortugolStudio();
            analisadorSemantico = new AnalisadorSemanticoPortugolStudio();
            break;

        default:
            return [];
    }

    const linhas = textoDocumento.split('\n').map(l => l + '\0');
    const hashArquivo = cyrb53(uriDocumento);
    const resultadoLexador = lexador.mapear(linhas, hashArquivo);
    let listaOcorrencias: Diagnostic[] = [];

    const resultadoAvaliadorSintatico = await avaliadorSintatico.analisar(resultadoLexador, hashArquivo);

    // Armazena definições de tipos para o cache de completude
    if (avaliadorSintatico instanceof AvaliadorSintatico) {
        const tiposDefinidos = (avaliadorSintatico as any).tiposDefinidosEmCodigo ?? {};
        declaracoesPreCarregadas = Object.values(tiposDefinidos) as Declaracao[];

        if (declaracoesPreCarregadas.length > 0) {
            (analisadorSemantico as any)?.registrarClassesExternas?.(
                declaracoesPreCarregadas.filter(d => d instanceof Classe)
            );

            definirDefinicoes(
                `${chaveWorkspace}::normal`,
                { ...tiposDefinidos }
            );

            dependenciasArquivos = declaracoesPreCarregadas
                .map((d: any) => d?.caminhoArquivoDefinicao)
                .filter(Boolean) as string[];
        }
    }

    let resultadoAnalisadorSemantico: any = { diagnosticos: [] };

    try {
        if (resultadoAvaliadorSintatico?.erros?.length && documento.languageId !== 'delegua-testes') {
            listaOcorrencias = listaOcorrencias.concat(
                formatarDiagnosticosAvaliacaoSintatica(
                    resultadoAvaliadorSintatico.erros,
                    documento.linhas
                )
            );
        }

        if (analisadorSemantico !== undefined) {
            try {
                resultadoAnalisadorSemantico = await analisadorSemantico.analisar(resultadoAvaliadorSintatico.declaracoes);
                listaOcorrencias = listaOcorrencias.concat(
                    formatarDiagnosticosAnaliseSemantica(resultadoAnalisadorSemantico.diagnosticos, documento.linhas)
                );
            } catch (erro: any) {
                console.error(`Erro ao executar análise semântica para extensão ${extensaoArquivo}:`, erro);
            }
        }
    } catch (erro: any) {
        console.error(`Erro ao formatar diagnósticos para extensão ${extensaoArquivo}:`, erro);
    }

    definirResultado(uriDocumento, {
        lexador: resultadoLexador,
        avaliadorSintatico: resultadoAvaliadorSintatico,
        analisadorSemantico: resultadoAnalisadorSemantico,
        declaracoesPreCarregadas,
    }, {
        versaoDocumento: documento.versao,
        hashConteudo,
        diagnosticos: listaOcorrencias,
        dependenciasArquivos,
    });

    return listaOcorrencias;
}
