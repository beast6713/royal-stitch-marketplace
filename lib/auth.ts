export type UserLike = {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  imageUrl?: string | null;
  primaryEmailAddress?: {
    emailAddress?: string | null;
  } | null;
} | null | undefined;

export function getUserDisplayName(user: UserLike) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();

  if (fullName) {
    return fullName;
  }

  if (user?.username) {
    return user.username;
  }

  const email = user?.primaryEmailAddress?.emailAddress;

  if (email) {
    return email.split("@")[0];
  }

  return "Studio Seller";
}

export function getUserPrimaryEmail(user: UserLike) {
  return user?.primaryEmailAddress?.emailAddress ?? null;
}

export function getUserAvatarUrl(user: UserLike) {
  return user?.imageUrl ?? null;
}
