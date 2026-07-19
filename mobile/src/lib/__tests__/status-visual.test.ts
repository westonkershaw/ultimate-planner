/**
 * status-visual.test.ts — coverage for the resolved-status -> display
 * mapping used by the Dating list/detail screens.
 *
 * Kept in its own file, separate from people-grouping.test.ts: status-visual.ts
 * imports StatusColors from '@/constants/palette' (not '@/constants/theme'),
 * which has no react-native/global.css import and is parseable by vitest's
 * node environment. Isolating it to this file still means a future regression
 * there only takes down status-visual assertions, not the unrelated
 * grouping/sorting suite in people-grouping.test.ts.
 */
import { describe, expect, it } from 'vitest';

import { statusVisual } from '../status-visual';

describe('statusVisual', () => {
  it('renders "past" as a filled dot, not celebratory', () => {
    const visual = statusVisual('past');
    expect(visual.shape).toBe('dot');
    expect(visual.filled).toBe(true);
    expect(visual.celebratory).toBeUndefined();
  });

  it('renders "interested" as a filled dot, not celebratory', () => {
    const visual = statusVisual('interested');
    expect(visual.shape).toBe('dot');
    expect(visual.filled).toBe(true);
    expect(visual.celebratory).toBeUndefined();
  });

  it('renders "dating" as a filled dot, not celebratory', () => {
    const visual = statusVisual('dating');
    expect(visual.shape).toBe('dot');
    expect(visual.filled).toBe(true);
    expect(visual.celebratory).toBeUndefined();
  });

  it('renders "engaged" as a HOLLOW star, not celebratory', () => {
    const visual = statusVisual('engaged');
    expect(visual.shape).toBe('star');
    expect(visual.filled).toBe(false);
    expect(visual.celebratory).toBeUndefined();
  });

  it('renders "newlywed" as a celebratory filled light-blue dot with a distinct label', () => {
    const visual = statusVisual('newlywed');
    expect(visual.shape).toBe('dot');
    expect(visual.filled).toBe(true);
    expect(visual.celebratory).toBe(true);
    expect(visual.color).toBe('#38bdf8'); // StatusColors.lightBlue
    expect(visual.label).toBe('Newlywed');
    expect(visual.label).not.toBe(statusVisual('married').label);
  });

  it('renders "married" as a filled dark-blue dot, not celebratory', () => {
    const visual = statusVisual('married');
    expect(visual.shape).toBe('dot');
    expect(visual.filled).toBe(true);
    expect(visual.celebratory).toBeUndefined();
    expect(visual.color).toBe('#2563eb'); // StatusColors.darkBlue
  });

  it('renders null as an unfilled dot with no label', () => {
    const visual = statusVisual(null);
    expect(visual.shape).toBe('dot');
    expect(visual.filled).toBe(false);
    expect(visual.celebratory).toBeUndefined();
    expect(visual.label).toBe('');
  });

});
