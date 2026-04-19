import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { TapRequestDto } from './dto/tap-request.dto';
import { AuthGuard } from './auth.guard';

@Controller('recommendation')
export class RecommendationController {
  constructor(private readonly service: RecommendationService) {}

  @Post()
  @UseGuards(AuthGuard)
  recommend(@Req() req: any, @Body() dto: TapRequestDto) {
    return this.service.recommend(req.userId, dto);
  }
}
