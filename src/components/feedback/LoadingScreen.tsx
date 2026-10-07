import { ActivityIndicator, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';

// SmashPoint splash / session-restore screen: deep emerald upper area with the badminton imagery, soft mint lower area.
export function LoadingScreen() {
  return (
    <View style={s.root}>
      <ImageBackground source={require('../../../assets/images/login-badminton-bg.png')} resizeMode="cover" style={s.hero}>
        <View pointerEvents="none" style={s.overlay} />
        <Text style={s.brand}>SmashPoint</Text>
        <Text style={s.tag}>Play  ·  Organize  ·  Manage</Text>
        <ActivityIndicator size="small" color={colors.lime} style={s.spinner} />
      </ImageBackground>
      <View style={s.lower}>
        <Text style={s.everyone}>Badminton for{`\n`}Everyone</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E7F4EC' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B4A35' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,43,30,0.62)' },
  brand: { color: colors.white, fontSize: 44, fontWeight: '900', letterSpacing: -1 },
  tag: { color: '#D8EBDD', fontSize: 16, marginTop: 8, letterSpacing: 1 },
  spinner: { marginTop: 28 },
  lower: { height: 130, backgroundColor: '#E7F4EC', alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -28 },
  everyone: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center', lineHeight: 26 },
});
