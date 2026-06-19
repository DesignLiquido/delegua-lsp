import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { criarAmbienteNode } from '../fontes/ambiente/ambiente-node';
import { prepararRenomeacao, proverEdicoesPorRenomeacao } from '../fontes/capacidades/renomeacao';
import { AmbienteLSPInterface, EntradaDiretorioInterface, DocumentoLSPInterface } from '../fontes/interfaces';

function criarDocumento(linhas: string[], nomeArquivo = 'teste.delegua'): DocumentoLSPInterface {
    const texto = linhas.join('\n');
    const uri = `file:///${nomeArquivo.replace(/\\/g, '/')}`;
    return { uri, nomeArquivo, texto, linhas, versao: 1, languageId: 'delegua' };
}

/**
 * Ambiente em memória, sem nenhum acesso a disco — prova que
 * `proverEdicoesPorRenomeacao` funciona com qualquer implementação de
 * `AmbienteLSP`, não apenas a do Node.js.
 */
function criarAmbienteEmMemoria(arquivos: Record<string, string>): AmbienteLSPInterface {
    return {
        sistemaArquivos: {
            async lerArquivoTexto(caminho: string) {
                return arquivos[caminho];
            },
            async listarDiretorio(caminho: string): Promise<EntradaDiretorioInterface[]> {
                const prefixo = caminho.endsWith('/') ? caminho : `${caminho}/`;
                const nomes = new Set<string>();
                const entradas: EntradaDiretorioInterface[] = [];

                for (const arquivo of Object.keys(arquivos)) {
                    if (!arquivo.startsWith(prefixo)) {
                        continue;
                    }
                    const resto = arquivo.slice(prefixo.length);
                    const nome = resto.split('/')[0];
                    if (nomes.has(nome)) {
                        continue;
                    }
                    nomes.add(nome);
                    entradas.push({ nome, ehDiretorio: resto.includes('/') });
                }

                return entradas;
            },
        },
        caminhos: {
            juntar: (...partes: string[]) => partes.join('/').replace(/\/+/g, '/'),
            dirname: (caminho: string) => caminho.split('/').slice(0, -1).join('/'),
            resolver: (base: string, relativo: string) => `${base}/${relativo}`,
            normalizar: (caminho: string) => caminho,
        },
    };
}

