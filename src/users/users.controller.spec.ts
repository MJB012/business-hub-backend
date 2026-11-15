import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { BusinessesService } from '../businesses/businesses.service';
import { UserRoleEnum } from '../enums/UserRoleEnum';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let businessesService: Partial<Record<keyof BusinessesService, jest.Mock>>;

  const mockBusinessId = '654321654321654321654321';
  const mockOwnerId = '111111111111111111111111';
  const mockMemberId = '222222222222222222222222';

  const mockOwnerUser = {
    _id: mockOwnerId,
    full_name: 'John Owner',
    email: 'owner@test.com',
    role: UserRoleEnum.ADMIN,
    business: { _id: mockBusinessId },
  };

  const mockReq = {
    user: mockOwnerUser,
  };

  const mockMember = {
    _id: mockMemberId,
    full_name: 'Jane Cashier',
    email: 'cashier@test.com',
    role: UserRoleEnum.CASHIER,
    business: mockBusinessId,
    toObject: () => ({
      _id: mockMemberId,
      full_name: 'Jane Cashier',
      email: 'cashier@test.com',
      role: UserRoleEnum.CASHIER,
      business: mockBusinessId,
    }),
  };

  beforeEach(async () => {
    usersService = {
      findAllByBusiness: jest.fn().mockResolvedValue([mockMember]),
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(mockMember),
      create: jest.fn().mockResolvedValue(mockMember),
      update: jest.fn().mockResolvedValue(mockMember),
      remove: jest.fn().mockResolvedValue({ message: 'Team member removed successfully' }),
    };

    businessesService = {
      findById: jest.fn().mockResolvedValue({
        _id: mockBusinessId,
        owner: mockOwnerId,
        name: 'Test Store',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: BusinessesService, useValue: businessesService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should list all team members for current business', async () => {
      const result = await controller.findAll(mockReq);
      expect(result).toHaveLength(1);
      expect(usersService.findAllByBusiness).toHaveBeenCalledWith(mockBusinessId);
    });

    it('should deny access if user is not an admin/manager', async () => {
      const unauthorizedReq = {
        user: { ...mockOwnerUser, role: UserRoleEnum.CASHIER },
      };
      await expect(controller.findAll(unauthorizedReq)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createTeamMember', () => {
    it('should create a new team member with valid role (cashier, manager, etc.)', async () => {
      const dto = {
        full_name: 'Alice Staff',
        email: 'alice@test.com',
        password: 'securePassword123',
        role: UserRoleEnum.CASHIER,
      };

      const res = await controller.createTeamMember(mockReq, dto as any);
      expect(res.full_name).toBe('Jane Cashier');
      expect(usersService.create).toHaveBeenCalled();
    });

    it('STRICT: should reject attempt to create a super_admin via web/API', async () => {
      const dto = {
        full_name: 'Fake SuperAdmin',
        email: 'hacker@test.com',
        password: 'password123',
        role: UserRoleEnum.SUPER_ADMIN,
      };

      await expect(controller.createTeamMember(mockReq, dto as any)).rejects.toThrow(ForbiddenException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('STRICT: should reject if email already exists with a role', async () => {
      usersService.findByEmail!.mockResolvedValueOnce({
        _id: 'some_id',
        email: 'cashier@test.com',
        role: UserRoleEnum.MANAGER,
      });

      const dto = {
        full_name: 'Duplicate Email',
        email: 'cashier@test.com',
        password: 'password123',
        role: UserRoleEnum.CASHIER,
      };

      await expect(controller.createTeamMember(mockReq, dto as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('updateTeamMember', () => {
    it('should update role of a team member', async () => {
      const dto = { role: UserRoleEnum.MANAGER };
      await controller.updateTeamMember(mockReq, mockMemberId, dto);
      expect(usersService.update).toHaveBeenCalled();
    });

    it('STRICT: should forbid promoting anyone to super_admin', async () => {
      const dto = { role: UserRoleEnum.SUPER_ADMIN };
      await expect(controller.updateTeamMember(mockReq, mockMemberId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('should forbid changing primary owner role away from admin', async () => {
      usersService.findById!.mockResolvedValueOnce({
        _id: mockOwnerId,
        business: mockBusinessId,
        role: UserRoleEnum.ADMIN,
      });

      const dto = { role: UserRoleEnum.CASHIER };
      await expect(controller.updateTeamMember(mockReq, mockOwnerId, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeTeamMember', () => {
    it('should remove a team member', async () => {
      const res = await controller.removeTeamMember(mockReq, mockMemberId);
      expect(res.message).toContain('removed successfully');
      expect(usersService.remove).toHaveBeenCalledWith(mockMemberId);
    });

    it('should forbid deleting the primary business owner', async () => {
      usersService.findById!.mockResolvedValueOnce({
        _id: mockOwnerId,
        business: mockBusinessId,
        role: UserRoleEnum.ADMIN,
      });

      await expect(controller.removeTeamMember(mockReq, mockOwnerId)).rejects.toThrow(ForbiddenException);
      expect(usersService.remove).not.toHaveBeenCalled();
    });
  });
});
