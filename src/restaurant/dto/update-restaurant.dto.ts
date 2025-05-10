import { ArrayMinSize, IsNotEmpty, IsNumber, IsString } from 'class-validator'

export class UpdateRestaurantDto {

	title?: string

	address?: string


	images?: string[]

	latitude?: string

	longitude?: string
}
