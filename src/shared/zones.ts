export function isDeckZone(status: string): boolean {
  return status === 'idea';
}

export function isPlaymatZone(status: string): boolean {
  return (
    status === 'spec' ||
    status === 'plan' ||
    status === 'in-progress' ||
    status === 'blocked' ||
    status === 'review'
  );
}

export function isGraveyardZone(status: string): boolean {
  return status === 'complete';
}
