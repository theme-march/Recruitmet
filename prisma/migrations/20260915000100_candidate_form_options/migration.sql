-- Seed the former hard-coded Direct Candidate options into their canonical tables.
-- Existing rows are preserved; these inserts only fill missing names/codes.

INSERT INTO `ProfessionCategory` (`id`, `code`, `name`, `sortOrder`, `active`)
SELECT 'direct-category-technician', 'TECHNICIAN', 'Technician', 10, true
WHERE NOT EXISTS (SELECT 1 FROM `ProfessionCategory` WHERE `code` = 'TECHNICIAN' OR `name` = 'Technician');
INSERT INTO `ProfessionCategory` (`id`, `code`, `name`, `sortOrder`, `active`)
SELECT 'direct-category-driver', 'DRIVER', 'Driver', 20, true
WHERE NOT EXISTS (SELECT 1 FROM `ProfessionCategory` WHERE `code` = 'DRIVER' OR `name` = 'Driver');
INSERT INTO `ProfessionCategory` (`id`, `code`, `name`, `sortOrder`, `active`)
SELECT 'direct-category-construction', 'CONSTRUCTION', 'Construction', 30, true
WHERE NOT EXISTS (SELECT 1 FROM `ProfessionCategory` WHERE `code` = 'CONSTRUCTION' OR `name` = 'Construction');
INSERT INTO `ProfessionCategory` (`id`, `code`, `name`, `sortOrder`, `active`)
SELECT 'direct-category-indoor', 'INDOOR_WORKER', 'Indoor Worker', 40, true
WHERE NOT EXISTS (SELECT 1 FROM `ProfessionCategory` WHERE `code` = 'INDOOR_WORKER' OR `name` = 'Indoor Worker');
INSERT INTO `ProfessionCategory` (`id`, `code`, `name`, `sortOrder`, `active`)
SELECT 'direct-category-hospitality', 'HOSPITALITY', 'Hospitality', 50, true
WHERE NOT EXISTS (SELECT 1 FROM `ProfessionCategory` WHERE `code` = 'HOSPITALITY' OR `name` = 'Hospitality');
INSERT INTO `ProfessionCategory` (`id`, `code`, `name`, `sortOrder`, `active`)
SELECT 'direct-category-manufacturing', 'MANUFACTURING', 'Manufacturing', 60, true
WHERE NOT EXISTS (SELECT 1 FROM `ProfessionCategory` WHERE `code` = 'MANUFACTURING' OR `name` = 'Manufacturing');
INSERT INTO `ProfessionCategory` (`id`, `code`, `name`, `sortOrder`, `active`)
SELECT 'direct-category-cleaning', 'CLEANING', 'Cleaning', 70, true
WHERE NOT EXISTS (SELECT 1 FROM `ProfessionCategory` WHERE `code` = 'CLEANING' OR `name` = 'Cleaning');

