import { IsString } from "class-validator";

export class ApplyCustomerDto {
  @IsString()
  customerId: string;
}