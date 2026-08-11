ALTER TABLE `aiQuotaWindows` DROP INDEX `ai_quota_scope_window_unique`;--> statement-breakpoint
DROP INDEX `ai_quota_user_window_idx` ON `aiQuotaWindows`;--> statement-breakpoint
ALTER TABLE `aiQuotaWindows` ADD `windowType` enum('hour','day') DEFAULT 'hour' NOT NULL;--> statement-breakpoint
ALTER TABLE `aiQuotaWindows` ADD CONSTRAINT `ai_quota_scope_window_unique` UNIQUE(`scopeType`,`scopeHash`,`windowType`,`windowStart`);--> statement-breakpoint
CREATE INDEX `ai_quota_user_window_idx` ON `aiQuotaWindows` (`userId`,`windowType`,`windowStart`);