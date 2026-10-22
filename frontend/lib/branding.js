// Display is an operator preference; it does not assert permission or endorsement.
export const universityAssetsEnabled = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_SHOW_UNIVERSITY_ASSETS === 'true' || process.env.NEXT_PUBLIC_QCU_ASSETS_AUTHORIZED === 'true';
