import { billService, type Bill } from "./billService";
import { transactionService } from "./transactionService";
import type { Wallet } from "./walletService";
import { currencyService } from "./currencyService";
import { toast } from "react-hot-toast";
import { Timestamp } from "firebase/firestore";

/**
 * Calculate the next due date based on bill frequency
 */
export function calculateNextDueDate(currentDueDate: Date, frequency: Bill['frequency']): Date {
    const nextDate = new Date(currentDueDate);

    switch (frequency) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'biweekly':
            nextDate.setDate(nextDate.getDate() + 15);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case 'once':
            // One-time bills don't recur
            return currentDueDate;
    }

    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
}

/**
 * Process all due bills:
 * 1. Auto-deduct payments for bills with autoDeduct=true
 * 2. Generate new instances for recurring bills
 */
export async function processDueBills(
    bills: Bill[],
    wallets: Wallet[],
    userId: string,
    exchangeRates: Record<string, number>
): Promise<{ processed: number; failed: number; recurring: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Look ahead 7 days for generating upcoming recurring bills
    const generationHorizon = new Date(today);
    generationHorizon.setDate(today.getDate() + 30);
    generationHorizon.setHours(0, 0, 0, 0);

    let processed = 0;
    let failed = 0;
    let recurring = 0;

    // Filter bills that need processing (either for payment or recursion)
    const dueBills = bills.filter(bill => {
        // If it's recurring, we check it regardless of paid status (to generate next instances)
        if (bill.frequency !== 'once') return true;

        // If it's one-time, skip if already paid
        if (bill.isPaid) return false;

        const billDate = new Date(bill.dueDate);
        billDate.setHours(0, 0, 0, 0);

        // Include due or overdue bills for payment
        return billDate <= today && bill.autoDeduct && !!bill.walletId;
    });

    // Processing start point
    for (const bill of dueBills) {
        // ---------- 1. Auto-deduct payment ----------
        // Only if not paid, auto-deduct is on, wallet is set, and it is due EXACTLY TODAY
        // FIX: Ensuring overdue bills from past dates are NOT auto-paid (manual only).
        const billDate = new Date(bill.dueDate);
        billDate.setHours(0, 0, 0, 0);

        const isDueToday = billDate.getTime() === today.getTime();
        const isDueForPayment = !bill.isPaid && bill.autoDeduct && bill.walletId && isDueToday;

        if (isDueForPayment) {
            try {
                const wallet = wallets.find(w => w.id === bill.walletId);
                if (!wallet) {
                    console.warn(`Wallet not found for bill ${bill.id}`);
                    failed++;
                } else {
                    const walletCurrency = wallet.currency || 'USD';
                    let billAmount = bill.amount;

                    if (bill.currency !== walletCurrency) {
                        const amountUSD = currencyService.convertToUSD(bill.amount, bill.currency, exchangeRates);
                        billAmount = currencyService.convertFromUSD(amountUSD, walletCurrency, exchangeRates);
                    }

                    if (wallet.balance < billAmount) {
                        console.warn(`Insufficient balance for bill ${bill.title}`);
                        failed++;
                    } else {
                        // Use atomic payment method to prevent duplicates
                        await transactionService.payBillAtomic(bill.id!, {
                            userId: userId,
                            title: `Auto-pay: ${bill.title}`,
                            subtitle: 'Automatic Bill Payment',
                            amount: -billAmount,
                            flow: 'expense',
                            categoryId: 'bills',
                            currency: walletCurrency,
                            date: new Date(),
                            walletId: bill.walletId
                        }, exchangeRates);

                        processed++;
                        toast.success(`Auto-paid: ${bill.title}`, { duration: 3000 });
                    }
                }
            } catch (err) {
                // If already paid (race condition), don't count as failed
                if (err instanceof Error && err.message.includes("already paid")) {
                    console.log(`Bill ${bill.title} was already paid.`);
                } else {
                    console.error(`Error processing bill payment ${bill.id}:`, err);
                    failed++;
                }
            }
        }

        // ---------- 2. Recurring bill generation ----------
        if (bill.frequency !== 'once') {
            try {
                // Determine where to start generating from
                // If we have a lastGeneratedDueDate, start from there.
                // Otherwise start from the bill's own dueDate.

                let lastGenDate: Date;
                if (bill.lastGeneratedDueDate) {
                    lastGenDate = bill.lastGeneratedDueDate instanceof Timestamp
                        ? bill.lastGeneratedDueDate.toDate()
                        : new Date(bill.lastGeneratedDueDate);
                } else {
                    lastGenDate = bill.dueDate instanceof Timestamp
                        ? bill.dueDate.toDate()
                        : new Date(bill.dueDate);
                }

                // Helper to ensure we don't mutate original
                const cursorDate = new Date(lastGenDate);
                cursorDate.setHours(0, 0, 0, 0);

                // If this is the first run (no lastGenDate recorded), we might need to verify 
                // if we should generate the *next* one or if the *current* one counts.
                // Usually: current bill exists. We want to generate the NEXT one.
                // So if we haven't generated anything yet, the first generation check starts from dueDate.

                // Example: Bill due Jan 1. Today Jan 5. Frequency Daily.
                // We want Jan 2, Jan 3, Jan 4, Jan 5.
                // nextDueDate(Jan 1) -> Jan 2.
                // Jan 2 <= Jan 5? Yes. Create. Recurse.

                let nextDueDate = calculateNextDueDate(cursorDate, bill.frequency);
                let lastSuccessfullyGeneratedDate = cursorDate;

                while (nextDueDate <= generationHorizon) {
                    const dueDateToSave = new Date(nextDueDate);
                    dueDateToSave.setHours(0, 0, 0, 0);

                    // Deterministic ID: rec_{parentId}_{timestamp}
                    const deterministicId = `rec_${bill.id}_${dueDateToSave.getTime()}`;

                    // Use deterministic ID - if doc exists, it's a no-op
                    await billService.addBillDeterministic(deterministicId, {
                        userId: bill.userId,
                        title: bill.title,
                        amount: bill.amount,
                        currency: bill.currency,
                        dueDate: dueDateToSave,
                        category: bill.category,
                        isPaid: false,
                        frequency: 'once',
                        walletId: bill.walletId,
                        autoDeduct: bill.autoDeduct,
                        parentBillId: bill.id
                    });

                    recurring++;
                    lastSuccessfullyGeneratedDate = nextDueDate;
                    nextDueDate = calculateNextDueDate(nextDueDate, bill.frequency);
                }

                // Update the parent bill with the progress
                if (lastSuccessfullyGeneratedDate > lastGenDate) {
                    await billService.updateBill(bill.id!, {
                        lastGeneratedDueDate: lastSuccessfullyGeneratedDate
                    });
                }

            } catch (err) {
                console.error(`Error creating recurring bills for ${bill.id}:`, err);
            }
        }
    }

    return { processed, failed, recurring };
}

