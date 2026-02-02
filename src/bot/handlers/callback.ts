import { editMessage, buildKeyboard, sendMessage, deleteMessage } from '../../utils/telegram.js';
import { showHub, showModules } from './start.js';
import { showHealthModule, showSleepCard, showSleepDetails, showWaterCard, showActivityCard, showHealthStats } from './health.js';
import { showFinancesModule, showBillsCard, showCategoriesCard, showExtratoCard, showGoalsCard, showReportsCard, showFinancePlaceholder } from './finances.js';
import { logWaterConsumption, showWaterInsert } from './water.js';
import { handleGoodMorning, handleGoodNight } from './dayNight.js';
import {
    handleCreateEvent,
    handleEventFieldInput,
    handleConfirmEvent,
    handleCancelEvent,
    handleEditEvent,
    handleToggleAllDay,
    handleSaveEvent,
    handleExitEdit,
    handleAllDayResponse
} from './events.js';
import { setLastMessageId, setBotState, getBotState } from '../../db/users.js';

// Main callback router
export async function handleCallback(
    chatId: number,
    messageId: number,
    userId: number,
    data: string
): Promise<void> {
    console.log(`📲 Callback: ${data} from user ${userId}`);

    // Track message for editing
    await setLastMessageId(userId, messageId);

    // Route based on callback data
    switch (data) {
        // Hub navigation
        case 'hub':
        case 'back_hub':
            await showHub(chatId, messageId, userId);
            break;

        // Day/Night buttons
        case 'good_morning':
            await handleGoodMorning(chatId, messageId, userId);
            break;
        case 'good_night':
            await handleGoodNight(chatId, messageId, userId);
            break;

        // Health area
        case 'health':
            await showHealthModule(chatId, messageId, userId);
            break;
        case 'health_sleep':
            await showSleepCard(chatId, messageId, userId);
            break;
        case 'health_sleep_details':
            await showSleepDetails(chatId, messageId, userId);
            break;
        case 'health_water':
            await showWaterCard(chatId, messageId, userId);
            break;
        case 'health_activity':
            await showActivityCard(chatId, messageId, userId);
            break;
        case 'health_stats':
            await showHealthStats(chatId, messageId, userId);
            break;
        // Legacy callbacks
        case 'sleep':
            await showSleepCard(chatId, messageId, userId);
            break;
        case 'water':
            await showWaterCard(chatId, messageId, userId);
            break;
        case 'water_quick':
            await showWaterInsert(chatId, messageId, userId);
            break;

        // Water logging
        case 'water_250':
            await logWaterConsumption(chatId, messageId, userId, 250);
            break;
        case 'water_500':
            await logWaterConsumption(chatId, messageId, userId, 500);
            break;
        case 'water_1000':
            await logWaterConsumption(chatId, messageId, userId, 1000);
            break;
        case 'water_insert':
            await showWaterInsert(chatId, messageId, userId);
            break;

        // Event creation
        case 'create_event':
            await handleCreateEvent(chatId, messageId, userId);
            break;
        case 'event_title':
        case 'event_date':
        case 'event_start':
        case 'event_end':
        case 'event_location':
            await handleEventFieldInput(chatId, messageId, userId, data.replace('event_', ''));
            break;
        case 'event_all_day':
            await handleToggleAllDay(chatId, messageId, userId);
            break;
        case 'event_allday_yes':
            await handleAllDayResponse(chatId, messageId, userId, true);
            break;
        case 'event_allday_no':
            await handleAllDayResponse(chatId, messageId, userId, false);
            break;
        case 'event_confirm':
            await handleConfirmEvent(chatId, messageId, userId);
            break;
        case 'event_cancel':
            await handleCancelEvent(chatId, messageId, userId);
            break;
        case 'event_edit':
            await handleEditEvent(chatId, messageId, userId);
            break;
        case 'event_save':
            await handleSaveEvent(chatId, messageId, userId);
            break;
        case 'event_exit':
            await handleExitEdit(chatId, messageId, userId);
            break;

        // Edit event fields
        case 'edit_title':
        case 'edit_date':
        case 'edit_start':
        case 'edit_end':
        case 'edit_location':
            await handleEventFieldInput(chatId, messageId, userId, data.replace('edit_', ''), true);
            break;

        // Future areas (placeholder)
        case 'studies':
            await showPlaceholder(chatId, messageId, '📚 Estudos', 'Em breve você poderá gerenciar seus estudos aqui!');
            break;
        case 'finances':
            await showFinancesModule(chatId, messageId, userId);
            break;
        case 'fin_entrada':
            await showFinancePlaceholder(chatId, messageId, '📥 Nova Entrada', 'Funcionalidade em desenvolvimento!');
            break;
        case 'fin_saida':
            await showFinancePlaceholder(chatId, messageId, '📤 Nova Saída', 'Funcionalidade em desenvolvimento!');
            break;
        case 'fin_bills':
            await showBillsCard(chatId, messageId, userId);
            break;
        case 'fin_categories':
            await showCategoriesCard(chatId, messageId, userId);
            break;
        case 'fin_extrato':
            await showExtratoCard(chatId, messageId, userId);
            break;
        case 'fin_goals':
            await showGoalsCard(chatId, messageId, userId);
            break;
        case 'fin_reports':
            await showReportsCard(chatId, messageId, userId);
            break;
        case 'bill_add':
        case 'bill_edit':
        case 'cat_add':
        case 'cat_edit':
        case 'goal_add':
            await showFinancePlaceholder(chatId, messageId, '🔧 Em Desenvolvimento', 'Esta funcionalidade será implementada em breve!');
            break;
        case 'reminders':
            await showPlaceholder(chatId, messageId, '⏰ Lembretes', 'Em breve você poderá criar lembretes personalizados!');
            break;

        // No-op button (separator)
        case 'noop':
            // Do nothing - this is a separator button
            break;

        // Show modules
        case 'show_modules':
            await showModules(chatId, messageId, userId);
            break;

        default:
            console.log(`⚠️ Unknown callback: ${data}`);
    }
}

// Placeholder for future features
async function showPlaceholder(
    chatId: number,
    messageId: number,
    title: string,
    message: string
): Promise<void> {
    const text = `
<b>${title}</b>
─────────────────────────

🚧 <i>${message}</i>

─────────────────────────`;

    const keyboard = buildKeyboard([
        [{ text: '↩️ Voltar ao Hub', callback_data: 'hub' }],
    ]);

    await editMessage(chatId, messageId, text, { replyMarkup: keyboard });
}
