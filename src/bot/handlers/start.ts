import { sendMessage, editMessage, buildKeyboard, deleteMessage } from '../../utils/telegram.js';
import { setLastMessageId, getLastMessageId } from '../../db/users.js';
import { getSleepStats, getWaterStats } from '../../db/health.js';
import { formatDuration, formatTimeOnly } from '../../utils/format.js';

// Centraliza texto
function centerText(text: string, width: number = 36): string {
    const textLength = [...text].length;
    const padding = Math.max(0, Math.floor((width - textLength) / 2));
    return ' '.repeat(padding) + text;
}

// Barra de progresso visual
function getProgressBar(percent: number, length: number = 16): string {
    const filled = Math.round((percent / 100) * length);
    const empty = length - filled;
    return '█'.repeat(Math.min(filled, length)) + '░'.repeat(Math.max(empty, 0));
}

// Emoji de status
function getStatusEmoji(percent: number): string {
    if (percent >= 100) return '✅';
    if (percent >= 75) return '🔥';
    if (percent >= 50) return '💪';
    if (percent >= 25) return '⚡';
    return '💧';
}

// Saudação baseada no horário
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
}

// Linha separadora full width
const LINE = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

// Build Hub Central Premium
export async function handleStart(chatId: number, userId: number): Promise<void> {
    const lastMsgId = await getLastMessageId(userId);
    if (lastMsgId) {
        await deleteMessage(chatId, lastMsgId);
    }

    const sleepStats = await getSleepStats(userId);
    const waterStats = await getWaterStats(userId);

    const greeting = getGreeting();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    // Build text with exact spacing
    let text = `${centerText('🧠 ASSESSOR ELITE')}
${LINE}

${greeting}, Leonel!
🗓 ${dateStr}

${LINE}
${centerText('⚡ DASHBOARD DO DIA')}
${LINE}

`;

    // Sleep info (sem espaçamento)
    if (sleepStats?.lastWake) {
        text += `☀️ Acordou às ${formatTimeOnly(sleepStats.lastWake)}\n`;
    }
    if (sleepStats?.todaySleepHours) {
        text += `😴 Dormiu ${formatDuration(Math.round(sleepStats.todaySleepHours * 60))}\n`;
    }

    // Water info com barra centralizada e padding mínimo
    if (waterStats) {
        const percent = waterStats.percentComplete;
        const bar = getProgressBar(percent);
        const emoji = getStatusEmoji(percent);

        text += `
${centerText(bar)}
💧 ${waterStats.todayMl}ml de ${waterStats.goalMl}ml ${emoji} (${percent}%)
🎯 ${waterStats.remaining > 0 ? `Faltam ${waterStats.remaining}ml para a meta` : '✨ Meta atingida!'}

`;
    }

    text += LINE;

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

// Show Hub (edit existing message)
export async function showHub(chatId: number, messageId: number, userId: number): Promise<void> {
    const sleepStats = await getSleepStats(userId);
    const waterStats = await getWaterStats(userId);

    const greeting = getGreeting();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    let text = `${centerText('🧠 ASSESSOR ELITE')}
${LINE}

${greeting}, Leonel!
🗓 ${dateStr}

${LINE}
${centerText('⚡ DASHBOARD DO DIA')}
${LINE}

`;

    if (sleepStats?.lastWake) {
        text += `☀️ Acordou às ${formatTimeOnly(sleepStats.lastWake)}\n`;
    }
    if (sleepStats?.todaySleepHours) {
        text += `😴 Dormiu ${formatDuration(Math.round(sleepStats.todaySleepHours * 60))}\n`;
    }

    if (waterStats) {
        const percent = waterStats.percentComplete;
        const bar = getProgressBar(percent);
        const emoji = getStatusEmoji(percent);

        text += `
${centerText(bar)}
💧 ${waterStats.todayMl}ml de ${waterStats.goalMl}ml ${emoji} (${percent}%)
🎯 ${waterStats.remaining > 0 ? `Faltam ${waterStats.remaining}ml para a meta` : '✨ Meta atingida!'}

`;
    }

    text += LINE;

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
    const sleepStats = await getSleepStats(userId);
    const waterStats = await getWaterStats(userId);

    const greeting = getGreeting();
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    let text = `${centerText('🧠 ASSESSOR ELITE')}
${LINE}

${greeting}, Leonel!
🗓 ${dateStr}

${LINE}
${centerText('⚡ DASHBOARD DO DIA')}
${LINE}

`;

    if (sleepStats?.lastWake) {
        text += `☀️ Acordou às ${formatTimeOnly(sleepStats.lastWake)}\n`;
    }
    if (sleepStats?.todaySleepHours) {
        text += `😴 Dormiu ${formatDuration(Math.round(sleepStats.todaySleepHours * 60))}\n`;
    }

    if (waterStats) {
        const percent = waterStats.percentComplete;
        const bar = getProgressBar(percent);
        const emoji = getStatusEmoji(percent);

        text += `
${centerText(bar)}
💧 ${waterStats.todayMl}ml de ${waterStats.goalMl}ml ${emoji} (${percent}%)
🎯 ${waterStats.remaining > 0 ? `Faltam ${waterStats.remaining}ml para a meta` : '✨ Meta atingida!'}

`;
    }

    text += LINE;
    text += `\n${centerText('📂 MÓDULOS DISPONÍVEIS')}\n`;

    const keyboard = buildKeyboard([
        [{ text: '💪 Saúde', callback_data: 'health' }],
        [
            { text: '📚 Estudos', callback_data: 'studies' },
            { text: '💰 Finanças', callback_data: 'finances' },
        ],
        [{ text: '↩️ Voltar ao Hub', callback_data: 'hub' }],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}
