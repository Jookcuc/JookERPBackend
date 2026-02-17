import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserKey } from '../auth/entities/user-key.entity';
import type { GenerateUseKeyDto, GenerateMultipleKeysDto, GeneratedKeyDto, KeyError } from './dto/use-keys.dto';
import * as crypto from 'crypto';

@Injectable()
export class UseKeysService {
  constructor(
    @InjectRepository(UserKey)
    private userKeyRepository: Repository<UserKey>,
  ) {}

  async generateUseKey(dto: GenerateUseKeyDto): Promise<GeneratedKeyDto> {
    const { prefix = 'JK', expiresDays = 30 } = dto;

    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
        const keyValue = `${prefix}${randomPart}`;

        const exists = await this.userKeyRepository.findOne({
          where: { keyValue },
        });

        if (exists) {
          attempts++;
          continue;
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresDays);


        const keyData: Partial<UserKey> = {
          keyValue,
          userId: undefined,
          used: false,
          expiresAt,
        };

        const userKey = this.userKeyRepository.create(keyData);
        const savedKey = await this.userKeyRepository.save(userKey);

        return {
          keyValue: savedKey.keyValue,
          expiresAt: savedKey.expiresAt,
          createdAt: savedKey.createdAt,
          status: 'DISPONIBLE',
        };
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new BadRequestException('No se pudo generar una llave única');
        }
      }
    }

    throw new BadRequestException('No se pudo generar una llave única');
  }

  async generateMultipleKeys(dto: GenerateMultipleKeysDto) {
    const { quantity, prefix = 'JK', expiresDays = 30 } = dto;

    const keys: GeneratedKeyDto[] = [];
    const errors: KeyError[] = [];

    for (let i = 0; i < quantity; i++) {
      try {
        const key = await this.generateUseKey({ prefix, expiresDays });
        keys.push(key);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    return {
      success: true,
      generated: keys.length,
      requested: quantity,
      keys,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async getAllKeys() {
    const keys = await this.userKeyRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return keys.map(key => this.mapKeyToDto(key));
  }

  async getAvailableKeys() {
    const keys = await this.userKeyRepository.find({
      where: { used: false },
      order: { createdAt: 'DESC' },
    });

    return keys
      .filter(key => !key.isExpired())
      .map(key => this.mapKeyToDto(key));
  }

  async getUsedKeys() {
    const keys = await this.userKeyRepository.find({
      where: { used: true },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return keys.map(key => this.mapKeyToDto(key));
  }

  async getKeysStats() {
    const allKeys = await this.userKeyRepository.find();

    const stats = {
      total: allKeys.length,
      available: 0,
      used: 0,
      expired: 0,
    };

    allKeys.forEach(key => {
      if (key.used) {
        stats.used++;
      } else if (key.isExpired()) {
        stats.expired++;
      } else {
        stats.available++;
      }
    });

    return stats;
  }

  async deleteKey(keyValue: string) {
    const key = await this.userKeyRepository.findOne({
      where: { keyValue },
    });

    if (!key) {
      throw new NotFoundException('Llave no encontrada');
    }

    if (key.used) {
      throw new BadRequestException('No se puede eliminar una llave que ya ha sido usada');
    }

    await this.userKeyRepository.remove(key);

    return {
      success: true,
      message: 'Llave eliminada exitosamente',
    };
  }

  async cleanExpiredKeys() {
    const now = new Date();

    const result = await this.userKeyRepository
      .createQueryBuilder()
      .delete()
      .where('used = :used', { used: false })
      .andWhere('expires_at < :now', { now })
      .execute();

    return {
      success: true,
      deleted: result.affected || 0,
    };
  }

  private mapKeyToDto(key: UserKey) {
    let status: 'DISPONIBLE' | 'USADA' | 'EXPIRADA' = 'DISPONIBLE';

    if (key.used) {
      status = 'USADA';
    } else if (key.isExpired()) {
      status = 'EXPIRADA';
    }

    return {
      keyValue: key.keyValue,
      expiresAt: key.expiresAt,
      status,
      createdAt: key.createdAt,
      userId: key.userId,
      userEmail: key.user?.email,
      userName: key.user ? `${key.user.firstName} ${key.user.lastName}` : undefined,
    };
  }
}