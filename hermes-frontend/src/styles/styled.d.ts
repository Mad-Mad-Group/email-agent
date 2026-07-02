import 'styled-components';
import { HermesTheme } from '../types/theme';

declare module 'styled-components' {
  export interface DefaultTheme extends HermesTheme {}
}