INSERT INTO `Profession` (`id`, `code`, `name`, `categoryId`, `active`)
SELECT 'direct-profession-driver', 'DRIVER', 'Driver', c.`id`, true FROM `ProfessionCategory` c
WHERE (c.`code` = 'DRIVER' OR c.`name` = 'Driver') AND NOT EXISTS (SELECT 1 FROM `Profession` WHERE `code` = 'DRIVER');
INSERT INTO `Profession` (`id`, `code`, `name`, `categoryId`, `active`)
SELECT 'direct-profession-bike-rider', 'BIKE_RIDER', 'Bike Rider', c.`id`, true FROM `ProfessionCategory` c
WHERE (c.`code` = 'DRIVER' OR c.`name` = 'Driver') AND NOT EXISTS (SELECT 1 FROM `Profession` WHERE `code` = 'BIKE_RIDER');
INSERT INTO `Profession` (`id`, `code`, `name`, `categoryId`, `active`)
SELECT 'direct-profession-electrical-plumbing', 'ELECTRICIAN_PLUMBER', 'Electrician / Plumber', c.`id`, true FROM `ProfessionCategory` c
WHERE (c.`code` = 'TECHNICIAN' OR c.`name` = 'Technician') AND NOT EXISTS (SELECT 1 FROM `Profession` WHERE `code` = 'ELECTRICIAN_PLUMBER');
INSERT INTO `Profession` (`id`, `code`, `name`, `categoryId`, `active`)
SELECT 'direct-profession-electrician', 'ELECTRICIAN', 'Electrician', c.`id`, true FROM `ProfessionCategory` c
WHERE (c.`code` = 'TECHNICIAN' OR c.`name` = 'Technician') AND NOT EXISTS (SELECT 1 FROM `Profession` WHERE `code` = 'ELECTRICIAN');
INSERT INTO `Profession` (`id`, `code`, `name`, `categoryId`, `active`)
SELECT 'direct-profession-plumber', 'PLUMBER', 'Plumber', c.`id`, true FROM `ProfessionCategory` c
WHERE (c.`code` = 'TECHNICIAN' OR c.`name` = 'Technician') AND NOT EXISTS (SELECT 1 FROM `Profession` WHERE `code` = 'PLUMBER');
INSERT INTO `Profession` (`id`, `code`, `name`, `categoryId`, `active`)
SELECT 'direct-profession-pipe-fitter', 'PIPE_FITTER', 'Pipe Fitter', c.`id`, true FROM `ProfessionCategory` c
WHERE (c.`code` = 'TECHNICIAN' OR c.`name` = 'Technician') AND NOT EXISTS (SELECT 1 FROM `Profession` WHERE `code` = 'PIPE_FITTER');
INSERT INTO `Profession` (`id`, `code`, `name`, `categoryId`, `active`)
SELECT 'direct-profession-welder', 'WELDER', 'Welder', c.`id`, true FROM `ProfessionCategory` c
WHERE (c.`code` = 'TECHNICIAN' OR c.`name` = 'Technician') AND NOT EXISTS (SELECT 1 FROM `Profession` WHERE `code` = 'WELDER');
INSERT INTO `Profession` (`id`, `code`, `name`, `categoryId`, `active`)
SELECT 'direct-profession-technician', 'TECHNICIAN', 'Technician', c.`id`, true FROM `ProfessionCategory` c
WHERE (c.`code` = 'TECHNICIAN' OR c.`name` = 'Technician') AND NOT EXISTS (SELECT 1 FROM `Profession` WHERE `code` = 'TECHNICIAN');
INSERT INTO `Profession` (`id`, `code`, `name`, `categoryId`, `active`)
SELECT 'direct-profession-construction-worker', 'GENERAL_CONSTRUCTION_WORKER', 'General Construction Worker', c.`id`, true FROM `ProfessionCategory` c
WHERE (c.`code` = 'CONSTRUCTION' OR c.`name` = 'Construction') AND NOT EXISTS (SELECT 1 FROM `Profession` WHERE `code` = 'GENERAL_CONSTRUCTION_WORKER');
INSERT INTO `Profession` (`id`, `code`, `name`, `categoryId`, `active`)
SELECT 'direct-profession-steel-fixer', 'STEEL_FIXER', 'Steel Fixer', c.`id`, true FROM `ProfessionCategory` c
WHERE (c.`code` = 'CONSTRUCTION' OR c.`name` = 'Construction') AND NOT EXISTS (SELECT 1 FROM `Profession` WHERE `code` = 'STEEL_FIXER');
INSERT INTO `Profession` (`id`, `code`, `name`, `categoryId`, `active`)
SELECT 'direct-profession-mason', 'MASON', 'Mason', c.`id`, true FROM `ProfessionCategory` c
WHERE (c.`code` = 'CONSTRUCTION' OR c.`name` = 'Construction') AND NOT EXISTS (SELECT 1 FROM `Profession` WHERE `code` = 'MASON');
INSERT INTO `Profession` (`id`, `code`, `name`, `categoryId`, `active`)
SELECT 'direct-profession-indoor-worker', 'INDOOR_WORKER', 'Indoor Worker', c.`id`, true FROM `ProfessionCategory` c
WHERE (c.`code` = 'INDOOR_WORKER' OR c.`name` = 'Indoor Worker') AND NOT EXISTS (SELECT 1 FROM `Profession` WHERE `code` = 'INDOOR_WORKER');
INSERT INTO `Profession` (`id`, `code`, `name`, `categoryId`, `active`)
SELECT 'direct-profession-packaging-worker', 'PACKAGING_WORKER', 'Packaging Worker', c.`id`, true FROM `ProfessionCategory` c
WHERE (c.`code` = 'INDOOR_WORKER' OR c.`name` = 'Indoor Worker') AND NOT EXISTS (SELECT 1 FROM `Profession` WHERE `code` = 'PACKAGING_WORKER');
INSERT INTO `Profession` (`id`, `code`, `name`, `categoryId`, `active`)
SELECT 'direct-profession-assistant-cashier', 'ASSISTANT_CASHIER', 'Asst. Cashier', c.`id`, true FROM `ProfessionCategory` c
WHERE (c.`code` = 'INDOOR_WORKER' OR c.`name` = 'Indoor Worker') AND NOT EXISTS (SELECT 1 FROM `Profession` WHERE `code` = 'ASSISTANT_CASHIER');
INSERT INTO `Profession` (`id`, `code`, `name`, `categoryId`, `active`)
SELECT 'direct-profession-hospitality-worker', 'HOSPITALITY_WORKER', 'Hospitality Worker', c.`id`, true FROM `ProfessionCategory` c
WHERE (c.`code` = 'HOSPITALITY' OR c.`name` = 'Hospitality') AND NOT EXISTS (SELECT 1 FROM `Profession` WHERE `code` = 'HOSPITALITY_WORKER');
INSERT INTO `Profession` (`id`, `code`, `name`, `categoryId`, `active`)
SELECT 'direct-profession-manufacturing-worker', 'MANUFACTURING_WORKER', 'Manufacturing Worker', c.`id`, true FROM `ProfessionCategory` c
WHERE (c.`code` = 'MANUFACTURING' OR c.`name` = 'Manufacturing') AND NOT EXISTS (SELECT 1 FROM `Profession` WHERE `code` = 'MANUFACTURING_WORKER');
INSERT INTO `Profession` (`id`, `code`, `name`, `categoryId`, `active`)
SELECT 'direct-profession-cleaner', 'CLEANER', 'Cleaner', c.`id`, true FROM `ProfessionCategory` c
WHERE (c.`code` = 'CLEANING' OR c.`name` = 'Cleaning') AND NOT EXISTS (SELECT 1 FROM `Profession` WHERE `code` = 'CLEANER');

