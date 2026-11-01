import { Injectable, UnauthorizedException, NotFoundException, BadRequestException, ForbiddenException, OnApplicationBootstrap } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { BusinessesService } from '../businesses/businesses.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { Types } from 'mongoose';
import { UserRoleEnum } from '../enums/UserRoleEnum';

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  constructor(
    private usersService: UsersService,
    private businessesService: BusinessesService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureSuperAdminExists();
  }

  async ensureSuperAdminExists() {
    try {
      const existingSuperAdmin = await this.usersService.findOne({ role: UserRoleEnum.SUPER_ADMIN });
      if (!existingSuperAdmin) {
        const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@businesshub.com').toLowerCase().trim();
        const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@2026!';
        const superAdminName = process.env.SUPER_ADMIN_NAME || 'Platform Super Admin';

        const userByEmail = await this.usersService.findByEmail(superAdminEmail);
        if (userByEmail) {
          await this.usersService.update(userByEmail._id as any, { role: UserRoleEnum.SUPER_ADMIN });
          console.log(`[BOOTSTRAP] Promoted existing account ${superAdminEmail} to Super Admin.`);
        } else {
          const hashed = await bcrypt.hash(superAdminPassword, 10);
          await this.usersService.create({
            full_name: superAdminName,
            email: superAdminEmail,
            password: hashed,
            role: UserRoleEnum.SUPER_ADMIN,
            business: null,
          });
          console.log(`[BOOTSTRAP] Successfully created default Super Admin account (${superAdminEmail}).`);
        }
      }
    } catch (err) {
      console.error('[BOOTSTRAP] Error ensuring Super Admin exists:', err);
    }
  }

  async validateUser(email: string, pass: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const match = await bcrypt.compare(pass, user.password);
    if (match) {
      // If business is blocked, forbid login for business admin/owner
      if (user.role !== UserRoleEnum.SUPER_ADMIN && (user.role as string) !== 'super_admin') {
        const business: any = user.business;
        if (business && typeof business === 'object' && business.status === 'blocked') {
          throw new UnauthorizedException(
            'Your business account has been blocked by the administration. Access is suspended.',
          );
        }
      }

      const userObj = user.toObject ? user.toObject() : { ...user };
      delete (userObj as any).password;
      return userObj;
    }
    return null;
  }

  async login(user: any) {
    const id = user._id ? user._id.toString() : user.id;
    const payload = {
      sub: id,
      email: user.email,
      role: user.role || UserRoleEnum.ADMIN,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async signup(createUserDto: CreateUserDto) {
    // Strict security check: Prevent any super admin creation attempt through API/registration
    if ((createUserDto as any).role === UserRoleEnum.SUPER_ADMIN || (createUserDto as any).role === 'super_admin') {
      throw new ForbiddenException('Creating a Super Admin account through registration is strictly prohibited.');
    }

    const existing = await this.usersService.findByEmail(createUserDto.email);
    if (existing) throw new UnauthorizedException('Email already in use');

    // 1. Create Business document (proper MongoDB Object reference)
    const business = await this.businessesService.create({
      name: createUserDto.business_name,
      type: createUserDto.business_type,
      status: 'active',
    });

    // 2. Hash password
    const hashed = await bcrypt.hash(createUserDto.password, 10);

    // 3. Create User document strictly defaulting to ADMIN role
    const user = await this.usersService.create({
      full_name: createUserDto.full_name,
      email: createUserDto.email,
      password: hashed,
      business: business._id as Types.ObjectId,
      role: UserRoleEnum.ADMIN,
    });

    // 4. Set Business owner reference to User ObjectId
    business.owner = user._id as Types.ObjectId;
    await business.save();

    // 5. Send welcome email notification via Nodemailer (Brevo SMTP)
    this.emailService
      .sendWelcomeEmail(
        user.email,
        createUserDto.full_name,
        createUserDto.business_name,
      )
      .catch((err) =>
        console.error(`[AUTH] Failed to send welcome email to ${user.email}:`, err),
      );

    // 6. Return populated user without password
    const populatedUser = await this.usersService.findById(user._id as Types.ObjectId);
    const userObj = populatedUser?.toObject ? populatedUser.toObject() : { ...user };
    delete (userObj as any).password;
    return userObj;
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('No account found with this email address');
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const userId = user._id ? user._id.toString() : (user as any).id;
    await this.usersService.update(userId, {
      reset_password_code: verificationCode,
      reset_password_expires: expiresAt,
    });

    // Send verification code email notification via Nodemailer (Brevo SMTP)
    await this.emailService.sendVerificationCodeEmail(
      user.email,
      verificationCode,
      user.full_name,
    );

    return {
      message: 'Verification code sent to your registered email',
      email,
    };
  }

  async verifyResetCode(email: string, code: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('No account found with this email address');
    }

    if (
      !user.reset_password_code ||
      user.reset_password_code !== code.trim() ||
      !user.reset_password_expires ||
      new Date() > new Date(user.reset_password_expires)
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    return {
      message: 'Verification code verified successfully',
      valid: true,
      email,
    };
  }

  async resetPassword(email: string, code: string, newPass: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('No account found with this email address');
    }

    if (
      !user.reset_password_code ||
      user.reset_password_code !== code.trim() ||
      !user.reset_password_expires ||
      new Date() > new Date(user.reset_password_expires)
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);
    const userId = user._id ? user._id.toString() : (user as any).id;

    await this.usersService.update(userId, {
      password: hashedPassword,
      reset_password_code: null,
      reset_password_expires: null,
    });

    return {
      message: 'Password has been reset successfully. Please log in with your new password.',
    };
  }
}
