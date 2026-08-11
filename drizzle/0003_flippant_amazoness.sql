CREATE TABLE `aiQuotaWindows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`scopeType` enum('account','anonymous') NOT NULL,
	`scopeHash` varchar(64) NOT NULL,
	`windowStart` timestamp NOT NULL,
	`requestCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiQuotaWindows_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_quota_scope_window_unique` UNIQUE(`scopeType`,`scopeHash`,`windowStart`)
);
--> statement-breakpoint
CREATE TABLE `aiRequestEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`scopeType` enum('account','anonymous') NOT NULL,
	`scopeHash` varchar(64) NOT NULL,
	`procedure` enum('generate','explain','convert','generateRelated') NOT NULL,
	`outcome` enum('succeeded','rejected','failed') NOT NULL,
	`promptCharacters` int NOT NULL,
	`messageCount` int NOT NULL,
	`responseCharacters` int,
	`durationMs` int,
	`failureCode` varchar(64),
	`quotaWindowStart` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiRequestEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `aiQuotaWindows` ADD CONSTRAINT `aiQuotaWindows_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `aiRequestEvents` ADD CONSTRAINT `aiRequestEvents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_quota_user_window_idx` ON `aiQuotaWindows` (`userId`,`windowStart`);--> statement-breakpoint
CREATE INDEX `ai_events_user_created_idx` ON `aiRequestEvents` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ai_events_scope_created_idx` ON `aiRequestEvents` (`scopeType`,`scopeHash`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ai_events_procedure_outcome_idx` ON `aiRequestEvents` (`procedure`,`outcome`,`createdAt`);