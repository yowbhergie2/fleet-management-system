export interface Vehicle {
  id: string;
  dpwhNumber: string; // DPWH Control Number
  brand: string;
  model: string;
  plateNumber: string;
  year?: number;
  fuelType?: 'Gasoline' | 'Diesel' | 'Electric' | 'Hybrid';
  status?: 'Active' | 'Under Maintenance' | 'Retired';
  organizationId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVehicleData {
  dpwhNumber: string;
  brand: string;
  model: string;
  plateNumber: string;
  year?: number;
  fuelType?: 'Gasoline' | 'Diesel' | 'Electric' | 'Hybrid';
  status?: 'Active' | 'Under Maintenance' | 'Retired';
}