/**
 * Check if bills need processing (used to determine if we should run the processor)
 */
export function hasDueBills(bills: Bill[]): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return bills.some(bill => {
        // 1. Check for payment (strict today)
        if (bill.autoDeduct && !bill.isPaid && bill.walletId) {
            const billDate = new Date(bill.dueDate);
            billDate.setHours(0, 0, 0, 0);
            if (billDate <= today) return true;
        }

        // 2. Check for recurring generation (within 7 days)
        if (bill.frequency !== 'once') {
            // Look ahead 7 days
            const generationHorizon = new Date(today);
            generationHorizon.setDate(today.getDate() + 7);
            generationHorizon.setHours(0, 0, 0, 0);

            let lastGenDate: Date;
            if (bill.lastGeneratedDueDate) {
                lastGenDate = bill.lastGeneratedDueDate instanceof Timestamp
                    ? bill.lastGeneratedDueDate.toDate()
                    : new Date(bill.lastGeneratedDueDate);
            } else {
                lastGenDate = bill.dueDate instanceof Timestamp
                    ? bill.dueDate.toDate()
                    : new Date(bill.dueDate);
            }

            const cursorDate = new Date(lastGenDate);
            cursorDate.setHours(0, 0, 0, 0);
            const nextDueDate = calculateNextDueDate(cursorDate, bill.frequency);

            if (nextDueDate <= generationHorizon) return true;
        }

        return false;
    });
}
