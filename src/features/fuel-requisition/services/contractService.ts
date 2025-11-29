import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, FuelRequisition } from '@/types';

export async function deductFromContract(opts: {
  requisition: FuelRequisition;
  contractId: string;
  actualLiters: number;
  priceAtPurchase: number;
  user: User;
}) {
  const { requisition, contractId, actualLiters, priceAtPurchase, user } = opts;
  const contractRef = doc(db, 'contracts', contractId);
  const contractSnap = await getDoc(contractRef);
  if (!contractSnap.exists()) throw new Error('Contract not found');
  const contract = contractSnap.data() as any;

  const amount = actualLiters * priceAtPurchase;
  const balanceBefore = contract.remainingBalance || 0;
  const balanceAfter = Math.max(0, balanceBefore - amount);

  await addDoc(collection(db, 'contract_transactions'), {
    contractId,
    requisitionId: requisition.id,
    risNumber: requisition.risNumber || null,
    transactionType: 'DEDUCTION',
    amount,
    liters: actualLiters,
    pricePerLiter: priceAtPurchase,
    balanceBefore,
    balanceAfter,
    remarks: `Fuel requisition ${requisition.risNumber || requisition.id}`,
    createdBy: user.id,
    createdByName: user.displayName,
    organizationId: user.organizationId,
    createdAt: serverTimestamp(),
  });

  const updateData: any = {
    remainingBalance: balanceAfter,
    updatedAt: serverTimestamp(),
  };
  if (balanceAfter <= 0) {
    updateData.status = 'EXHAUSTED';
    updateData.exhaustedAt = serverTimestamp();
  }

  await updateDoc(contractRef, updateData);
}
