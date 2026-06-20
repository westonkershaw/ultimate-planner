import { z } from "zod";

// ── Macro / Nutrition ─────────────────────────────────────────────────────

export const ActivityLevelSchema = z.enum([
  "sedentary",
  "light",
  "moderate",
  "active",
  "extra",
]);

export const GoalTypeSchema = z.enum(["cut", "maintain", "bulk"]);

export const MacroLogSchema = z.object({
  weightLbs: z.number().positive("Weight must be positive").max(1000),
  heightInches: z.number().positive("Height must be positive").max(120),
  ageYears: z.number().int().min(10).max(120),
  sex: z.enum(["male", "female"]),
  activityLevel: ActivityLevelSchema,
  goalType: GoalTypeSchema,
  calorieGoal: z.number().int().positive().max(10000).optional(),
});

export type MacroLog = z.infer<typeof MacroLogSchema>;

// ── Finance ───────────────────────────────────────────────────────────────

export const FinanceCategorySchema = z.enum([
  "food",
  "transport",
  "housing",
  "health",
  "entertainment",
  "shopping",
  "subscriptions",
  "savings",
  "income",
  "other",
]);

export const FinanceEntrySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  amount: z.number().positive("Amount must be greater than 0").max(1_000_000),
  category: FinanceCategorySchema.default("other"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  notes: z.string().max(500).optional(),
});

export type FinanceEntry = z.infer<typeof FinanceEntrySchema>;

export const FinanceGoalSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(100),
  targetAmount: z.number().positive("Target must be positive").max(100_000_000),
  currentAmount: z.number().min(0).default(0),
  targetDate: z.string().optional(),
  monthlyContribution: z.number().min(0).optional(),
  interestRate: z.number().min(0).max(1).optional(),
});

export type FinanceGoalInput = z.infer<typeof FinanceGoalSchema>;

// ── Tasks ─────────────────────────────────────────────────────────────────

export const PrioritySchema = z.enum(["low", "normal", "high"]);

export const TaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200),
  priority: PrioritySchema.default("normal"),
  category: z.string().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
    .optional(),
  notes: z.string().max(1000).optional(),
  time: z.string().optional(),
  repeat: z.enum(["none", "daily", "weekly"]).default("none"),
});

export type TaskInput = z.infer<typeof TaskSchema>;

// ── Workout / NLP ─────────────────────────────────────────────────────────

export const WorkoutLogSchema = z.object({
  exercise: z.string().min(1, "Exercise name is required").max(100),
  weightLbs: z.number().positive("Weight must be positive").max(2000),
  sets: z.number().int().positive().max(100),
  reps: z.number().int().positive().max(1000),
  notes: z.string().max(500).optional(),
});

export type WorkoutLogInput = z.infer<typeof WorkoutLogSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────

/** Returns { success, data, errors } — use for form validation */
export function validate<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const key = issue.path.join(".") || "root";
    errors[key] = issue.message;
  });
  return { success: false, errors };
}
