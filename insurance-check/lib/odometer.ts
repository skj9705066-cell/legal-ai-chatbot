/**
 * 기계식 계기판처럼 한 자리의 바퀴 위치(0~10)를 구한다.
 * 자리값은 정수로 멈춰 있고, 아래 자리가 9→0으로 넘어가는 마지막 10% 구간에서만 한 칸 굴러간다.
 * (일의 자리는 연속으로 돈다.) 최종 정수값에서는 항상 정확한 숫자에 멈춘다.
 */
export function wheelPosition(v: number, place: number): number {
  const scaled = v / Math.pow(10, place);
  const whole = Math.floor(scaled + 1e-9);
  const digit = whole % 10;
  const frac = Math.max(0, scaled - whole);
  const shift = place === 0 ? frac : Math.max(0, (frac - 0.9) / 0.1);
  return digit + shift;
}
