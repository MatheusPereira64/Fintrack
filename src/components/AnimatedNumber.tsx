import React, { useEffect, memo } from 'react';
import { Text, TextStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedProps, withTiming, Easing,
} from 'react-native-reanimated';
import { formatCurrency } from '../utils/currency';

// Necessário para animar propriedades de texto com Reanimated
const AnimatedText = Animated.createAnimatedComponent(Text);

interface AnimatedNumberProps {
  value:   number;
  style?:  TextStyle;
  prefix?: string;
  formatFn?: (v: number) => string;
  duration?: number;
}

/**
 * Exibe um número com animação de contagem suave (spring/tween).
 * Usa um approach compatível com RN sem `AnimatedProps` de texto,
 * via interpolação de state com `requestAnimationFrame`.
 */
export const AnimatedNumber = memo(function AnimatedNumber({
  value,
  style,
  prefix = '',
  formatFn = formatCurrency,
  duration = 800,
}: AnimatedNumberProps) {
  const [displayed, setDisplayed] = React.useState(value);
  const startRef = React.useRef(value);
  const frameRef = React.useRef<number | null>(null);

  useEffect(() => {
    const start     = startRef.current;
    const end       = value;
    const startTime = Date.now();

    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    const animate = () => {
      const elapsed  = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing: ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplayed(start + (end - start) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        startRef.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [value, duration]);

  return <Text style={style}>{prefix}{formatFn(displayed)}</Text>;
});
