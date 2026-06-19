import { ResultadoAnaliseInterface } from "../resultado-analise-interface";

export interface EntradaCacheAnaliseInterface {
    resultado: ResultadoAnaliseInterface;
    diagnosticos: any[];
    dependenciasArquivos: string[];
    criadoEm: number;
    expiraEm: number;
    tempoVidaMs: number;
    versaoDocumento?: number;
    hashConteudo?: number;
    motivo?: string;
}
