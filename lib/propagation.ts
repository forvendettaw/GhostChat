let shareCount = 0;

export function trackPropagation(type: 'invite' | 'share' | 'install') {
  shareCount++;
  console.log(`Propagation tracked: ${type}, total: ${shareCount}`);
}

export function getShareCount(): number {
  return shareCount;
}

export function getUnlockedFeatures() {
  return {
    themes: shareCount >= 1,
    voice: shareCount >= 3,
    groups: shareCount >= 5,
    priority: shareCount >= 10
  };
}
