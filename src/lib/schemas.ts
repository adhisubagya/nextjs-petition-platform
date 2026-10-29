import { z } from "zod";

export const NAME_MAX = 40;
export const MESSAGE_MAX = 500;

export const commentInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(NAME_MAX, `Name must be ${NAME_MAX} characters or fewer`),
  message: z
    .string()
    .trim()
    .min(1, "Comment cannot be blank")
    .max(MESSAGE_MAX, `Comment must be ${MESSAGE_MAX} characters or fewer`),
  avatarUrl: z.url({ protocol: /^https$/ }).nullable().default(null),
});

export const commentRequestSchema = commentInputSchema.extend({
  turnstileToken: z.string().min(1, "Verification required"),
});

export type CommentInput = z.infer<typeof commentInputSchema>;
export type CommentRequest = z.infer<typeof commentRequestSchema>;
