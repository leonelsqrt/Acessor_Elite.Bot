import { sendMessage, editMessage, buildKeyboard, deleteMessage } from '../../utils/telegram.js';
import { setLastMessageId, getLastMessageId } from '../../db/users.js';
import { getSleepStats, getWaterStats } from '../../db/health.js';
import { formatDuration, formatTimeOnly } from '../../utils/format.js';

// Barra de progresso compacta (10 blocos)
function getProgressBar(percent: number): string {
    const length = 10;
    const filled = Math.round((percent / 100) * length);
    const empty = length - filled;
    return '▓'.repeat(Math.min(filled, length)) + '░'.repeat(Math.max(empty, 0));
}

// Emoji de status
function getStatusEmoji(percent: number): string {
    if (percent >= 100) return '✅';
    if (percent >= 75) return '🔥';
    if (percent >= 50) return '💪';
    return '⚡';
}

// Saudação baseada no horário
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
}

// Linha separadora (curta para mobile)
const LINE = '─────────────────────';

// Build Hub Central Premium
export async function handleStart(chatId: number, userId: number): Promise<void> {
    const lastMsgId = await getLastMessageId(userId);
    if (lastMsgId) {
        await deleteMessage(chatId, lastMsgId);
    }

    const text = await buildHubText(userId);

    const keyboard = buildKeyboard([
        [
            { text: '☀️ Acordar', callback_data: 'good_morning' },
            { text: '🌙 Dormir', callback_data: 'good_night' },
        ],
        [
            { text: '💧 +250ml', callback_data: 'water_250' },
            { text: '💧 +500ml', callback_data: 'water_500' },
            { text: '💧 +1L', callback_data: 'water_1000' },
        ],
        [
            { text: '📅 Criar Evento', callback_data: 'create_event' },
        ],
        [
            { text: '── 📂 MÓDULOS ──', callback_data: 'show_modules' },
        ],
    ]);

    const msg = await sendMessage(chatId, text, { replyMarkup: keyboard });
    if (msg) {
        await setLastMessageId(userId, msg.message_id);
    }
}

// Build hub text
async function buildHubText(userId: number): Promise<string> {
    const sleepStats = await getSleepStats(userId);
    const waterStats = await getWaterStats(userId);

    const greeting = getGreeting();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    let text = `<b>🧠 ASSESSOR ELITE</b>
${LINE}

${greeting}, Leonel!
🗓 <i>${dateStr}</i>

${LINE}
<b>⚡ DASHBOARD DO DIA</b>
${LINE}
`;

    // Sleep info
    if (sleepStats?.lastWake) {
        text += `☀️ Acordou às <b>${formatTimeOnly(sleepStats.lastWake)}</b>\n`;
    }
    if (sleepStats?.todaySleepHours) {
        text += `😴 Dormiu <b>${formatDuration(Math.round(sleepStats.todaySleepHours * 60))}</b>\n`;
    }

    // Water info
    if (waterStats) {
        const percent = Math.min(waterStats.percentComplete, 100);
        const bar = getProgressBar(percent);
        const emoji = getStatusEmoji(waterStats.percentComplete);

        text += `\n💧 <b>Hidratação</b>\n`;
        text += `${bar} ${waterStats.percentComplete}%\n`;
        text += `<b>${waterStats.todayMl}ml</b> / ${waterStats.goalMl}ml ${emoji}\n`;

        if (waterStats.remaining > 0) {
            text += `<i>🎯 Faltam ${waterStats.remaining}ml</i>\n`;
        } else {
            text += `<i>✨ Meta atingida!</i>\n`;
        }
    }

    text += `\n${LINE}`;

    return text;
}

// Show Hub (edit existing message)
export async function showHub(chatId: number, messageId: number, userId: number): Promise<void> {
    const text = await buildHubText(userId);

    const keyboard = buildKeyboard([
        [
            { text: '☀️ Acordar', callback_data: 'good_morning' },
            { text: '🌙 Dormir', callback_data: 'good_night' },
        ],
        [
            { text: '💧 +250ml', callback_data: 'water_250' },
            { text: '💧 +500ml', callback_data: 'water_500' },
            { text: '💧 +1L', callback_data: 'water_1000' },
        ],
        [
            { text: '📅 Criar Evento', callback_data: 'create_event' },
        ],
        [
            { text: '── 📂 MÓDULOS ──', callback_data: 'show_modules' },
        ],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}

// Show modules
export async function showModules(chatId: number, messageId: number, userId: number): Promise<void> {
    const text = await buildHubText(userId);
    const finalText = text + `\n\n<b>📂 MÓDULOS</b>`;

    const keyboard = buildKeyboard([
        [{ text: '💪 Saúde', callback_data: 'health' }],
        [
            { text: '📚 Estudos', callback_data: 'studies' },
            { text: '💰 Finanças', callback_data: 'finances' },
        ],
        [{ text: '↩️ Voltar', callback_data: 'hub' }],
    ]);

    await editMessage(chatId, messageId, finalText, { replyMarkup: keyboard });
}
