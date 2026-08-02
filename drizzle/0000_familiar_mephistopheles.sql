CREATE TABLE "expenses" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "expenses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"vertical_id" integer NOT NULL,
	"subtype_id" integer NOT NULL,
	"amount_paise" integer NOT NULL,
	"spent_on" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_paise_positive" CHECK ("expenses"."amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "subtypes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subtypes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"vertical_id" integer NOT NULL,
	"name" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subtypes_id_vertical_id_key" UNIQUE("id","vertical_id")
);
--> statement-breakpoint
CREATE TABLE "verticals" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "verticals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_subtype_vertical_fk" FOREIGN KEY ("subtype_id","vertical_id") REFERENCES "public"."subtypes"("id","vertical_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtypes" ADD CONSTRAINT "subtypes_vertical_id_verticals_id_fk" FOREIGN KEY ("vertical_id") REFERENCES "public"."verticals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_spent_on_idx" ON "expenses" USING btree ("spent_on");--> statement-breakpoint
CREATE INDEX "expenses_vertical_spent_on_idx" ON "expenses" USING btree ("vertical_id","spent_on");--> statement-breakpoint
CREATE INDEX "expenses_subtype_spent_on_idx" ON "expenses" USING btree ("subtype_id","spent_on");--> statement-breakpoint
CREATE UNIQUE INDEX "subtypes_vertical_name_lower_key" ON "subtypes" USING btree ("vertical_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "verticals_name_lower_key" ON "verticals" USING btree (lower("name"));