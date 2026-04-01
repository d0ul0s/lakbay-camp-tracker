export const replaceTags = (text: string, data: Record<string, string | number | null | undefined>) => {
  if (!text) return '';
  let result = text;
  
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'gi');
    result = result.replace(regex, (value ?? '') as string);
  });
  
  return result;
};

export const getBranding = (appSettings: any, currentUser: any, detectedYL?: string) => {
  return {
    campName: appSettings?.campName || 'LAKBAY 2026',
    churchName: appSettings?.churchName || 'UNITED PENTECOSTAL CHURCH PHILIPPINES',
    campDate: appSettings?.campDate || 'MAY 20-23, 2026',
    campLocation: appSettings?.campLocation || 'SUMMER CAMP VENUE',
    campSignatory: (currentUser?.role === 'coordinator' && detectedYL)
      ? detectedYL
      : (appSettings?.campSignatory || 'CAMP DIRECTOR'),
    logoUrl: appSettings?.logoUrl || null
  };
};
