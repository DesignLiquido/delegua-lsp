import { Classe, Const, FuncaoDeclaracao, Var } from '@designliquido/delegua/declaracoes';
import primitivasDicionario from '@designliquido/delegua/bibliotecas/primitivas-dicionario';
import primitivasNumero from '@designliquido/delegua/bibliotecas/primitivas-numero';
import primitivasTexto from '@designliquido/delegua/bibliotecas/primitivas-texto';
import primitivasVetor from '@designliquido/delegua/bibliotecas/primitivas-vetor';
import {
    CompletionItem,
    CompletionItemKind,
    InsertTextFormat,
    MarkupKind,
    Position,
} from 'vscode-languageserver-types';

import { obterResultado } from '../analise/cache-analise';
import { formatarPrimitivas, funcoesNativasDelegua } from '../bibliotecas/formatadores';
import { primitivasMetodosLiquido, objetosEmRotaLiquido } from '../bibliotecas/primitivas-liquido';
import { definicoesTagsDocumentario } from '../documentacao-em-editor/etiquetas-documentarios';
import { DocumentoLSP } from '../interfaces/documento-lsp-interface';
import { MetodoParametro, ParametroDetectado, PropriedadeParametro, TipoParametro } from '../interfaces/completude';

const primitivasDicionarioFormatadas = formatarPrimitivas(primitivasDicionario);
const primitivasNumeroFormatadas = formatarPrimitivas(primitivasNumero);
const primitivasTextoFormatadas = formatarPrimitivas(primitivasTexto);
const primitivasVetorFormatadas = formatarPrimitivas(primitivasVetor);

const completudesDocumentario = definicoesTagsDocumentario.map(definicao => {
    const item: CompletionItem = {
        label: definicao.canonica,
        kind: CompletionItemKind.Interface,
        detail: `${definicao.titulo} do documentário`,
        documentation: {
            kind: MarkupKind.Markdown,
            value: `Etiqueta canônica: \`${definicao.canonica}\`${definicao.aliases.length > 1 ? `\n\nAliases: ${definicao.aliases.map(a => `\`${a}\``).join(', ')}` : ''}`,
        },
        insertText: `${definicao.canonica} $0`,
        insertTextFormat: InsertTextFormat.Snippet,
        sortText: `0-${definicao.canonica}`,
    };
    return item;
});

// ─── helpers ────────────────────────────────────────────────────────────────

const tiposParametrosLiquido: TipoParametro[] = [
    {
        nome: 'requisicao',
        propriedades: [
            { nome: 'corpo', tipo: 'objeto', documentacao: 'Corpo da requisição HTTP', tipoCompletude: CompletionItemKind.Property },
            {
                nome: 'parametros', tipo: 'objeto', documentacao: 'Parâmetros da URL', tipoCompletude: CompletionItemKind.Property,
                propriedadesAninhadas: [
                    { nome: 'id', tipo: 'texto', documentacao: 'ID comum em parâmetros de rota' },
                    { nome: 'slug', tipo: 'texto', documentacao: 'Slug comum em parâmetros de rota' },
                ],
            },
            { nome: 'cabecalhos', tipo: 'objeto', documentacao: 'Cabeçalhos HTTP da requisição', tipoCompletude: CompletionItemKind.Property },
        ],
        metodos: [],
    },
    {
        nome: 'resposta',
        propriedades: [],
        metodos: [
            { nome: 'status', parametros: ['codigo: number'], tipoRetorno: 'resposta', documentacao: 'Define o código de status HTTP', snippet: 'status(${1:200})', permiteEncadeamento: true },
            { nome: 'json', parametros: ['dados: object'], tipoRetorno: 'void', documentacao: 'Envia resposta JSON', snippet: 'json(${1:{\\}})', permiteEncadeamento: false },
            { nome: 'enviar', parametros: ['texto: string'], tipoRetorno: 'void', documentacao: 'Envia resposta em texto plano', snippet: 'enviar("${1:texto}")', permiteEncadeamento: false },
            { nome: 'lmht', parametros: ['lmht: dicionário'], tipoRetorno: 'void', documentacao: 'Envia resposta HTML', snippet: 'lmht("${1:<html></html>}")', permiteEncadeamento: false },
            { nome: 'redirecionar', parametros: ['caminho: texto'], tipoRetorno: 'void', documentacao: 'Redireciona a requisição', snippet: 'redirecionar("${1:caminho}")', permiteEncadeamento: false },
            { nome: 'cabecalho', parametros: ['nome: texto', 'valor: texto'], tipoRetorno: 'resposta', documentacao: 'Define um cabeçalho HTTP', snippet: 'cabecalho("${1:nome}", "${2:valor}")', permiteEncadeamento: true },
            { nome: 'cookie', parametros: ['nome: texto', 'valor: texto', 'opcoes?: dicionário'], tipoRetorno: 'resposta', documentacao: 'Define um cookie', snippet: 'cookie("${1:nome}", "${2:valor}")', permiteEncadeamento: true },
        ],
    },
];

