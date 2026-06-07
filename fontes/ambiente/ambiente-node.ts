import * as fs from 'fs';
import * as path from 'path';

import { AmbienteLSP } from '../interfaces/ambiente-lsp-interface';
import { EntradaDiretorio, SistemaArquivosInterface } from '../interfaces/sistema-arquivos-interface';
import { ManipuladorCaminhosInterface } from '../interfaces/manipulador-caminhos-interface';

/**
 * Único módulo (além de `servidor.ts`) que importa `fs`/`path`. Consumidores
 * que rodam fora do Node.js (ex.: extensões web do VSCode) não devem importar
 * este arquivo — devem fornecer seu próprio `AmbienteLSP`.
 */

function criarSistemaArquivosNode(): SistemaArquivosInterface {
    return {
        async lerArquivoTexto(caminho: string): Promise<string | undefined> {
            try {
                return fs.readFileSync(caminho, 'utf-8');
            } catch {
                return undefined;
            }
        },

        async listarDiretorio(caminho: string): Promise<EntradaDiretorio[]> {
            try {
                return fs.readdirSync(caminho, { withFileTypes: true })
                    .map(entrada => ({ nome: entrada.name, ehDiretorio: entrada.isDirectory() }));
            } catch {
                return [];
            }
        },
    };
}

function criarManipuladorCaminhosNode(): ManipuladorCaminhosInterface {
    return {
        juntar: (...partes: string[]) => path.join(...partes),
        dirname: (caminho: string) => path.dirname(caminho),
        resolver: (base: string, relativo: string) => path.resolve(base, relativo),
        normalizar: (caminho: string) => path.normalize(caminho),
    };
}

export function criarAmbienteNode(): AmbienteLSP {
    return {
        sistemaArquivos: criarSistemaArquivosNode(),
        caminhos: criarManipuladorCaminhosNode(),
    };
}
