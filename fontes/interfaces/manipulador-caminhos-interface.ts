/**
 * Manipulação de caminhos de arquivos, fornecida pelo ambiente de execução.
 * Mantida como interface (em vez de uma reimplementação portável) porque
 * resolução de `..`/`.`/letras de unidade é exatamente o tipo de lógica que
 * a implementação nativa de cada ambiente já resolve corretamente — e o lado
 * que conhece suas próprias convenções de caminho (ex.: `vscode.Uri` em
 * extensões web) é quem deve decidir a estratégia certa.
 */
export interface ManipuladorCaminhosInterface {
    juntar(...partes: string[]): string;
    dirname(caminho: string): string;
    resolver(base: string, relativo: string): string;
    normalizar(caminho: string): string;
}
