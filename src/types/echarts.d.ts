/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'echarts/core' {
  export const use: any;
  export const init: any;
  export const graphic: any;
  export const registerTheme: any;
  export const registerLocale: any;
  export const registerMap: any;
  export const registerVisual: any;
  export const registerTransform: any;
  export const registerAction: any;
  export const registerCoordinateSystem: any;
  export const registerLayout: any;
  export const registerLoading: any;
  export const registerPostInit: any;
  export const registerPostUpdate: any;
  export const registerPreprocessor: any;
  export const registerProcessor: any;
  export const registerUpdateLifecycle: any;
  export const getInstanceByDom: any;
  export const connect: any;
  export const disconnect: any;
  export const dispose: any;
  export type ComposeOption<_T> = any;
  export type ImagePatternObject = any;
  export type EChartsType = any;
  export type ElementEvent = any;
  export type SetOptionOpts = any;
  export type ECBasicOption = any;
  export type ECElement = any;
  export namespace graphic {
    export type LinearGradient = any;
    export type RadialGradient = any;
    export type ClipPath = any;
    export type Group = any;
    export type Rect = any;
    export type Circle = any;
    export type Sector = any;
    export type Ring = any;
    export type Polygon = any;
    export type Polyline = any;
    export type Line = any;
    export type BezierCurve = any;
    export type Arc = any;
    export type CompoundPath = any;
    export type LinearGradientObject = any;
    export type RadialGradientObject = any;
    export type PatternObject = any;
    export type ImagePatternObject = any;
  }
}

declare module 'echarts/charts' {
  export const LineChart: any;
  export type LineSeriesOption = any;
  export const PieChart: any;
  export type PieSeriesOption = any;
  export const BarChart: any;
  export type BarSeriesOption = any;
}

declare module 'echarts/components' {
  export const DataZoomComponent: any;
  export type DataZoomComponentOption = any;
  export const GridComponent: any;
  export type GridComponentOption = any;
  export const TooltipComponent: any;
  export type TooltipComponentOption = any;
  export const LegendComponent: any;
  export type LegendComponentOption = any;
  export const TitleComponent: any;
  export type TitleComponentOption = any;
  export const MarkLineComponent: any;
  export type MarkLineComponentOption = any;
  export const MarkPointComponent: any;
  export type MarkPointComponentOption = any;
}

declare module 'echarts/renderers' {
  export const CanvasRenderer: any;
  export const SVGRenderer: any;
}
