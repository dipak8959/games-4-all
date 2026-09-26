import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { type } from '../theme/type';
import { gutter, space } from '../theme/tokens';

/**
 * A section header, in the two registers the design actually uses.
 *
 * `strong` (the default) is the one that carries the page: 16px extra-bold
 * in ink, uppercase and opened out — `ON THIS DEVICE`, `WHAT PARENTS SHOULD
 * KNOW`, `TODAY'S PLAY TIME`. It is a heading, and it should look like one.
 *
 * `quiet` is the small grey machine label the design reserves for a picker
 * row — `WHO IS PLAYING` sitting above the cells you choose from. It names
 * the control rather than announcing a section.
 *
 * Getting these the wrong way round — setting every header in quiet grey
 * mono — is what flattened the whole interface: with no strong headers,
 * nothing anchored a screen and every shelf ran into the next.
 *
 * The right-hand `meta` is always the small mono form: a count, a size, a
 * state. Never the heading itself.
 */
export function SectionHeader({
  label,
  meta,
  tone = 'strong',
}: {
  readonly label: string;
  readonly meta?: string;
  readonly tone?: 'strong' | 'quiet';
}) {
  return (
    <View style={styles.row}>
      <Text style={tone === 'strong' ? type.h5 : type.mono} accessibilityRole="header">
        {label}
      </Text>
      {meta ? <Text style={type.mono}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: gutter,
    paddingTop: 14,
    paddingBottom: space.sm,
  },
});
