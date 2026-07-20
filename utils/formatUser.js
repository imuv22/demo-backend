export const hasVerifiedCurrentProfilePicture = (user) =>
    Boolean(
        user.profilePicture?.publicId &&
        user.profilePictureVerification?.isVerified &&
        user.profilePictureVerification
            .profilePicturePublicId ===
            user.profilePicture.publicId
    );

export const formatUser = (user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    profilePictureVerified:
        hasVerifiedCurrentProfilePicture(user),
    profilePicture: user.profilePicture?.url
        ? {
            url: user.profilePicture.url,
        }
        : null,
});
