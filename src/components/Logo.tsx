import React, { memo } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const logo = require('../assets/images/logo.png');

interface LogoProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
  rounded?: boolean;
}

export const Logo = memo(function Logo({ size = 64, style, rounded = true }: LogoProps) {
  return (
    <Image
      source={logo}
      style={[
        {
          width: size,
          height: size,
          borderRadius: rounded ? size * 0.22 : 0,
        },
        style,
      ]}
      resizeMode="cover"
      accessibilityLabel="FinTrack"
    />
  );
});
