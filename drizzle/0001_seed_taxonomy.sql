-- Seeds the expense taxonomy: ten verticals and the subtypes beneath them.
--
-- This is a migration rather than a standalone seed script so that the database
-- still rebuilds from scratch off committed SQL, which is the guarantee the
-- rest of `drizzle/` exists to keep. The taxonomy is close to structural in
-- this app -- with `verticals` empty there is nothing to pick and nothing to
-- chart -- so it belongs in the same chain as the tables it fills.
--
-- `id` is GENERATED ALWAYS AS IDENTITY on both tables, so ids can neither be
-- hardcoded here nor carried from the first insert to the second. Subtypes
-- resolve their parent by name instead. `ON CONFLICT DO NOTHING` needs no
-- conflict target: it catches the `lower(name)` unique indexes on both tables,
-- which leaves this file safe to re-apply after a partial failure.

INSERT INTO "verticals" ("name") VALUES
	('Food'),
	('Convenience'),
	('Subscriptions'),
	('Transport'),
	('Health'),
	('Shopping'),
	('Leisure'),
	('People'),
	('Other'),
	('Loans')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "subtypes" ("vertical_id", "name")
SELECT v."id", s."name"
FROM "verticals" v
JOIN (VALUES
	-- Food is filed by platform, because the question worth answering is which
	-- app the money goes to. 'Bistro' is Blinkit's prepared-food arm; a Blinkit
	-- grocery order belongs under Convenience instead, since the split is by
	-- what was bought rather than by which app it was bought in.
	('Food', 'Bistro'),
	('Food', 'Zepto Café'),
	('Food', 'Swiggy'),
	('Food', 'Zomato'),
	('Food', 'EatClub'),
	('Food', 'Swish'),
	('Food', 'Dining Out'),
	('Food', 'Others'),

	-- Quick commerce, also by platform. Groceries live here, not under Food.
	('Convenience', 'Blinkit'),
	('Convenience', 'Zepto'),
	('Convenience', 'Instamart'),
	('Convenience', 'Others'),

	-- Recurring bills and streaming share a vertical for now. Utilities are not
	-- subscriptions in any strict sense, but both are money that leaves every
	-- month without a decision being made.
	('Subscriptions', 'Electricity'),
	('Subscriptions', 'Gas'),
	('Subscriptions', 'Water'),
	('Subscriptions', 'Internet'),
	('Subscriptions', 'Mobile'),
	('Subscriptions', 'Streaming'),
	('Subscriptions', 'Music'),
	('Subscriptions', 'Apps & Cloud'),

	-- No fuel or servicing here: the taxonomy assumes no owned vehicle.
	('Transport', 'Rapido'),
	('Transport', 'Uber'),
	('Transport', 'Metro'),
	('Transport', 'Others'),

	('Health', 'Doctor'),
	('Health', 'Medicines'),
	('Health', 'Diagnostics'),
	('Health', 'Insurance'),
	('Health', 'Fitness'),

	('Shopping', 'Clothing'),
	('Shopping', 'Electronics'),
	('Shopping', 'Home & Kitchen'),
	('Shopping', 'Personal Care'),

	('Leisure', 'Movies & Events'),
	('Leisure', 'Hobbies'),
	('Leisure', 'Books'),
	('Leisure', 'Games'),

	('People', 'Gifts'),
	('People', 'Festivals'),
	('People', 'Family Support'),
	('People', 'Donations'),

	-- `expenses.subtype_id` is NOT NULL, so a vertical with no subtypes cannot
	-- take an expense at all. Even the catch-all needs one row beneath it.
	('Other', 'Uncategorized'),

	-- The full EMI is logged, not just the interest: the cash is genuinely gone,
	-- and splitting each payment would mean re-deriving the amortisation split
	-- every month.
	('Loans', 'Home Loan'),
	('Loans', 'Vehicle Loan'),
	('Loans', 'Personal Loan'),
	('Loans', 'Education Loan'),
	('Loans', 'Credit Card Dues')
) AS s("vertical", "name") ON lower(v."name") = lower(s."vertical")
-- Without this the join order is left to the planner, so the same file would
-- hand out different ids in different databases. Identity values are drawn in
-- the order rows are produced, so ordering here makes the seed reproducible.
ORDER BY v."id", s."name"
ON CONFLICT DO NOTHING;
