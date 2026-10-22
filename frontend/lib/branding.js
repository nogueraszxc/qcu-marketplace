// Local layout review may show supplied university assets. Public use is opt-in only.
export const universityAssetsEnabled = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_QCU_ASSETS_AUTHORIZED === 'true';
