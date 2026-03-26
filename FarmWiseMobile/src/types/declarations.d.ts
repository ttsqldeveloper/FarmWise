declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.svg';

// Fix for react-native-vector-icons
declare module 'react-native-vector-icons/MaterialIcons' {
  import { Icon } from 'react-native-vector-icons/Icon';
  export default Icon;
}

// Fix for socket.io-client
declare module 'socket.io-client' {
  const io: any;
  export default io;
}

// Fix for react-native-chart-kit
declare module 'react-native-chart-kit' {
  export const LineChart: any;
  export const BarChart: any;
  export const PieChart: any;
  export const ProgressChart: any;
  export const ContributionGraph: any;
  export const StackedBarChart: any;
}