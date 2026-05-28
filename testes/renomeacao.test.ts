import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { prepareRename, provideRenameEdits } from '../fontes/capacidades/renomeacao';
import { DocumentoLSP } from '../fontes/interfaces/documento-lsp-interface';

function criarDocumento(linhas: string[], nomeArquivo = 'teste.delegua'): DocumentoLSP {
    const texto = linhas.join('\n');
    const uri = `file:///${nomeArquivo.replace(/\\/g, '/')}`;
    return { uri, nomeArquivo, texto, linhas, versao: 1, languageId: 'delegua' };
}

describe('renomeacao', () => {
    let pastaTemp: string;

    beforeEach(() => {
        pastaTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'delegua-lsp-rename-'));
    });

    afterEach(() => {
        fs.rmSync(pastaTemp, { recursive: true, force: true });
    });

    describe('prepareRename()', () => {
        it('retorna o intervalo da palavra sob o cursor', () => {
            const doc = criarDocumento(['var contador = 0']);
            const intervalo = prepareRename(doc, { line: 0, character: 4 });

            expect(intervalo).toBeDefined();
            expect(intervalo!.start).toEqual({ line: 0, character: 4 });
            expect(intervalo!.end).toEqual({ line: 0, character: 12 }); // "contador" = 8 chars: início 4 + 8 = 12
        });

        it('retorna undefined quando cursor está em operador', () => {
            const doc = criarDocumento(['var x = 10']);
            const intervalo = prepareRename(doc, { line: 0, character: 7 }); // espaço após '='
            expect(intervalo).toBeUndefined();
        });

        it('retorna undefined quando cursor está em número', () => {
            const doc = criarDocumento(['var x = 10']);
            const intervalo = prepareRename(doc, { line: 0, character: 9 }); // "1" em "10"
            // "10" não começa com [_a-zA-Z], então deve ser undefined
            expect(intervalo).toBeUndefined();
        });

        it('retorna intervalo correto para identificador com underscore', () => {
            const doc = criarDocumento(['var _minha_var = 0']);
            const intervalo = prepareRename(doc, { line: 0, character: 5 });
            expect(intervalo).toBeDefined();
            expect(intervalo!.start.character).toBe(4);
            expect(intervalo!.end.character).toBe(14); // "_minha_var" = 10 chars
        });
    });

    describe('provideRenameEdits()', () => {
        it('retorna edições para o documento atual', () => {
            const linhas = ['var total = 0', 'total = total + 1'];
            const doc = criarDocumento(linhas);

            const edits = provideRenameEdits(doc, { line: 0, character: 4 }, 'soma', pastaTemp);

            expect(edits).toBeDefined();
            expect(edits!.changes).toBeDefined();
            const edicoesDoc = edits!.changes![doc.uri];
            expect(edicoesDoc).toBeDefined();
            expect(edicoesDoc.every(e => e.newText === 'soma')).toBe(true);
        });

        it('conta corretamente as ocorrências renomeadas no documento', () => {
            const linhas = ['var x = 0', 'x = x + 1', 'escreva(x)'];
            const doc = criarDocumento(linhas);

            const edits = provideRenameEdits(doc, { line: 0, character: 4 }, 'contador', pastaTemp);
            const edicoesDoc = edits!.changes![doc.uri];
            // "x" aparece em 3 linhas, total 4 vezes (var x, x =, x +, escreva(x))
            expect(edicoesDoc.length).toBeGreaterThanOrEqual(4);
        });

        it('inclui edições em outros arquivos do workspace', () => {
            const arquivoB = path.join(pastaTemp, 'outro.delegua');
            fs.writeFileSync(arquivoB, 'escreva(soma)', 'utf-8');

            const linhas = ['funcao soma() {}'];
            const arquivoA = path.join(pastaTemp, 'modulo.delegua');
            fs.writeFileSync(arquivoA, linhas[0], 'utf-8');

            const doc = criarDocumento(linhas, arquivoA);
            const edits = provideRenameEdits(doc, { line: 0, character: 8 }, 'calcular', pastaTemp);

            expect(edits).toBeDefined();
            const todasUris = Object.keys(edits!.changes!);
            expect(todasUris.some(u => u.includes('outro'))).toBe(true);
        });

        it('retorna undefined para novo nome inválido (começa com número)', () => {
            const doc = criarDocumento(['var x = 1']);
            const edits = provideRenameEdits(doc, { line: 0, character: 4 }, '1invalido', pastaTemp);
            expect(edits).toBeUndefined();
        });

        it('retorna undefined para novo nome inválido (contém espaço)', () => {
            const doc = criarDocumento(['var x = 1']);
            const edits = provideRenameEdits(doc, { line: 0, character: 4 }, 'nome invalido', pastaTemp);
            expect(edits).toBeUndefined();
        });

        it('retorna changes vazio quando novo nome é igual ao atual', () => {
            const doc = criarDocumento(['var x = 1']);
            const edits = provideRenameEdits(doc, { line: 0, character: 4 }, 'x', pastaTemp);
            expect(edits).toBeDefined();
            expect(Object.keys(edits!.changes!)).toHaveLength(0);
        });

        it('retorna undefined quando cursor está em posição sem identificador', () => {
            const doc = criarDocumento(['var x = 1']);
            const edits = provideRenameEdits(doc, { line: 0, character: 7 }, 'novoNome', pastaTemp);
            expect(edits).toBeUndefined();
        });

        it('as edições apontam para os intervalos corretos', () => {
            const linhas = ['var nome = "teste"'];
            const doc = criarDocumento(linhas);

            const edits = provideRenameEdits(doc, { line: 0, character: 4 }, 'apelido', pastaTemp);
            const edicoesDoc = edits!.changes![doc.uri];
            expect(edicoesDoc[0].range.start.character).toBe(4);
            expect(edicoesDoc[0].range.end.character).toBe(8); // "nome" = 4 chars
        });
    });
});
