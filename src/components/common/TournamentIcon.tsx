import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

// Shared hand-built vector icon set (no react-native-svg / vector-icons dependency — this project has had
// font-loading issues with icon libraries before, so every icon is plain absolutely-positioned Views).
// Originally lived only in app/(player)/tournaments.tsx; moved here so other screens (e.g. the organizer
// Match screen) can reuse the same icons instead of duplicating them or reaching across the app/src boundary.
export type TournamentIconName =
  | 'trophy' | 'search' | 'location' | 'calendar' | 'people' | 'single' | 'clock' | 'chevron' | 'share'
  | 'medal' | 'map' | 'menu' | 'check' | 'play' | 'info' | 'lock' | 'shuttle'
  | 'document' | 'star' | 'bars' | 'settings' | 'bracket' | 'activity' | 'quote';

export function TournamentIcon({ name, size = 20 }: { name: TournamentIconName; size?: number }) {
  const color = colors.lime;
  const stroke = Math.max(2, Math.round(size / 9));
  const box = { width: size, height: size } as const;
  if (name === 'chevron') return <View style={[box, s.vectorIcon]}><View style={[s.chevronPart, { width: size * .42, height: stroke, backgroundColor: color, transform: [{ rotate: '45deg' }], top: size * .34 }]} /><View style={[s.chevronPart, { width: size * .42, height: stroke, backgroundColor: color, transform: [{ rotate: '-45deg' }], top: size * .62 }]} /></View>;
  if (name === 'share') return <View style={[box, s.vectorIcon]}><View style={[s.shareStem, { backgroundColor: color, width: stroke, height: size * .65, left: size * .48, top: size * .18, transform: [{ rotate: '45deg' }] }]} /><View style={[s.shareHead, { borderColor: color, borderTopWidth: stroke, borderRightWidth: stroke, width: size * .38, height: size * .38, right: size * .02, top: size * .02, transform: [{ rotate: '-2deg' }] }]} /><View style={[s.shareDot, { backgroundColor: color, width: size * .2, height: size * .2, borderRadius: size, left: size * .05, bottom: size * .03 }]} /></View>;
  if (name === 'search') return <View style={[box, s.vectorIcon]}><View style={[s.searchLens, { width: size * .56, height: size * .56, borderColor: color, borderWidth: stroke }]} /><View style={[s.searchHandle, { width: size * .38, height: stroke, backgroundColor: color, transform: [{ rotate: '45deg' }], right: -size * .04, bottom: size * .12 }]} /></View>;
  if (name === 'location') return <View style={[box, s.vectorIcon]}><View style={[s.pin, { width: size * .62, height: size * .62, borderColor: color, borderWidth: stroke, borderRadius: size, transform: [{ rotate: '45deg' }], top: size * .08 }]} /><View style={[s.pinDot, { width: size * .18, height: size * .18, borderRadius: size, backgroundColor: color, top: size * .28 }]} /></View>;
  if (name === 'calendar') return <View style={[box, s.vectorIcon]}><View style={[s.calendarBody, { borderColor: color, borderWidth: stroke, borderRadius: size * .12, width: size * .78, height: size * .7, top: size * .2 }]} /><View style={[s.calendarBar, { backgroundColor: color, height: stroke, width: size * .78, top: size * .38 }]} /><View style={[s.calendarPin, { backgroundColor: color, width: stroke, height: size * .2, left: size * .2, top: 0 }]} /><View style={[s.calendarPin, { backgroundColor: color, width: stroke, height: size * .2, right: size * .2, top: 0 }]} /></View>;
  if (name === 'people') return <View style={[box, s.vectorIcon]}><View style={[s.personHead, { width: size * .25, height: size * .25, borderRadius: size, borderColor: color, borderWidth: stroke, left: size * .36, top: size * .08 }]} /><View style={[s.personBody, { width: size * .55, height: size * .32, borderColor: color, borderWidth: stroke, borderRadius: size, left: size * .22, top: size * .45 }]} /><View style={[s.personSide, { width: size * .18, height: size * .18, borderRadius: size, borderColor: color, borderWidth: stroke, left: 0, top: size * .28 }]} /><View style={[s.personSide, { width: size * .18, height: size * .18, borderRadius: size, borderColor: color, borderWidth: stroke, right: 0, top: size * .28 }]} /></View>;
  if (name === 'clock') return <View style={[box, s.vectorIcon]}><View style={[s.clockFace, { borderColor: color, borderWidth: stroke, borderRadius: size, width: size * .82, height: size * .82, top: size * .08, left: size * .08 }]} /><View style={[s.clockHand, { backgroundColor: color, width: stroke, height: size * .28, left: size * .47, top: size * .25 }]} /><View style={[s.clockHand, { backgroundColor: color, width: size * .28, height: stroke, left: size * .47, top: size * .5, transform: [{ rotate: '25deg' }] }]} /></View>;
  if (name === 'single') return <View style={[box, s.vectorIcon]}><View style={[s.personHead, { width: size * .32, height: size * .32, borderRadius: size, borderColor: color, borderWidth: stroke, left: size * .34, top: size * .06 }]} /><View style={[s.personBody, { width: size * .6, height: size * .44, borderColor: color, borderWidth: stroke, borderRadius: size, left: size * .2, top: size * .5 }]} /></View>;
  if (name === 'medal') return <View style={[box, s.vectorIcon]}><View style={[s.medalRibbon, { backgroundColor: color, width: stroke * 1.3, height: size * .4, left: size * .3, top: 0, transform: [{ rotate: '18deg' }] }]} /><View style={[s.medalRibbon, { backgroundColor: color, width: stroke * 1.3, height: size * .4, right: size * .3, top: 0, transform: [{ rotate: '-18deg' }] }]} /><View style={[s.medalDisc, { borderColor: color, borderWidth: stroke, borderRadius: size, width: size * .56, height: size * .56, left: size * .22, top: size * .36 }]} /></View>;
  if (name === 'map') return <View style={[box, s.vectorIcon]}><View style={[s.mapBody, { borderColor: color, borderWidth: stroke, borderRadius: size * .1, width: size * .82, height: size * .62, left: size * .09, top: size * .16 }]} /><View style={[s.mapFold, { backgroundColor: color, width: stroke, height: size * .62, left: size * .37, top: size * .16 }]} /><View style={[s.mapFold, { backgroundColor: color, width: stroke, height: size * .62, left: size * .63, top: size * .16 }]} /></View>;
  if (name === 'menu') return <View style={[box, s.vectorIcon]}><View style={[s.menuDot, { width: size * .16, height: size * .16, borderRadius: size, backgroundColor: color, top: size * .1, left: size * .42 }]} /><View style={[s.menuDot, { width: size * .16, height: size * .16, borderRadius: size, backgroundColor: color, top: size * .42, left: size * .42 }]} /><View style={[s.menuDot, { width: size * .16, height: size * .16, borderRadius: size, backgroundColor: color, top: size * .74, left: size * .42 }]} /></View>;
  if (name === 'check') return <View style={[box, s.vectorIcon]}><View style={[s.checkPart, { width: size * .32, height: stroke, backgroundColor: color, left: size * .06, top: size * .52, transform: [{ rotate: '45deg' }] }]} /><View style={[s.checkPart, { width: size * .58, height: stroke, backgroundColor: color, left: size * .26, top: size * .42, transform: [{ rotate: '-45deg' }] }]} /></View>;
  if (name === 'play') return <View style={[box, s.vectorIcon]}><View style={[s.playTriangle, { left: size * .3, top: size * .16, borderTopWidth: size * .34, borderBottomWidth: size * .34, borderLeftWidth: size * .46, borderLeftColor: color }]} /></View>;
  if (name === 'info') return <View style={[box, s.vectorIcon]}><View style={[s.infoCircle, { borderColor: color, borderWidth: stroke, borderRadius: size, width: size * .82, height: size * .82, top: size * .08, left: size * .08 }]} /><View style={[s.infoDot, { backgroundColor: color, width: stroke * 1.2, height: stroke * 1.2, borderRadius: size, left: size * .44, top: size * .24 }]} /><View style={[s.infoBar, { backgroundColor: color, width: stroke, height: size * .28, left: size * .47, top: size * .46 }]} /></View>;
  if (name === 'lock') return <View style={[box, s.vectorIcon]}><View style={[s.lockShackle, { borderColor: color, borderWidth: stroke, width: size * .4, height: size * .34, borderTopLeftRadius: size * .2, borderTopRightRadius: size * .2, left: size * .3, top: size * .08 }]} /><View style={[s.lockBody, { backgroundColor: color, borderRadius: size * .1, width: size * .58, height: size * .42, left: size * .21, top: size * .42 }]} /></View>;
  if (name === 'shuttle') return <View style={[box, s.vectorIcon]}>
    <View style={[s.shuttleCone, { left: size * .2, top: size * .04, borderLeftWidth: size * .3, borderRightWidth: size * .3, borderTopWidth: size * .52, borderTopColor: color, opacity: 0.3 }]} />
    <View style={[s.shuttleCone, { left: size * .2, top: size * .04, borderLeftWidth: size * .3, borderRightWidth: size * .3, borderTopWidth: size * .52, borderTopColor: color, opacity: 0.85, transform: [{ scaleX: 0.5 }] }]} />
    <View style={[s.shuttleBand, { borderColor: color, borderWidth: Math.max(1, stroke * .55), width: size * .58, height: size * .58, borderRadius: size, left: size * .21, top: size * .16 }]} />
    <View style={[s.shuttleCork, { backgroundColor: color, width: size * .22, height: size * .22, borderRadius: size, left: size * .39, top: size * .56 }]} />
  </View>;
  if (name === 'document') return <View style={[box, s.vectorIcon]}><View style={[s.docBody, { borderColor: color, borderWidth: stroke, borderRadius: size * .08, width: size * .66, height: size * .8, left: size * .17, top: size * .1 }]} /><View style={[s.docLine, { backgroundColor: color, width: size * .38, height: stroke, left: size * .31, top: size * .38 }]} /><View style={[s.docLine, { backgroundColor: color, width: size * .38, height: stroke, left: size * .31, top: size * .56 }]} /><View style={[s.docLine, { backgroundColor: color, width: size * .24, height: stroke, left: size * .31, top: size * .74 }]} /></View>;
  if (name === 'star') return <View style={[box, s.vectorIcon]}><View style={[s.starDiamond, { backgroundColor: color, width: size * .52, height: size * .52, left: size * .24, top: size * .24, borderRadius: size * .08, transform: [{ rotate: '45deg' }] }]} /></View>;
  if (name === 'bars') return <View style={[box, s.vectorIcon]}><View style={[s.barItem, { backgroundColor: color, width: size * .18, height: size * .34, left: size * .14, bottom: size * .1 }]} /><View style={[s.barItem, { backgroundColor: color, width: size * .18, height: size * .54, left: size * .41, bottom: size * .1 }]} /><View style={[s.barItem, { backgroundColor: color, width: size * .18, height: size * .74, left: size * .68, bottom: size * .1 }]} /></View>;
  if (name === 'settings') return <View style={[box, s.vectorIcon]}><View style={[s.gearRing, { borderColor: color, borderWidth: stroke, borderRadius: size, width: size * .7, height: size * .7, left: size * .15, top: size * .15 }]} /><View style={[s.gearNotch, { backgroundColor: color, width: stroke * 1.2, height: size * .2, left: size * .44, top: 0 }]} /><View style={[s.gearNotch, { backgroundColor: color, width: stroke * 1.2, height: size * .2, left: size * .44, bottom: 0 }]} /><View style={[s.gearNotch, { backgroundColor: color, width: size * .2, height: stroke * 1.2, top: size * .44, left: 0 }]} /><View style={[s.gearNotch, { backgroundColor: color, width: size * .2, height: stroke * 1.2, top: size * .44, right: 0 }]} /></View>;
  if (name === 'bracket') return <View style={[box, s.vectorIcon]}><View style={[s.bracketLine, { backgroundColor: color, width: size * .34, height: stroke, left: size * .1, top: size * .22 }]} /><View style={[s.bracketLine, { backgroundColor: color, width: size * .34, height: stroke, left: size * .1, top: size * .72 }]} /><View style={[s.bracketLine, { backgroundColor: color, width: stroke, height: size * .5, left: size * .42, top: size * .22 }]} /><View style={[s.bracketLine, { backgroundColor: color, width: size * .34, height: stroke, left: size * .42, top: size * .47 }]} /></View>;
  if (name === 'activity') return <View style={[box, s.vectorIcon]}><View style={[s.activityPart, { width: size * .3, height: stroke, backgroundColor: color, left: size * .04, top: size * .62 }]} /><View style={[s.activityPart, { width: size * .32, height: stroke, backgroundColor: color, left: size * .28, top: size * .3, transform: [{ rotate: '64deg' }] }]} /><View style={[s.activityPart, { width: size * .32, height: stroke, backgroundColor: color, left: size * .46, top: size * .3, transform: [{ rotate: '-64deg' }] }]} /><View style={[s.activityPart, { width: size * .3, height: stroke, backgroundColor: color, left: size * .66, top: size * .62 }]} /></View>;
  if (name === 'quote') return <View style={[box, s.vectorIcon]}><View style={[s.quoteMark, { backgroundColor: color, width: size * .3, height: size * .3, borderRadius: size * .1, left: size * .06, top: size * .3 }]} /><View style={[s.quoteMark, { backgroundColor: color, width: size * .3, height: size * .3, borderRadius: size * .1, left: size * .5, top: size * .3 }]} /></View>;
  return <View style={[box, s.vectorIcon]}><View style={[s.trophyCup, { borderColor: color, borderWidth: stroke, width: size * .48, height: size * .46, left: size * .26, top: size * .08, borderBottomLeftRadius: size * .14, borderBottomRightRadius: size * .14 }]} /><View style={[s.trophyStem, { backgroundColor: color, width: stroke, height: size * .18, left: size * .47, top: size * .54 }]} /><View style={[s.trophyBase, { backgroundColor: color, width: size * .5, height: stroke, left: size * .25, top: size * .76 }]} /></View>;
}