function criarCompletudesCompletas(tipoParametro: TipoParametro): CompletionItem[] {
    const completudes: CompletionItem[] = [];

    if (tipoParametro.propriedades) {
        for (const propriedade of tipoParametro.propriedades) {
            let detalhe = `(${propriedade.tipo}) ${propriedade.nome}`;
            if (propriedade.propriedadesAninhadas && propriedade.propriedadesAninhadas.length > 0) {
                detalhe += ` - ${propriedade.propriedadesAninhadas.length} propriedades aninhadas`;
            }
            completudes.push({
                label: propriedade.nome,
                kind: propriedade.tipoCompletude ?? CompletionItemKind.Property,
                documentation: { kind: MarkupKind.Markdown, value: propriedade.documentacao },
                detail: detalhe,
            });
        }
    }

    if (tipoParametro.metodos) {
        for (const metodo of tipoParametro.metodos) {
            let detalhe = `${metodo.nome}(${metodo.parametros.join(', ')})`;
            if (metodo.tipoRetorno) detalhe += ` → ${metodo.tipoRetorno}`;
            if (metodo.permiteEncadeamento) detalhe += ' (encadeável)';

            completudes.push({
                label: metodo.nome,
                kind: CompletionItemKind.Method,
                documentation: { kind: MarkupKind.Markdown, value: metodo.documentacao },
                detail: detalhe,
                insertText: metodo.snippet ?? `${metodo.nome}($0)`,
                insertTextFormat: InsertTextFormat.Snippet,
            });
        }
    }

    return completudes;
}

function obterTipoParametro(nomeParametro: string | null): TipoParametro | null {
    if (!nomeParametro) return null;
    return tiposParametrosLiquido.find(t => t.nome === nomeParametro) || null;
}

function obterTipoParametroComDeteccao(nomeParametro: string | null, parametrosDetectados: ParametroDetectado[]): TipoParametro | null {
    if (!nomeParametro) return null;
    const direto = obterTipoParametro(nomeParametro);
    if (direto) return direto;
    const detectado = parametrosDetectados.find(p => p.nome === nomeParametro);
    return detectado ? obterTipoParametro(detectado.tipoOriginal) : null;
}

function obterPalavraAntesPonto(texto: string): string | null {
    const match = texto.match(/(\w+)\./);
    return match ? match[1] : null;
}

function analisarCadeiaChamadasEmCodigo(texto: string): string[] {
    const regex = /(\w+)(?:\.(\w+)(?:\([^)]*\))?)*\.$/;
    const match = texto.match(regex);
    if (!match) return [];

    const partes = texto.split('.');
    const caminho: string[] = [];
    for (let i = 0; i < partes.length - 1; i++) {
        const nome = partes[i].replace(/\([^)]*\)$/, '').trim();
        if (nome) caminho.push(nome);
    }
    return caminho;
}

