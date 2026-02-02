import { editMessage, buildKeyboard } from '../../utils/telegram.js';
import { logSleep, getSleepStats } from '../../db/health.js';
import { formatDuration, formatTimeOnly } from '../../utils/format.js';
import { showHub } from './start.js';

// Handle "Acordei" / "Bom Dia" button
export async function handleGoodMorning(
    chatId: number,
    messageId: number,
    userId: number
): Promise<void> {
    // Log wake time
    await logSleep(userId, 'wake');

    // Calculate sleep duration if we have last night's sleep time
    const stats = await getSleepStats(userId);

    const now = new Date();

    // Show quick confirmation then return to Hub
    let text = `
<b>☀️ BOM DIA, LEONEL!</b>
═══════════════════════════

⏰ Acordou às <b>${formatTimeOnly(now)}</b>

`;

    // Show sleep duration if available
    if (stats?.lastSleep) {
        const sleepTime = new Date(stats.lastSleep);
        const durationMs = now.getTime() - sleepTime.getTime();
        const durationMinutes = Math.round(durationMs / (1000 * 60));

        text += `😴 Dormiu <b>${formatDuration(durationMinutes)}</b>\n\n`;

        if (durationMinutes < 360) {
            text += `<i>⚠️ Poucas horas de sono. Cuide-se hoje!</i>`;
        } else if (durationMinutes >= 420 && durationMinutes <= 540) {
            text += `<i>✅ Noite ideal! Você está no caminho certo.</i>`;
        } else if (durationMinutes > 540) {
            text += `<i>💤 Bastante descanso! Energia renovada!</i>`;
        } else {
            text += `<i>😊 Bom descanso! Vamos ter um dia produtivo!</i>`;
        }
    } else {
        text += `<i>✨ Seu dia começou! Registrado com sucesso.</i>`;
    }

    text += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Retornando ao Hub em 2 segundos...</i>
`;

    await editMessage(chatId, messageId, text);

    // Return to Hub after brief display
    setTimeout(async () => {
        await showHub(chatId, messageId, userId);
    }, 2000);
}

// Handle "Vou Dormir" / "Boa Noite" button
export async function handleGoodNight(
    chatId: number,
    messageId: number,
    userId: number
): Promise<void> {
    // Log sleep time
    await logSleep(userId, 'sleep');

    const now = new Date();
    const stats = await getSleepStats(userId);

    // Calculate time awake if we have wake time
    let awakeInfo = '';
    if (stats?.lastWake) {
        const wakeTime = new Date(stats.lastWake);
        // Only calculate if wake was today
        if (wakeTime.toDateString() === now.toDateString()) {
            const durationMs = now.getTime() - wakeTime.getTime();
            const durationMinutes = Math.round(durationMs / (1000 * 60));
            awakeInfo = `☀️ Dia ativo: <b>${formatDuration(durationMinutes)}</b>\n`;
        }
    }

    let text = `
<b>🌙 BOA NOITE, LEONEL!</b>
═══════════════════════════

⏰ Dormindo às <b>${formatTimeOnly(now)}</b>
${awakeInfo}
`;

    // Check time and give feedback
    const hour = now.getHours();
    if (hour < 22) {
        text += `<i>👏 Excelente! Dormir cedo é um ótimo hábito!</i>`;
    } else if (hour >= 22 && hour < 24) {
        text += `<i>😊 Hora boa para descansar. Bons sonhos!</i>`;
    } else {
        text += `<i>😴 Já é tarde! Descanse bem e recupere!</i>`;
    }

    text += `

💤 <b>Registrado com sucesso!</b>

━━━━━━━━━━━━━━━━━━━━━━━━━━━
<i>Até amanhã! 🌟</i>
`;

    const keyboard = buildKeyboard([
        [{ text: '↩️ Voltar ao Hub', callback_data: 'hub' }],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}