INSERT INTO `Company` (`id`, `code`, `name`, `country`, `status`, `createdAt`, `updatedAt`)
SELECT 'direct-company-almarai', 'DIRECT_ALMARAI', 'Almarai', 'Saudi Arabia', 'Active', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (SELECT 1 FROM `Company` WHERE `name` = 'Almarai' AND `country` = 'Saudi Arabia');
INSERT INTO `Company` (`id`, `code`, `name`, `country`, `status`, `createdAt`, `updatedAt`)
SELECT 'direct-company-binladen', 'DIRECT_SBG', 'Saudi Binladen Group', 'Saudi Arabia', 'Active', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (SELECT 1 FROM `Company` WHERE `name` = 'Saudi Binladen Group' AND `country` = 'Saudi Arabia');
INSERT INTO `Company` (`id`, `code`, `name`, `country`, `status`, `createdAt`, `updatedAt`)
SELECT 'direct-company-nesma', 'DIRECT_NESMA', 'Nesma & Partners', 'Saudi Arabia', 'Active', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (SELECT 1 FROM `Company` WHERE `name` = 'Nesma & Partners' AND `country` = 'Saudi Arabia');
INSERT INTO `Company` (`id`, `code`, `name`, `country`, `status`, `createdAt`, `updatedAt`)
SELECT 'direct-company-keeta', 'DIRECT_KEETA', 'Keeta Saudi Arabia', 'Saudi Arabia', 'Active', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (SELECT 1 FROM `Company` WHERE `name` = 'Keeta Saudi Arabia' AND `country` = 'Saudi Arabia');
INSERT INTO `Company` (`id`, `code`, `name`, `country`, `status`, `createdAt`, `updatedAt`)
SELECT 'direct-company-albaik', 'DIRECT_AL_BAIK', 'Al Baik', 'Saudi Arabia', 'Active', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (SELECT 1 FROM `Company` WHERE `name` = 'Al Baik' AND `country` = 'Saudi Arabia');
INSERT INTO `Company` (`id`, `code`, `name`, `country`, `status`, `createdAt`, `updatedAt`)
SELECT 'direct-company-nesto', 'DIRECT_NESTO', 'Nesto Supermarket', 'Saudi Arabia', 'Active', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (SELECT 1 FROM `Company` WHERE `name` = 'Nesto Supermarket' AND `country` = 'Saudi Arabia');
INSERT INTO `Company` (`id`, `code`, `name`, `country`, `status`, `createdAt`, `updatedAt`)
SELECT 'direct-company-almabani', 'DIRECT_AL_MABANI', 'Al Mabani', 'Saudi Arabia', 'Active', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (SELECT 1 FROM `Company` WHERE `name` = 'Al Mabani' AND `country` = 'Saudi Arabia');
INSERT INTO `Company` (`id`, `code`, `name`, `country`, `status`, `createdAt`, `updatedAt`)
SELECT 'direct-company-lulu', 'DIRECT_LULU', 'Lulu Hypermarket', 'Saudi Arabia', 'Active', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
WHERE NOT EXISTS (SELECT 1 FROM `Company` WHERE `name` = 'Lulu Hypermarket' AND `country` = 'Saudi Arabia');

INSERT IGNORE INTO `MasterData` (`id`, `type`, `code`, `name`, `sortOrder`, `active`, `createdAt`, `updatedAt`) VALUES
('direct-status-new', 'DIRECT_FILE_STATUS', 'NEW', 'New', 10, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('direct-status-interested', 'DIRECT_FILE_STATUS', 'INTERESTED', 'Interested', 20, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('direct-status-pre-confirmed', 'DIRECT_FILE_STATUS', 'PRE_CONFIRMED', 'Pre-Confirmed', 30, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('direct-status-active', 'DIRECT_FILE_STATUS', 'ACTIVE', 'Active', 40, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('direct-status-hold', 'DIRECT_FILE_STATUS', 'HOLD', 'Hold', 50, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('direct-status-closed', 'DIRECT_FILE_STATUS', 'CLOSED', 'Closed', 60, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
