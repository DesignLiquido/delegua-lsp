import { Declaracao } from "@designliquido/delegua/declaracoes";

export interface EntradaCacheDefinicoesInterface {
    definicoes: { [nomeTipo: string]: Declaracao };
    criadoEm: number;
    expiraEm: number;
    tempoVidaMs: number;
    motivo?: string;
}
