let lastKnownSeed = 0;

// Generates simple unique Id
export const simpleUid = (length = 11): string => {
  if (length < 5 || length > 11) {
    throw new Error('length value must be between 5 and 11');
  }
  lastKnownSeed = Math.random();
  const seed = Math.random() * lastKnownSeed;
  return seed.toString(16).split('.')[1].slice(0, length);
};