function obterCompletudesParaCaminho(caminho: string[], parametrosDetectados: ParametroDetectado[]): CompletionItem[] | null {
    if (!caminho.length) return null;

    let tipoAtual = obterTipoParametroComDeteccao(caminho[0], parametrosDetectados);
    if (!tipoAtual) return null;

    for (let i = 1; i < caminho.length; i++) {
        const nome = caminho[i];
        const metodo: MetodoParametro | undefined = tipoAtual.metodos?.find(m => m.nome === nome);
        if (metodo?.permiteEncadeamento && metodo.tipoRetorno) {
            tipoAtual = tiposParametrosLiquido.find(t => t.nome === metodo.tipoRetorno) || tipoAtual;
            continue;
        }
        const prop: PropriedadeParametro | undefined = tipoAtual.propriedades?.find(p => p.nome === nome);
        if (prop?.propriedadesAninhadas) {
            tipoAtual = { nome: `${tipoAtual.nome}.${nome}`, propriedades: prop.propriedadesAninhadas };
            continue;
        }
        return null;
    }

    return criarCompletudesCompletas(tipoAtual);
}

function obterDetalhesEscopo(linhas: string[], linhaAtual: number, caractereAtual: number): { tipoEscopo: string } {
    let contadorChaves = 0;
    const pilhaEscopos: string[] = [];
    const palavrasChaveEscopo = ['rotaGet', 'rotaPost'];

    for (let i = 0; i <= linhaAtual; i++) {
        const textoLinha = linhas[i] ?? '';
        const fimLinha = i === linhaAtual ? caractereAtual : textoLinha.length;

        palavrasChaveEscopo.forEach(palavra => {
            const regex = new RegExp(`\\bliquido\\.${palavra}\\b`, 'gi');
            let correspondencia: RegExpExecArray | null;
            while ((correspondencia = regex.exec(textoLinha)) !== null && correspondencia.index < fimLinha) {
                if (textoLinha.substring(correspondencia.index).includes('{')) {
                    pilhaEscopos.push(palavra);
                }
            }
        });

        for (let col = 0; col < fimLinha; col++) {
            const char = textoLinha[col];
            if (char === '{') {
                contadorChaves++;
            } else if (char === '}') {
                contadorChaves--;
                if (pilhaEscopos.length > 0) pilhaEscopos.pop();
            }
        }
    }

    return { tipoEscopo: pilhaEscopos.length > 0 ? pilhaEscopos[pilhaEscopos.length - 1] : 'global' };
}

