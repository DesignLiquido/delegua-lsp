import { ManipuladorCaminhosInterface } from './manipulador-caminhos-interface';
import { SistemaArquivosInterface } from './sistema-arquivos-interface';

/**
 * Conjunto de APIs específicas do ambiente de execução (Node.js, extensão web
 * do VSCode, testes, etc.) injetado nas capacidades do servidor durante a
 * inicialização. Permite que `delegua-lsp` funcione fora de um processo Node
 * sem importar diretamente módulos nativos como `fs`/`path`.
 */
export interface AmbienteLSP {
    sistemaArquivos: SistemaArquivosInterface;
    caminhos: ManipuladorCaminhosInterface;
}
