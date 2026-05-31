import { useState } from 'react';
import { Plus, Trash2, Wallet } from 'lucide-react';
import type { Expense, ExpenseCategory } from '../types';
import {
  EXPENSE_CATEGORY_OPTIONS,
  expenseEmoji,
  expenseLabel,
} from '../constants';
import { currencySymbol, formatMoney } from '../utils/currency';
import { toDateInput } from '../utils/date';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

export interface ExpenseInput {
  description?: string;
  category?: ExpenseCategory;
  cost?: number;
  date?: string | null;
}

export function ExpensesPanel({
  expenses,
  currency,
  canEdit,
  title = 'Expenses',
  emptyHint = 'No extra expenses yet. Track meals, snacks, pharmacies, and small shopping here.',
  onAdd,
  onUpdate,
  onDelete,
}: {
  expenses: Expense[];
  currency: string;
  canEdit: boolean;
  title?: string;
  emptyHint?: string;
  onAdd: (data: ExpenseInput) => Promise<void>;
  onUpdate: (id: string, data: ExpenseInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const total = (expenses || []).reduce(
    (s, e) => s + (Number(e.cost) || 0),
    0
  );

  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('lunch');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setDescription('');
    setAmount('');
    setDate('');
    setCategory('lunch');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const n = amount === '' ? 0 : Number(amount);
    if (Number.isNaN(n) || n < 0) {
      setError('Enter a non-negative amount');
      return;
    }
    setBusy(true);
    try {
      await onAdd({
        description: description.trim(),
        category,
        cost: n,
        date: date || null,
      });
      reset();
      setShowForm(false);
      toast.success('Expense added');
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, label: string) => {
    const ok = await confirm({
      title: 'Delete this expense?',
      message: `“${label}” will be removed from your trip total.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await onDelete(id);
      toast.success('Expense deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold flex items-center gap-2 text-sm">
          <Wallet className="w-4 h-4" /> {title}
          <span className="text-xs text-slate-500 font-normal">
            {expenses.length} · {formatMoney(total, currency)}
          </span>
        </div>
        {canEdit && (
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => setShowForm((s) => !s)}
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        )}
      </div>

      {showForm && canEdit && (
        <form
          onSubmit={submit}
          className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700"
        >
          <div className="grid grid-cols-2 gap-2">
            <select
              className="input py-1 text-xs"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              {EXPENSE_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.emoji} {o.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="input py-1 text-xs"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <input
            className="input py-1 text-xs"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-1">
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
                {currencySymbol(currency)}
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="input py-1 text-xs pl-5 w-full"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <button className="btn-primary" disabled={busy}>
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          {error && <div className="text-xs text-red-600">{error}</div>}
        </form>
      )}

      {expenses.length === 0 ? (
        <div className="text-xs text-slate-500">{emptyHint}</div>
      ) : (
        <ul className="space-y-1 max-h-64 overflow-y-auto scrollbar-thin">
          {expenses.map((e) => (
            <ExpenseRow
              key={e.id}
              expense={e}
              currency={currency}
              canEdit={canEdit}
              onDelete={() =>
                remove(e.id, e.description || expenseLabel(e.category))
              }
              onSave={async (patch) => {
                try {
                  await onUpdate(e.id, patch);
                  toast.success('Expense saved');
                } catch (err: any) {
                  toast.error(err.message);
                }
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ExpenseRow({
  expense,
  currency,
  canEdit,
  onSave,
  onDelete,
}: {
  expense: Expense;
  currency: string;
  canEdit: boolean;
  onSave: (patch: ExpenseInput) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(expense.description);
  const [amt, setAmt] = useState(String(expense.cost ?? 0));
  const [cat, setCat] = useState<ExpenseCategory>(expense.category);
  const [date, setDate] = useState(toDateInput(expense.date));

  const commit = async () => {
    const patch: ExpenseInput = {};
    if (desc !== expense.description) patch.description = desc;
    if (cat !== expense.category) patch.category = cat;
    const n = amt === '' ? 0 : Number(amt);
    if (!Number.isNaN(n) && n !== expense.cost) patch.cost = n;
    if (date !== toDateInput(expense.date)) patch.date = date || null;
    if (Object.keys(patch).length) await onSave(patch);
    setEditing(false);
  };

  if (!editing) {
    return (
      <li className="flex items-center gap-2 text-xs py-1">
        <span
          className="text-base leading-none"
          title={expenseLabel(expense.category)}
        >
          {expenseEmoji(expense.category)}
        </span>
        <div className="flex-1 min-w-0">
          <button
            type="button"
            className={`text-left w-full truncate ${
              canEdit ? 'hover:text-brand-600' : 'cursor-default'
            }`}
            onClick={() => canEdit && setEditing(true)}
          >
            {expense.description || expenseLabel(expense.category)}
          </button>
          {expense.date && (
            <div className="text-[10px] text-slate-500">
              {toDateInput(expense.date)}
            </div>
          )}
        </div>
        <span className="font-medium tabular-nums">
          {formatMoney(expense.cost, currency)}
        </span>
        {canEdit && (
          <button
            className="text-slate-400 hover:text-red-600"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </li>
    );
  }

  return (
    <li className="space-y-1 text-xs py-1 border-t border-slate-200 dark:border-slate-700">
      <div className="grid grid-cols-2 gap-1">
        <select
          className="input py-1 text-xs"
          value={cat}
          onChange={(e) => setCat(e.target.value as ExpenseCategory)}
        >
          {EXPENSE_CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.emoji} {o.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input py-1 text-xs"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <input
        className="input py-1 text-xs"
        placeholder="Description"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <div className="flex gap-1">
        <input
          type="number"
          min={0}
          step="0.01"
          className="input py-1 text-xs flex-1"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
        />
        <button className="btn-primary" onClick={commit} type="button">
          Save
        </button>
        <button
          className="btn-secondary"
          onClick={() => setEditing(false)}
          type="button"
        >
          Cancel
        </button>
      </div>
    </li>
  );
}
