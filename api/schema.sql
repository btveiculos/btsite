-- Eventos do site: uma linha por visita, página vista ou clique.
-- vid é um identificador aleatório gerado no navegador (sem IP, sem dado pessoal).
CREATE TABLE IF NOT EXISTS events (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  ts     INTEGER NOT NULL,          -- epoch em milissegundos
  day    TEXT    NOT NULL,          -- AAAA-MM-DD no fuso de São Paulo
  type   TEXT    NOT NULL,          -- visit | page | car | whats
  vid    TEXT    NOT NULL,
  page   TEXT,                      -- caminho da página (/ ou /estoque.html)
  target TEXT,                      -- id do carro ou chave do botão
  label  TEXT,                      -- nome do carro, para exibir no painel
  dev    TEXT,                      -- celular | computador | tablet
  ref    TEXT,                      -- de onde veio: google, instagram, whatsapp, direto...
  car    TEXT                       -- id do carro no clique de WhatsApp dos detalhes
);

CREATE INDEX IF NOT EXISTS idx_events_type_day ON events (type, day);
CREATE INDEX IF NOT EXISTS idx_events_type_target ON events (type, target);
CREATE INDEX IF NOT EXISTS idx_events_day ON events (day);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts);
