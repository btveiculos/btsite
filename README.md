# BT Veículos Jundiaí

Site da loja: https://btveiculosjundiai.com.br

Site estático (HTML, CSS e JavaScript sem framework e sem etapa de build), publicado pelo
GitHub Pages a partir da branch `main`. Visitas, cliques e a edição do estoque passam por
um servidor pequeno no Cloudflare (Worker + banco D1), na pasta `api/`.

## Estrutura

```
index.html          página inicial
estoque.html        estoque completo com filtros
admin.html          painel da loja (não aparece no site; bloqueado no robots.txt)
404.html            página de endereço inexistente

css/site.css        visual do site
css/painel.css      visual do painel

js/data.js          estoque (gerado pelo painel; pode ser editado à mão com cuidado)
js/config.js        endereço do servidor (BT_API)
js/track.js         contagem anônima de visitas e cliques
js/comum.js         cabeçalho, WhatsApp, card do carro e janela de detalhes
js/app.js           página inicial
js/estoque.js       filtros do estoque
js/painel.js        painel

carros/             fotos dos veículos
img/                foto da loja (loja.jpg), prévia para redes sociais (og.jpg)
api/                servidor no Cloudflare
```

As páginas carregam os scripts nesta ordem: `config.js → track.js → data.js → comum.js →
app.js` (ou `estoque.js`). O `data.js` vai com `?v=<horário>` para o estoque nunca ficar
preso no cache.

## Estoque

O dia a dia é pelo painel: `https://btveiculosjundiai.com.br/admin.html`.

- **Visão geral**: visitas, pessoas diferentes, cliques em veículos e no WhatsApp, origem
  das visitas, aparelho e horários.
- **Veículos**: desempenho de cada carro (aberturas, chamadas no WhatsApp, taxa de contato).
- **Estoque**: adicionar, editar, remover, marcar destaque e enviar fotos. As alterações
  ficam pendentes até clicar em **Publicar no site**, que grava `js/data.js` e as fotos em
  um único commit. O GitHub Pages atualiza em cerca de 1 minuto.

Formato de cada veículo em `js/data.js`:

```js
{
  "id": 1, "destaque": false,
  "marca": "Volkswagen", "modelo": "Voyage", "versao": "1.0 Flex 12V 4P G Completo",
  "ano": 2022, "anoModelo": 2023, "km": 177500, "preco": 59900,
  "uso": "seminovo", "cambio": "manual", "combustivel": "Flex", "cor": "Preto",
  "img": "/carros/arquivo-1.jpg",
  "opcionais": ["Ar-condicionado"], "desc": "Texto livre.",
  "fotos": ["/carros/arquivo-1.jpg", "/carros/arquivo-2.jpg"]
}
```

`img` é a capa (a primeira foto). O número do WhatsApp fica na primeira linha do `data.js`
(`const WHATSAPP = '5511993662724'`) e é usado em todos os botões do site.

## Google Tag Manager

Contêiner `GTM-WPXH76C2`, carregado pelo domínio do Stape (`stape.btveiculosjundiai.com.br`)
em `index.html`, `estoque.html` e `404.html` (o painel fica de fora). O `js/track.js` envia
para o `dataLayer`:

| Evento | Quando | Campos |
| --- | --- | --- |
| `ver_veiculo` | abriu os detalhes de um carro | `veiculo_id`, `veiculo_nome` |
| `clique_whatsapp` | clicou em qualquer botão de WhatsApp ou enviou os formulários | `botao`, `veiculo_id`, `veiculo_nome` |

Valores de `botao`: `detalhes-veiculo`, `topo-do-site`, `menu-topo`, `menu-celular`,
`botao-flutuante`, `como-chegar`, `form-financiamento`, `form-troca`.

## Rodar no computador

```bash
python -m http.server 8791
```

Abrir http://localhost:8791. Visitas feitas em `localhost` não entram na contagem.

Para testar o painel com um servidor local e dados de teste:

```bash
cd api
npm install
npm run db:local
npm run dev
```

Criar `api/.dev.vars` (não vai para o Git) com:

```
ADMIN_PASSWORD=uma-senha-de-teste
SESSION_SECRET=qualquer-texto-longo
DRY_RUN=1
```

e abrir http://localhost:8791/admin.html?api=http://localhost:8787. Com `DRY_RUN=1` o botão
de publicar só simula, sem gravar no GitHub.

## Servidor (api/)

Cloudflare Worker `bt-veiculos-api` com banco D1 `bt-veiculos`. Endereço atual em
`js/config.js`.

| Rota | Uso |
| --- | --- |
| `POST /e` | evento do site: visita, página, clique em carro, clique no WhatsApp |
| `POST /admin/login` | senha do painel, devolve sessão de 12 h |
| `GET /admin/stats?dias=N` | números do painel |
| `GET /admin/stock` | estoque atual lido do GitHub |
| `POST /admin/publish` | grava estoque e fotos no GitHub em um commit |

Segredos (ficam só no Cloudflare, nunca no código):

- `ADMIN_PASSWORD`: senha do painel
- `SESSION_SECRET`: chave que assina as sessões; trocar derruba todas as sessões abertas
- `GITHUB_TOKEN`: token fine-grained com acesso só a este repositório, permissão
  *Contents: Read and write*

```bash
cd api
npx wrangler login
npx wrangler secret put ADMIN_PASSWORD      # trocar a senha do painel
npx wrangler deploy                         # publicar mudanças em api/src/index.js
npx wrangler d1 execute bt-veiculos --remote --command "SELECT COUNT(*) FROM events"
```

A contagem própria não guarda nome, telefone nem IP: cada navegador recebe um código aleatório
(`localStorage`) e o servidor ignora robôs e prévias de link.

## Publicar mudanças no site

Qualquer push na `main` publica o site pelo GitHub Pages. O domínio está no arquivo `CNAME`.
Ao mudar `css/site.css` ou `css/painel.css`, atualizar o `?v=` no `<link>` das páginas para
o navegador não usar a versão antiga.
