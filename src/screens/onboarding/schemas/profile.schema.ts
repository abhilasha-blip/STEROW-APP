import { z } from 'zod';
import { AVATARS, type AvatarId } from '@/constants/avatars';
import { strings } from '@/constants/strings';
import { fullNameError, isValidEmail } from '@/utils/validation';

const e = strings.onboarding.errors;

const avatarIds = AVATARS.map(a => a.id) as [AvatarId, ...AvatarId[]];

export const avatarSchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('preset'), id: z.enum(avatarIds) }),
    z.object({ type: z.literal('photo'), uri: z.string().min(1) }),
  ])
  .nullable();

/** 1/3 "My Profile" form state: Profile photo, Full Name, Email (no DOB: no backend column). */
export const profileFieldsSchema = z.object({
  avatar: avatarSchema,
  fullName: z.string(),
  /** Saved to user_details.email (the column can be updated; the login itself stays the phone number). */
  email: z.string(),
});

export type ProfileFormValues = z.infer<typeof profileFieldsSchema>;

/** Full Name and Email are required. */
export function createProfileSchema() {
  return profileFieldsSchema.superRefine((v, ctx) => {
    const nameError = fullNameError(v.fullName);
    if (nameError) {
      ctx.addIssue({ code: 'custom', path: ['fullName'], message: nameError });
    }
    if (!v.email.trim()) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: e.emailRequired });
    } else if (!isValidEmail(v.email)) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: e.emailInvalid });
    }
  });
}

export const profileSchema = createProfileSchema();
