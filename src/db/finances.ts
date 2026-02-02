import { query, queryOne } from './connection.js';

// ==================== CATEGORIAS ====================

export interface Category {
    id: number;
    userId: number;
    name: string;
    emoji: string;
    categoryType: 'entrada' | 'saida';
}

// Buscar categorias do usuário
export async function getCategories(userId: number, type?: 'entrada' | 'saida'): Promise<Category[]> {
    let sql = `SELECT id, user_id, name, emoji, category_type 
               FROM financial_categories 
               WHERE user_id = $1`;
    const params: (number | string)[] = [userId];

    if (type) {
        sql += ` AND category_type = $2`;
        params.push(type);
    }

    sql += ` ORDER BY name`;

    const result = await query<{
        id: number;
        user_id: number;
        name: string;
        emoji: string;
        category_type: 'entrada' | 'saida';
    }>(sql, params);

    return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        emoji: row.emoji,
        categoryType: row.category_type,
    }));
}

// Criar categoria
export async function createCategory(
    userId: number,
    name: string,
    emoji: string,
    categoryType: 'entrada' | 'saida'
): Promise<number> {
    const result = await queryOne<{ id: number }>(
        `INSERT INTO financial_categories (user_id, name, emoji, category_type)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [userId, name, emoji, categoryType]
    );
    return result?.id || 0;
}

// Excluir categoria
export async function deleteCategory(categoryId: number): Promise<void> {
    await query(`DELETE FROM financial_categories WHERE id = $1`, [categoryId]);
}

// ==================== TRANSAÇÕES ====================

export interface Transaction {
    id: number;
    userId: number;
    categoryId: number | null;
    categoryName: string | null;
    categoryEmoji: string | null;
    transactionType: 'entrada' | 'saida';
    amount: number;
    description: string | null;
    transactionDate: Date;
}

// Buscar transações do mês
export async function getMonthTransactions(userId: number, month: number, year: number): Promise<Transaction[]> {
    const result = await query<{
        id: number;
        user_id: number;
        category_id: number | null;
        category_name: string | null;
        category_emoji: string | null;
        transaction_type: 'entrada' | 'saida';
        amount: string;
        description: string | null;
        transaction_date: Date;
    }>(
        `SELECT t.id, t.user_id, t.category_id, c.name as category_name, c.emoji as category_emoji,
                t.transaction_type, t.amount, t.description, t.transaction_date
         FROM financial_transactions t
         LEFT JOIN financial_categories c ON t.category_id = c.id
         WHERE t.user_id = $1 
           AND EXTRACT(MONTH FROM t.transaction_date) = $2
           AND EXTRACT(YEAR FROM t.transaction_date) = $3
         ORDER BY t.transaction_date DESC, t.id DESC`,
        [userId, month, year]
    );

    return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        categoryId: row.category_id,
        categoryName: row.category_name,
        categoryEmoji: row.category_emoji,
        transactionType: row.transaction_type,
        amount: parseFloat(row.amount),
        description: row.description,
        transactionDate: row.transaction_date,
    }));
}

// Criar transação
export async function createTransaction(
    userId: number,
    transactionType: 'entrada' | 'saida',
    amount: number,
    categoryId?: number,
    description?: string
): Promise<number> {
    const result = await queryOne<{ id: number }>(
        `INSERT INTO financial_transactions (user_id, transaction_type, amount, category_id, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [userId, transactionType, amount, categoryId || null, description || null]
    );
    return result?.id || 0;
}

// Excluir transação
export async function deleteTransaction(transactionId: number): Promise<void> {
    await query(`DELETE FROM financial_transactions WHERE id = $1`, [transactionId]);
}

// Resumo financeiro do mês
export interface MonthSummary {
    totalEntradas: number;
    totalSaidas: number;
    saldo: number;
}

export async function getMonthSummary(userId: number, month: number, year: number): Promise<MonthSummary> {
    const result = await queryOne<{ entradas: string; saidas: string }>(
        `SELECT 
            COALESCE(SUM(CASE WHEN transaction_type = 'entrada' THEN amount ELSE 0 END), 0) as entradas,
            COALESCE(SUM(CASE WHEN transaction_type = 'saida' THEN amount ELSE 0 END), 0) as saidas
         FROM financial_transactions
         WHERE user_id = $1 
           AND EXTRACT(MONTH FROM transaction_date) = $2
           AND EXTRACT(YEAR FROM transaction_date) = $3`,
        [userId, month, year]
    );

    const entradas = parseFloat(result?.entradas || '0');
    const saidas = parseFloat(result?.saidas || '0');

    return {
        totalEntradas: entradas,
        totalSaidas: saidas,
        saldo: entradas - saidas,
    };
}

// ==================== CONTAS FIXAS ====================

export interface FixedBill {
    id: number;
    userId: number;
    name: string;
    emoji: string;
    amount: number | null;
    isVariable: boolean;
    estimatedAmount: number | null;
    dueDay: number;
    billingDay: number | null;
    isActive: boolean;
}

// Buscar contas fixas
export async function getFixedBills(userId: number): Promise<FixedBill[]> {
    const result = await query<{
        id: number;
        user_id: number;
        name: string;
        emoji: string;
        amount: string | null;
        is_variable: boolean;
        estimated_amount: string | null;
        due_day: number;
        billing_day: number | null;
        is_active: boolean;
    }>(
        `SELECT * FROM fixed_bills WHERE user_id = $1 AND is_active = true ORDER BY due_day`,
        [userId]
    );

    return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        emoji: row.emoji,
        amount: row.amount ? parseFloat(row.amount) : null,
        isVariable: row.is_variable,
        estimatedAmount: row.estimated_amount ? parseFloat(row.estimated_amount) : null,
        dueDay: row.due_day,
        billingDay: row.billing_day,
        isActive: row.is_active,
    }));
}

