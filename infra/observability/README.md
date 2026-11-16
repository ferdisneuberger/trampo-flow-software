# Observabilidade do Trampo Flow (Prometheus e Grafana)

A API e o MCP expõem métricas do Prometheus em **portas internas próprias** (`9464` e `9465`), fora do ingress. Esta pasta traz tudo para ligar isso ao Prometheus e ao Grafana que você já tem na VPS: o **dashboard**, os **17 alertas por e-mail**, a rede dedicada e o trecho de raspagem.

| Arquivo                                    | O que é                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `grafana/trampo-flow-dashboard.json`       | Dashboard para **importar** no Grafana (79 painéis, 8 seções)           |
| `grafana/trampo-flow-alert-rules.json`     | Os 17 alertas (provisionamento do Grafana)                              |
| `apply-alert-rules.mjs`                    | Aplica os alertas pela API do Grafana (sem montar arquivo no container) |
| `docker-compose.monitoring.yml`            | Coloca a `api` e o `mcp` na rede `monitoring`                           |
| `prometheus-scrape.yml`                    | Trecho do `prometheus.yml`                                              |
| `build.mjs`, `dashboard.mjs`, `alerts.mjs` | Geradores (fonte única do dashboard e dos alertas)                      |

## 1. Rede dedicada (na VPS)

O Prometheus **não está** na rede `edge`, e a `edge` é compartilhada com outros apps, então as métricas ganham uma rede só delas:

```bash
docker network create monitoring
```

Inclua o arquivo da rede nos comandos do compose do trampo-flow (o `deploy-app.sh` precisa dele também; veja a seção 6):

```bash
docker compose -f docker-compose.yml -f docker-compose.edge.yml \
               -f infra/observability/docker-compose.monitoring.yml up -d
```

No projeto `neuberger-infra`, o container do Prometheus também entra na rede `monitoring`:

```yaml
services:
  prometheus:
    networks: [<as redes atuais>, monitoring]
networks:
  monitoring:
    external: true
```

## 2. Raspagem

Acrescente o conteúdo de `prometheus-scrape.yml` em `scrape_configs:` do `prometheus.yml` e recarregue (`docker exec neuberger-infra-prometheus-1 kill -HUP 1`, ou reinicie o container). Confira em `http://<prometheus>/targets`: os alvos `trampo-flow-api` e `trampo-flow-mcp` devem estar **UP**.

Se a rede `monitoring` for compartilhada com mais alguém, defina `METRICS_BEARER_TOKEN` no `.env` do trampo-flow e use o mesmo valor em `authorization:` no trecho.

## 3. Importar o dashboard

No Grafana: **Dashboards → New → Import → Upload JSON file** → `grafana/trampo-flow-dashboard.json`. Escolha a pasta e confirme. O dashboard usa a variável **Prometheus** (no topo): selecione a sua fonte de dados.

Seções: visão geral, requisições HTTP, **produto e uso** (usuários ativos, funil de ativação, candidaturas por status e canal, de onde vêm as vagas, transições), **segurança**, **OAuth e MCP** (funil de conexão, ferramentas, agentes), preenchimento pelo link, e-mail, banco e processos.

## 4. Alertas por e-mail

Os alertas são do Grafana (não do Prometheus) e vão para um **ponto de contato de e-mail**. Você precisa de dois dados:

- o **UID da fonte de dados Prometheus** (Grafana → Connections → Data sources → a fonte → o UID está no final da URL);
- o **nome do ponto de contato de e-mail** que você já usa nos outros alertas (Alerting → Contact points).

Gere os arquivos com os seus valores:

```bash
node infra/observability/build.mjs --datasource-uid <UID> --contact-point "<nome do ponto de contato>"
```

Depois aplique **de um dos dois jeitos**:

**a) Pela API (não exige montar arquivo).** Crie um token de service account com papel Editor (Administration → Users and access → Service accounts) e rode:

```bash
GRAFANA_URL=https://<seu-grafana> GRAFANA_TOKEN=<token> node infra/observability/apply-alert-rules.mjs
```

É idempotente: roda de novo para atualizar, e substitui só o grupo `trampo-flow` (pasta "Trampo Flow"). As regras ficam editáveis pela interface.

**b) Por arquivo.** Monte `grafana/trampo-flow-alert-rules.json` em `/etc/grafana/provisioning/alerting/` do container do Grafana e reinicie-o. As regras ficam somente leitura na interface.

Se ainda **não tem** ponto de contato de e-mail, gere um junto (e use o mesmo nome):

```bash
node infra/observability/build.mjs --datasource-uid <UID> --contact-point trampo-flow-email --email voce@exemplo.com
```