function detectarParametrosDaFuncao(linhas: string[], linhaAtual: number): ParametroDetectado[] {
    const parametrosDetectados: ParametroDetectado[] = [];
    const linhaInicio = Math.max(0, linhaAtual - 50);

    for (let i = linhaAtual; i >= linhaInicio; i--) {
        const textoLinha = linhas[i] ?? '';
        const correspondencia = textoLinha.match(/liquido\.(rotaGet|rotaPost|rotaPut|rotaDelete)\s*\(\s*funcao\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/);
        if (correspondencia) {
            parametrosDetectados.push(
                { nome: correspondencia[2], tipoOriginal: 'requisicao', linha: i },
                { nome: correspondencia[3], tipoOriginal: 'resposta', linha: i }
            );
            break;
        }
    }

    return parametrosDetectados;
}

function obterClasseEnvolvente(linhas: string[], linhaAtual: number, caractereAtual: number): string | null {
    let profundidade = 0;

    for (let i = linhaAtual; i >= 0; i--) {
        const textoLinha = linhas[i] ?? '';
        const limite = i === linhaAtual ? caractereAtual : textoLinha.length;

        for (let col = limite - 1; col >= 0; col--) {
            const char = textoLinha[col];
            if (char === '}') {
                profundidade++;
            } else if (char === '{') {
                if (profundidade === 0) {
                    for (let busca = i; busca >= Math.max(0, i - 3); busca--) {
                        const correspondencia = (linhas[busca] ?? '').match(/\bclasse\s+(\w+)/);
                        if (correspondencia) return correspondencia[1];
                    }
                } else {
                    profundidade--;
                }
            }
        }
    }

    return null;
}

function obterCompletudesDeClasseDeTexto(linhas: string[], nomeClasse: string): CompletionItem[] {
    const completudes: CompletionItem[] = [];
    let linhaInicio = -1;

    for (let i = 0; i < linhas.length; i++) {
        if ((linhas[i] ?? '').match(new RegExp(`\\bclasse\\s+${nomeClasse}\\b`))) {
            linhaInicio = i;
            break;
        }
    }

    if (linhaInicio === -1) return completudes;

    let profundidade = 0;
    for (let i = linhaInicio; i < linhas.length; i++) {
        const texto = linhas[i] ?? '';
        const profundidadeAntes = profundidade;
        for (const char of texto) {
            if (char === '{') profundidade++;
            else if (char === '}') profundidade--;
        }

        if (profundidadeAntes === 1 && i > linhaInicio) {
            const correspondenciaMetodo = texto.match(/^\s*([a-zA-ZÀ-ú_]\w*)\s*\(/);
            if (correspondenciaMetodo && correspondenciaMetodo[1] !== 'construtor') {
                const nome = correspondenciaMetodo[1];
                if (!completudes.some(c => c.label === nome)) {
                    completudes.push({
                        label: nome,
                        kind: CompletionItemKind.Method,
                        detail: `(método) ${nome}`,
                        insertText: `${nome}($0)`,
                        insertTextFormat: InsertTextFormat.Snippet,
                    });
                }
            }

            const correspondenciaPropriedade = texto.match(/^\s*([a-zA-ZÀ-ú_]\w*)\s*:/);
            if (correspondenciaPropriedade) {
                const nome = correspondenciaPropriedade[1];
                if (!completudes.some(c => c.label === nome)) {
                    completudes.push({ label: nome, kind: CompletionItemKind.Property, detail: `(propriedade) ${nome}` });
                }
            }
        }

        if (profundidade === 0 && i > linhaInicio) break;
    }

    return completudes;
}

function obterCompletudesDeClasse(classeDeclarada: Classe): CompletionItem[] {
    const completudes: CompletionItem[] = [];

    for (const metodo of classeDeclarada.metodos) {
        const params = metodo.funcao?.parametros?.map((p: any) => p.nome?.lexema ?? '').join(', ') ?? '';
        completudes.push({
            label: metodo.simbolo.lexema,
            kind: CompletionItemKind.Method,
            detail: `(método) ${metodo.simbolo.lexema}(${params})`,
            insertText: `${metodo.simbolo.lexema}($0)`,
            insertTextFormat: InsertTextFormat.Snippet,
        });
    }

    for (const prop of classeDeclarada.propriedades) {
        completudes.push({
            label: prop.nome.lexema,
            kind: CompletionItemKind.Property,
            detail: prop.tipo ? `(${prop.tipo}) ${prop.nome.lexema}` : `(propriedade) ${prop.nome.lexema}`,
        });
    }

    return completudes;
}

function coletarVarsEConsts(declaracoes: any[]): { nome: string; tipo: string }[] {
    const resultado: { nome: string; tipo: string }[] = [];
    for (const d of declaracoes) {
        if (d instanceof Var) resultado.push({ nome: d.simbolo.lexema, tipo: d.tipo });
        else if (d instanceof Const) resultado.push({ nome: d.simbolo.lexema, tipo: d.tipo });

        if ((d as any).corpo?.declaracoes) resultado.push(...coletarVarsEConsts((d as any).corpo.declaracoes));
        if ((d as any).caminhoEntao?.declaracoes) resultado.push(...coletarVarsEConsts((d as any).caminhoEntao.declaracoes));
        if ((d as any).caminhoSenao?.declaracoes) resultado.push(...coletarVarsEConsts((d as any).caminhoSenao.declaracoes));
    }
    return resultado;
}

function coletarVariaveisLocais(todasDeclaracoes: any[], linhaAtual: number): { nome: string; tipo: string }[] {
    const todasFuncoes: FuncaoDeclaracao[] = [];
    for (const d of todasDeclaracoes) {
        if (d instanceof FuncaoDeclaracao) todasFuncoes.push(d);
        if (d instanceof Classe) todasFuncoes.push(...d.metodos);
    }

    const funcoesAnteriores = todasFuncoes.filter(f => Number(f.simbolo.linha) <= linhaAtual);
    if (!funcoesAnteriores.length) return [];

    const funcaoAtual = funcoesAnteriores.reduce((prev, curr) =>
        Number(curr.simbolo.linha) > Number(prev.simbolo.linha) ? curr : prev
    );

    const corpo: any[] = Array.isArray(funcaoAtual.funcao.corpo) ? funcaoAtual.funcao.corpo : [];
    return coletarVarsEConsts(corpo);
}

function estaEmDocumentario(linhas: string[], linhaAtual: number, caractereAtual: number): boolean {
    let em = false;
    for (let i = 0; i <= linhaAtual; i++) {
        const textoLinha = linhas[i] ?? '';
        const limite = i === linhaAtual ? textoLinha.substring(0, caractereAtual) : textoLinha;
        if (limite.includes('/**')) em = true;
        if (limite.includes('*/')) em = false;
    }
    return em;
}

function obterCompletudesDocumentario(textoAntesPosicao: string): CompletionItem[] {
    const correspondencia = textoAntesPosicao.match(/(^|\s)@(\w*)$/);
    if (!correspondencia) return [];

    const prefixo = `@${(correspondencia[2] || '').toLowerCase()}`;
    return completudesDocumentario
        .filter(item => item.label.toString().toLowerCase().startsWith(prefixo))
        .map(item => ({
            ...item,
            insertText: `${item.label.toString().slice(prefixo.length)} $0`,
            insertTextFormat: InsertTextFormat.Snippet,
        }));
}

function completudesParaDelegua(
    textoAntesPosicao: string,
    palavraAntesPonto: string | null,
    parametrosDetectados: ParametroDetectado[],
    declaracaoCorrespondente: { nome: string; tipo: string } | undefined
): CompletionItem[] {
    if (textoAntesPosicao.endsWith('.')) {
        const tipoDetectadoLiquido = obterTipoParametroComDeteccao(palavraAntesPonto, parametrosDetectados);
        if (tipoDetectadoLiquido) {
            const tipoLiquido = tiposParametrosLiquido.find(tp => tp.nome === tipoDetectadoLiquido.nome);
            if (tipoLiquido) return criarCompletudesCompletas(tipoLiquido);
        }

        if (declaracaoCorrespondente) {
            const mapeamento: Record<string, typeof primitivasDicionarioFormatadas> = {
                'dicionario': primitivasDicionarioFormatadas, 'dicionário': primitivasDicionarioFormatadas,
                'numero': primitivasNumeroFormatadas, 'número': primitivasNumeroFormatadas,
                'texto': primitivasTextoFormatadas,
                'vetor': primitivasVetorFormatadas, 'dicionario[]': primitivasVetorFormatadas,
                'dicionário[]': primitivasVetorFormatadas, 'numero[]': primitivasVetorFormatadas,
                'número[]': primitivasVetorFormatadas, 'logico[]': primitivasVetorFormatadas,
                'lógico[]': primitivasVetorFormatadas, 'qualquer[]': primitivasVetorFormatadas,
                'texto[]': primitivasVetorFormatadas,
            };

            const prims = mapeamento[declaracaoCorrespondente.tipo];
            if (prims) {
                return prims.map(fn => ({
                    label: fn.nome,
                    kind: CompletionItemKind.Function,
                    documentation: { kind: MarkupKind.Markdown, value: fn.documentacao },
                }));
            }
        }

        return [];
    }

    return funcoesNativasDelegua.map(fn => ({
        label: fn.nome,
        kind: CompletionItemKind.Function,
        documentation: { kind: MarkupKind.Markdown, value: fn.documentacao },
    }));
}

// ─── entry point ────────────────────────────────────────────────────────────

/**
 * Fornece sugestões de completude para o símbolo na posição dada.
 */
export function proverItensCompletude(documento: DocumentoLSP, posicao: Position): CompletionItem[] {
    const resultadoAnalise = obterResultado(documento.uri);
    const linhaTexto = documento.linhas[posicao.line] ?? '';
    const textoAntesPosicao = linhaTexto.substring(0, posicao.character);

    if (estaEmDocumentario(documento.linhas, posicao.line, posicao.character)) {
        const completudesDoc = obterCompletudesDocumentario(textoAntesPosicao);
        if (completudesDoc.length > 0) return completudesDoc;
    }

    const detalhesEscopo = obterDetalhesEscopo(documento.linhas, posicao.line, posicao.character);
    const parametrosDetectados = detectarParametrosDaFuncao(documento.linhas, posicao.line);
    const caminhoCompleto = analisarCadeiaChamadasEmCodigo(textoAntesPosicao);

    if (caminhoCompleto.length > 0) {
        const completudes = obterCompletudesParaCaminho(caminhoCompleto, parametrosDetectados);
        if (completudes && completudes.length > 0) return completudes;
    }

    const todasDeclaracoes = [
        ...(resultadoAnalise?.declaracoesPreCarregadas || []),
        ...(resultadoAnalise?.avaliadorSintatico?.declaracoes || []),
    ];
    const variaveisLocais = coletarVariaveisLocais(todasDeclaracoes, posicao.line + 1);

    const declaracoesPertinentes = [
        ...variaveisLocais,
        ...(resultadoAnalise?.avaliadorSintatico?.declaracoes.flatMap((declaracao: any) => {
            if (declaracao instanceof Var) return [{ nome: declaracao.simbolo.lexema, tipo: declaracao.tipo }];
            if (declaracao instanceof Const) return [{ nome: declaracao.simbolo.lexema, tipo: declaracao.tipo }];
            if (declaracao instanceof Classe) return [{ nome: declaracao.simbolo.lexema, tipo: declaracao.simbolo.lexema }];
            if (declaracao instanceof FuncaoDeclaracao) return [{ nome: declaracao.simbolo.lexema, tipo: declaracao.tipo }];
            return [];
        }) || []),
    ];

    const completudesDeVariaveisEConstantes: CompletionItem[] = declaracoesPertinentes
        .filter(v => /^[a-zA-ZÀ-úÇç_]/.test(v.nome))
        .map(v => ({
            label: v.nome,
            kind: CompletionItemKind.Variable,
            detail: `(${v.tipo}) ${v.nome}`,
        }));

    const palavraAntesPonto = obterPalavraAntesPonto(textoAntesPosicao);
    const declaracaoCorrespondente = declaracoesPertinentes.find(v => v.nome === palavraAntesPonto);

    if (palavraAntesPonto === 'isto') {
        const nomeClasse = obterClasseEnvolvente(documento.linhas, posicao.line, posicao.character);
        if (nomeClasse) {
            const classeDeclarada = resultadoAnalise?.avaliadorSintatico?.declaracoes.find(
                (d: any) => d instanceof Classe && (d as Classe).simbolo.lexema === nomeClasse
            ) as Classe | undefined;
            if (classeDeclarada) return obterCompletudesDeClasse(classeDeclarada);
            return obterCompletudesDeClasseDeTexto(documento.linhas, nomeClasse);
        }
    }

    const tipoParametro = obterTipoParametroComDeteccao(palavraAntesPonto, parametrosDetectados);
    if (tipoParametro) return criarCompletudesCompletas(tipoParametro);

    switch (detalhesEscopo.tipoEscopo) {
        case 'rotaGet':
        case 'rotaPost':
            return objetosEmRotaLiquido.map(obj => ({
                label: obj.nome,
                kind: CompletionItemKind.Function,
                documentation: { kind: MarkupKind.Markdown, value: obj.documentacao },
            }));
        default:
            if (palavraAntesPonto === 'liquido') {
                return primitivasMetodosLiquido.map(fn => ({
                    label: fn.nome,
                    kind: CompletionItemKind.Function,
                    documentation: { kind: MarkupKind.Markdown, value: fn.documentacao },
                    insertText: `${fn.nome}(requisicao, resposta) {\n\t$0\n}`,
                    insertTextFormat: InsertTextFormat.Snippet,
                }));
            }

            return completudesDeVariaveisEConstantes.concat(
                completudesParaDelegua(textoAntesPosicao, palavraAntesPonto, parametrosDetectados, declaracaoCorrespondente)
            );
    }
}
