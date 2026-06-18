import { AmbienteLSP } from '../interfaces/ambiente-lsp-interface';

/**
 * Converte um caminho de arquivo para uma URI `file://`.
 */
export function caminhoParaUri(caminho: string): string {
    const normalizado = caminho.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, letra) => letra.toLowerCase() + ':');
    return normalizado.startsWith('/') ? `file://${normalizado}` : `file:///${normalizado}`;
}

/**
 * Varre recursivamente um diretório do workspace em busca de arquivos com as
 * extensões informadas, ignorando `node_modules` e diretórios ocultos.
 */
export async function varrerArquivosWorkspace(
    ambiente: AmbienteLSP,
    pastaRaiz: string,
    extensoes: string[]
): Promise<string[]> {
    const arquivos: string[] = [];

    async function varrer(diretorio: string): Promise<void> {
        const entradas = await ambiente.sistemaArquivos.listarDiretorio(diretorio);

        for (const entrada of entradas) {
            if (entrada.nome === 'node_modules' || entrada.nome.startsWith('.')) {
                continue;
            }
            const caminhoCompleto = ambiente.caminhos.juntar(diretorio, entrada.nome);
            if (entrada.ehDiretorio) {
                await varrer(caminhoCompleto);
            } else if (extensoes.some(ext => entrada.nome.endsWith(`.${ext}`))) {
                arquivos.push(caminhoCompleto);
            }
        }
    }

    await varrer(pastaRaiz);
    return arquivos;
}