e monte também `grafana/trampo-flow-contact-point.json` em `/etc/grafana/provisioning/alerting/`. O envio de e-mail depende do SMTP do próprio Grafana (`GF_SMTP_*`), que você já usa nos alertas atuais.

### Os 17 alertas

| Alerta                               | Condição (ponto de partida)                            | Gravidade |
| ------------------------------------ | ------------------------------------------------------ | --------- |
| API fora do ar                       | alvo `trampo-flow-api` fora por 2 min (ou sem dados)   | crítica   |
| MCP fora do ar                       | alvo `trampo-flow-mcp` fora por 2 min (ou sem dados)   | alta      |
| Banco fora                           | `trampo_db_up` = 0 por 1 min                           | crítica   |
| Erros 5xx                            | > 2% e pelo menos 3 erros em 5 min                     | alta      |
| Latência                             | p95 de uma rota > 1 s por 10 min (mín. 10 requisições) | média     |
| **Sessão reutilizada**               | qualquer refresh de sessão reutilizado em 10 min       | alta      |
| **Código/refresh OAuth reutilizado** | qualquer reuso em 10 min                               | alta      |
| Força bruta                          | > 30 logins com senha errada em 5 min                  | média     |
| Login travado                        | o limitador global de login travou                     | média     |
| Pico de cadastros                    | > 20 cadastros em 1 h                                  | média     |
| E-mail falhando                      | > 3 falhas de envio em 15 min                          | alta      |
| Preenchimento pelo link degradado    | > 70% sem dados em 1 h (mín. 10 tentativas)            | baixa     |
| Ferramentas do MCP com erros         | > 20% de erro em 15 min (mín. 5 chamadas)              | média     |
| Fluxo OAuth não conecta              | > 50% de erro no `/oauth/token` em 15 min (mín. 5)     | média     |
| Estoques de negócio parados          | sem atualização há mais de 5 min                       | média     |
| Limpeza do OAuth parada              | sem sucesso há mais de 2 h (só com OAuth ligado)       | média     |
| Event loop saturado                  | p99 > 200 ms por 5 min                                 | média     |

Os limiares consideram o baixo tráfego do projeto (várias condições exigem um mínimo de eventos antes de comparar uma proporção). Ajuste em `alerts.mjs` e gere de novo.

## 5. Manter em dia

`dashboard.mjs` e `alerts.mjs` são a fonte; os JSONs em `grafana/` são gerados (com valores de exemplo para a fonte de dados e o ponto de contato). O CI confere que eles estão em dia (`node infra/observability/build.mjs --check`). Ao mudar uma métrica ou um painel, rode `node infra/observability/build.mjs`, versione o resultado e importe o dashboard de novo (mesmo `uid`: ele atualiza o existente).

## 6. Deploy

O `deploy-app.sh trampo-flow` (do `neuberger-infra`) usa `APP_COMPOSE=(-f docker-compose.yml -f docker-compose.edge.yml)`. Acrescente o terceiro arquivo nessa lista para a `api` e o `mcp` não perderem a rede `monitoring` a cada deploy. As variáveis novas (`METRICS_*`, `BUSINESS_GAUGES_INTERVAL_SECONDS`, `MCP_METRICS_PORT`) têm padrão e não precisam ir no `.env`.

## Referência rápida das métricas

Prefixo `trampo_` (API) e `trampo_mcp_` (MCP); métricas padrão do Node mantêm os nomes da comunidade (`process_*`, `nodejs_*`). Rótulos sempre de listas fechadas: nunca e-mail, IP, token, id, texto livre, nome de empresa ou URL.

- **HTTP:** `trampo_http_requests_total{method,route,status,auth}`, `..._duration_seconds`, `..._in_flight`, `..._request_size_bytes`.
- **Estoques (calculados no banco a cada 60 s):** `trampo_users`, `trampo_users_active`, `trampo_users_funnel`, `trampo_users_with_applications`, `trampo_applications`, `trampo_applications_stale`, `trampo_pat_active`, `trampo_oauth_grants_active`, `trampo_oauth_clients`.
- **Eventos:** `trampo_applications_created_total`, `..._transitions_total`, `trampo_auth_*`, `trampo_pat_events_total`, `trampo_rate_limit_hits_total`, `trampo_job_preview_*`, `trampo_mail_*`, `trampo_oauth_*`, `trampo_db_*`.
- **MCP:** `trampo_mcp_http_requests_total`, `..._tool_calls_total`, `..._auth_challenges_total`, `..._token_kind_total`, `..._client_requests_total`, `..._upstream_requests_total`.
