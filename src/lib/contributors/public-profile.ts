export type PublicContributorProfileInput = {
  isPublic: boolean;
  handle: string;
  displayName: string;
  bio: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  createdAt: Date;
  approvedContributions: number;
};

export type PublicContributorProfile = {
  handle: string;
  displayName: string;
  bio: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  joinedAt: Date;
  approvedContributions: number;
};

export function toPublicContributorProfile(
  profile: PublicContributorProfileInput,
): PublicContributorProfile | null {
  if (!profile.isPublic) return null;
  return {
    handle: profile.handle,
    displayName: profile.displayName,
    bio: profile.bio,
    websiteUrl: profile.websiteUrl,
    githubUrl: profile.githubUrl,
    joinedAt: profile.createdAt,
    approvedContributions: profile.approvedContributions,
  };
}
