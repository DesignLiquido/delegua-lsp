import * as sistemaArquivos from 'fs';
import * as caminho from 'path';

import { AmbienteLSPInterface } from '../interfaces/ambiente-lsp-interface';
import { EntradaDiretorioInterface, SistemaArquivosInterface } from '../interfaces';
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
                return sistemaArquivos.readFileSync(caminho, 'utf-8');
            } catch {
                return undefined;
            }
        },

        async listarDiretorio(caminho: string): Promise<EntradaDiretorioInterface[]> {
            try {
                return sistemaArquivos.readdirSync(caminho, { withFileTypes: true })
                    .map(entrada => ({ nome: entrada.name, ehDiretorio: entrada.isDirectory() }));
            } catch {
                return [];
            }
        },
    };
}

function criarManipuladorCaminhosNode(): ManipuladorCaminhosInterface {
    return {
        juntar: (...partes: string[]) => caminho.join(...partes),
        dirname: (caminhoParam: string) => caminho.dirname(caminhoParam),
        resolver: (base: string, relativo: string) => caminho.resolve(base, relativo),
        normalizar: (caminhoParam: string) => caminho.normalize(caminhoParam),
    };
}

export function criarAmbienteNode(): AmbienteLSPInterface {
    return {
        sistemaArquivos: criarSistemaArquivosNode(),
        caminhos: criarManipuladorCaminhosNode(),
    };
}
