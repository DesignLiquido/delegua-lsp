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
