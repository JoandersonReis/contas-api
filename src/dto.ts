import { Transform } from "class-transformer";
import {
  IsEmail,
  IsInt,
  IsString,
  Length,
  Max,
  Min,
  Matches,
  IsDateString,
} from "class-validator";
const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;
export class LoginDto {
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @Length(3, 254)
  email!: string;
  @IsString() @Length(10, 128) password!: string;
}
export class RegisterDto extends LoginDto {
  @Transform(trim) @IsString() @Length(2, 80) name!: string;
}
export class FolderDto {
  @Transform(trim) @IsString() @Length(1, 80) name!: string;
  @IsInt() @Min(1) @Max(1000000000) budgetCents!: number;
}
export class EntryDto {
  @Transform(trim) @IsString() @Length(1, 160) description!: string;
  @IsInt() @Min(1) @Max(1000000000) amountCents!: number;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) date!: string;
}
