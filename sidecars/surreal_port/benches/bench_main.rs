use std::time::Instant;

fn now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn main() {
    let n = 100_000;
    let t0 = Instant::now();
    let mut sum: i64 = 0;
    for _ in 0..n {
        sum = sum.wrapping_add(now_ms());
    }
    let elapsed = t0.elapsed();
    println!(
        "test bench_now_ms ... bench: {:>9} ns/iter (+/- 0)",
        elapsed.as_nanos() / n as u128
    );
    let _ = sum;
}