const s = StyleSheet.create({
  vectorIcon: { position: 'relative', flexShrink: 0 },
  chevronPart: { position: 'absolute', left: '29%', borderRadius: 2 },
  searchLens: { position: 'absolute', left: 1, top: 1, borderRadius: 20 },
  searchHandle: { position: 'absolute', borderRadius: 2 },
  shareStem: { position: 'absolute', borderRadius: 2 },
  shareHead: { position: 'absolute', borderRadius: 2 },
  shareDot: { position: 'absolute' },
  pin: { position: 'absolute', left: '19%' },
  pinDot: { position: 'absolute', left: '41%' },
  calendarBody: { position: 'absolute', left: '11%' },
  calendarBar: { position: 'absolute', left: '11%' },
  calendarPin: { position: 'absolute', borderRadius: 2 },
  personHead: { position: 'absolute' },
  personBody: { position: 'absolute' },
  personSide: { position: 'absolute' },
  clockFace: { position: 'absolute' },
  clockHand: { position: 'absolute', borderRadius: 2 },
  trophyCup: { position: 'absolute' },
  trophyStem: { position: 'absolute' },
  trophyBase: { position: 'absolute', borderRadius: 2 },
  medalRibbon: { position: 'absolute', borderRadius: 2 },
  medalDisc: { position: 'absolute' },
  mapBody: { position: 'absolute' },
  mapFold: { position: 'absolute' },
  menuDot: { position: 'absolute' },
  checkPart: { position: 'absolute', borderRadius: 2 },
  playTriangle: {
    position: 'absolute',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  infoCircle: { position: 'absolute' },
  infoDot: { position: 'absolute' },
  infoBar: { position: 'absolute' },
  lockShackle: { position: 'absolute', borderBottomWidth: 0 },
  lockBody: { position: 'absolute' },
  shuttleCork: { position: 'absolute' },
  shuttleBand: { position: 'absolute', backgroundColor: 'transparent' },
  shuttleCone: {
    position: 'absolute',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  docBody: { position: 'absolute' },
  docLine: { position: 'absolute', borderRadius: 1 },
  starDiamond: { position: 'absolute' },
  barItem: { position: 'absolute' },
  gearRing: { position: 'absolute' },
  gearNotch: { position: 'absolute', borderRadius: 1 },
  bracketLine: { position: 'absolute', borderRadius: 1 },
  activityPart: { position: 'absolute', borderRadius: 1 },
  quoteMark: { position: 'absolute' },
});
