import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ThemePreference } from '../../../domain/users/enums/theme-preference.enum';

export class UpdateThemePreferenceDto {
  @ApiProperty({
    enum: ThemePreference,
    enumName: 'ThemePreference',
    example: ThemePreference.LIGHT,
  })
  @IsEnum(ThemePreference)
  themePreference!: ThemePreference;
}
