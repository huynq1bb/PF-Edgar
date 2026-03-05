/**
 * Rule-based size suggestion from (height, weight) using store size chart.
 * Returns size name and confidence 0–100.
 */

export type SizeChartEntry = {
  sizeName: string;
  heightMin: number;
  heightMax: number;
  weightMin: number;
  weightMax: number;
};

export type SuggestedSize = {
  size: string;
  confidence: number;
};

function pointInRect(
  h: number,
  w: number,
  e: SizeChartEntry
): boolean {
  return (
    h >= e.heightMin &&
    h <= e.heightMax &&
    w >= e.weightMin &&
    w <= e.weightMax
  );
}

function centerDistance(
  h: number,
  w: number,
  e: SizeChartEntry
): number {
  const ch = (e.heightMin + e.heightMax) / 2;
  const cw = (e.weightMin + e.weightMax) / 2;
  return Math.sqrt((h - ch) ** 2 + (w - cw) ** 2);
}

/** Distance from point (h,w) to the rectangle (0 if inside). */
function distanceToRect(
  h: number,
  w: number,
  e: SizeChartEntry
): number {
  const dh =
    h < e.heightMin
      ? e.heightMin - h
      : h > e.heightMax
        ? h - e.heightMax
        : 0;
  const dw =
    w < e.weightMin
      ? e.weightMin - w
      : w > e.weightMax
        ? w - e.weightMax
        : 0;
  return Math.sqrt(dh * dh + dw * dw);
}

/**
 * Suggest size and confidence from height (cm) and weight (kg).
 * - Inside exactly one range -> that size, 100%.
 * - Inside overlap -> size whose center is closest, confidence 85–100%.
 * - Outside all -> nearest size by distance to rect, confidence 50–85%.
 */
export function getSuggestedSize(
  entries: SizeChartEntry[],
  height: number,
  weight: number
): SuggestedSize {
  if (entries.length === 0) {
    return { size: "", confidence: 0 };
  }

  const containing = entries.filter((e) =>
    pointInRect(height, weight, e)
  );

  if (containing.length === 1) {
    return {
      size: containing[0].sizeName,
      confidence: 100,
    };
  }

  if (containing.length > 1) {
    const byCenter = [...containing].sort(
      (a, b) =>
        centerDistance(height, weight, a) -
        centerDistance(height, weight, b)
    );
    const best = byCenter[0];
    const dist = centerDistance(height, weight, best);
    const maxDist = Math.max(
      ...containing.map((e) => centerDistance(height, weight, e))
    );
    const penalty = maxDist === 0 ? 0 : (dist / maxDist) * 15;
    return {
      size: best.sizeName,
      confidence: Math.round(100 - penalty),
    };
  }

  const withDistance = entries.map((e) => ({
    entry: e,
    dist: distanceToRect(height, weight, e),
  }));
  withDistance.sort((a, b) => a.dist - b.dist);
  const nearest = withDistance[0];
  const dist = nearest.dist;
  const range = 50;
  const confidence = Math.max(50, Math.round(85 - (dist / range) * 35));
  return {
    size: nearest.entry.sizeName,
    confidence: Math.min(100, confidence),
  };
}
