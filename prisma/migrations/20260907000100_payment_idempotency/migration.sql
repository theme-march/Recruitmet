-- Nullable fields preserve historical payments; reference remains a business reference.
ALTER TABLE `Payment`
  ADD COLUMN `idempotencyKey` VARCHAR(191) NULL,
  ADD COLUMN `requestHash` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `Payment_idempotencyKey_key` ON `Payment` (`idempotencyKey`);
