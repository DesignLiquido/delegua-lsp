import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    InitializeResult,
    TextDocumentSyncKind,
    CompletionParams,
    DefinitionParams,
    DocumentFormattingParams,
    HoverParams,
    ReferenceParams,
    RenameParams,
    PrepareRenameParams,
    WorkspaceFolder,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { criarAmbienteNode } from './ambiente/ambiente-node';
import { executarAnalises } from './analisador';
import {
    proverItensCompletude,
    proverDefinicao,
    proverFormatacao,
    proverDocumentacaoEmCodigo,
    proverReferencias,
    prepareRename,
    provideRenameEdits,
} from './capacidades';
import { DocumentoLSPInterface } from './interfaces/documento-lsp-interface';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
const ambiente = criarAmbienteNode();

let pastaWorkspace = '';

function obterPastaWorkspace(pastas: WorkspaceFolder[] | null | undefined): string {
    if (!pastas || pastas.length === 0) return '';
    const uriPasta = pastas[0].uri;
    // Remove o prefixo file:/// ou file://
    return uriPasta.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '').replace(/%3A/gi, ':');
}

function textDocumentParaDocumentoLSP(doc: TextDocument): DocumentoLSPInterface {
    const texto = doc.getText();
    const linhas = texto.split('\n');
    return {
        uri: doc.uri,
        nomeArquivo: doc.uri.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '').replace(/%3A/gi, ':'),
        texto,
        linhas,
        versao: doc.version,
        languageId: doc.languageId,
    };
}

connection.onInitialize((params: InitializeParams): InitializeResult => {
    pastaWorkspace = obterPastaWorkspace(params.workspaceFolders);

    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            completionProvider: {
                triggerCharacters: ['.', '@'],
                resolveProvider: false,
            },
            definitionProvider: true,
            documentFormattingProvider: true,
            hoverProvider: true,
            referencesProvider: true,
            renameProvider: {
                prepareProvider: true,
            },
        },
    };
});

documents.onDidChangeContent(async (change) => {
    const documento = textDocumentParaDocumentoLSP(change.document);
    const diagnosticos = await executarAnalises(documento, pastaWorkspace);
    connection.sendDiagnostics({ uri: documento.uri, diagnostics: diagnosticos });
});

connection.onCompletion((params: CompletionParams) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];

    const documento = textDocumentParaDocumentoLSP(doc);
    return proverItensCompletude(documento, params.position);
});

connection.onDefinition((params: DefinitionParams) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return undefined;

    const documento = textDocumentParaDocumentoLSP(doc);
    return proverDefinicao(documento, params.position, ambiente) ?? null;
});

connection.onDocumentFormatting(async (params: DocumentFormattingParams) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;

    const documento = textDocumentParaDocumentoLSP(doc);
    return await proverFormatacao(documento) ?? null;
});

connection.onHover((params: HoverParams) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;

    const documento = textDocumentParaDocumentoLSP(doc);
    return proverDocumentacaoEmCodigo(documento, params.position) ?? null;
});

connection.onReferences(async (params: ReferenceParams) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return [];

    const documento = textDocumentParaDocumentoLSP(doc);
    return proverReferencias(
        documento,
        params.position,
        params.context.includeDeclaration,
        pastaWorkspace,
        ambiente
    );
});

connection.onPrepareRename((params: PrepareRenameParams) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;

    const documento = textDocumentParaDocumentoLSP(doc);
    return prepareRename(documento, params.position) ?? null;
});

connection.onRenameRequest(async (params: RenameParams) => {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return null;

    const documento = textDocumentParaDocumentoLSP(doc);
    return (await provideRenameEdits(documento, params.position, params.newName, pastaWorkspace, ambiente)) ?? null;
});

documents.listen(connection);
connection.listen();
