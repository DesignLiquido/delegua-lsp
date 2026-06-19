import { FuncaoNativaOuMetodoPrimitiva } from "./tipos";

const parametrosTodasPrimitivas = [
    {
        nome: 'requisicao',
        documentacao: 'Dados da requisição, providos por Liquido.'
    },
    {
        nome: 'resposta',
        documentacao: 'Dados a serem retornados como resposta à requisição.'
    }
];

export const primitivasMetodosLiquido: FuncaoNativaOuMetodoPrimitiva[] = [
    {
        nome: 'rotaGet',
        assinaturas: [
            {
                formato: 'rotaGet(requisicao, resposta)',
                parametros: parametrosTodasPrimitivas
            }
        ],
        documentacao: '# `liquido.rotaGet(requisicao, resposta)`\n\n' +
            'Especifica uma rota GET, normalmente uma rota somente leitura, com parâmetros de pesquisa.',
        exemploCodigo: 'liquido.rotaGet(requisicao, resposta) { ... }'
    },
    {
        nome: 'rotaPost',
        assinaturas: [
            {
                formato: 'rotaPost(requisicao, resposta)',
                parametros: parametrosTodasPrimitivas
            }
        ],
        documentacao: '# `liquido.rotaPost(requisicao, resposta)`\n\n' +
            'Especifica uma rota POST, normalmente uma rota para inclusão de dados.',
        exemploCodigo: 'liquido.rotaPost(requisicao, resposta) { ... }'
    },
    {
        nome: 'rotaPut',
        assinaturas: [
            {
                formato: 'rotaPut(requisicao, resposta)',
                parametros: parametrosTodasPrimitivas
            }
        ],
        documentacao: '# `liquido.rotaPut(requisicao, resposta)`\n\n' +
            'Especifica uma rota PUT, normalmente usada para atualização completa de um recurso.',
        exemploCodigo: 'liquido.rotaPut(requisicao, resposta) { ... }'
    },
    {
        nome: 'rotaPatch',
        assinaturas: [
            {
                formato: 'rotaPatch(requisicao, resposta)',
                parametros: parametrosTodasPrimitivas
            }
        ],
        documentacao: '# `liquido.rotaPatch(requisicao, resposta)`\n\n' +
            'Especifica uma rota PATCH, normalmente usada para atualização parcial de um recurso.',
        exemploCodigo: 'liquido.rotaPatch(requisicao, resposta) { ... }'
    },
    {
        nome: 'rotaDelete',
        assinaturas: [
            {
                formato: 'rotaDelete(requisicao, resposta)',
                parametros: parametrosTodasPrimitivas
            }
        ],
        documentacao: '# `liquido.rotaDelete(requisicao, resposta)`\n\n' +
            'Especifica uma rota DELETE, usada para exclusão de um recurso.',
        exemploCodigo: 'liquido.rotaDelete(requisicao, resposta) { ... }'
    },
    {
        nome: 'rotaOptions',
        assinaturas: [
            {
                formato: 'rotaOptions(requisicao, resposta)',
                parametros: parametrosTodasPrimitivas
            }
        ],
        documentacao: '# `liquido.rotaOptions(requisicao, resposta)`\n\n' +
            'Especifica uma rota OPTIONS, usada para informar quais métodos HTTP são permitidos no caminho, frequentemente utilizada em requisições de pré-verificação CORS.',
        exemploCodigo: 'liquido.rotaOptions(requisicao, resposta) { ... }'
    },
    {
        nome: 'rotaCopy',
        assinaturas: [
            {
                formato: 'rotaCopy(requisicao, resposta)',
                parametros: parametrosTodasPrimitivas
            }
        ],
        documentacao: '# `liquido.rotaCopy(requisicao, resposta)`\n\n' +
            'Especifica uma rota COPY (WebDAV), usada para copiar um recurso de um local para outro.',
        exemploCodigo: 'liquido.rotaCopy(requisicao, resposta) { ... }'
    },
    {
        nome: 'rotaHead',
        assinaturas: [
            {
                formato: 'rotaHead(requisicao, resposta)',
                parametros: parametrosTodasPrimitivas
            }
        ],
        documentacao: '# `liquido.rotaHead(requisicao, resposta)`\n\n' +
            'Especifica uma rota HEAD, semelhante à rota GET, mas retorna apenas os cabeçalhos da resposta sem o corpo.',
        exemploCodigo: 'liquido.rotaHead(requisicao, resposta) { ... }'
    },
    {
        nome: 'rotaLock',
        assinaturas: [
            {
                formato: 'rotaLock(requisicao, resposta)',
                parametros: parametrosTodasPrimitivas
            }
        ],
        documentacao: '# `liquido.rotaLock(requisicao, resposta)`\n\n' +
            'Especifica uma rota LOCK (WebDAV), usada para bloquear um recurso contra modificações concorrentes.',
        exemploCodigo: 'liquido.rotaLock(requisicao, resposta) { ... }'
    },
    {
        nome: 'rotaUnlock',
        assinaturas: [
            {
                formato: 'rotaUnlock(requisicao, resposta)',
                parametros: parametrosTodasPrimitivas
            }
        ],
        documentacao: '# `liquido.rotaUnlock(requisicao, resposta)`\n\n' +
            'Especifica uma rota UNLOCK (WebDAV), usada para remover o bloqueio de um recurso.',
        exemploCodigo: 'liquido.rotaUnlock(requisicao, resposta) { ... }'
    },
    {
        nome: 'rotaPurge',
        assinaturas: [
            {
                formato: 'rotaPurge(requisicao, resposta)',
                parametros: parametrosTodasPrimitivas
            }
        ],
        documentacao: '# `liquido.rotaPurge(requisicao, resposta)`\n\n' +
            'Especifica uma rota PURGE, usada para invalidar o cache de um recurso em servidores de cache como Varnish.',
        exemploCodigo: 'liquido.rotaPurge(requisicao, resposta) { ... }'
    },
    {
        nome: 'rotaPropfind',
        assinaturas: [
            {
                formato: 'rotaPropfind(requisicao, resposta)',
                parametros: parametrosTodasPrimitivas
            }
        ],
        documentacao: '# `liquido.rotaPropfind(requisicao, resposta)`\n\n' +
            'Especifica uma rota PROPFIND (WebDAV), usada para recuperar propriedades de um recurso ou coleção.',
        exemploCodigo: 'liquido.rotaPropfind(requisicao, resposta) { ... }'
    }
];

export const objetosEmRotaLiquido: FuncaoNativaOuMetodoPrimitiva[] = [
    {
        nome: 'requisicao',
        assinaturas: [{ formato: 'requisicao', parametros: parametrosTodasPrimitivas }],
        documentacao: '# Objeto `requisicao`\n\nRepresenta todos os dados já conhecidos da requisição.',
        exemploCodigo: 'requisicao.parametros\nrequisicao.corpo'
    },
    {
        nome: 'resposta',
        assinaturas: [{ formato: 'resposta', parametros: parametrosTodasPrimitivas }],
        documentacao: '# Objeto `resposta`\n\nRepresenta todos os dados a serem usados para responder à requisição.',
        exemploCodigo: 'resposta.enviar("Esta é uma resposta por texto")\nresposta.status(200)'
    }
];
