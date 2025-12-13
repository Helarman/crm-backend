import { PartialType } from '@nestjs/swagger';
import { CreateNetworkTariffDto } from './create-network-tariff.dto';

export class UpdateNetworkTariffDto extends PartialType(CreateNetworkTariffDto) {}