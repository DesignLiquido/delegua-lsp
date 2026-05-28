import { Declaracao } from "@designliquido/delegua";
import { RetornoAnalisadorSemanticoInterface, RetornoAvaliadorSintaticoInterface, RetornoLexadorInterface, SimboloInterface } from "@designliquido/delegua/interfaces";

export interface ResultadoAnaliseInterface {
    lexador: RetornoLexadorInterface<SimboloInterface>;
    avaliadorSintatico: RetornoAvaliadorSintaticoInterface<Declaracao>;
    analisadorSemantico: RetornoAnalisadorSemanticoInterface;
    declaracoesPreCarregadas?: any[];
}
