import { User } from '../entities/user.entity';

export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>;

  abstract findByUsername(username: string): Promise<User | null>;

  abstract existsById(id: string): Promise<boolean>;

  abstract existsAny(): Promise<boolean>;

  abstract create(user: User): Promise<void>;

  abstract update(user: User): Promise<void>;
}
