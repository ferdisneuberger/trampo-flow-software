import { User } from '../../src/domain/users/entities/user.entity';
import { UserRepository } from '../../src/domain/users/repositories/user.repository';

function clone(user: User): User {
  return User.restore({
    id: user.id,
    username: user.username,
    passwordHash: user.passwordHash,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id);

    return user ? clone(user) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const normalized = username.trim().toLowerCase();
    const user = [...this.users.values()].find(
      (candidate) => candidate.username === normalized,
    );

    return user ? clone(user) : null;
  }

  async existsById(id: string): Promise<boolean> {
    return this.users.has(id);
  }

  async existsAny(): Promise<boolean> {
    return this.users.size > 0;
  }

  async create(user: User): Promise<void> {
    if (this.users.has(user.id)) {
      throw new Error(`User "${user.id}" already exists.`);
    }

    this.users.set(user.id, clone(user));
  }

  async update(user: User): Promise<void> {
    if (!this.users.has(user.id)) {
      throw new Error(`User "${user.id}" does not exist.`);
    }

    this.users.set(user.id, clone(user));
  }
}
