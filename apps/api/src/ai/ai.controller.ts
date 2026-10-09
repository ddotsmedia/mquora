import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TranslationService } from './translation.service';

interface TranslateDto {
  text: string;
}

@Controller('api/v1/ai')
export class AiController {
  constructor(private translationService: TranslationService) {}

  @Post('translate/manglish-to-ml')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async manglishToMalayalam(@Body() dto: TranslateDto) {
    const result = await this.translationService.manglishToMalayalam(dto.text);
    return { text: result };
  }

  @Post('translate/ml-to-en')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async malayalamToEnglish(@Body() dto: TranslateDto) {
    const result = await this.translationService.malayalamToEnglish(dto.text);
    return { text: result };
  }
}
