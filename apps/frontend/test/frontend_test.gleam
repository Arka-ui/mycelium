import gleeunit
import gleeunit/should

pub fn main() -> Nil {
  gleeunit.main()
}

pub fn smoke_test() -> Nil {
  // The frontend is a 30-line bootstrap; meaningful tests live in
  // tests/integration as end-to-end browser-driven WebDriver tests
  // landing in M3.
  should.equal(1 + 1, 2)
}
