export function isDeckZone(status: string): boolean {
  return status === 'idea';
}

export function isActiveZone(status: string): boolean {
  return (
    status === 'spec' ||
    status === 'plan' ||
    status === 'in-progress' ||
    status === 'blocked'
  );
}

export function isReviewZone(status: string): boolean {
  return status === 'review';
}

export function isGraveyardZone(status: string): boolean {
  return status === 'complete';
}
