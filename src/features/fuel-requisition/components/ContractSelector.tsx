import { Badge, Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import type { Contract } from '@/types';

interface ContractSelectorProps {
  contracts: Contract[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

const formatCurrency = (amount: number | null | undefined) =>
  typeof amount === 'number'
    ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
    : '—';

export function ContractSelector({ contracts, selectedId, onSelect, disabled }: ContractSelectorProps) {
  const sorted = [...contracts].sort((a, b) => a.remainingBalance - b.remainingBalance);

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-gray-700">Select Contract</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.length === 0 && <p className="text-sm text-gray-500">No active contracts for this supplier.</p>}
        {sorted.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            disabled={disabled}
            className={`w-full text-left border rounded-lg p-3 transition hover:border-indigo-500 ${
              selectedId === c.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{c.contractNumber}</p>
                <p className="text-xs text-gray-600">
                  Balance: {formatCurrency(c.remainingBalance)} / {formatCurrency(c.totalAmount)}
                </p>
              </div>
              <Badge variant={c.status === 'EXHAUSTED' ? 'default' : 'success'}>
                {c.status === 'EXHAUSTED' ? 'Exhausted' : 'Active'}
              </Badge>
            </div>
          </button>
        ))}
        {selectedId && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onSelect('')}
            disabled={disabled}
          >
            Clear selection
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default ContractSelector;