// Criar conta fixa
export async function createFixedBill(
    userId: number,
    name: string,
    emoji: string,
    dueDay: number,
    amount?: number,
    isVariable?: boolean,
    estimatedAmount?: number,
    billingDay?: number
): Promise<number> {
    const result = await queryOne<{ id: number }>(
        `INSERT INTO fixed_bills (user_id, name, emoji, due_day, amount, is_variable, estimated_amount, billing_day)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [userId, name, emoji, dueDay, amount || null, isVariable || false, estimatedAmount || null, billingDay || null]
    );
    return result?.id || 0;
}

// Atualizar conta fixa
export async function updateFixedBill(
    billId: number,
    updates: Partial<{ name: string; emoji: string; amount: number; dueDay: number; billingDay: number }>
): Promise<void> {
    const setClauses: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(updates.name);
    }
    if (updates.emoji !== undefined) {
        setClauses.push(`emoji = $${paramIndex++}`);
        values.push(updates.emoji);
    }
    if (updates.amount !== undefined) {
        setClauses.push(`amount = $${paramIndex++}`);
        values.push(updates.amount);
    }
    if (updates.dueDay !== undefined) {
        setClauses.push(`due_day = $${paramIndex++}`);
        values.push(updates.dueDay);
    }
    if (updates.billingDay !== undefined) {
        setClauses.push(`billing_day = $${paramIndex++}`);
        values.push(updates.billingDay);
    }

    if (setClauses.length > 0) {
        values.push(billId);
        await query(
            `UPDATE fixed_bills SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
            values
        );
    }
}

// Excluir conta fixa
export async function deleteFixedBill(billId: number): Promise<void> {
    await query(`UPDATE fixed_bills SET is_active = false WHERE id = $1`, [billId]);
}

// ==================== VALORES DE CONTAS (MENSAL) ====================

export interface BillValue {
    id: number;
    billId: number;
    month: number;
    year: number;
    amount: number;
    isPaid: boolean;
    paidAt: Date | null;
}

// Buscar valor da conta do mês
export async function getBillValue(billId: number, month: number, year: number): Promise<BillValue | null> {
    const result = await queryOne<{
        id: number;
        bill_id: number;
        month: number;
        year: number;
        amount: string;
        is_paid: boolean;
        paid_at: Date | null;
    }>(
        `SELECT * FROM bill_values WHERE bill_id = $1 AND month = $2 AND year = $3`,
        [billId, month, year]
    );

    if (!result) return null;

    return {
        id: result.id,
        billId: result.bill_id,
        month: result.month,
        year: result.year,
        amount: parseFloat(result.amount),
        isPaid: result.is_paid,
        paidAt: result.paid_at,
    };
}

// Definir valor da conta do mês
export async function setBillValue(billId: number, month: number, year: number, amount: number): Promise<void> {
    await query(
        `INSERT INTO bill_values (bill_id, month, year, amount)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (bill_id, month, year) 
         DO UPDATE SET amount = $4, defined_at = NOW()`,
        [billId, month, year, amount]
    );
}

// Marcar conta como paga
export async function markBillPaid(billId: number, month: number, year: number): Promise<void> {
    await query(
        `UPDATE bill_values SET is_paid = true, paid_at = NOW()
         WHERE bill_id = $1 AND month = $2 AND year = $3`,
        [billId, month, year]
    );
}

// ==================== METAS FINANCEIRAS ====================

export interface FinancialGoal {
    id: number;
    userId: number;
    name: string;
    targetAmount: number;
    currentAmount: number;
    isCompleted: boolean;
}

// Buscar metas
export async function getFinancialGoals(userId: number): Promise<FinancialGoal[]> {
    const result = await query<{
        id: number;
        user_id: number;
        name: string;
        target_amount: string;
        current_amount: string;
        is_completed: boolean;
    }>(
        `SELECT * FROM financial_goals WHERE user_id = $1 ORDER BY is_completed, created_at DESC`,
        [userId]
    );

    return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        targetAmount: parseFloat(row.target_amount),
        currentAmount: parseFloat(row.current_amount),
        isCompleted: row.is_completed,
    }));
}

// Criar meta
export async function createFinancialGoal(userId: number, name: string, targetAmount: number): Promise<number> {
    const result = await queryOne<{ id: number }>(
        `INSERT INTO financial_goals (user_id, name, target_amount)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [userId, name, targetAmount]
    );
    return result?.id || 0;
}

// Atualizar progresso da meta
export async function updateGoalProgress(goalId: number, amount: number): Promise<void> {
    await query(
        `UPDATE financial_goals 
         SET current_amount = current_amount + $2,
             is_completed = (current_amount + $2 >= target_amount),
             completed_at = CASE WHEN current_amount + $2 >= target_amount THEN NOW() ELSE NULL END
         WHERE id = $1`,
        [goalId, amount]
    );
}

// Excluir meta
export async function deleteFinancialGoal(goalId: number): Promise<void> {
    await query(`DELETE FROM financial_goals WHERE id = $1`, [goalId]);
}
