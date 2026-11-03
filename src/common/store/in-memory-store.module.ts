import { Global, Module } from '@nestjs/common';
import { InMemoryStore } from './in-memory.store';

/**
 * Satu instance InMemoryStore dipakai bersama oleh semua repository.
 * Module ini global agar tidak perlu di-import berulang kali.
 */
@Global()
@Module({
  providers: [InMemoryStore],
  exports: [InMemoryStore],
})
export class InMemoryStoreModule {}
