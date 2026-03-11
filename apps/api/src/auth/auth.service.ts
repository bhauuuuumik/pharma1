import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async login(phone: string, pin: string) {
    const staff = await this.prisma.staff.findFirst({ where: { phone } });
    if (!staff) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(pin, staff.pinHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return {
      token: Buffer.from(`${staff.id}:${staff.storeId}`).toString('base64'),
      staff: {
        id: staff.id,
        displayName: staff.displayName,
        role: staff.role,
        tenantId: staff.tenantId,
        storeId: staff.storeId,
      },
    };
  }

  async me(token: string) {
    const [staffId] = Buffer.from(token, 'base64').toString().split(':');
    return this.prisma.staff.findUnique({ where: { id: staffId } });
  }
}
