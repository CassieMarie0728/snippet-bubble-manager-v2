CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`parentId` int,
	`icon` varchar(64),
	`color` varchar(16),
	`description` text,
	`revision` int NOT NULL DEFAULT 1,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_user_client_unique` UNIQUE(`userId`,`clientId`)
);
--> statement-breakpoint
CREATE TABLE `collectionSnippets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`snippetId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collectionSnippets_id` PRIMARY KEY(`id`),
	CONSTRAINT `collection_snippets_unique` UNIQUE(`collectionId`,`snippetId`)
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`color` varchar(16),
	`isPublic` boolean NOT NULL DEFAULT false,
	`revision` int NOT NULL DEFAULT 1,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collections_id` PRIMARY KEY(`id`),
	CONSTRAINT `collections_user_client_unique` UNIQUE(`userId`,`clientId`)
);
--> statement-breakpoint
CREATE TABLE `shares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`snippetId` int NOT NULL,
	`token` varchar(96) NOT NULL,
	`snapshot` json NOT NULL,
	`viewCount` int NOT NULL DEFAULT 0,
	`maxViews` int,
	`expiresAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shares_id` PRIMARY KEY(`id`),
	CONSTRAINT `shares_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `snippetTags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snippetId` int NOT NULL,
	`tag` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `snippetTags_id` PRIMARY KEY(`id`),
	CONSTRAINT `snippet_tags_unique` UNIQUE(`snippetId`,`tag`)
);
--> statement-breakpoint
CREATE TABLE `snippetVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snippetId` int NOT NULL,
	`version` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`code` text NOT NULL,
	`language` varchar(80) NOT NULL,
	`description` text NOT NULL,
	`changeDescription` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `snippetVersions_id` PRIMARY KEY(`id`),
	CONSTRAINT `snippet_versions_unique` UNIQUE(`snippetId`,`version`)
);
--> statement-breakpoint
CREATE TABLE `snippets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` varchar(64) NOT NULL,
	`categoryId` int,
	`title` varchar(255) NOT NULL,
	`code` text NOT NULL,
	`language` varchar(80) NOT NULL,
	`description` text NOT NULL,
	`isFavorite` boolean NOT NULL DEFAULT false,
	`isPinned` boolean NOT NULL DEFAULT false,
	`lastCopiedAt` timestamp,
	`copyCount` int NOT NULL DEFAULT 0,
	`revision` int NOT NULL DEFAULT 1,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `snippets_id` PRIMARY KEY(`id`),
	CONSTRAINT `snippets_user_client_unique` UNIQUE(`userId`,`clientId`)
);
--> statement-breakpoint
CREATE TABLE `syncChanges` (
	`sequence` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityType` enum('snippet','category','collection','share') NOT NULL,
	`changeType` enum('upsert','delete','link','unlink') NOT NULL,
	`entityClientId` varchar(64) NOT NULL,
	`revision` int NOT NULL,
	`payload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `syncChanges_sequence` PRIMARY KEY(`sequence`)
);
--> statement-breakpoint
CREATE TABLE `syncOperations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`operationId` varchar(64) NOT NULL,
	`entityType` enum('snippet','category','collection','share') NOT NULL,
	`operationType` enum('upsert','delete','link','unlink') NOT NULL,
	`entityClientId` varchar(64) NOT NULL,
	`baseRevision` int NOT NULL DEFAULT 0,
	`payload` json NOT NULL,
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `syncOperations_id` PRIMARY KEY(`id`),
	CONSTRAINT `sync_operations_user_operation_unique` UNIQUE(`userId`,`operationId`)
);
--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_parentId_categories_id_fk` FOREIGN KEY (`parentId`) REFERENCES `categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collectionSnippets` ADD CONSTRAINT `collectionSnippets_collectionId_collections_id_fk` FOREIGN KEY (`collectionId`) REFERENCES `collections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collectionSnippets` ADD CONSTRAINT `collectionSnippets_snippetId_snippets_id_fk` FOREIGN KEY (`snippetId`) REFERENCES `snippets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collections` ADD CONSTRAINT `collections_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shares` ADD CONSTRAINT `shares_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shares` ADD CONSTRAINT `shares_snippetId_snippets_id_fk` FOREIGN KEY (`snippetId`) REFERENCES `snippets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `snippetTags` ADD CONSTRAINT `snippetTags_snippetId_snippets_id_fk` FOREIGN KEY (`snippetId`) REFERENCES `snippets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `snippetVersions` ADD CONSTRAINT `snippetVersions_snippetId_snippets_id_fk` FOREIGN KEY (`snippetId`) REFERENCES `snippets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `snippets` ADD CONSTRAINT `snippets_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `snippets` ADD CONSTRAINT `snippets_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `syncChanges` ADD CONSTRAINT `syncChanges_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `syncOperations` ADD CONSTRAINT `syncOperations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `categories_user_updated_idx` ON `categories` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `categories_parent_idx` ON `categories` (`parentId`);--> statement-breakpoint
CREATE INDEX `collection_snippets_snippet_idx` ON `collectionSnippets` (`snippetId`);--> statement-breakpoint
CREATE INDEX `collections_user_updated_idx` ON `collections` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `shares_snippet_status_idx` ON `shares` (`snippetId`,`revokedAt`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `snippet_tags_tag_idx` ON `snippetTags` (`tag`);--> statement-breakpoint
CREATE INDEX `snippet_versions_created_idx` ON `snippetVersions` (`snippetId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `snippets_user_updated_idx` ON `snippets` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `snippets_user_deleted_idx` ON `snippets` (`userId`,`deletedAt`);--> statement-breakpoint
CREATE INDEX `snippets_category_idx` ON `snippets` (`categoryId`);--> statement-breakpoint
CREATE INDEX `sync_changes_user_sequence_idx` ON `syncChanges` (`userId`,`sequence`);--> statement-breakpoint
CREATE INDEX `sync_operations_user_entity_idx` ON `syncOperations` (`userId`,`entityType`,`entityClientId`);