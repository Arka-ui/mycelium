import gleeunit
import gleeunit/should

pub fn main() -> Nil {
  gleeunit.main()
}

pub fn smoke_test() -> Nil {
  should.equal(1 + 1, 2)
}
