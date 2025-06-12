export class CreateShiftExpenseDto {
  title: string;
  amount: number;
  description?: string;
}

export class UpdateShiftExpenseDto {
  title?: string;
  amount?: number;
  description?: string;
}