describe('renomeacao', () => {
    let pastaTemp: string;
    const ambiente = criarAmbienteNode();

    beforeEach(() => {
        pastaTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'delegua-lsp-rename-'));
    });

    afterEach(() => {
        fs.rmSync(pastaTemp, { recursive: true, force: true });
    });

    describe('prepararRenomeacao()', () => {
        it('retorna o intervalo da palavra sob o cursor', () => {
            const doc = criarDocumento(['var contador = 0']);
            const intervalo = prepararRenomeacao(doc, { line: 0, character: 4 });

            expect(intervalo).toBeDefined();
            expect(intervalo!.start).toEqual({ line: 0, character: 4 });
            expect(intervalo!.end).toEqual({ line: 0, character: 12 }); // "contador" = 8 chars: início 4 + 8 = 12
        });

        it('retorna undefined quando cursor está em operador', () => {
            const doc = criarDocumento(['var x = 10']);
            const intervalo = prepararRenomeacao(doc, { line: 0, character: 7 }); // espaço após '='
            expect(intervalo).toBeUndefined();
        });

        it('retorna undefined quando cursor está em número', () => {
            const doc = criarDocumento(['var x = 10']);
            const intervalo = prepararRenomeacao(doc, { line: 0, character: 9 }); // "1" em "10"
            // "10" não começa com [_a-zA-Z], então deve ser undefined
            expect(intervalo).toBeUndefined();
        });

        it('retorna intervalo correto para identificador com underscore', () => {
            const doc = criarDocumento(['var _minha_var = 0']);
            const intervalo = prepararRenomeacao(doc, { line: 0, character: 5 });
            expect(intervalo).toBeDefined();
            expect(intervalo!.start.character).toBe(4);
            expect(intervalo!.end.character).toBe(14); // "_minha_var" = 10 chars
        });
    });

    describe('proverEdicoesPorRenomeacao()', () => {
        it('retorna edições para o documento atual', async () => {
            const linhas = ['var total = 0', 'total = total + 1'];
            const doc = criarDocumento(linhas);

            const edits = await proverEdicoesPorRenomeacao(doc, { line: 0, character: 4 }, 'soma', pastaTemp, ambiente);

            expect(edits).toBeDefined();
            expect(edits!.changes).toBeDefined();
            const edicoesDoc = edits!.changes![doc.uri];
            expect(edicoesDoc).toBeDefined();
            expect(edicoesDoc.every(e => e.newText === 'soma')).toBe(true);
        });

        it('conta corretamente as ocorrências renomeadas no documento', async () => {
            const linhas = ['var x = 0', 'x = x + 1', 'escreva(x)'];
            const doc = criarDocumento(linhas);

            const edits = await proverEdicoesPorRenomeacao(doc, { line: 0, character: 4 }, 'contador', pastaTemp, ambiente);
            const edicoesDoc = edits!.changes![doc.uri];
            // "x" aparece em 3 linhas, total 4 vezes (var x, x =, x +, escreva(x))
            expect(edicoesDoc.length).toBeGreaterThanOrEqual(4);
        });

        it('inclui edições em outros arquivos do workspace', async () => {
            const arquivoB = path.join(pastaTemp, 'outro.delegua');
            fs.writeFileSync(arquivoB, 'escreva(soma)', 'utf-8');

            const linhas = ['funcao soma() {}'];
            const arquivoA = path.join(pastaTemp, 'modulo.delegua');
            fs.writeFileSync(arquivoA, linhas[0], 'utf-8');

            const doc = criarDocumento(linhas, arquivoA);
            const edits = await proverEdicoesPorRenomeacao(doc, { line: 0, character: 8 }, 'calcular', pastaTemp, ambiente);

            expect(edits).toBeDefined();
            const todasUris = Object.keys(edits!.changes!);
            expect(todasUris.some(u => u.includes('outro'))).toBe(true);
        });

        it('retorna undefined para novo nome inválido (começa com número)', async () => {
            const doc = criarDocumento(['var x = 1']);
            const edits = await proverEdicoesPorRenomeacao(doc, { line: 0, character: 4 }, '1invalido', pastaTemp, ambiente);
            expect(edits).toBeUndefined();
        });

        it('retorna undefined para novo nome inválido (contém espaço)', async () => {
            const doc = criarDocumento(['var x = 1']);
            const edits = await proverEdicoesPorRenomeacao(doc, { line: 0, character: 4 }, 'nome invalido', pastaTemp, ambiente);
            expect(edits).toBeUndefined();
        });

        it('retorna changes vazio quando novo nome é igual ao atual', async () => {
            const doc = criarDocumento(['var x = 1']);
            const edits = await proverEdicoesPorRenomeacao(doc, { line: 0, character: 4 }, 'x', pastaTemp, ambiente);
            expect(edits).toBeDefined();
            expect(Object.keys(edits!.changes!)).toHaveLength(0);
        });

        it('retorna undefined quando cursor está em posição sem identificador', async () => {
            const doc = criarDocumento(['var x = 1']);
            const edits = await proverEdicoesPorRenomeacao(doc, { line: 0, character: 7 }, 'novoNome', pastaTemp, ambiente);
            expect(edits).toBeUndefined();
        });

        it('as edições apontam para os intervalos corretos', async () => {
            const linhas = ['var nome = "teste"'];
            const doc = criarDocumento(linhas);

            const edits = await proverEdicoesPorRenomeacao(doc, { line: 0, character: 4 }, 'apelido', pastaTemp, ambiente);
            const edicoesDoc = edits!.changes![doc.uri];
            expect(edicoesDoc[0].range.start.character).toBe(4);
            expect(edicoesDoc[0].range.end.character).toBe(8); // "nome" = 4 chars
        });

        it('funciona com um AmbienteLSP totalmente em memória (sem fs/path do Node.js)', async () => {
            const arquivos: Record<string, string> = {
                'workspace/modulo.delegua': 'funcao soma() {}',
                'workspace/outro.delegua': 'escreva(soma)',
            };
            const ambienteEmMemoria = criarAmbienteEmMemoria(arquivos);

            const doc = criarDocumento(['funcao soma() {}'], 'workspace/modulo.delegua');
            const edits = await proverEdicoesPorRenomeacao(doc, { line: 0, character: 8 }, 'calcular', 'workspace', ambienteEmMemoria);

            expect(edits).toBeDefined();
            const todasUris = Object.keys(edits!.changes!);
            expect(todasUris.some(u => u.includes('outro'))).toBe(true);
        });
    });
});
