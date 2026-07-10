import { describe, expect, it } from 'vitest';
import { splitBubbleText } from '../../src/render/BubbleManager';
import { splitCompanionLine } from '../../api/_lib/filters';

describe('bubble text splitting (spec §5.5: split > 120 chars)', () => {
  it('keeps short lines whole', () => {
    expect(splitBubbleText('You did it!')).toEqual(['You did it!']);
    expect(splitCompanionLine('You did it!')).toEqual(['You did it!']);
  });

  it('splits long lines into ≤120-char pages without breaking words', () => {
    const long =
      'You said the scared part out loud and that always helps it feel smaller, because naming a worry takes some of its power away and lets a friend stand beside you while you face it together.';
    for (const splitter of [splitBubbleText, splitCompanionLine]) {
      const parts = splitter(long);
      expect(parts.length).toBeGreaterThan(1);
      for (const part of parts) expect(part.length).toBeLessThanOrEqual(121);
      expect(parts.join(' ').replace(/\s+/g, ' ')).toContain('naming a worry');
    }
  });
});
