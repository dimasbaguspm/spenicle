// Mock drizzle-orm functions
import { eq, and, asc, desc } from 'drizzle-orm';
import { Mock, Mocked, vi } from 'vitest';

import { db } from '../../../core/db/config.ts';
import { validate } from '../../../helpers/validation/index.ts';
import { users, User, PagedUsers } from '../../../models/schema.ts';
import { UserService } from '../user.service.ts';

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
}));

// Mock database configuration
vi.mock('../../../core/db/config.ts', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock validation functions
vi.mock('../../../helpers/validation/index.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../helpers/validation/index.ts')>();
  return {
    ...actual,
    validate: vi.fn(),
  };
});

// Get the mocked functions with proper typing
const mockEq = eq as Mock;
const mockAnd = and as Mock;
const mockAsc = asc as Mock;
const mockDesc = desc as Mock;
const mockDb = db as Mocked<typeof db>;
const mockValidate = validate as Mock;

describe('UserService', () => {
  let userService: UserService;

  const mockUser: User = {
    id: 1,
    groupId: 1,
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    name: 'Test User',
    isActive: true,
    isOnboard: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const pagedUser: PagedUsers = {
    items: [mockUser],
    totalItems: 1,
    pageSize: 25,
    pageNumber: 1,
    totalPages: 1,
  };

  const mockPrepare = vi.fn().mockReturnValue({
    execute: vi.fn().mockResolvedValue([mockUser]),
  });

  const mockSelectMany = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        prepare: mockPrepare,
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockReturnValue({
              prepare: mockPrepare,
            }),
          }),
        }),
      }),
    }),
  });

  beforeEach(() => {
    userService = new UserService();
    vi.clearAllMocks();
  });

  describe('getMany', () => {
    it('should get users with default pagination and sorting', async () => {
      const mockFilters = { sortBy: 'createdAt', sortOrder: 'asc', pageSize: 25, pageNumber: 1 };

      mockValidate.mockResolvedValue({ data: mockFilters });

      mockDb.select.mockReturnValue(mockSelectMany());

      const result = await userService.getMany();

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), {});
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockAsc).toHaveBeenCalledWith(users.createdAt);
      expect(result).toEqual(pagedUser);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        id: 1,
        groupId: 1,
        email: 'test@example.com',
        name: 'Test',
        isActive: true,
        isOnboard: false,
        sortBy: 'name',
        sortOrder: 'desc',
        pageSize: 10,
        pageNumber: 2,
      };

      mockValidate.mockResolvedValue({ data: filters });

      mockDb.select.mockReturnValue(mockSelectMany());

      const result = await userService.getMany(filters);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockEq).toHaveBeenCalledWith(users.id, 1);
      expect(mockEq).toHaveBeenCalledWith(users.groupId, 1);
      expect(mockEq).toHaveBeenCalledWith(users.email, 'test@example.com');
      expect(mockEq).toHaveBeenCalledWith(users.name, 'Test');
      expect(mockEq).toHaveBeenCalledWith(users.isActive, true);
      expect(mockEq).toHaveBeenCalledWith(users.isOnboard, false);
      expect(mockDesc).toHaveBeenCalledWith(users.name);
      expect(result).toEqual({ ...pagedUser, pageSize: 10, pageNumber: 2 });
    });

    it('should handle empty conditions', async () => {
      const mockFilters = { sortBy: 'createdAt', sortOrder: 'asc', pageSize: 25, pageNumber: 1 };

      mockValidate.mockResolvedValue({ data: mockFilters });

      mockDb.select.mockReturnValue(mockSelectMany());

      await userService.getMany();

      expect(mockSelectMany().from().where).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getSingle', () => {
    it('should get a single user by conditions', async () => {
      const filters = { id: 1, groupId: 1, isOnboard: true };

      mockValidate.mockResolvedValue({ data: filters });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await userService.getSingle(filters);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), filters);
      expect(mockEq).toHaveBeenCalledWith(users.id, 1);
      expect(mockEq).toHaveBeenCalledWith(users.groupId, 1);
      expect(mockEq).toHaveBeenCalledWith(users.isOnboard, true);
      expect(mockAnd).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return undefined when no user found', async () => {
      const filters = { id: 999 };

      mockValidate.mockResolvedValue({ data: filters });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      mockDb.select.mockReturnValue(mockSelect());

      const result = await userService.getSingle(filters);

      expect(result).toBeUndefined();
    });
  });

  describe('createSingle', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        groupId: 1,
      };

      mockValidate.mockResolvedValue({ data: userData });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      mockDb.insert.mockReturnValue(mockInsert());

      const result = await userService.createSingle(userData);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), userData);
      expect(mockDb.insert).toHaveBeenCalledWith(users);
      expect(mockInsert().values).toHaveBeenCalledWith({
        email: userData.email,
        passwordHash: userData.password,
        name: userData.name,
        groupId: userData.groupId,
        isActive: false,
        isOnboard: false,
      });
      expect(result).toEqual(mockUser);
    });

    it('should create a new user with isOnboard set to false by default', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'hashedpassword',
        name: 'New User',
        groupId: 1,
      };

      mockValidate.mockResolvedValue({ data: userData });

      const newUser = { ...mockUser, email: userData.email, name: userData.name, isOnboard: false };
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newUser]),
        }),
      });
      mockDb.insert.mockReturnValue(mockInsert());

      const result = await userService.createSingle(userData);

      expect(mockInsert().values).toHaveBeenCalledWith({
        email: userData.email,
        passwordHash: userData.password,
        name: userData.name,
        groupId: userData.groupId,
        isActive: false,
        isOnboard: false,
      });
      expect(result.isOnboard).toBe(false);
    });
  });

  describe('updateSingle', () => {
    it('should update a user by id', async () => {
      const id = 1;
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        isActive: false,
        isOnboard: true,
      };

      mockValidate.mockResolvedValue({ data: updateData });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockUser, ...updateData }]),
          }),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdate());

      const result = await userService.updateSingle(id, updateData);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), updateData);
      expect(mockDb.update).toHaveBeenCalledWith(users);
      expect(mockUpdate().set).toHaveBeenCalledWith(updateData);
      expect(mockEq).toHaveBeenCalledWith(users.id, id);
      expect(result).toEqual({ ...mockUser, ...updateData });
    });

    it('should update user onboarding status', async () => {
      const id = 1;
      const onboardingData = {
        isOnboard: true,
      };

      mockValidate.mockResolvedValue({ data: onboardingData });

      const onboardedUser = { ...mockUser, isOnboard: true };
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([onboardedUser]),
          }),
        }),
      });
      mockDb.update.mockReturnValue(mockUpdate());

      const result = await userService.updateSingle(id, onboardingData);

      expect(mockValidate).toHaveBeenCalledWith(expect.any(Object), onboardingData);
      expect(mockDb.update).toHaveBeenCalledWith(users);
      expect(mockUpdate().set).toHaveBeenCalledWith(onboardingData);
      expect(mockEq).toHaveBeenCalledWith(users.id, id);
      expect(result.isOnboard).toBe(true);
    });
  });

  describe('deleteSingle', () => {
    it('should delete a user by id', async () => {
      const id = 1;

      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUser]),
        }),
      });
      mockDb.delete.mockReturnValue(mockDelete());

      const result = await userService.deleteSingle(id);

      expect(mockDb.delete).toHaveBeenCalledWith(users);
      expect(mockEq).toHaveBeenCalledWith(users.id, id);
      expect(result).toEqual(mockUser);
    });
  });
});
