import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request) => request?.cookies?.accessToken,
      ]),
      
      ignoreExpiration: false,
      
      secretOrKey: configService.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: any) {
    this.logger.debug(`Validating user with ID: ${payload.id}`);
    
    // Проверяем обязательное поле
    if (!payload.id) {
      this.logger.warn('Invalid JWT payload - missing ID');
      throw new UnauthorizedException('Invalid token payload');
    }
    
    return { 
      id: payload.id,
      ...(payload.email && { email: payload.email })
    };
  }
}