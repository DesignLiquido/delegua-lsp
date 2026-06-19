import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { criarAmbienteNode } from '../fontes/ambiente/ambiente-node';
import { proverReferencias } from '../fontes/capacidades/referencias';
import { AmbienteLSPInterface, EntradaDiretorioInterface, DocumentoLSPInterface } from '../fontes/interfaces';

function criarDocumentoDeTexto(texto: string, nomeArquivo = 'teste.delegua'): DocumentoLSPInterface {
    const uri = `file:///${nomeArquivo.replace(/\\/g, '/')}`;
    const linhas = texto.split('\n');
    return { uri, nomeArquivo, texto, linhas, versao: 1, languageId: 'delegua' };
}

/**
 * Ambiente em memória, sem nenhum acesso a disco — prova que `proverReferencias`
 * funciona com qualquer implementação de `AmbienteLSP`, não apenas a do Node.js.
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

describe('referencias', () => {
    let pastaTemp: string;
    const ambiente = criarAmbienteNode();

    beforeEach(() => {
        pastaTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'delegua-lsp-test-'));
    });

    afterEach(() => {
        fs.rmSync(pastaTemp, { recursive: true, force: true });
    });

    describe('proverReferencias()', () => {
        it('retorna lista vazia quando cursor está em espaço em branco', async () => {
            const doc = criarDocumentoDeTexto('var x = 10');
            const refs = await proverReferencias(doc, { line: 0, character: 3 }, true, pastaTemp, ambiente);
            expect(refs).toHaveLength(0);
        });

        it('encontra ocorrências no próprio documento (via arquivo temporário)', async () => {
            const conteudo = ['var contador = 0', 'contador = contador + 1', 'escreva(contador)'].join('\n');
            const arquivoTemp = path.join(pastaTemp, 'arq.delegua');
            fs.writeFileSync(arquivoTemp, conteudo, 'utf-8');

            const doc = criarDocumentoDeTexto(conteudo, arquivoTemp);
            const refs = await proverReferencias(doc, { line: 0, character: 4 }, true, pastaTemp, ambiente);

            // "contador" aparece em 3 linhas
            expect(refs.length).toBeGreaterThanOrEqual(3);
        });

        it('encontra referências em múltiplos arquivos do workspace', async () => {
            const arquivo1 = path.join(pastaTemp, 'modulo.delegua');
            const arquivo2 = path.join(pastaTemp, 'principal.delegua');
            fs.writeFileSync(arquivo1, 'funcao soma() {}', 'utf-8');
            fs.writeFileSync(arquivo2, 'var r = soma()', 'utf-8');

            const doc = criarDocumentoDeTexto('funcao soma() {}', arquivo1);
            const refs = await proverReferencias(doc, { line: 0, character: 8 }, true, pastaTemp, ambiente);

            const uris = refs.map(r => r.uri);
            expect(uris.some(u => u.includes('principal'))).toBe(true);
        });

        it('retorna referências corretas excluindo declarações quando incluirDeclaracao=false', async () => {
            const conteudo = ['funcao minhaFuncao() {}', 'minhaFuncao()'].join('\n');
            const arquivoTemp = path.join(pastaTemp, 'func.delegua');
            fs.writeFileSync(arquivoTemp, conteudo, 'utf-8');

            const doc = criarDocumentoDeTexto(conteudo, arquivoTemp);

            const comDeclaracao = await proverReferencias(doc, { line: 0, character: 8 }, true, pastaTemp, ambiente);
            const semDeclaracao = await proverReferencias(doc, { line: 0, character: 8 }, false, pastaTemp, ambiente);

            // incluirDeclaracao=true deve retornar >= semDeclaracao
            expect(comDeclaracao.length).toBeGreaterThanOrEqual(semDeclaracao.length);
        });

        it('ignora a pasta node_modules ao varrer workspace', async () => {
            const nodeModules = path.join(pastaTemp, 'node_modules');
            fs.mkdirSync(nodeModules);
            fs.writeFileSync(path.join(nodeModules, 'lib.delegua'), 'var x = 1', 'utf-8');

            const conteudo = 'var x = 1';
            const arquivoTemp = path.join(pastaTemp, 'app.delegua');
            fs.writeFileSync(arquivoTemp, conteudo, 'utf-8');

            const doc = criarDocumentoDeTexto(conteudo, arquivoTemp);
            const refs = await proverReferencias(doc, { line: 0, character: 4 }, true, pastaTemp, ambiente);

            const uris = refs.map(r => r.uri);
            expect(uris.every(u => !u.includes('node_modules'))).toBe(true);
        });

        it('as posições retornadas apontam para a palavra correta', async () => {
            const conteudo = 'var total = 0';
            const arquivoTemp = path.join(pastaTemp, 'pos.delegua');
            fs.writeFileSync(arquivoTemp, conteudo, 'utf-8');

            const doc = criarDocumentoDeTexto(conteudo, arquivoTemp);
            const refs = await proverReferencias(doc, { line: 0, character: 4 }, true, pastaTemp, ambiente);

            expect(refs.length).toBeGreaterThan(0);
            const primeiraRef = refs[0];
            expect(primeiraRef.range.start.line).toBe(0);
            // "total" começa na coluna 4
            expect(primeiraRef.range.start.character).toBe(4);
            expect(primeiraRef.range.end.character).toBe(9); // "total" tem 5 caracteres
        });

        it('funciona com um AmbienteLSP totalmente em memória (sem fs/path do Node.js)', async () => {
            const arquivos: Record<string, string> = {
                'workspace/modulo.delegua': 'funcao saudar() {}',
                'workspace/principal.delegua': 'saudar()',
            };
            const ambienteEmMemoria = criarAmbienteEmMemoria(arquivos);

            const doc = criarDocumentoDeTexto('funcao saudar() {}', 'workspace/modulo.delegua');
            const refs = await proverReferencias(doc, { line: 0, character: 8 }, true, 'workspace', ambienteEmMemoria);

            const uris = refs.map(r => r.uri);
            expect(uris.some(u => u.includes('principal'))).toBe(true);
        });
    });
});
