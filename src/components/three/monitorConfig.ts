// Single tuning block for the desk monitor — edit these values to move,
// resize or tilt the whole monitor assembly. CameraRig's monitor focus
// preset derives from this too, so focus stays locked on when you tweak.
export const MONITOR = {
  // Desk contact point of the stand base (x = along desk, y = desk surface
  // height, z = depth; more negative z = closer to the wall).
  position: [1.2, 1.005, -3.8] as [number, number, number],
  // Uniform scale of the whole assembly (stand + panel + screen).
  // 1 = the current 1.82-wide panel; 1.1 = 10% bigger, etc.
  size: 0.7,
  // Screen tilt in radians (negative = leaned back toward the wall).
  tilt: -0.04,
}
