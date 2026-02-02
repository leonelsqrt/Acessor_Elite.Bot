import { editMessage, buildKeyboard } from '../../utils/telegram.js';
import { logSleep, getSleepStats } from '../../db/health.js';
import { formatTimeOnly } from '../../utils/format.js';
import { showHub } from './start.js';

// Formatar duração no padrão XhYmin
function formatDurationCompact(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins}min`;
}

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
─────────────────────

⏰ Acordou às <b>${formatTimeOnly(now)}</b>

`;

    // Show sleep duration if available
    if (stats?.todaySleepHours && stats.todaySleepHours > 0) {
        const totalMinutes = Math.round(stats.todaySleepHours * 60);
        text += `😴 Dormiu por <b>${formatDurationCompact(totalMinutes)}</b>\n\n`;

        if (totalMinutes < 360) {
            text += `<i>⚠️ Poucas horas de sono. Cuide-se hoje!</i>`;
        } else if (totalMinutes >= 420 && totalMinutes <= 540) {
            text += `<i>✅ Noite ideal! Você está no caminho certo.</i>`;
        } else if (totalMinutes > 540) {
            text += `<i>💤 Bastante descanso! Energia renovada!</i>`;
        } else {
            text += `<i>😊 Bom descanso! Vamos ter um dia produtivo!</i>`;
        }
    } else {
        text += `<i>✨ Seu dia começou! Registrado com sucesso.</i>`;
    }

    text += `

─────────────────────
<i>Retornando ao Hub...</i>
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

    // Calculate time awake and get message
    let awakeMinutes = 0;
    let awakeInfo = '';

    if (stats?.lastWake) {
        const wakeTime = new Date(stats.lastWake);
        const durationMs = now.getTime() - wakeTime.getTime();
        awakeMinutes = Math.round(durationMs / (1000 * 60));

        // Só mostra se faz sentido (menos de 24h)
        if (awakeMinutes > 0 && awakeMinutes < 1440) {
            awakeInfo = `☀️ Dia ativo: <b>${formatDurationCompact(awakeMinutes)}</b>\n`;
        }
    }

    // Lógica de mensagem baseada no tempo acordado
    // Se acordar às 06:30 e precisa de 8h de sono, ideal é dormir às 22:30 = 16h acordado
    // <= 16h (960min) = excelente | 16-17h (960-1020min) = ok | >17h (>1020min) = alerta
    let sleepMessage = '';
    if (awakeMinutes > 0 && awakeMinutes < 1440) {
        if (awakeMinutes <= 960) {
            sleepMessage = `👏 Excelente! Sono ideal garantido.`;
        } else if (awakeMinutes <= 1020) {
            sleepMessage = `😐 Ok, mas tente dormir mais cedo amanhã.`;
        } else {
            sleepMessage = `⚠️ Atenção! Sono pode ser prejudicado.`;
        }
    } else {
        sleepMessage = `💤 Bons sonhos!`;
    }

    let text = `
<b>🌙 BOA NOITE, LEONEL!</b>
─────────────────────

⏰ Dormindo às <b>${formatTimeOnly(now)}</b>
${awakeInfo}
<i>${sleepMessage}</i>

💤 <b>Registrado com sucesso!</b>

─────────────────────
<i>Até amanhã! 🌟</i>
`;

    const keyboard = buildKeyboard([
        [{ text: '☀️ Acordar', callback_data: 'good_morning' }],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}
