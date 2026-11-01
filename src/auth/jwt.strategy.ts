import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { UserRoleEnum } from '../enums/UserRoleEnum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'secretKey',
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) return null;
    const userObj = user.toObject ? user.toObject() : { ...user };
    delete (userObj as any).password;
    if (!userObj.role) {
      userObj.role = payload.role || UserRoleEnum.ADMIN;
    }

    // Check if the business is blocked for non-super-admins
    if (userObj.role !== UserRoleEnum.SUPER_ADMIN && userObj.role !== 'super_admin') {
      const business: any = userObj.business;
      if (business && typeof business === 'object' && business.status === 'blocked') {
        throw new UnauthorizedException(
          'Your business account has been blocked by the administration. Access is suspended.',
        );
      }
    }

    return userObj;
  }
}
