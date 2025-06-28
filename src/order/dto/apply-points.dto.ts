import { IsNumber, Min } from "class-validator";

export class ApplyPointsDto {
  @IsNumber()
  @Min(1)
  points: number;
}