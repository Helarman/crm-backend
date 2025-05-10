import { ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

interface CustomRequest extends Request {
  cookies: {
    [key: string]: string;
  };
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }
    
    return super.canActivate(context);
  }

  private extractToken(request: Request): string | null {
    // Проверяем Authorization header (Bearer Token)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.split(' ')[0] === 'Bearer') {
      return authHeader.split(' ')[1];
    }
    
    // Или проверяем куки (если токен там)
    return request.cookies?.accessToken || null;
  }
}