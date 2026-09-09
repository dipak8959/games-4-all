import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { type } from '../theme/type';
import { gutter, space } from '../theme/tokens';

/**
 * A section label: uppercase machine type on the left, an optional count or
 * status on the right.
 *
 * Deliberately quiet — the label names the shelf below it for a grown-up,
 * while the shelf itself stays navigable by icon alone for a child who
 * can't read it yet.
 */
export function SectionHeader({
  label,
  meta,
}: {
  readonly label: string;
  readonly meta?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={type.mono} accessibilityRole="header">
        {label}
      </Text>
      {meta ? <Text style={type.mono}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingTop: 14,
    paddingBottom: space.sm,
  },
});
