import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { gutter, palette, rule, space } from '../theme/tokens';
import { fonts, type } from '../theme/type';

export type Fact = {
  readonly value: string;
  readonly label: string;
};

/**
 * The handoff's 3-cell fact grid: a 20px/800 value over a mono label, cells
 * divided by 1px vertical rules.
 */
export function FactGrid({ facts }: { readonly facts: readonly Fact[] }) {
  return (
    <View style={styles.row}>
      {facts.map((fact, index) => (
        <React.Fragment key={fact.label}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.cell}>
            <Text style={styles.value}>{fact.value}</Text>
            <Text style={type.monoSm}>{fact.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

/**
 * The handoff's numbered `WHAT PARENTS SHOULD KNOW` row: a mono index in
 * accent red, a line of copy, and a 1px rule above each.
 */
export function NumberedRow({ index, copy }: { readonly index: string; readonly copy: string }) {
  return (
    <View style={styles.numbered}>
      <Text style={[type.mono, styles.numberedIndex]}>{index}</Text>
      <Text style={[type.secondary, styles.numberedCopy]}>{copy}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  divider: { width: rule.hair, backgroundColor: palette.border },
  cell: { flex: 1, paddingHorizontal: gutter, paddingVertical: space.lg, gap: space.xs },
  value: { fontFamily: fonts.heavy, fontSize: 20, color: palette.ink },
  numbered: {
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: gutter,
    paddingVertical: space.md,
    borderTopWidth: rule.hair,
    borderTopColor: palette.border,
  },
  numberedIndex: { width: 20, color: palette.accentText },
  numberedCopy: { flex: 1 },
});
