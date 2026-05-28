import { CompletionItemKind } from 'vscode-languageserver-types';

export interface PropriedadeParametro {
    nome: string;
    tipo: string;
    documentacao: string;
    tipoCompletude?: CompletionItemKind;
    propriedadesAninhadas?: PropriedadeParametro[];
}
