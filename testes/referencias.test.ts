import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { provideReferences } from '../fontes/capacidades/referencias';
import { DocumentoLSP } from '../fontes/interfaces/documento-lsp-interface';

function criarDocumentoDeTexto(texto: string, nomeArquivo = 'teste.delegua'): DocumentoLSP {
    const uri = `file:///${nomeArquivo.replace(/\\/g, '/')}`;
    const linhas = texto.split('\n');
    return { uri, nomeArquivo, texto, linhas, versao: 1, languageId: 'delegua' };
}

describe('referencias', () => {
    let pastaTemp: string;

    beforeEach(() => {
        pastaTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'delegua-lsp-test-'));
    });

    afterEach(() => {
        fs.rmSync(pastaTemp, { recursive: true, force: true });
    });

    describe('provideReferences()', () => {
        it('retorna lista vazia quando cursor está em espaço em branco', () => {
            const doc = criarDocumentoDeTexto('var x = 10');
            const refs = provideReferences(doc, { line: 0, character: 3 }, true, pastaTemp);
            expect(refs).toHaveLength(0);
        });

        it('encontra ocorrências no próprio documento (via arquivo temporário)', () => {
            const conteudo = ['var contador = 0', 'contador = contador + 1', 'escreva(contador)'].join('\n');
            const arquivoTemp = path.join(pastaTemp, 'arq.delegua');
            fs.writeFileSync(arquivoTemp, conteudo, 'utf-8');

            const doc = criarDocumentoDeTexto(conteudo, arquivoTemp);
            const refs = provideReferences(doc, { line: 0, character: 4 }, true, pastaTemp);

            // "contador" aparece em 3 linhas
            expect(refs.length).toBeGreaterThanOrEqual(3);
        });

        it('encontra referências em múltiplos arquivos do workspace', () => {
            const arquivo1 = path.join(pastaTemp, 'modulo.delegua');
            const arquivo2 = path.join(pastaTemp, 'principal.delegua');
            fs.writeFileSync(arquivo1, 'funcao soma() {}', 'utf-8');
            fs.writeFileSync(arquivo2, 'var r = soma()', 'utf-8');

            const doc = criarDocumentoDeTexto('funcao soma() {}', arquivo1);
            const refs = provideReferences(doc, { line: 0, character: 8 }, true, pastaTemp);

            const uris = refs.map(r => r.uri);
            expect(uris.some(u => u.includes('principal'))).toBe(true);
        });

        it('retorna referências corretas excluindo declarações quando incluirDeclaracao=false', () => {
            const conteudo = ['funcao minhaFuncao() {}', 'minhaFuncao()'].join('\n');
            const arquivoTemp = path.join(pastaTemp, 'func.delegua');
            fs.writeFileSync(arquivoTemp, conteudo, 'utf-8');

            const doc = criarDocumentoDeTexto(conteudo, arquivoTemp);

            const comDeclaracao = provideReferences(doc, { line: 0, character: 8 }, true, pastaTemp);
            const semDeclaracao = provideReferences(doc, { line: 0, character: 8 }, false, pastaTemp);

            // incluirDeclaracao=true deve retornar >= semDeclaracao
            expect(comDeclaracao.length).toBeGreaterThanOrEqual(semDeclaracao.length);
        });

        it('ignora a pasta node_modules ao varrer workspace', () => {
            const nodeModules = path.join(pastaTemp, 'node_modules');
            fs.mkdirSync(nodeModules);
            fs.writeFileSync(path.join(nodeModules, 'lib.delegua'), 'var x = 1', 'utf-8');

            const conteudo = 'var x = 1';
            const arquivoTemp = path.join(pastaTemp, 'app.delegua');
            fs.writeFileSync(arquivoTemp, conteudo, 'utf-8');

            const doc = criarDocumentoDeTexto(conteudo, arquivoTemp);
            const refs = provideReferences(doc, { line: 0, character: 4 }, true, pastaTemp);

            const uris = refs.map(r => r.uri);
            expect(uris.every(u => !u.includes('node_modules'))).toBe(true);
        });

        it('as posições retornadas apontam para a palavra correta', () => {
            const conteudo = 'var total = 0';
            const arquivoTemp = path.join(pastaTemp, 'pos.delegua');
            fs.writeFileSync(arquivoTemp, conteudo, 'utf-8');

            const doc = criarDocumentoDeTexto(conteudo, arquivoTemp);
            const refs = provideReferences(doc, { line: 0, character: 4 }, true, pastaTemp);

            expect(refs.length).toBeGreaterThan(0);
            const primeiraRef = refs[0];
            expect(primeiraRef.range.start.line).toBe(0);
            // "total" começa na coluna 4
            expect(primeiraRef.range.start.character).toBe(4);
            expect(primeiraRef.range.end.character).toBe(9); // "total" tem 5 caracteres
        });
    });
});
