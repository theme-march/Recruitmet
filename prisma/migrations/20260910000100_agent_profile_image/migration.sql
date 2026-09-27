ALTER TABLE `Agent`
  ADD COLUMN `profileImageObjectId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `Agent_profileImageObjectId_key`
  ON `Agent`(`profileImageObjectId`);

ALTER TABLE `Agent`
  ADD CONSTRAINT `Agent_profileImageObjectId_fkey`
  FOREIGN KEY (`profileImageObjectId`) REFERENCES `StoredObject`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
