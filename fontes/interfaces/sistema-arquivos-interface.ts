import { EntradaDiretorioInterface } from "./entrada-diretorio-interface";

/**
 * Acesso a arquivos e diretórios, fornecido pelo ambiente de execução.
 * Assíncrona porque a única API de sistema de arquivos disponível em uma
 * extensão web do VSCode (`vscode.workspace.fs`) é assíncrona — uma interface
 * síncrona não poderia ser implementada honestamente em um navegador.
 */
export interface SistemaArquivosInterface {
    /** Lê o conteúdo de um arquivo como texto UTF-8. `undefined` em caso de falha. */
    lerArquivoTexto(caminho: string): Promise<string | undefined>;
    /** Lista as entradas de um diretório. `[]` em caso de falha. */
    listarDiretorio(caminho: string): Promise<EntradaDiretorioInterface[]>;
}
