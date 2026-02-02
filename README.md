# 🧩 Acessor Elite Bot

Bot Telegram de assistente pessoal premium com integração Google Calendar e IA Gemini.

## ⚡ Quick Start

```bash
# Clonar
git clone https://github.com/SEU_USUARIO/Acessor_Elite.Bot.git
cd Acessor_Elite.Bot

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Subir com Docker
docker-compose up -d --build

# Inicializar banco
docker exec -i elite-postgres psql -U postgres -d elite < src/db/schema.sql
```

## 🔧 Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `TELEGRAM_BOT_TOKEN` | Token do bot do Telegram |
| `TELEGRAM_ALLOWLIST` | IDs permitidos (separados por vírgula) |
| `GOOGLE_CLIENT_ID` | OAuth Client ID do Google |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret |
| `GEMINI_API_KEY` | API Key do Google AI Studio |

## 📚 Stack

- Node.js + TypeScript
- Express.js
- PostgreSQL
- Docker
- Google APIs (Calendar, Gemini)

## 📄 License

MIT
