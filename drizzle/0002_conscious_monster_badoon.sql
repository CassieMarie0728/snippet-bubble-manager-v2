CREATE TABLE `syncConflicts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`operationId` varchar(64) NOT NULL,
	`entityType` enum('snippet','category','collection','share') NOT NULL,
	`entityClientId` varchar(64) NOT NULL,
	`baseRevision` int NOT NULL,
	`serverRevision` int NOT NULL,
	`localPayload` json NOT NULL,
	`serverPayload` json NOT NULL,
	`resolution` enum('unresolved','server_wins','local_wins') NOT NULL DEFAULT 'unresolved',
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `syncConflicts_id` PRIMARY KEY(`id`),
	CONSTRAINT `sync_conflicts_user_operation_unique` UNIQUE(`userId`,`operationId`)
);
--> statement-breakpoint
ALTER TABLE `syncConflicts` ADD CONSTRAINT `syncConflicts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `sync_conflicts_user_resolution_idx` ON `syncConflicts` (`userId`,`resolution`,`createdAt`);